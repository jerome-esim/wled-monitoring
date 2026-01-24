import { useEffect, useRef, useState } from 'react';

interface PreviewProps {
  frameData: { data: string; width: number; height: number } | null;
  fps: number;
}

export function Preview({ frameData, fps }: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const STRIP_WIDTH = 20; // Pixels per strip (width multiplier)
  const [canvasSize, setCanvasSize] = useState({ width: 260, height: 250 }); // Default: 13 strips × 250 LEDs

  useEffect(() => {
    if (!frameData || !canvasRef.current) {
      console.log('Preview: No frameData or canvas ref', { frameData: !!frameData, canvas: !!canvasRef.current });
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      console.log('Preview: Rendering frame', {
        width: frameData.width,
        height: frameData.height,
        dataLength: frameData.data.length
      });

      // Decode base64 RGB data
      const binaryString = atob(frameData.data);
      const len = binaryString.length;
      const rgbBytes = new Uint8ClampedArray(len);
      for (let i = 0; i < len; i++) {
        rgbBytes[i] = binaryString.charCodeAt(i);
      }

      console.log('Preview: Decoded', {
        expectedBytes: frameData.width * frameData.height * 3,
        actualBytes: len,
        firstPixel: [rgbBytes[0], rgbBytes[1], rgbBytes[2]]
      });

      const stripCount = frameData.width;   // Number of strips (e.g., 13, 20, etc.)
      const ledCount = frameData.height;     // LEDs per strip (e.g., 250)

      // Update canvas size state for display
      const newWidth = stripCount * STRIP_WIDTH;
      const newHeight = ledCount;
      setCanvasSize({ width: newWidth, height: newHeight });

      // Set canvas size with wider strips
      canvas.width = newWidth;
      canvas.height = newHeight;

      // Draw each LED as a rectangle
      for (let strip = 0; strip < stripCount; strip++) {
        for (let led = 0; led < ledCount; led++) {
          // Calculate pixel index in the RGB data
          const pixelIndex = (strip * ledCount + led) * 3;

          const r = rgbBytes[pixelIndex];
          const g = rgbBytes[pixelIndex + 1];
          const b = rgbBytes[pixelIndex + 2];

          // Draw the LED as a rectangle
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(strip * STRIP_WIDTH, led, STRIP_WIDTH, 1);
        }
      }

      console.log('Preview: Frame rendered successfully');
    } catch (error) {
      console.error('Failed to render frame:', error);
    }
  }, [frameData]);

  return (
    <div className="preview-container">
      <div className="preview-header">
        <h2>Preview</h2>
        <div className="fps-counter">{fps} FPS</div>
      </div>
      <div className="preview-canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="preview-canvas"
          width={canvasSize.width}
          height={canvasSize.height}
        />
      </div>
    </div>
  );
}
