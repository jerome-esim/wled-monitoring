import { useEffect, useRef } from 'react';

interface PreviewProps {
  frameData: { data: string; width: number; height: number } | null;
  fps: number;
}

export function Preview({ frameData, fps }: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

      // Convert RGB to RGBA for canvas ImageData
      const width = frameData.width;
      const height = frameData.height;
      const rgbaBytes = new Uint8ClampedArray(width * height * 4);

      for (let i = 0; i < width * height; i++) {
        const rgbIndex = i * 3;
        const rgbaIndex = i * 4;
        // Copy RGB values from source to RGBA destination
        rgbaBytes[rgbaIndex + 0] = rgbBytes[rgbIndex + 0]; // R
        rgbaBytes[rgbaIndex + 1] = rgbBytes[rgbIndex + 1]; // G
        rgbaBytes[rgbaIndex + 2] = rgbBytes[rgbIndex + 2]; // B
        rgbaBytes[rgbaIndex + 3] = 255;                    // A (fully opaque)
      }

      // Create ImageData and draw to canvas
      canvas.width = width;
      canvas.height = height;
      const imageData = new ImageData(rgbaBytes, width, height);
      ctx.putImageData(imageData, 0, 0);
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
          width={13}
          height={250}
        />
      </div>
    </div>
  );
}
