// src/App.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import ControlPanel from './components/ControlPanel';
import ArOverlay, { type ArElement as ArElementType } from './components/ArOverlay';

const WS_URL = `ws://localhost:3000`;

function App() {
  const [status, setStatus] = useState<string>('Idle');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [arElements, setArElements] = useState<ArElementType[]>([]);
  
  const ws = useRef<WebSocket | null>(null);
  const nextArId = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // containerRef is no longer needed for clicks, but we'll keep it for layout
  const containerRef = useRef<HTMLDivElement | null>(null);

  // --- (stopSession, sendScreenSnapshot, playAudio functions remain unchanged) ---
  const stopSession = useCallback((closeWs = true) => {
    console.log('Stopping session...');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    
    if (closeWs && ws.current?.readyState === WebSocket.OPEN) {
      ws.current.close();
    }
    mediaRecorderRef.current = null;
    localStreamRef.current = null;
    screenStreamRef.current = null;
    ws.current = null;

    setIsConnected(false);
    setArElements([]);
    setStatus('Idle');
  }, [setIsConnected, setStatus, setArElements]);
  
  const sendScreenSnapshot = useCallback(() => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not open, cannot send snapshot.");
      setStatus('Error: Disconnected');
      return;
    }
    const videoElement = videoRef.current; // Get ref
    if (!videoElement || videoElement.readyState < 2 || videoElement.videoWidth === 0) {
       console.warn("Video element not ready or has no dimensions.");
       setStatus('Error: Screen share not ready for snapshot');
       return;
    }

    console.log("Capturing screen snapshot...");
    setStatus('Capturing screen...');
    
    // --- CAPTURE THE DIMENSIONS ---
    const snapWidth = videoElement.videoWidth;
    const snapHeight = videoElement.videoHeight;
    // --- END CAPTURE ---

    const canvas = document.createElement('canvas');
    canvas.width = snapWidth;   // Use captured width
    canvas.height = snapHeight; // Use captured height
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error("Could not get canvas 2D context.");
      setStatus('Error capturing screen.');
      return;
    }

    try {
        ctx.drawImage(videoElement, 0, 0, snapWidth, snapHeight);
        const base64ImageData = canvas.toDataURL('image/jpeg', 0.7);
        const base64Cleaned = base64ImageData.split(',')[1];

        if (base64Cleaned && base64Cleaned.length > 0) {
            const snapshotData = {
                type: 'screen_snapshot',
                imageData: base64Cleaned,
                timestamp: Date.now(),
                // --- ADDED THESE TWO LINES ---
                videoWidth: snapWidth,
                videoHeight: snapHeight
            };
            ws.current.send(JSON.stringify(snapshotData));
            console.log(`Sent screen snapshot (${snapWidth}x${snapHeight}).`);
            setStatus('Snapshot sent. Please describe your problem.');
        } else {
             throw new Error("Canvas toDataURL returned empty data.");
        }
    } catch (error) {
         console.error("Error creating or sending snapshot:", error);
         setStatus('Error sending snapshot.');
    }
  }, [setStatus]);
  const playAudio = useCallback(async (base64Data: string) => {
    try {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }
        }
        const audioContext = audioContextRef.current;
        if (!audioContext) throw new Error("AudioContext failed.");

        setStatus('Decoding audio...');
        const binaryString = window.atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const arrayBuffer = bytes.buffer;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        setStatus('Playing audio...');
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);

        source.onended = () => {
            console.log("Audio playback finished.");
            if (isConnected) {
               setStatus(mediaRecorderRef.current ? 'Streaming...' : 'Connected. Waiting for input.');
            }
        };
    } catch (error) {
        console.error("Error playing audio:", error);
        setStatus(`Error playing audio`);
    }
  }, [setStatus, isConnected]);
  // --- END UNCHANGED FUNCTIONS ---


  // --- MODIFIED handleServerMessage ---
  const handleServerMessage = useCallback((message: any) => {
    try {
        const msg = JSON.parse(message);

        // Draw box (unchanged)
        if (msg.action === 'draw_box' && 
            Array.isArray(msg.coords) && msg.coords.length === 4 &&
            msg.referenceSize
        ) {
            const newElement: ArElementType = {
                id: nextArId.current++,
                coords: msg.coords as [number, number, number, number],
                color: msg.color || 'red',
                referenceSize: msg.referenceSize
            };
            console.log("Adding AR element:", newElement);
            setArElements(prev => [...prev, newElement]);
            setTimeout(() => {
                setArElements(prev => prev.filter(el => el.id !== newElement.id));
            }, 5000); // Highlight for 5 seconds
        }
        // Play audio (unchanged)
        else if (msg.type === 'audio_playback' && typeof msg.data === 'string') {
            console.log("Received audio playback instruction");
            playAudio(msg.data);
        }
        // Status update (unchanged)
        else if (msg.type === 'status') {
            setStatus(`Server: ${msg.message}`);
        }
        // --- 'request_snapshot' HANDLER IS REMOVED ---
        else {
            console.log("Received unknown JSON structure:", msg);
        }
    } catch (e) {
        console.log("Received non-JSON message:", message);
    }
  }, [setStatus, playAudio, setArElements]); // sendScreenSnapshot removed from dependencies


  // --- (startStreaming and connectWebSocket functions remain unchanged) ---
  const startStreaming = useCallback(async () => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      setStatus("Error: WebSocket not connected.");
      return;
    }
    setStatus('Requesting permissions...');
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setStatus('Mic access granted. Requesting screen...');

      screenStreamRef.current = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: "always" } as any,
            audio: false
      });
      setStatus('Screen access granted.');
      
      if (videoRef.current && screenStreamRef.current) {
          videoRef.current.srcObject = screenStreamRef.current;
          videoRef.current.play().catch(e => {
              console.error("Video play error:", e);
          });
      }
      
      if (localStreamRef.current?.getAudioTracks().length > 0) {
        const options = { mimeType: 'audio/webm;codecs=opus' };
        mediaRecorderRef.current = new MediaRecorder(localStreamRef.current, options);
        mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
          if (event.data.size > 0 && ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(event.data);
          }
        };
        mediaRecorderRef.current.start(1000); // Send audio chunks every second
        setStatus('Streaming audio and screen...');
      } else {
        setStatus('Streaming screen (no audio input found)...');
      }
    } catch (err) {
      console.error('Error getting media streams:', err);
      setStatus(`Error getting streams`);
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
  // --- END UNCHANGED FUNCTIONS ---


  // --- CLICK LISTENER useEffect IS REMOVED ---


  // --- MODIFIED RETURN STATEMENT (same as last step) ---
  return (
    <div className="App">
      <h1>SAHAY Assistant</h1>
      
      <div className="controls-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <ControlPanel
          isConnected={isConnected}
          onStart={connectWebSocket}
          onStop={stopSession}
        />

        <button
          className="analyze-button" 
          onClick={sendScreenSnapshot}
          disabled={!isConnected || status.includes('Analyzing...')}
          style={{ marginLeft: '10px', padding: '10px 15px' }} // Inline styles for simplicity
        >
          {status.includes('Analyzing...') ? 'Analyzing...' : 'Analyze Screen'}
        </button>
      </div>

      <p>Status: {status}</p>

      <div
        ref={containerRef} // ref is still here for layout
        className="screen-share-container"
        style={{
            position: 'relative',
            width: '80%',
            maxWidth: '1200px',
            margin: '20px auto',
            border: '1px solid #ccc',
            backgroundColor: '#f0f0f0',
            aspectRatio: '16 / 9',
            overflow: 'hidden' 
         }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted 
          style={{ 
              width: '100%', 
              height: '100%', 
              display: 'block', 
              objectFit: 'contain'
          }}
        ></video>
        
        <ArOverlay elements={arElements} videoRef={videoRef} /> 
      
      </div>
    </div>
  );
}

export default App;