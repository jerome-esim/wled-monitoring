import React from 'react';
import { useAppStore } from '../../store/appStore';
import type { ShaderConfig } from '@shared/types';

interface ShaderParametersProps {
  shader: ShaderConfig;
}

export const ShaderParameters: React.FC<ShaderParametersProps> = ({ shader }) => {
  const { addLayer, shaders } = useAppStore();

  const handleAddAsLayer = () => {
    addLayer(shader.id, `${shader.name} Layer`);
  };

  // Get parameter descriptions based on shader type
  const getShaderParameters = () => {
    switch (shader.id) {
      case 'zigzag-chaser':
        return [
          { name: 'Density', description: 'Number of simultaneous chasers (1-10)', range: '1-10' },
          { name: 'Chaser Size', description: 'Size of the bright head', range: '0.01-0.2' },
          { name: 'Trail Length', description: 'Length of the fading trail', range: '0-0.5' },
          { name: 'Reverse', description: 'Reverse animation direction', range: 'On/Off' },
        ];
      case 'continuous-zigzag-chaser':
        return [
          { name: 'Density', description: 'Number of simultaneous chasers (1-10)', range: '1-10' },
          { name: 'Chaser Size', description: 'Size of the bright head', range: '0.01-0.2' },
          { name: 'Trail Length', description: 'Length of the fading trail', range: '0-0.5' },
          { name: 'Reverse', description: 'Reverse animation direction', range: 'On/Off' },
        ];
      case 'neon-warmup':
        return [
          { name: 'Active Neons', description: 'Number of neons active simultaneously', range: '1-12' },
          { name: 'Warmup Duration', description: 'Time for neon to warm up (seconds)', range: '0.1-3.0' },
          { name: 'On Duration', description: 'Time neon stays fully on (seconds)', range: '0.5-10.0' },
          { name: 'Off Duration', description: 'Time neon stays off (seconds)', range: '0.1-2.0' },
        ];
      case 'gradient-sweep':
        return [
          { name: 'Speed', description: 'Animation speed multiplier', range: 'Global' },
          { name: 'Colors', description: 'Start and end colors', range: 'Global' },
        ];
      case 'lightning-flash':
        return [
          { name: 'Intensity', description: 'Flash intensity', range: 'Global' },
          { name: 'Speed', description: 'Flash frequency', range: 'Global' },
        ];
      case 'right-to-left':
        return [
          { name: 'Speed', description: 'Movement speed', range: 'Global' },
          { name: 'Colors', description: 'Animation colors', range: 'Global' },
        ];
      default:
        return [];
    }
  };

  const parameters = getShaderParameters();

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 space-y-6 shadow-2xl border border-gray-700">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            {shader.name}
          </h2>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            shader.type === 'builtin'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
          }`}>
            {shader.type === 'builtin' ? 'Built-in' : 'Custom'}
          </span>
        </div>
        {shader.category && (
          <p className="text-sm text-gray-400">
            Category: <span className="text-blue-400">{shader.category}</span>
          </p>
        )}
      </div>

      {/* Add Layer Button */}
      <button
        onClick={handleAddAsLayer}
        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
      >
        <span className="text-lg">+</span>
        Add as Layer
      </button>

      {/* Parameters List */}
      {parameters.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide flex items-center gap-2">
            <span className="w-1 h-4 bg-gradient-to-b from-blue-500 to-purple-500 rounded"></span>
            Available Parameters
          </h3>

          <div className="space-y-3">
            {parameters.map((param, index) => (
              <div
                key={index}
                className="bg-gray-700/50 backdrop-blur-sm rounded-lg p-4 border border-gray-600/50 hover:border-blue-500/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-white mb-1">
                      {param.name}
                    </h4>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {param.description}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="inline-block px-2 py-1 bg-blue-500/20 text-blue-300 text-xs font-mono rounded border border-blue-500/30">
                      {param.range}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Note */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-xs text-blue-300 leading-relaxed">
          <span className="font-semibold">💡 Tip:</span> Add this shader as a layer to adjust its parameters in real-time.
          You can combine multiple shader layers with different blend modes for complex effects.
        </p>
      </div>

      {/* Global Parameters Note */}
      <div className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wide mb-2">
          Global Controls
        </h4>
        <div className="space-y-2 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Speed, Intensity, Direction</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span>Color 1, Color 2</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>BPM, Master Brightness</span>
          </div>
        </div>
      </div>
    </div>
  );
};
