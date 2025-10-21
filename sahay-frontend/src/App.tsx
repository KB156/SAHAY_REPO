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

  const handleServerMessage = useCallback((message: any) => {
    try {
      const msg = JSON.parse(message);
      if (msg.action === 'draw_box' && Array.isArray(msg.coords) && msg.coords.length === 4) {
        // Use nextArId to create a unique ID for the new element
        const newElement: ArElementType = {
          id: nextArId.current++,
          coords: msg.coords as [number, number, number, number],
          color: msg.color || 'red'
        };
        console.log("Adding AR element:", newElement);
        setArElements(prev => [...prev, newElement]);

        // Remove this specific element after 5 seconds
        setTimeout(() => {
          setArElements(prev => prev.filter(el => el.id !== newElement.id));
        }, 5000);
      } else if (msg.type === 'status') {
        setStatus(`Server: ${msg.message}`);
      }
      // Add audio playback handling here later
    } catch (e) {
      console.log("Received non-JSON message:", message);
    }
  }, [setStatus]);

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
 useEffect(() => {
    const handleClick = (event: MouseEvent) => {
        // Check if WebSocket is connected before sending
        if (ws.current?.readyState === WebSocket.OPEN) {
            const clickData = {
                type: 'user_click',
                x: event.clientX,
                y: event.clientY,
                timestamp: Date.now()
            };
            ws.current.send(JSON.stringify(clickData));
            console.log('Sent click:', clickData);
        } else {
             console.log('WebSocket not open, click not sent.');
        }
    };

    // Add listener
    document.addEventListener('click', handleClick);

    // Cleanup function
    return () => {
        document.removeEventListener('click', handleClick);
    };
  }, []); // Empty dependency array ensures it's added/removed once// Empty dependency array ensures this runs only once

  return (
    <div className="App">
      <h1>SAHAY Assistant</h1>
      <ControlPanel
        isConnected={isConnected}
        onStart={connectWebSocket}
        onStop={stopSession}
      />
      <p>Status: {status}</p>
      <ArOverlay elements={arElements} />
    </div>
  );
}

export default App;