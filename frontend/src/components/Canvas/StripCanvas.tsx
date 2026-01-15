import React, { useRef, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import type { StripConfig } from '@shared/types';

interface StripCanvasProps {
  onStripClick?: (strip: StripConfig) => void;
}

export const StripCanvas: React.FC<StripCanvasProps> = ({ onStripClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { strips } = useAppStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw strips
    strips.forEach((strip) => {
      const x = strip.position.x;
      const y = strip.position.y;
      const width = strip.orientation === 'horizontal' ? strip.ledCount * 2 : 20;
      const height = strip.orientation === 'vertical' ? strip.ledCount * 2 : 20;

      // Draw strip background
      ctx.fillStyle = '#4b5563';
      ctx.fillRect(x, y, width, height);

      // Draw strip border
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      // Draw strip label
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.fillText(strip.name, x + 5, y - 5);

      // Draw LED count
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px sans-serif';
      ctx.fillText(`${strip.ledCount} LEDs`, x + 5, y + height + 15);
    });
  }, [strips]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !onStripClick) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find clicked strip
    for (const strip of strips) {
      const stripX = strip.position.x;
      const stripY = strip.position.y;
      const width = strip.orientation === 'horizontal' ? strip.ledCount * 2 : 20;
      const height = strip.orientation === 'vertical' ? strip.ledCount * 2 : 20;

      if (x >= stripX && x <= stripX + width && y >= stripY && y <= stripY + height) {
        onStripClick(strip);
        break;
      }
    }
  };

  return (
    <div className="h-full bg-gray-800 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">LED Layout</h2>
        <p className="text-sm text-gray-400 mt-1">
          {strips.length} strip{strips.length !== 1 ? 's' : ''} configured
        </p>
      </div>
      <div className="p-4">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          onClick={handleCanvasClick}
          className="border border-gray-700 rounded cursor-pointer"
        />
      </div>
    </div>
  );
};
