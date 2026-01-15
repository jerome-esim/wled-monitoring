import React from 'react';
import { useAppStore } from '../../store/appStore';
import type { BlendMode } from '@shared/types';

export const LayerManager: React.FC = () => {
  const {
    layers,
    shaders,
    addLayer,
    removeLayer,
    updateLayer,
    toggleLayer,
    moveLayer,
    selectedLayerId,
    setSelectedLayerId,
  } = useAppStore();

  // Sort layers by order (bottom to top)
  const sortedLayers = [...layers].sort((a, b) => a.order - b.order);

  const handleAddLayer = () => {
    if (shaders.length === 0) return;

    // Add the first shader as a new layer
    const shader = shaders[0];
    addLayer(shader.id, `${shader.name} Layer`);
  };

  const handleAddSpecificShader = (shaderId: string) => {
    const shader = shaders.find(s => s.id === shaderId);
    if (!shader) return;

    addLayer(shaderId, `${shader.name} Layer`);
  };

  const handleBlendModeChange = (layerId: string, blendMode: BlendMode) => {
    updateLayer(layerId, { blendMode });
  };

  const handleOpacityChange = (layerId: string, opacity: number) => {
    updateLayer(layerId, { opacity });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Layers</h2>
        <button
          onClick={handleAddLayer}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
          disabled={shaders.length === 0}
        >
          + Add Layer
        </button>
      </div>

      {/* Layer List */}
      <div className="space-y-2">
        {sortedLayers.length === 0 ? (
          <div className="text-gray-400 text-sm text-center py-4">
            No layers yet. Add a shader to get started.
          </div>
        ) : (
          sortedLayers.map((layer, index) => {
            const shader = shaders.find(s => s.id === layer.shaderId);
            const isSelected = layer.id === selectedLayerId;

            return (
              <div
                key={layer.id}
                className={`bg-gray-700 rounded p-3 space-y-2 border-2 transition-colors ${
                  isSelected ? 'border-blue-500' : 'border-transparent'
                }`}
                onClick={() => setSelectedLayerId(layer.id)}
              >
                {/* Layer Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLayer(layer.id);
                      }}
                      className={`w-6 h-6 rounded flex items-center justify-center text-sm transition-colors ${
                        layer.enabled
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-gray-600 hover:bg-gray-500'
                      }`}
                    >
                      {layer.enabled ? '👁' : '🚫'}
                    </button>
                    <span className="text-white font-medium text-sm">
                      {layer.name}
                    </span>
                    <span className="text-gray-400 text-xs">
                      ({shader?.name || 'Unknown'})
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Move buttons */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(layer.id, 'up');
                      }}
                      disabled={index === sortedLayers.length - 1}
                      className="w-6 h-6 bg-gray-600 hover:bg-gray-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
                    >
                      ↑
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(layer.id, 'down');
                      }}
                      disabled={index === 0}
                      className="w-6 h-6 bg-gray-600 hover:bg-gray-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
                    >
                      ↓
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLayer(layer.id);
                      }}
                      className="w-6 h-6 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors ml-2"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Layer Controls (shown when selected) */}
                {isSelected && (
                  <div className="space-y-2 pt-2 border-t border-gray-600">
                    {/* Opacity */}
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">
                        Opacity: {(layer.opacity * 100).toFixed(0)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={layer.opacity}
                        onChange={(e) =>
                          handleOpacityChange(layer.id, Number(e.target.value))
                        }
                        className="w-full"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* Blend Mode */}
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">
                        Blend Mode
                      </label>
                      <select
                        value={layer.blendMode}
                        onChange={(e) =>
                          handleBlendModeChange(layer.id, e.target.value as BlendMode)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-2 py-1 bg-gray-600 text-white text-sm rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="normal">Normal</option>
                        <option value="add">Add</option>
                        <option value="multiply">Multiply</option>
                        <option value="screen">Screen</option>
                      </select>
                    </div>

                    {/* Change Shader */}
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">
                        Shader
                      </label>
                      <select
                        value={layer.shaderId}
                        onChange={(e) => updateLayer(layer.id, { shaderId: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-2 py-1 bg-gray-600 text-white text-sm rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                      >
                        {shaders.map(shader => (
                          <option key={shader.id} value={shader.id}>
                            {shader.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Quick Add Shader Buttons */}
      {shaders.length > 0 && (
        <div className="pt-2 border-t border-gray-700">
          <label className="block text-xs text-gray-400 mb-2">Quick Add:</label>
          <div className="flex flex-wrap gap-2">
            {shaders.map(shader => (
              <button
                key={shader.id}
                onClick={() => handleAddSpecificShader(shader.id)}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
              >
                + {shader.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
