// server.js
require('dotenv').config();
console.log("Service Account Path from .env:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');
const { VertexAI } = require('@google-cloud/vertexai');
const textToSpeech = require('@google-cloud/text-to-speech');
const vision = require('@google-cloud/vision');
const speech = require('@google-cloud/speech');
const crypto = require('crypto');
const sharp = require('sharp'); // For image resizing

// --- Initialization ---
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3000;

const vertex_ai = new VertexAI({
    project: process.env.GOOGLE_CLOUD_PROJECT_ID,
    location: process.env.GOOGLE_CLOUD_LOCATION,
});
const model = 'gemini-2.5-flash';
const generativeModel = vertex_ai.preview.getGenerativeModel({
    model: model,
    generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.2,
        topP: 0.8,
        topK: 40,
    },
    safetySettings: [], // Disable safety filters
});

const ttsClient = new textToSpeech.TextToSpeechClient();
const visionClient = new vision.ImageAnnotatorClient();
const speechClient = new speech.SpeechClient();
const stateStore = {};

app.use(cors());
app.use(express.static(path.join(__dirname, '../sahay-frontend/dist')));
// --- End Initialization ---


wss.on('connection', (ws) => {
    const connectionId = crypto.randomUUID();
    console.log(`Client ${connectionId} connected via WebSocket`);

    // --- Full State Initialization ---
    stateStore[connectionId] = {
        language: 'en-US',
        sttStream: null,
        sttStreamActive: false,
        lastTranscript: null,
        lastOcrData: null,
        lastSnapshotDims: null, // Will be { width, height }
        isProcessing: false   // Prevents duplicate AI calls
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

        const requestConfig = {
            config: {
                encoding: 'WEBM_OPUS',
                sampleRateHertz: 48000,
                languageCode: sessionState.language,
                audioChannelCount: 1,
                enableAutomaticPunctuation: true,
                model: 'latest_long',
            },
            interimResults: false,
        };

        const recognizeStream = speechClient.streamingRecognize(requestConfig)
            .on('error', (error) => {
                console.error(`[${connectionId}] STT Error:`, error);
                const sessionState = stateStore[connectionId];
                if (sessionState) {
                    const shouldRestart = (error.code === 3 || error.code === 11);
                    sessionState.sttStreamActive = false;
                    sessionState.sttStream = null;
                    if (shouldRestart) {
                        console.log(`[${connectionId}] Attempting to restart STT stream...`);
                        setTimeout(() => {
                            if (stateStore[connectionId]) setupSttStream();
                        }, 500);
                    } else {
                        ws.send(JSON.stringify({ type: 'status', message: `Speech recognition error.` }));
                    }
                }
            })
            .on('data', async (data) => {
                const sessionState = stateStore[connectionId];
                if (!sessionState) return;

                if (sessionState.isProcessing) {
                    console.log(`[${connectionId}] Already processing, ignoring new transcript.`);
                    return;
                }

                if (data.results[0] && data.results[0].isFinal) {
                    const transcript = data.results[0].alternatives[0].transcript.trim();
                    if (transcript.length === 0) {
                        console.log(`[${connectionId}] Ignoring empty transcript.`);
                        return;
                    }
                    
                    console.log(`[${connectionId}] *** TRANSCRIPTION: "${transcript}" ***`);
                    
                    sessionState.lastTranscript = transcript;
                    ws.send(JSON.stringify({ 
                        type: 'status', 
                        message: `I heard: "${transcript}". Analyzing...` 
                    }));

                    if (!sessionState.lastOcrData) {
                        console.log(`[${connectionId}] No OCR data. Asking user to analyze screen.`);
                        ws.send(JSON.stringify({ 
                            type: 'status', 
                            message: 'Please click "Analyze Screen" first so I can see what you see.' 
                        }));
                        return;
                    }

                    console.log(`[${connectionId}] Have transcript and OCR. Calling AI...`);
                    
                    sessionState.isProcessing = true;
                    
                    const plan = await getGuidanceStep_OneShot(sessionState);

                    if (plan && plan.guide_text) {
                        
                        // --- !! PADDING LOGIC !! ---
                        const targetText = plan.ar_target_text || "";
                        if (plan.ar_target_coords && (targetText.toLowerCase().includes("password") || targetText.toLowerCase().includes("username"))) {
                            console.log(`[${connectionId}] AI targeted a form label. Expanding BBox to include input field.`);
                            const [x1, y1, x2, y2] = plan.ar_target_coords;
                            const boxWidth = x2 - x1;
                            const boxHeight = y2 - y1;
                            
                            const horizontalPadding = boxWidth * 1.5 + 20; 
                            const verticalPadding = boxHeight * 0.5; 

                            plan.ar_target_coords = [
                                Math.max(0, x1 - 5),
                                Math.max(0, y1 - verticalPadding),
                                x2 + horizontalPadding,
                                y2 + verticalPadding
                            ];
                            console.log(`[${connectionId}] Original BBox: [${x1},${y1},${x2},${y2}]`);
                            console.log(`[${connectionId}] New Expanded BBox:`, plan.ar_target_coords);
                        }
                        // --- !! END PADDING LOGIC !! ---

                        await sendActionToClient(ws, plan, sessionState); 
                        
                        sessionState.lastTranscript = null;
                        sessionState.lastOcrData = null;
                    } else {
                        console.log(`[${connectionId}] Failed to get valid plan from Gemini.`);
                        ws.send(JSON.stringify({ 
                            type: 'status', 
                            message: 'Sorry, I couldn\'t process that request.' 
                        }));
                    }
                    
                    sessionState.isProcessing = false;
                }
            });

        sessionState.sttStream = recognizeStream;
        sessionState.sttStreamActive = true;
        console.log(`[${connectionId}] STT stream created and active.`);
        ws.send(JSON.stringify({ 
            type: 'status', 
            message: 'Welcome! Click "Analyze Screen", then describe your issue.' 
        }));
    }; // End setupSttStream

    setupSttStream();

    // --- WebSocket Message Handler ---
    ws.on('message', async (message) => {
        const sessionState = stateStore[connectionId];
        if (!sessionState) return;

        let isAudio = false;
        let parsedMessage = null;

        try {
            const messageString = message.toString();
            if (messageString.startsWith('{') && messageString.endsWith('}')) {
                parsedMessage = JSON.parse(messageString);
            } else if (message instanceof Buffer || message instanceof ArrayBuffer) {
                isAudio = true;
            }
        } catch (e) {
            if (message instanceof Buffer || message instanceof ArrayBuffer) isAudio = true;
        }

        // Process Audio
        if (isAudio) {
            const audioBuffer = (message instanceof Buffer) ? message : Buffer.from(message);
            if (sessionState.sttStream && sessionState.sttStreamActive) {
                try {
                    sessionState.sttStream.write(audioBuffer);
                } catch (sttError) {
                    console.error(`[${connectionId}] Error writing to STT stream:`, sttError);
                    sessionState.sttStreamActive = false;
                }
            } else if (!sessionState.sttStreamActive && sessionState.sttStream === null) {
                console.log(`[${connectionId}] STT stream inactive, restarting.`);
                setupSttStream();
            }
        }
        // Process JSON
        else if (parsedMessage) { 
            
            if (parsedMessage.type === 'screen_snapshot' && parsedMessage.imageData) {
                 console.log(`[${connectionId}] Received screen snapshot.`);
                 
                 const ocrResults = await getOcrResults(connectionId, parsedMessage.imageData, sessionState); 

                 if (ocrResults !== null) {
                     sessionState.lastOcrData = ocrResults;
                     console.log(`[${connectionId}] Stored ${ocrResults.length} total screen elements.`);

                     if (sessionState.lastTranscript && !sessionState.isProcessing) {
                        sessionState.isProcessing = true; 
                        console.log(`[${connectionId}] Have pending transcript. Calling AI...`);
                        
                        const plan = await getGuidanceStep_OneShot(sessionState);
                        if (plan && plan.guide_text) {
                            
                            // --- !! PADDING LOGIC (Copied) !! ---
                            const targetText = plan.ar_target_text || "";
                            if (plan.ar_target_coords && (targetText.toLowerCase().includes("password") || targetText.toLowerCase().includes("username"))) {
                                console.log(`[${connectionId}] AI targeted a form label. Expanding BBox to include input field.`);
                                const [x1, y1, x2, y2] = plan.ar_target_coords;
                                const boxWidth = x2 - x1;
                                const boxHeight = y2 - y1;

                                const horizontalPadding = boxWidth * 1.5 + 20;
                                const verticalPadding = boxHeight * 0.5; 

                                plan.ar_target_coords = [
                                    Math.max(0, x1 - 5),
                                    Math.max(0, y1 - verticalPadding),
                                    x2 + horizontalPadding,
                                    y2 + verticalPadding
                                ];
                                console.log(`[${connectionId}] Original BBox: [${x1},${y1},${x2},${y2}]`);
                                console.log(`[${connectionId}] New Expanded BBox:`, plan.ar_target_coords);
                            }
                            // --- !! END PADDING LOGIC !! ---

                            await sendActionToClient(ws, plan, sessionState); 
                        }
                        sessionState.lastTranscript = null;
                        sessionState.lastOcrData = null;
                        
                        sessionState.isProcessing = false; 
                     
                     } else if (sessionState.isProcessing) {
                         console.log(`[${connectionId}] OCR data stored, but AI is already processing.`);
                     
                     } else {
                        console.log(`[${connectionId}] OCR/Object data stored. Waiting for user to speak.`);
                        ws.send(JSON.stringify({ 
                            type: 'status', 
                            message: 'Screen analyzed. Please describe your problem.' 
                        }));
                     }
                 } else {
                     ws.send(JSON.stringify({ type: 'status', message: 'Error processing screen image.' }));
                 }
            }
            else {
                console.log(`[${connectionId}] Received unknown JSON type:`, parsedMessage.type);
            }
        }
    }); // End ws.on('message')

    ws.on('close', () => {
        console.log(`Client ${connectionId} disconnected`);
        const sessionState = stateStore[connectionId];
        if (sessionState && sessionState.sttStream) {
            sessionState.sttStream.destroy();
        }
        delete stateStore[connectionId];
    });

    ws.on('error', (error) => {
        console.error(`[${connectionId}] WebSocket Error:`, error);
        const sessionState = stateStore[connectionId];
        if (sessionState && sessionState.sttStream) {
            sessionState.sttStream.destroy();
        }
        delete stateStore[connectionId];
    });

}); // End wss.on('connection')


// --- Get OCR / Objects Function ---
async function getOcrResults(connectionId, base64ImageData, sessionState) {
    console.log(`[${connectionId}] Requesting OCR and Object Detection...`);
    
    let imgWidth, imgHeight, processedBase64;

    try {
        const inputBuffer = Buffer.from(base64ImageData, 'base64');
        console.log(`[${connectionId}] Resizing image...`);
        const { data: resizedBuffer, info: resizedInfo } = await sharp(inputBuffer)
            .resize({ width: 1280 }) // Resize to a standard 1280px width
            .toBuffer({ resolveWithObject: true });
        
        imgWidth = resizedInfo.width;
        imgHeight = resizedInfo.height;
        processedBase64 = resizedBuffer.toString('base64');

        sessionState.lastSnapshotDims = { width: imgWidth, height: imgHeight };
        console.log(`[${connectionId}] Image resized to ${imgWidth}x${imgHeight}.`);

    } catch (sharpError) {
        console.error(`[${connectionId}] Image resizing error:`, sharpError);
        return null;
    }

    try {
        const request = {
            image: { content: processedBase64 },
            features: [
                { type: 'TEXT_DETECTION' },
                { type: 'OBJECT_LOCALIZATION' }
            ],
            imageContext: { languageHints: ["en", "hi"] },
        };
        const [result] = await visionClient.annotateImage(request);
        
        const allScreenElements = [];

        const textDetections = result.textAnnotations;
        if (textDetections && textDetections.length > 0) {
            const ocrData = textDetections.slice(1).map(text => {
                const xValues = text.boundingPoly.vertices.map(v => v.x ?? 0);
                const yValues = text.boundingPoly.vertices.map(v => v.y ?? 0);
                return {
                    type: 'text',
                    text: text.description,
                    bbox: [Math.min(...xValues), Math.min(...yValues), Math.max(...xValues), Math.max(...yValues)] 
                };
            });
            allScreenElements.push(...ocrData);
            console.log(`[${connectionId}] Extracted ${ocrData.length} text elements.`);
        } else {
            console.log(`[${connectionId}] OCR: No text detected.`);
        }

        const objectDetections = result.localizedObjectAnnotations;
        if (objectDetections && objectDetections.length > 0) {
            const objectData = objectDetections.map(obj => {
                const xValues = obj.boundingPoly.normalizedVertices.map(v => (v.x ?? 0) * imgWidth);
                const yValues = obj.boundingPoly.normalizedVertices.map(v => (v.y ?? 0) * imgHeight);
                
                return {
                    type: 'object',
                    name: obj.name,
                    score: obj.score,
                    bbox: [Math.min(...xValues), Math.min(...yValues), Math.max(...xValues), Math.max(...yValues)]
                };
            });
            allScreenElements.push(...objectData);
            console.log(`[${connectionId}] Extracted ${objectData.length} object elements (e.g., ${objectData[0]?.name}).`);
        } else {
            console.log(`[${connectionId}] No objects detected.`);
        }

        return allScreenElements;

    } catch (error) {
        console.error(`[${connectionId}] Vision API Error:`, error);
        return null;
    }
}


// --- Get AI Guidance Function ---
async function getGuidanceStep_OneShot(sessionState) {
    const connectionId = Object.keys(stateStore).find(key => stateStore[key] === sessionState);
    if (!connectionId) console.error("Could not find connectionId for sessionState!");
    
    console.log(`[${connectionId}] Calling getGuidanceStep_OneShot...`);

    const ocrStringForPrompt = sessionState.lastOcrData && sessionState.lastOcrData.length > 0
        ? JSON.stringify(sessionState.lastOcrData)
        : "[]";

    const transcriptString = sessionState.lastTranscript ? `"${sessionState.lastTranscript}"` : "User did not speak, just sent screen analysis.";
    
    const prompt = `
SYSTEM_ROLE: You are SAHAY, an expert AI assistant.
USER_LANGUAGE: "en-US"
INSTRUCTION: Analyze the user's speech and screen to provide a single, clear piece of guidance.

--- CONTEXT ---
USER_TRANSCRIPT: ${transcriptString}

SCREEN_ELEMENTS: ${ocrStringForPrompt}
This is a JSON array of all elements on the screen.
- {"type": "text", "text": "...", "bbox": [x1, y1, x2, y2]}
- {"type": "object", "name": "Input field", "bbox": [x1, y1, x2, y2]}
--- END CONTEXT ---

TASK: Your goal is to identify the user's problem and guide them to the *correct UI element*.
1.  **Identify the Problem:** Use the USER_TRANSCRIPT and any "text" elements that show an error (e.g., "Error: Password field cannot be empty.").
2.  **Find the Target Label:** Find the "text" element that relates to the problem (e.g., the text "Password:").
3.  **Find the Target UI Element:** Find the "object" (like "Input field" or "Button") that is *spatially closest* to that Target Label.
4.  **!! FALLBACK !!:** If you cannot find a relevant "object" (e.g., the list has "No objects detected"), you MUST use the "bbox" of the **Target Label** ("text" element) as the "ar_target_coords".
5.  **Formulate Plan:** Return the coordinates ("bbox") of your chosen target.

Respond ONLY in this JSON format (no markdown, no extra text):
{
    "diagnosis": "Brief explanation of the problem (e.g., 'The password field is empty.')",
    "guide_text": "Clear instruction for the user's next action (e.g., 'Please click in the password field to type.')",
    "ar_target_text": "The 'name' or 'text' of the target you are highlighting (e.g., 'Password' or 'Input field')",
    "ar_target_coords": [160, 150, 360, 170],
    "ar_color": "red"
}
`;

    try {
        console.log(`[${connectionId}] Sending updated prompt (with objects) to Vertex AI...`);
        const req = {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        };
        const streamingResp = await generativeModel.generateContentStream(req);
        
        let aggregatedResponseText = '';
        for await (const item of streamingResp.stream) {
            if (item.candidates?.[0]?.content?.parts?.[0]?.text) {
                aggregatedResponseText += item.candidates[0].content.parts[0].text;
            }
        }

        console.log(`[${connectionId}] Raw Vertex AI Response:`, aggregatedResponseText);
        
        const jsonText = aggregatedResponseText
            .replace(/^```json\s*/, '')
            .replace(/\s*```$/, '')
            .trim();
        
        if (!jsonText) {
            throw new Error("Received empty response from Vertex AI (likely safety-blocked).");
        }

        const parsedPlan = JSON.parse(jsonText);
        
        // We no longer pad here, we pad in the calling functions
        if (!parsedPlan.ar_target_coords || !Array.isArray(parsedPlan.ar_target_coords) || parsedPlan.ar_target_coords.length !== 4) {
             console.warn(`[${connectionId}] AI returned invalid or null coordinates. Clearing them.`);
             parsedPlan.ar_target_coords = null;
        }
        
        console.log(`[${connectionId}] Parsed one-shot plan:`, parsedPlan);
        return parsedPlan;

    } catch (error) {
        console.error(`[${connectionId}] Error calling Vertex AI API:`, error);
        return {
            diagnosis: "AI Error",
            guide_text: "Sorry, I ran into an error. Please try analyzing the screen again.",
            ar_target_text: null,
            ar_target_coords: null,
            ar_color: "red",
        };
    }
}


// --- Send Action to Client Function ---
async function sendActionToClient(ws, plan, sessionState) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.log("WebSocket not open, cannot send action.");
        return;
    }
    
    const languageCode = sessionState.language || 'en-US';
    const referenceSize = sessionState.lastSnapshotDims || { width: 1280, height: 720 };
    if (!sessionState.lastSnapshotDims) {
        console.warn("Using fallback 1280x720 reference size!");
    }

    console.log(`Sending action for language: ${languageCode}`, plan);
    console.log(`Using reference size: ${referenceSize.width}x${referenceSize.height}`);

    if (plan.ar_target_coords && Array.isArray(plan.ar_target_coords) && plan.ar_target_coords.length === 4) {
        const arData = {
            action: 'draw_box',
            color: plan.ar_color || 'red',
            coords: plan.ar_target_coords,
            referenceSize: referenceSize
        };
        console.log("Sending AR Data:", arData);
        ws.send(JSON.stringify(arData));
    } else {
        console.log("No valid AR coordinates found in plan.");
    }

    if (plan.guide_text) {
        try {
            console.log(`Requesting TTS for [${languageCode}]: "${plan.guide_text}"`);
            const request = {
                input: { text: plan.guide_text },
                voice: { languageCode: languageCode, ssmlGender: 'NEUTRAL' },
                audioConfig: { audioEncoding: 'MP3' },
            };
            const [response] = await ttsClient.synthesizeSpeech(request);
            const audioBase64 = response.audioContent.toString('base64');
            const audioData = {
                type: 'audio_playback',
                data: audioBase64
            };
            console.log(`Sending TTS audio (${audioBase64.length} chars base64)`);
            ws.send(JSON.stringify(audioData));
        } catch (error) {
            console.error("Error generating or sending TTS:", error);
        }
    }
}

// --- Start Server ---
server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});