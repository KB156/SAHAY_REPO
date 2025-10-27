// src/App.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import ControlPanel from './components/ControlPanel';
import ArOverlay from './components/ArOverlay';
import type { ArElement } from './components/ArOverlay'; // Use "import type"
import type { ArElement as ArElementType } from './components/ArOverlay'; // Use 'import type' and rename to avoid conflict

const WS_URL = `ws://localhost:3000`;

function App() {
  const [status, setStatus] = useState<string>('Idle');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [arElements, setArElements] = useState<ArElementType[]>([]);
  const ws = useRef<WebSocket | null>(null);
  const nextArId = useRef<number>(0); // For unique keys
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const stopSession = useCallback((closeWs = true) => {
    console.log('Stopping session...');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      console.log("MediaRecorder stopped");
    }
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    console.log("Media streams stopped");

    if (closeWs && ws.current?.readyState === WebSocket.OPEN) {
      ws.current.close();
      console.log("WebSocket closed");
    }
    
    mediaRecorderRef.current = null;
    localStreamRef.current = null;
    screenStreamRef.current = null;
    ws.current = null;

    setIsConnected(false);
    setArElements([]);
    setStatus('Idle');
  }, [setIsConnected, setStatus, setArElements]);

  // src/App.tsx (Implement handleServerMessage)
// src/App.tsx (Modify handleServerMessage)
const playAudio = useCallback(async (base64Data: string) => {
    try {
        // Ensure AudioContext is initialized (often requires user interaction first)
        if (!audioContextRef.current) {
            console.log("Initializing AudioContext...");
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            // Resume context if it's suspended (browsers often start it suspended)
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }
        }
        const audioContext = audioContextRef.current;
        if (!audioContext) {
            throw new Error("AudioContext could not be initialized.");
        }

        setStatus('Decoding audio...'); // Update status

        // 1. Decode Base64 to ArrayBuffer
        const binaryString = window.atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const arrayBuffer = bytes.buffer;

        // 2. Decode ArrayBuffer into AudioBuffer
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // 3. Play the AudioBuffer
        setStatus('Playing audio...');
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0); // Play immediately

        source.onended = () => {
            console.log("Audio playback finished.");
            // Set status back to Streaming or Connected after playback
            if (isConnected) { // Check if still connected
               setStatus(mediaRecorderRef.current ? 'Streaming audio and screen...' : 'Connected.');
            }
        };

    } catch (error) {
        console.error("Error playing audio:", error);
        setStatus(`Error playing audio: ${error instanceof Error ? error.message : String(error)}`);
    }
}, [setStatus, isConnected]); // Add isConnected dependency // Add setStatus dependency

const handleServerMessage = useCallback((message: any) => {
    try {
        const msg = JSON.parse(message);

        if (msg.action === 'draw_box' && Array.isArray(msg.coords) && msg.coords.length === 4) {
            const newElement: ArElementType = {
                id: nextArId.current++,
                coords: msg.coords as [number, number, number, number],
                color: msg.color || 'red'
            };
            console.log("Adding AR element:", newElement);
            setArElements(prev => [...prev, newElement]);
            setTimeout(() => {
                setArElements(prev => prev.filter(el => el.id !== newElement.id));
            }, 5000);
        }
        // --- ADD THIS BLOCK ---
        else if (msg.type === 'audio_playback' && typeof msg.data === 'string') {
            console.log("Received audio playback instruction");
            playAudio(msg.data); // Call the playback function
        }
        // --- END OF ADDED BLOCK ---
        else if (msg.type === 'status') {
            setStatus(`Server: ${msg.message}`);
        } else {
            console.log("Received unknown JSON structure:", msg);
        }
    } catch (e) {
        console.log("Received non-JSON message:", message);
    }
}, [setStatus, playAudio]); // Add playAudio dependency
// src/App.tsx (Add this function)


  const startStreaming = useCallback(async () => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      setStatus("Error: WebSocket not connected.");
      return;
    }
    setStatus('Requesting permissions...');
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setStatus('Mic access granted. Requesting screen...');
      
      // FIX: Cast the video constraints object to 'any' to allow 'cursor' property
      screenStreamRef.current = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as any, // <-- THE FIX IS HERE
        audio: false
      });

      setStatus('Screen access granted. Starting audio recorder...');
      console.log("DEBUG: videoRef.current:", videoRef.current);
      console.log("DEBUG: screenStreamRef.current:", screenStreamRef.current);
      if (videoRef.current && screenStreamRef.current) {
          console.log("Setting video source object...");
          videoRef.current.srcObject = screenStreamRef.current;
          videoRef.current.play().catch(e => {
              console.error("Video play error:", e); // Check this error specifically
              setStatus('Screen share active, click video to play if needed.');
          });
          // Add a listener to confirm video is playing
          videoRef.current.onplaying = () => {
              console.log("DEBUG: Video has started playing.");
              setStatus('Displaying screen share...');
          };
          videoRef.current.onerror = (e) => {
              console.error("DEBUG: Video element error:", e);
              setStatus('Error rendering screen share video.');
          }
      } else {
          console.error("Video element ref or screen stream missing.");
          setStatus('Error displaying screen share.');
      }
      if (localStreamRef.current?.getAudioTracks().length > 0) {
        const options = { mimeType: 'audio/webm;codecs=opus' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          console.warn(`${options.mimeType} not supported, trying default`);
        }
        mediaRecorderRef.current = new MediaRecorder(localStreamRef.current, options);
        mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
          if (event.data.size > 0 && ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(event.data);
          }
        };
        mediaRecorderRef.current.start(1000);
        setStatus('Streaming audio and screen...');
      } else {
        setStatus('Streaming screen (no audio input found)...');
      }
      console.log("Screen sharing active.");
    } catch (err) {
      console.error('Error getting media streams:', err);
      setStatus(`Error getting streams: ${err instanceof Error ? err.message : String(err)}`);
      stopSession();
    }
  }, [stopSession, setStatus]);

  const connectWebSocket = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) return;
    ws.current = new WebSocket(WS_URL);
    setStatus('Connecting...');
    ws.current.onopen = () => {
      console.log('WebSocket Connected');
      setIsConnected(true);
      setStatus('Connected. Starting streams...');
      startStreaming();
    };
    ws.current.onmessage = (event: MessageEvent) => {
      handleServerMessage(event.data);
    };
    ws.current.onerror = (event: Event) => {
      console.error('WebSocket Error:', event);
      setStatus('Error connecting.');
      stopSession();
    };
    ws.current.onclose = () => {
      console.log('WebSocket Disconnected');
      if (isConnected) {
        setIsConnected(false);
        setStatus('Disconnected.');
        stopSession(false);
      }
    };
  }, [handleServerMessage, stopSession, isConnected, startStreaming, setIsConnected, setStatus]);

  // FIX: Add the useEffect hook to handle click listeners
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        const clickData = {
          type: 'user_click',
          x: event.clientX,
          y: event.clientY,
          timestamp: Date.now()
        };
        ws.current.send(JSON.stringify(clickData));
        console.log('Sent click:', clickData);
      }
    };
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []); 
  // src/App.tsx (Add this useEffect hook)
 // src/App.tsx (Replace the SECOND useEffect hook for clicks with this)

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      // Check if WebSocket is connected AND videoRef exists
      if (ws.current?.readyState === WebSocket.OPEN && videoRef.current) {

        // Get the bounding rectangle of the video element ON CLICK
        const videoRect = videoRef.current.getBoundingClientRect();

        // Calculate click coordinates relative to the video element's top-left corner
        const relativeX = event.clientX - videoRect.left;
        const relativeY = event.clientY - videoRect.top;

        // --- Check if click is within the video bounds ---
        // (Prevents sending clicks from outside the video area)
        if (relativeX >= 0 && relativeX <= videoRect.width &&
            relativeY >= 0 && relativeY <= videoRect.height)
        {
            // --- Send RELATIVE Coordinates ---
            const clickData = {
              type: 'user_click',
              // Use relative coordinates for verification logic
              x: Math.round(relativeX), // Send relative X
              y: Math.round(relativeY), // Send relative Y
              // Send dimensions for potential scaling later (optional now)
              videoWidth: Math.round(videoRect.width),
              videoHeight: Math.round(videoRect.height),
              timestamp: Date.now()
            };
            ws.current.send(JSON.stringify(clickData));
            console.log('Sent relative click:', clickData);

        } else {
             console.log('Click ignored (outside video bounds).');
        }
        // --- End Check & Send ---

      } else {
        console.log('WebSocket not open or videoRef not set, click not sent.');
      }
    };

    // Add listener to the video container *or* the video element itself
    // Listening on the container might be more robust if video hasn't loaded yet
    const container = document.querySelector('.screen-share-container'); // Use querySelector or add a ref

    if (container) {
         // We listen on the container, but calculate relative to the video
         container.addEventListener('click', handleClick as EventListener);
    } else {
         console.error("Screen share container not found for click listener.");
         // Fallback: listen on the whole document? Might send unwanted clicks.
         // document.addEventListener('click', handleClick);
    }


    // Cleanup function
    return () => {
         if (container) {
              container.removeEventListener('click', handleClick as EventListener);
         }
         // else { document.removeEventListener('click', handleClick); }
    };
  // Rerun if ws.current changes (e.g., reconnects)
  }, [ws.current]); // Dependency: ws.current ensures listener re-attaches if WS reconnects
  // src/App.tsx (Replace the existing return statement with this)

  return (
    <div className="App">
      <h1>SAHAY Assistant</h1>
      <ControlPanel
        isConnected={isConnected}
        onStart={connectWebSocket}
        onStop={stopSession}
      />
      <p>Status: {status}</p>

      {/* --- VIDEO AND OVERLAY CONTAINER --- */}
      <div
        className="screen-share-container"
        style={{
            position: 'relative', // Parent for absolute overlay
            width: '80%',        // Adjust width as needed
            maxWidth: '1200px',  // Optional: Set a max width
            margin: '20px auto', // Center the container
            border: '1px solid #ccc', // Optional border
            backgroundColor: '#f0f0f0', // Background while loading
            aspectRatio: '16 / 9', // Maintain aspect ratio (adjust if needed)
            overflow: 'hidden'    // Hide anything spilling out
         }}
      >
        {/* Video element to display the screen share */}
        <video
          ref={videoRef}
          autoPlay        // Try to autoplay when stream is attached
          playsInline     // Necessary for inline playback on mobile
          // muted        // Usually mute screen share audio unless needed
          style={{
              width: '100%',     // Make video fill the container width
              height: '100%',    // Make video fill the container height
              display: 'block',  // Prevent extra space below video
              objectFit: 'contain' // Scale video down to fit container, maintaining aspect ratio
          }}
        ></video>

        {/* AR Overlay positioned absolutely within this container */}
        <ArOverlay elements={arElements} />
      </div>
      {/* --- END CONTAINER --- */}

    </div>
  );
}

export default App;