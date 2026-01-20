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

  // Sort layers by order (top to bottom in UI, highest order = top)
  const sortedLayers = [...layers].sort((a, b) => b.order - a.order);

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

  const handleColor1Change = (layerId: string, hex: string) => {
    const rgb = hexToRgb(hex);
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      updateLayer(layerId, {
        params: { ...layer.params, color1: [...rgb, 1] }
      });
    }
  };

  const handleColor2Change = (layerId: string, hex: string) => {
    const rgb = hexToRgb(hex);
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      updateLayer(layerId, {
        params: { ...layer.params, color2: [...rgb, 1] }
      });
    }
  };

  const hexToRgb = (hex: string): number[] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16) / 255,
          parseInt(result[2], 16) / 255,
          parseInt(result[3], 16) / 255,
        ]
      : [1, 1, 1];
  };

  const rgbToHex = (rgb: number[]): string => {
    const r = Math.round((rgb[0] || 0) * 255).toString(16).padStart(2, '0');
    const g = Math.round((rgb[1] || 0) * 255).toString(16).padStart(2, '0');
    const b = Math.round((rgb[2] || 0) * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
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
                    {/* Move buttons - inverted because display is top-to-bottom */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(layer.id, 'up');
                      }}
                      disabled={index === 0}
                      className="w-6 h-6 bg-gray-600 hover:bg-gray-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
                    >
                      ↑
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(layer.id, 'down');
                      }}
                      disabled={index === sortedLayers.length - 1}
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

                    {/* Layer Colors Override */}
                    <div>
                      <label className="block text-xs text-gray-300 mb-2">
                        Colors (override global)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Color 1</label>
                          <input
                            type="color"
                            value={layer.params?.color1 ? rgbToHex(layer.params.color1 as number[]) : '#ff0000'}
                            onChange={(e) => handleColor1Change(layer.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full h-8 rounded cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Color 2</label>
                          <input
                            type="color"
                            value={layer.params?.color2 ? rgbToHex(layer.params.color2 as number[]) : '#0000ff'}
                            onChange={(e) => handleColor2Change(layer.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full h-8 rounded cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Shader-Specific Parameters */}
                    {shader?.id === 'zigzag-chaser' && (
                      <div className="space-y-2">
                        <label className="block text-xs text-gray-300 mb-2">
                          Chaser Parameters
                        </label>

                        {/* Density */}
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            Density: {layer.params?.density?.toFixed(1) || '1.0'}
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            step="1"
                            value={layer.params?.density || 1}
                            onChange={(e) => updateLayer(layer.id, {
                              params: { ...layer.params, density: Number(e.target.value) }
                            })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full"
                          />
                        </div>

                        {/* Chaser Size */}
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            Head Size: {layer.params?.chaserSize?.toFixed(2) || '0.05'}
                          </label>
                          <input
                            type="range"
                            min="0.01"
                            max="0.2"
                            step="0.01"
                            value={layer.params?.chaserSize || 0.05}
                            onChange={(e) => updateLayer(layer.id, {
                              params: { ...layer.params, chaserSize: Number(e.target.value) }
                            })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full"
                          />
                        </div>

                        {/* Trail Length */}
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            Trail Length: {layer.params?.trailLength?.toFixed(2) || '0.10'}
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="0.5"
                            step="0.01"
                            value={layer.params?.trailLength || 0.1}
                            onChange={(e) => updateLayer(layer.id, {
                              params: { ...layer.params, trailLength: Number(e.target.value) }
                            })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full"
                          />
                        </div>

                        {/* Reverse */}
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-gray-400">
                            Reverse Direction
                          </label>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateLayer(layer.id, {
                                params: { ...layer.params, reverse: layer.params?.reverse ? 0 : 1 }
                              });
                            }}
                            className={`px-3 py-1 rounded text-xs transition-colors ${
                              layer.params?.reverse
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                            }`}
                          >
                            {layer.params?.reverse ? 'ON' : 'OFF'}
                          </button>
                        </div>

                        {/* Warmup Duration (Neon shader) */}
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            Warmup Duration: {layer.params?.warmupDuration?.toFixed(2) || '0.50'}s
                          </label>
                          <input
                            type="range"
                            min="0.1"
                            max="3.0"
                            step="0.1"
                            value={layer.params?.warmupDuration || 0.5}
                            onChange={(e) => updateLayer(layer.id, {
                              params: { ...layer.params, warmupDuration: Number(e.target.value) }
                            })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full"
                          />
                        </div>

                        {/* On Duration (Neon shader) */}
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            On Duration: {layer.params?.onDuration?.toFixed(2) || '2.00'}s
                          </label>
                          <input
                            type="range"
                            min="0.5"
                            max="10.0"
                            step="0.1"
                            value={layer.params?.onDuration || 2.0}
                            onChange={(e) => updateLayer(layer.id, {
                              params: { ...layer.params, onDuration: Number(e.target.value) }
                            })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full"
                          />
                        </div>

                        {/* Off Duration (Neon shader) */}
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            Off Duration: {layer.params?.offDuration?.toFixed(2) || '0.30'}s
                          </label>
                          <input
                            type="range"
                            min="0.1"
                            max="2.0"
                            step="0.1"
                            value={layer.params?.offDuration || 0.3}
                            onChange={(e) => updateLayer(layer.id, {
                              params: { ...layer.params, offDuration: Number(e.target.value) }
                            })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full"
                          />
                        </div>
                      </div>
                    )}
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
