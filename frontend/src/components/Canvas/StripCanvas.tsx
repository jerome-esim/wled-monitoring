import React, { useRef, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';

export const StripCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { strips, activeShaderId, shaders, matrixData, layers } = useAppStore();

  useEffect(() => {
    console.log('[StripCanvas] Render triggered:', {
      stripsCount: strips.length,
      activeShaderId,
      matrixDataLength: matrixData?.length || 0,
      layersCount: layers.length,
      hasContent: activeShaderId || (layers && layers.length > 0)
    });

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (strips.length === 0) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No strips configured', canvas.width / 2, canvas.height / 2);
      return;
    }

    const stripCount = strips.length;
    const ledCount = strips[0]?.ledCount || 250;

    // Calculate dimensions for matrix display
    const padding = 20;
    const matrixWidth = canvas.width - padding * 2;
    const matrixHeight = canvas.height - padding * 2;

    const stripWidth = matrixWidth / stripCount;
    const ledHeight = matrixHeight / ledCount;

    // Draw the active shader name
    const activeShader = activeShaderId ? shaders.find((s) => s.id === activeShaderId) : null;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      activeShader ? `Active: ${activeShader.name}` : 'No active shader',
      padding,
      15
    );

    // Draw matrix grid
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;

    // Draw vertical lines (strip separators)
    for (let i = 0; i <= stripCount; i++) {
      const x = padding + i * stripWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + matrixHeight);
      ctx.stroke();
    }

    // Draw strip labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < stripCount; i++) {
      const x = padding + i * stripWidth + stripWidth / 2;
      ctx.fillText(`S${i + 1}`, x, padding - 5);
    }

    // Draw the LED matrix if we have data
    // Check if we have matrixData AND (activeShader OR layers)
    const hasContent = activeShader || (layers && layers.length > 0);
    if (matrixData && hasContent) {
      // Matrix data format: [strip0_led0_R, strip0_led0_G, strip0_led0_B, ...]
      // Organized as rows (each row is a horizontal line across all strips)

      for (let led = 0; led < ledCount; led++) {
        for (let strip = 0; strip < stripCount; strip++) {
          // Calculate pixel index in the matrix data
          // Matrix is stored row-major: each row contains all strips for that LED position
          const pixelIndex = (led * stripCount + strip) * 3;

          const r = matrixData[pixelIndex];
          const g = matrixData[pixelIndex + 1];
          const b = matrixData[pixelIndex + 2];

          // Draw the LED pixel
          const x = padding + strip * stripWidth;
          const y = padding + led * ledHeight;

          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(x, y, stripWidth, ledHeight);
        }
      }
    } else {
      // Draw placeholder grid
      ctx.fillStyle = '#4b5563';
      for (let i = 0; i < stripCount; i++) {
        const x = padding + i * stripWidth;
        ctx.fillRect(x, padding, stripWidth, matrixHeight);
      }

      // Message
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        'Select a shader and press Play to see the preview',
        canvas.width / 2,
        canvas.height / 2
      );
    }

  }, [strips, activeShaderId, shaders, matrixData, layers]);

  return (
    <div className="h-full bg-gray-800 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">LED Matrix - Live Preview</h2>
        <p className="text-sm text-gray-400 mt-1">
          {strips.length} strip{strips.length !== 1 ? 's' : ''} × {strips[0]?.ledCount || 0} LEDs
          {' • '}
          {strips.length * (strips[0]?.ledCount || 0)} total LEDs
        </p>
      </div>
      <div className="p-4">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="border border-gray-700 rounded"
        />
      </div>
    </div>
  );
};
