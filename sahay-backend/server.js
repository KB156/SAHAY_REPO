// server.js
require('dotenv').config();
console.log("Service Account Path from .env:", process.env.GOOGLE_APPLICATION_CREDENTIALS); // <-- ADD THIS LINE FOR DEBUGGING
// ... rest of your requires (express, http, ws, etc.)
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors'); // Import cors

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

const { VertexAI } = require('@google-cloud/vertexai');

const vertex_ai = new VertexAI({
    project: process.env.GOOGLE_CLOUD_PROJECT_ID, // ADD your Project ID to .env
    location: process.env.GOOGLE_CLOUD_LOCATION,   // ADD your region (e.g., 'us-central1', 'asia-south1') to .env
});
const model = 'gemini-2.5-flash';
const generativeModel = vertex_ai.preview.getGenerativeModel({
    model: model,
    generationConfig: { // Optional: configure output parameters
        maxOutputTokens: 2048,
        temperature: 0.2, // Lower temperature for more deterministic JSON output
        topP: 0.8,
        topK: 40,
    },
    // safetySettings: [], // Optional: configure safety settings if needed
});

const textToSpeech = require('@google-cloud/text-to-speech');
const ttsClient = new textToSpeech.TextToSpeechClient();
// server.js (Add near top if not already present)
const speech = require('@google-cloud/speech');
const speechClient = new speech.SpeechClient();
const crypto = require('crypto'); // For connection IDs
const stateStore = {}; // Make sure stateStore is defined globally

app.use(cors()); // Enable CORS for all origins (for development)
app.use(express.static(path.join(__dirname, '../sahay-frontend/dist'))); // Serve built React app later

// server.js (Replace the entire wss.on('connection') block)

wss.on('connection', (ws) => {
    const connectionId = crypto.randomUUID();
    console.log(`Client ${connectionId} connected via WebSocket`);

    // Initialize state for this connection
    stateStore[connectionId] = {
        currentStep: 1,
        language: 'en-US', // Default, update later
        verificationCondition: null,
        sttStream: null,
        sttStreamActive: false,
        // Add a flag to track if we've already sent the initial guidance
        initialGuidanceSent: false
    };
    console.log(`[${connectionId}] Initial state:`, stateStore[connectionId]);

    // --- Function to Setup STT Stream ---
    const setupSttStream = () => {
        const sessionState = stateStore[connectionId];
        if (!sessionState || sessionState.sttStreamActive) {
            console.log(`[${connectionId}] STT stream setup skipped or already active.`);
            return;
        }
        console.log(`[${connectionId}] Setting up STT stream for language ${sessionState.language}...`);

        // In the setupSttStream function, update the requestConfig:
        const requestConfig = {
            config: {
                encoding: 'WEBM_OPUS',
                sampleRateHertz: 48000, // Standard for WebRTC/Opus
                languageCode: sessionState.language,
                audioChannelCount: 1, // Add this - mono audio
                enableAutomaticPunctuation: true,
                model: 'latest_long', // Better for continuous speech
            },
            interimResults: false,
        };

        const recognizeStream = speechClient.streamingRecognize(requestConfig)
        .on('error', (error) => {
        console.error(`[${connectionId}] STT Error:`, error);
        const sessionState = stateStore[connectionId]; // Get state safely

        if (sessionState) { // Only act if state still exists
                // --- ADD RESTART LOGIC ---
                // Check if it's the specific "Unable to recognize" error (code 3)
                // or potentially a timeout (code 11 might appear too)
                const shouldRestart = (error.code === 3 || error.code === 11);

                // Mark current stream as inactive regardless
                sessionState.sttStreamActive = false;
                sessionState.sttStream = null; // Clear stream ref

                if (shouldRestart) {
                    console.log(`[${connectionId}] Attempting to restart STT stream due to error code ${error.code}.`);
                    // Use setTimeout to avoid instant, potentially rapid restarts
                    setTimeout(() => {
                        // Double-check state still exists before restarting
                        if (stateStore[connectionId]) {
                            setupSttStream(); // Call the setup function again
                        } else {
                            console.log(`[${connectionId}] State removed before STT restart could occur.`);
                        }
                    }, 500); // Wait 500ms before restarting
                } else {
                    // For other errors, just report it
                    ws.send(JSON.stringify({ type: 'status', message: `Speech recognition error (${error.code}). Please try again.` }));
                }
                // --- END RESTART LOGIC ---

            } else {
             console.error(`[${connectionId}] State not found during STT error handling.`);
        }
        })
            .on('data', async (data) => {
                const transcript = data.results[0]?.alternatives[0]?.transcript;
                const isFinal = data.results[0]?.isFinal;
                const sessionState = stateStore[connectionId]; // Get current state

                if (!sessionState) return; // Connection might have closed

                if (transcript && isFinal) {
                    console.log(`[${connectionId}] Final STT: ${transcript}`);

                    // --- TRIGGER COGNITION ---
                    if (!sessionState.verificationCondition) { // Only process if not waiting for verification
                        console.log(`[${connectionId}] Getting guidance for Step ${sessionState.currentStep}...`);

                        // --- CALL GEMINI ---
                        // For Phase 1, always use the hardcoded function, passing the real transcript
                        const plan = await getGuidanceStep_Phase1_Hardcoded(transcript);

                        if (plan && plan.guide_text) { // Check for valid plan *with* text
                            // --- SEND ACTION ---
                            await sendActionToClient(ws, plan, sessionState.language);
                            // --- SET VERIFICATION ---
                            sessionState.verificationCondition = plan.verify_condition;
                            console.log(`[${connectionId}] Set verification for Step ${sessionState.currentStep}:`, sessionState.verificationCondition);
                            sessionState.initialGuidanceSent = true; // Mark that first guidance is sent
                        } else {
                            console.log(`[${connectionId}] Failed to get valid plan from Gemini.`);
                            ws.send(JSON.stringify({ type: 'status', message: 'Sorry, I couldn\'t understand that or find a next step.' }));
                        }
                    } else {
                        console.log(`[${connectionId}] Already waiting for verification, ignoring transcript: "${transcript}"`);
                    }
                }
            });

        // Store the stream and mark as active
        sessionState.sttStream = recognizeStream;
        sessionState.sttStreamActive = true;
        console.log(`[${connectionId}] STT stream created and active.`);

        // Send initial prompt AFTER stream is ready
        if (!sessionState.initialGuidanceSent) {
            ws.send(JSON.stringify({ type: 'status', message: 'Welcome! Please describe your issue.' }));
        }
    }; // End setupSttStream

    // --- Setup STT Stream on Connection ---
    setupSttStream();


    ws.on('message', (message) => {
        if (message instanceof Buffer) {
        console.log(`[${connectionId}] Received audio chunk: ${message.length} bytes`);
        // Log first few bytes to verify format
        console.log(`[${connectionId}] First bytes:`, message.slice(0, 4).toString('hex'));
        }
        const sessionState = stateStore[connectionId];
        if (!sessionState) {
            console.log(`[${connectionId}] State not found, ignoring message.`);
            return;
        }

        if (message instanceof Buffer) {
            // --- FORWARD AUDIO TO STT ---
            if (sessionState.sttStream && sessionState.sttStreamActive) {
                try {
                    sessionState.sttStream.write(message);
                } catch (sttError) {
                    console.error(`[${connectionId}] Error writing to STT stream:`, sttError);
                    sessionState.sttStreamActive = false;
                }
            } else if (!sessionState.sttStreamActive && sessionState.sttStream) {
                 // Stream might have errored out, try recreating it
                 console.log(`[${connectionId}] STT stream inactive, attempting restart.`);
                 sessionState.sttStream.destroy(); // Ensure old one is gone
                 sessionState.sttStream = null;
                 setupSttStream(); // Try to set up a new one
                 // Optionally buffer the message or inform the user
            } else {
                 // First audio chunk might arrive before stream is fully ready
                 // console.log(`[${connectionId}] Received audio chunk, but STT stream not ready yet.`);
            }
        } else {
            // --- HANDLE JSON MESSAGES (Clicks) ---
            try {
                const parsedMessage = JSON.parse(message.toString());
                // console.log(`[${connectionId}] Received JSON:`, parsedMessage); // Can be noisy

                if (parsedMessage.type === 'user_click') {
                    console.log(`[${connectionId}] User click received:`, parsedMessage);
                    // Call verification (Step 13)
                    verifyUserAction(connectionId, ws, parsedMessage);
                } else {
                    // console.log(`[${connectionId}] Received unknown JSON:`, parsedMessage);
                }
            } catch (e) {
                console.log(`[${connectionId}] Received non-JSON text:`, message.toString());
            }
        }
    });

    ws.on('close', () => {
        console.log(`Client ${connectionId} disconnected`);
        const sessionState = stateStore[connectionId];
        if (sessionState && sessionState.sttStream) {
            sessionState.sttStream.destroy();
            console.log(`[${connectionId}] Destroyed STT stream on close.`);
        }
        delete stateStore[connectionId];
    });

    ws.on('error', (error) => {
        console.error(`[${connectionId}] WebSocket Error:`, error);
        const sessionState = stateStore[connectionId];
        if (sessionState && sessionState.sttStream) {
            sessionState.sttStream.destroy();
            console.log(`[${connectionId}] Destroyed STT stream due to WS error.`);
        }
        delete stateStore[connectionId];
    });

    // Initial message moved inside setupSttStream to ensure stream readiness

}); // End wss.on('connection')


// --- Make sure verifyUserAction and isClickValid functions exist ---
// server.js (Replace the placeholder verifyUserAction)

async function verifyUserAction(connectionId, ws, clickAction) {
     const sessionState = stateStore[connectionId];
     if (!sessionState) {
         console.error(`[${connectionId}] State not found during verification!`);
         // Optionally send error to client
         // ws.send(JSON.stringify({ type: 'status', message: 'Session error. Please reconnect.' }));
         return;
     }
     if (!sessionState.verificationCondition) {
         console.log(`[${connectionId}] No verification condition set. Ignoring click.`);
         return; // Not waiting for anything
     }

     const condition = sessionState.verificationCondition;
     const clickCoords = [clickAction.x, clickAction.y];
     let conditionMet = false;

     console.log(`[${connectionId}] Verifying Step ${sessionState.currentStep}. Condition:`, condition);
     console.log(`[${connectionId}] User Clicked At:`, clickCoords);

     // --- Check Condition ---
     if (condition.event === 'click' && condition.target_coords) {
         conditionMet = isClickValid(clickCoords, condition.target_coords);
     } else if (condition.event === 'keypress') {
         // TODO: Needs client implementation to send keypress events with target info
         console.log(`[${connectionId}] Keypress verification check needed.`);
         // --- TEMPORARY for Phase 1 ---
         // Treat a CLICK within the keypress target area as success for now
         if (condition.target_coords && isClickValid(clickCoords, condition.target_coords)) {
             console.warn(`[${connectionId}] TEMP: Treating CLICK in target area as successful KEYPRESS verification.`);
             conditionMet = true;
         } else {
              console.log(`[${connectionId}] Click was outside target area for keypress condition.`);
         }
     } else {
         console.warn(`[${connectionId}] Unknown verification event type: ${condition.event}`);
     }

     // --- Take Action Based on Verification ---
     if (conditionMet) {
        console.log(`[${connectionId}] Verification SUCCESS for step ${sessionState.currentStep}!`);
        ws.send(JSON.stringify({type: 'status', message: `Step ${sessionState.currentStep} successful!`}));
        sessionState.verificationCondition = null; // Clear condition for this step
        sessionState.currentStep++; // Advance step number

        // --- TRIGGER NEXT STEP ---
         console.log(`[${connectionId}] Requesting guidance for Step ${sessionState.currentStep}...`);
         let nextPlan;
         // --- Simple Phase 1 Logic: Only handle Step 2 ---
         if (sessionState.currentStep === 2) {
             nextPlan = await getGuidanceStep_Phase1_Step2(); // Get Step 2 plan
         } else {
             console.log(`[${connectionId}] Reached end of Phase 1 flow.`);
             ws.send(JSON.stringify({type: 'status', message: 'Task completed!'}));
             // Optionally close connection or wait for more input
             return; // Stop processing further steps in this flow
         }

         if (nextPlan && nextPlan.guide_text) {
             await sendActionToClient(ws, nextPlan, sessionState.language);
             sessionState.verificationCondition = nextPlan.verify_condition; // Set condition for the *new* step
             console.log(`[${connectionId}] Set verification for Step ${sessionState.currentStep}:`, sessionState.verificationCondition);
         } else {
             console.log(`[${connectionId}] Failed to get valid plan for step ${sessionState.currentStep}.`);
             ws.send(JSON.stringify({ type: 'status', message: 'Sorry, I could not determine the next step.' }));
             // Reset state?
             sessionState.verificationCondition = null;
             sessionState.currentStep = 1; // Go back to start?
         }

     } else { // Condition NOT Met
        console.log(`[${connectionId}] Verification FAILED for step ${sessionState.currentStep}.`);
        ws.send(JSON.stringify({type: 'status', message: `That wasn't quite right. Let's try step ${sessionState.currentStep} again.`}));

        // --- TRIGGER RE-PROMPT ---
         let currentPlan;
         // Re-fetch the plan for the *current* step to give guidance again
         if (sessionState.currentStep === 1) {
              currentPlan = await getGuidanceStep_Phase1_Hardcoded("User failed verification. Please repeat the instruction for step 1."); // Pass hint to Gemini
         } else if (sessionState.currentStep === 2) {
              currentPlan = await getGuidanceStep_Phase1_Step2(); // Re-fetch Step 2 plan
         }
         // Add more steps as needed in later phases

         if (currentPlan && currentPlan.guide_text) {
             // Prepend a re-prompt phrase
             currentPlan.guide_text = `Let's try that again. ${currentPlan.guide_text}`;
             await sendActionToClient(ws, currentPlan, sessionState.language);
             // Keep the *same* verification condition - user needs to try this step again
             console.log(`[${connectionId}] Re-sent guidance for Step ${sessionState.currentStep}. Still waiting for:`, sessionState.verificationCondition);
         } else {
              console.log(`[${connectionId}] Could not get plan to re-prompt step ${sessionState.currentStep}.`);
              ws.send(JSON.stringify({ type: 'status', message: 'Something went wrong. Please try explaining again.' }));
              sessionState.verificationCondition = null; // Clear condition to allow user to speak again
         }
     }
} // End verifyUserAction
// Placeholder definitions from Step 13 needed here
// server.js (Make sure this function exists)
function isClickValid(clickCoords, targetBbox) {
     // Basic validation
     if (!clickCoords || !Array.isArray(clickCoords) || clickCoords.length !== 2 ||
         !targetBbox || !Array.isArray(targetBbox) || targetBbox.length !== 4) {
         console.warn("Invalid input to isClickValid");
         return false;
     }

     const [x, y] = clickCoords.map(Number);
     const [x1, y1, x2, y2] = targetBbox.map(Number);

     // Check for invalid coordinates (e.g., negative dimensions)
     if (x1 > x2 || y1 > y2) {
         console.warn("Invalid target bounding box:", targetBbox);
         return false;
     }

     const isValid = (x >= x1 && x <= x2 && y >= y1 && y <= y2);
     console.log(`isClickValid: Click[${x},${y}] vs Target[${x1},${y1},${x2},${y2}] -> Valid: ${isValid}`);
     return isValid;
}

// server.js (Replace the existing verifyUserAction function)

async function verifyUserAction(connectionId, ws, clickAction) {
    const sessionState = stateStore[connectionId];
    if (!sessionState) {
        console.error(`[${connectionId}] State not found during verification!`);
        return;
    }
    if (!sessionState.verificationCondition) {
        console.log(`[${connectionId}] No verification condition set. Ignoring click.`);
        return;
    }

    const condition = sessionState.verificationCondition;
    // Client is now sending relative coordinates as 'x' and 'y'
    const clickCoords = [clickAction.x, clickAction.y];
    // Client also sends video dimensions
    const videoWidth = clickAction.videoWidth;
    const videoHeight = clickAction.videoHeight;

    let conditionMet = false;

    console.log(`[${connectionId}] Verifying Step ${sessionState.currentStep}. Condition:`, condition);
    console.log(`[${connectionId}] User Clicked At (Relative): [${clickCoords.join(',')}] in Video Size [${videoWidth}x${videoHeight}]`);

    // --- Check Condition ---
    if (condition.target_coords && videoWidth > 0 && videoHeight > 0) { // Ensure we have target and video dimensions
        // --- Coordinate Scaling ---
        // Assume hardcoded/Gemini coordinates are relative to a reference screen size
        // For Phase 1, let's ASSUME the hardcoded coords were based on roughly 1280x720 (adjust if needed)
        // In Phase 2/3, we'd get this dynamically or from configuration.
        const referenceScreenWidth = 1280; // Example reference width
        const referenceScreenHeight = 720; // Example reference height

        // Calculate scaling factors
        const scaleX = videoWidth / referenceScreenWidth;
        const scaleY = videoHeight / referenceScreenHeight;

        // Scale the TARGET coordinates DOWN to match the video element's coordinate system
        const scaledTargetCoords = [
            condition.target_coords[0] * scaleX, // x1
            condition.target_coords[1] * scaleY, // y1
            condition.target_coords[2] * scaleX, // x2
            condition.target_coords[3] * scaleY  // y2
        ];
        console.log(`[${connectionId}] Scaled Target Coords: [${scaledTargetCoords.map(Math.round).join(',')}]`);
        // --- End Scaling ---

        // Now compare the RELATIVE click coordinates to the SCALED target coordinates
        if (condition.event === 'click') {
            conditionMet = isClickValid(clickCoords, scaledTargetCoords);
        } else if (condition.event === 'keypress') {
            console.log(`[${connectionId}] Keypress verification check needed.`);
            // TEMP: Treat a CLICK within the SCALED target area as success for keypress
            if (isClickValid(clickCoords, scaledTargetCoords)) {
                console.warn(`[${connectionId}] TEMP: Treating CLICK in SCALED target area as successful KEYPRESS verification.`);
                conditionMet = true;
            } else {
                console.log(`[${connectionId}] Click was outside SCALED target area for keypress condition.`);
            }
        } else {
            console.warn(`[${connectionId}] Unknown verification event type: ${condition.event}`);
        }
    } else {
        console.warn(`[${connectionId}] Cannot verify: Missing target coordinates or video dimensions (W:${videoWidth}, H:${videoHeight}).`);
    }

    // --- Take Action Based on Verification ---
    if (conditionMet) {
        console.log(`[${connectionId}] Verification SUCCESS for step ${sessionState.currentStep}!`);
        ws.send(JSON.stringify({ type: 'status', message: `Step ${sessionState.currentStep} successful!` }));
        sessionState.verificationCondition = null; // Clear condition
        sessionState.currentStep++; // Advance step

        // --- TRIGGER NEXT STEP ---
        console.log(`[${connectionId}] Requesting guidance for Step ${sessionState.currentStep}...`);
        let nextPlan;
        if (sessionState.currentStep === 2) {
            nextPlan = await getGuidanceStep_Phase1_Step2(); // Get Step 2 plan
        } else {
            console.log(`[${connectionId}] Reached end of Phase 1 flow.`);
            ws.send(JSON.stringify({ type: 'status', message: 'Task completed!' }));
            return; // Stop processing
        }

        if (nextPlan && nextPlan.guide_text) {
            await sendActionToClient(ws, nextPlan, sessionState.language);
            sessionState.verificationCondition = nextPlan.verify_condition;
            console.log(`[${connectionId}] Set verification for Step ${sessionState.currentStep}:`, sessionState.verificationCondition);
        } else {
            console.log(`[${connectionId}] Failed to get valid plan for step ${sessionState.currentStep}.`);
            ws.send(JSON.stringify({ type: 'status', message: 'Sorry, I could not determine the next step.' }));
            // Reset?
            sessionState.verificationCondition = null;
            sessionState.currentStep = 1;
        }

    } else { // Condition NOT Met
        console.log(`[${connectionId}] Verification FAILED for step ${sessionState.currentStep}.`);
        ws.send(JSON.stringify({ type: 'status', message: `That wasn't quite right. Let's try step ${sessionState.currentStep} again.` }));

        // --- TRIGGER RE-PROMPT ---
        let currentPlan;
        if (sessionState.currentStep === 1) {
            currentPlan = await getGuidanceStep_Phase1_Hardcoded("User failed verification.");
        } else if (sessionState.currentStep === 2) {
            currentPlan = await getGuidanceStep_Phase1_Step2();
        }

        if (currentPlan && currentPlan.guide_text) {
            currentPlan.guide_text = `Let's try that again. ${currentPlan.guide_text}`;
            await sendActionToClient(ws, currentPlan, sessionState.language);
            console.log(`[${connectionId}] Re-sent guidance for Step ${sessionState.currentStep}. Still waiting for:`, sessionState.verificationCondition);
        } else {
            console.log(`[${connectionId}] Could not get plan to re-prompt step ${sessionState.currentStep}.`);
            ws.send(JSON.stringify({ type: 'status', message: 'Something went wrong. Please try explaining again.' }));
            sessionState.verificationCondition = null;
        }
    }
} // End verifyUserAction
// --- Make sure getGuidanceStep_Phase1_Step2() exists ---
async function getGuidanceStep_Phase1_Step2() {
    // Hardcoded plan for guiding user TO password field after seeing error
    console.log("Generating hardcoded plan for Step 2...");
     return {
        diagnosis: "User acknowledged error, now needs to fill password field.",
        guide_text: "Okay, now please click inside the password field so you can type your password. I've highlighted it in green.",
        ar_target_text: null, // Highlight based on coords
        ar_target_coords: [ 100, 150, 300, 170 ], // Coords of password field
        ar_color: 'green',
        verify_condition: { event: 'keypress', target_coords: [ 150, 150, 450, 170 ] } // Expect typing in password field
    };
}
// server.js (Replace the existing function with this one)

async function getGuidanceStep_Phase1_Hardcoded(userTranscript = "I clicked submit but it's not working!") {
    // --- Restore the hardcoded context data ---
    const hardcodedOCR = `[{"text": "Username", "coords": [50, 100, 150, 120]}, {"text": "Password", "coords": [50, 150, 150, 170]}, {"text": "Submit", "coords": [50, 200, 120, 230]}, {"text": "Error: Password field cannot be empty.", "coords": [50, 175, 400, 195]}]`;
    const hardcodedUIElements = `[{"element": "text_field", "label": "Username", "coords": [160, 100, 360, 120]}, {"element": "password_field", "label": "Password", "coords": [160, 150, 360, 170]}, {"element": "button", "text": "Submit", "coords": [50, 200, 120, 230]}]`;
    const hardcodedLastClick = `{"event": "click", "coords": [85, 215]}`; // Clicked Submit button

    // --- The Full Prompt with a Simplified TASK ---
    const prompt = `
        SYSTEM_ROLE: You are SAHAY, an AI support agent. Guide non-technical users calmly. Give *one* instruction at a time. Respond ONLY in the requested JSON format.

        USER_LANGUAGE: "en-US"
        INSTRUCTION: Generate your response in simple English.

        --- CONTEXT ---
        USER_TRANSCRIPT: "${userTranscript}"
        SCREEN_OCR: ${hardcodedOCR}
        SCREEN_UI_ELEMENTS: ${hardcodedUIElements}
        LAST_USER_ACTION: ${hardcodedLastClick}
        CURRENT_STEP: 1
        --- END CONTEXT ---

        TASK: Based on the context, what is the core problem and the single next guidance step?
        Respond ONLY in this JSON format:
        {
        "diagnosis": "<Your diagnosis of the core problem in English>",
        "guide_text": "<Your spoken guidance for this single step in simple English>",
        "ar_target_text": "<The exact OCR text to highlight for guidance, or null if none needed>",
        "ar_target_coords": [<x1>, <y1>, <x2>, <y2>],
        "verify_condition": {"event": "<click|keypress>", "target_coords": [<x1>, <y1>, <x2>, <y2>]}
        }
        `;

    try {
        console.log(`Sending prompt to Vertex AI (${model})...`);
        const req = {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        };
        const streamingResp = await generativeModel.generateContentStream(req);
        // Aggregate the response stream
        let aggregatedResponseText = '';
        for await (const item of streamingResp.stream) {
             if (item.candidates?.[0]?.content?.parts?.[0]?.text) {
                aggregatedResponseText += item.candidates[0].content.parts[0].text;
             }
        }

        console.log("Raw Vertex AI Response Text:", aggregatedResponseText);
        // Clean markdown
        const jsonText = aggregatedResponseText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
        const parsedPlan = JSON.parse(jsonText);
        console.log("Parsed Vertex AI Plan:", parsedPlan);
        return parsedPlan;

    } catch (error) {
        console.error("Error calling Vertex AI API:", error);
        // Return fallback plan on error
        return { diagnosis: "Error communicating with AI. Could not get a diagnosis." };
    }
}
// server.js (Add or replace this function)

async function sendActionToClient(ws, plan, languageCode = 'en-US') {
    // Ensure WebSocket is still open before trying to send
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.log("WebSocket not open, cannot send action.");
        return;
    }

    console.log(`Sending action for language: ${languageCode}`, plan);

    // --- 1. Send AR Data (Highlighting) ---
    // Check if valid coordinates exist in the plan
    if (plan.ar_target_coords && Array.isArray(plan.ar_target_coords) && plan.ar_target_coords.length === 4) {
        const arData = {
            action: 'draw_box',
            // Use color from plan if provided, otherwise default to red
            color: plan.ar_color || 'red',
            coords: plan.ar_target_coords
        };
        console.log("Sending AR Data:", arData);
        ws.send(JSON.stringify(arData));
    } else {
        // Optionally clear previous highlights if no new target
        // ws.send(JSON.stringify({ action: 'clear_boxes' }));
        console.log("No valid AR coordinates found in plan for this step.");
    }

    // --- 2. Send TTS Audio ---
    // Check if there is text to speak
    if (plan.guide_text) {
        try {
            console.log(`Requesting TTS for [${languageCode}]: "${plan.guide_text}"`);
            // Construct the TTS request
            const request = {
                input: { text: plan.guide_text },
                // Set voice based on the languageCode passed to this function
                voice: { languageCode: languageCode, ssmlGender: 'NEUTRAL' }, // Or choose a specific voice name
                // MP3 is widely supported in browsers
                audioConfig: { audioEncoding: 'MP3' },
            };

            // Perform the text-to-speech request
            const [response] = await ttsClient.synthesizeSpeech(request);

            // Convert the audio content to a Base64 string for easy sending via JSON
            const audioBase64 = response.audioContent.toString('base64');

            // Prepare the message for the client
            const audioData = {
                type: 'audio_playback', // Client looks for this type
                data: audioBase64 // The base64 encoded audio
            };

            console.log(`Sending TTS audio (${audioBase64.length} chars base64)`);
            ws.send(JSON.stringify(audioData));

        } catch (error) {
            console.error("Error generating or sending TTS:", error);
            // Send a fallback status message to the client if TTS fails
            ws.send(JSON.stringify({
                type: 'status',
                message: "Error generating audio guidance. Please follow on-screen highlights."
            }));
        }
    } else {
        console.log("No guide text found in plan for this step.");
    }
}

server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);

    // --- Keep the Test Call ---
   
});