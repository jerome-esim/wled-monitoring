import { useEffect, useRef } from 'react';

interface PreviewProps {
  frameData: { data: string; width: number; height: number } | null;
  fps: number;
}

export function Preview({ frameData, fps }: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!frameData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Decode base64 image data
    const img = new Image();
    img.onload = () => {
      canvas.width = frameData.width;
      canvas.height = frameData.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = `data:image/png;base64,${frameData.data}`;
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
