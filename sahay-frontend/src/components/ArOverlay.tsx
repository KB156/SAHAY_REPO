// src/components/ArOverlay.tsx
import React from 'react';

export interface ArElement {
  id: number; // Add an ID for stable removal
  coords: [number, number, number, number]; // [x1, y1, x2, y2]
  color?: string;
}

interface ArOverlayProps {
  elements: ArElement[];
}

function ArOverlay({ elements }: ArOverlayProps) {
  return (
    <div style={{ position: 'fixed', /* Use fixed to overlay whole screen */ top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 10000 }}>
      {elements.map((el) => (
        <div
          key={el.id}
          style={{
            position: 'absolute',
            border: `3px solid ${el.color || 'red'}`,
            left: `${el.coords[0]}px`,
            top: `${el.coords[1]}px`,
            width: `${el.coords[2] - el.coords[0]}px`,
            height: `${el.coords[3] - el.coords[1]}px`,
            boxSizing: 'border-box', // Ensure border is included in size
          }}
        />
      ))}
    </div>
  );
}
export default ArOverlay;