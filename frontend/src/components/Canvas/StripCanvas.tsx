import React, { useRef, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { useSocket } from '../../hooks/useSocket';

export const StripCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { strips, selectedShaderId, shaders, assignments, setAssignment, previewData } = useAppStore();
  const { applyShader } = useSocket();

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

      // Check if strip has a shader assigned
      const assignment = assignments.find((a) => a.stripId === strip.id);
      const assignedShader = assignment
        ? shaders.find((s) => s.id === assignment.shaderId)
        : null;

      // Get preview data if available
      const rgbData = previewData.get(strip.id);

      // Draw strip background or live preview
      if (rgbData && assignedShader) {
        // Draw live preview from shader
        if (strip.orientation === 'horizontal') {
          // Draw horizontal strip with actual LED colors
          const ledWidth = width / strip.ledCount;
          for (let i = 0; i < strip.ledCount; i++) {
            const r = rgbData[i * 3];
            const g = rgbData[i * 3 + 1];
            const b = rgbData[i * 3 + 2];
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(x + i * ledWidth, y, ledWidth, height);
          }
        } else {
          // Draw vertical strip with actual LED colors
          const ledHeight = height / strip.ledCount;
          for (let i = 0; i < strip.ledCount; i++) {
            const r = rgbData[i * 3];
            const g = rgbData[i * 3 + 1];
            const b = rgbData[i * 3 + 2];
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(x, y + i * ledHeight, width, ledHeight);
          }
        }
      } else {
        // Draw static background
        ctx.fillStyle = assignedShader ? '#059669' : '#4b5563';
        ctx.fillRect(x, y, width, height);
      }

      // Draw strip border
      ctx.strokeStyle = assignedShader ? '#10b981' : '#60a5fa';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      // Draw strip label
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.fillText(strip.name, x + 5, y - 5);

      // Draw shader name if assigned
      if (assignedShader) {
        ctx.fillStyle = '#d1fae5';
        ctx.font = '10px sans-serif';
        ctx.fillText(assignedShader.name, x + 5, y + 15);
      }

      // Draw LED count
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px sans-serif';
      ctx.fillText(`${strip.ledCount} LEDs`, x + 5, y + height + 15);
    });
  }, [strips, assignments, shaders, previewData]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    // Need a selected shader to assign
    if (!selectedShaderId) {
      alert('Please select a shader first');
      return;
    }

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
        // Assign shader to strip
        const assignment = {
          stripId: strip.id,
          shaderId: selectedShaderId,
          params: {}, // Will use global params
        };

        setAssignment(assignment);
        applyShader(assignment);

        console.log(`Assigned shader ${selectedShaderId} to strip ${strip.name}`);
        break;
      }
    }
  };

  return (
    <div className="h-full bg-gray-800 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">LED Layout - Live Preview</h2>
        <p className="text-sm text-gray-400 mt-1">
          {strips.length} strip{strips.length !== 1 ? 's' : ''} configured • Click to assign selected shader
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
