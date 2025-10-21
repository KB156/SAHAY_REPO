// src/components/ControlPanel.tsx
import React from 'react';

interface ControlPanelProps {
  isConnected: boolean;
  onStart: () => void;
  onStop: () => void;
}

function ControlPanel({ isConnected, onStart, onStop }: ControlPanelProps) {
  return (
    <div>
      <button onClick={onStart} disabled={isConnected}>Start Session</button>
      <button onClick={onStop} disabled={!isConnected}>Stop Session</button>
    </div>
  );
}
export default ControlPanel;