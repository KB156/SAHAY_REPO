// src/components/ArOverlay.tsx
import React from 'react';

// Define the shape of an AR element object
export interface ArElement {
  id: number; // Unique ID for React key and removal
  coords: [number, number, number, number]; // Explicitly tuple [x1, y1, x2, y2]
  color?: string; // Optional color string
}

// Define props interface using the element type
interface ArOverlayProps {
  elements: ArElement[]; // Array of ArElement objects
}

function ArOverlay({ elements }: ArOverlayProps) {
  return (
    // --- THIS DIV MUST BE ABSOLUTELY POSITIONED ---
    <div style={{
        position: 'absolute', // Position relative to the nearest positioned ancestor (the container in App.tsx)
        top: 0,               // Align to the top of the container
        left: 0,              // Align to the left of the container
        width: '100%',        // Cover the full width of the container
        height: '100%',       // Cover the full height of the container
        pointerEvents: 'none',// Allow clicks to pass through to the video/page below
        zIndex: 10000         // Ensure it's visually on top
      }}
      className="ar-overlay-wrapper" // Optional: for CSS file styling
    >
      {/* Map over the elements to render individual highlight boxes */}
      {elements.map((el) => (
        <div
          key={el.id} // Use the unique ID for the key
          className="highlight-box" // Optional: for CSS file styling
          style={{
            position: 'absolute', // Position this box relative to the overlay wrapper div
            border: `3px solid ${el.color || 'red'}`, // Use provided color or default red
            left: `${el.coords[0]}px`, // Set left position from coords[0] (x1)
            top: `${el.coords[1]}px`,  // Set top position from coords[1] (y1)
            width: `${el.coords[2] - el.coords[0]}px`, // Calculate width (x2 - x1)
            height: `${el.coords[3] - el.coords[1]}px`, // Calculate height (y2 - y1)
            boxSizing: 'border-box', // Ensure border width is included in size calculation
          }}
        />
      ))}
    </div>
     // --- END ABSOLUTE POSITIONING ---
  );
}

export default ArOverlay;