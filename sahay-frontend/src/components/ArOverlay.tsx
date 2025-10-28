// src/components/ArOverlay.tsx
// (Create this new file)

import React, { useState, useLayoutEffect } from 'react';

// --- 1. DEFINE THE TYPE (with referenceSize) ---
export type ArElement = {
  id: number;
  coords: [number, number, number, number]; // [x1, y1, x2, y2] from reference
  color: string;
  referenceSize: { width: number; height: number }; // Reference dimensions
};

type ArOverlayProps = {
  elements: ArElement[];
  // --- 2. ACCEPT THE videoRef ---
  videoRef: React.RefObject<HTMLVideoElement|null>;
};

// --- 3. SCALED ELEMENT COMPONENT ---
// This component will manage its own scaled position
const ScaledArElement: React.FC<{ 
    element: ArElement; 
    videoRect: DOMRect | null // The video's current bounding box
}> = ({ element, videoRect }) => {
  
  // Don't render if video rect isn't available or has no size
  if (!videoRect || videoRect.width === 0 || videoRect.height === 0) {
    return null; 
  }

  const { coords, color, referenceSize } = element;

  // --- 4. CALCULATE SCALING (Accounting for 'object-fit: contain') ---
  const refAspectRatio = referenceSize.width / referenceSize.height;
  const videoAspectRatio = videoRect.width / videoRect.height;

  let scale: number;
  let offsetX = 0;
  let offsetY = 0;

  if (videoAspectRatio > refAspectRatio) {
    // Letterboxed (video is wider than reference, limited by height)
    scale = videoRect.height / referenceSize.height;
    const scaledVideoWidth = referenceSize.width * scale;
    offsetX = (videoRect.width - scaledVideoWidth) / 2; // Center horizontally
  } else {
    // Pillarboxed (video is taller than reference, limited by width)
    scale = videoRect.width / referenceSize.width;
    const scaledVideoHeight = referenceSize.height * scale;
    offsetY = (videoRect.height - scaledVideoHeight) / 2; // Center vertically
  }

  // Apply scaling and offset to coordinates
  const x1 = coords[0] * scale + offsetX;
  const y1 = coords[1] * scale + offsetY;
  const x2 = coords[2] * scale + offsetX;
  const y2 = coords[3] * scale + offsetY;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${x1}px`,
    top: `${y1}px`,
    width: `${x2 - x1}px`,
    height: `${y2 - y1}px`,
    border: `3px solid ${color}`,
    boxSizing: 'border-box',
    pointerEvents: 'none', // Allow clicks to pass through
    zIndex: 10,
  };

  return <div style={style} />;
};

// --- 5. MAIN OVERLAY COMPONENT ---
const ArOverlay: React.FC<ArOverlayProps> = ({ elements, videoRef }) => {
  const [videoRect, setVideoRect] = useState<DOMRect | null>(null);
  
  // We need to update the rect whenever the window resizes or video loads
  useLayoutEffect(() => {
    const updateRect = () => {
      if (videoRef.current) {
        setVideoRect(videoRef.current.getBoundingClientRect());
      }
    };
    
    updateRect(); // Initial check
    
    // Add listeners
    const videoElement = videoRef.current;
    videoElement?.addEventListener('play', updateRect);
    videoElement?.addEventListener('loadedmetadata', updateRect);
    window.addEventListener('resize', updateRect);
    
    // Cleanup
    return () => {
      videoElement?.removeEventListener('play', updateRect);
      videoElement?.removeEventListener('loadedmetadata', updateRect);
      window.removeEventListener('resize', updateRect);
    };
  }, [videoRef]); // Rerun if videoRef changes

  return (
    <div
      className="ar-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        // Match the video element's dimensions
        width: '100%',
        height: '100%',
        pointerEvents: 'none', // Make overlay non-interactive
      }}
    >
      {/* Map over elements and render scaled boxes */}
      {elements.map((el) => (
        <ScaledArElement key={el.id} element={el} videoRect={videoRect} />
      ))}
    </div>
  );
};

export default ArOverlay;