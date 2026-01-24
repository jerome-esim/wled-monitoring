import { useState } from 'react';
import { ShaderLayer, AVAILABLE_SHADERS } from '../types';
import { LayerEditor } from './LayerEditor';

interface LayerListProps {
  layers: ShaderLayer[];
  onChange: (layers: ShaderLayer[]) => void;
}

export function LayerList({ layers, onChange }: LayerListProps) {
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());

  const addLayer = (shaderId: string) => {
    const shaderDef = AVAILABLE_SHADERS.find(s => s.id === shaderId);
    if (!shaderDef) return;

    const newLayer: ShaderLayer = {
      id: `layer-${Date.now()}`,
      shaderId: shaderId,
      name: shaderDef.name,
      enabled: true,
      opacity: 1.0,
      blendMode: 'normal',
      order: layers.length,
      params: {}
    };

    onChange([...layers, newLayer]);
    setExpandedLayers(new Set([...expandedLayers, newLayer.id]));
  };

  const updateLayer = (index: number, layer: ShaderLayer) => {
    const newLayers = [...layers];
    newLayers[index] = layer;
    onChange(newLayers);
  };

  const deleteLayer = (index: number) => {
    const newLayers = layers.filter((_, i) => i !== index);
    // Reorder remaining layers
    newLayers.forEach((layer, i) => {
      layer.order = i;
    });
    onChange(newLayers);
  };

  const moveLayer = (index: number, direction: 'up' | 'down') => {
    const newLayers = [...layers];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newLayers.length) return;

    // Swap layers
    [newLayers[index], newLayers[targetIndex]] = [newLayers[targetIndex], newLayers[index]];

    // Update order
    newLayers.forEach((layer, i) => {
      layer.order = i;
    });

    onChange(newLayers);
  };

  const toggleExpand = (layerId: string) => {
    const newExpanded = new Set(expandedLayers);
    if (newExpanded.has(layerId)) {
      newExpanded.delete(layerId);
    } else {
      newExpanded.add(layerId);
    }
    setExpandedLayers(newExpanded);
  };

  return (
    <div className="layer-list">
      <div className="layer-list-header">
        <h2>Shader Layers</h2>
        <div className="add-layer-dropdown">
          <select
            onChange={(e) => {
              if (e.target.value) {
                addLayer(e.target.value);
                e.target.value = '';
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>
              + Add Layer
            </option>
            {AVAILABLE_SHADERS.map((shader) => (
              <option key={shader.id} value={shader.id}>
                {shader.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="layers">
        {layers.length === 0 ? (
          <div className="no-layers">No layers yet. Add one to get started!</div>
        ) : (
          layers.map((layer, index) => (
            <div key={layer.id} className="layer-item">
              <div
                className="layer-item-header"
                onClick={() => toggleExpand(layer.id)}
              >
                <span className={`expand-icon ${expandedLayers.has(layer.id) ? 'expanded' : ''}`}>
                  ▶
                </span>
                <input
                  type="checkbox"
                  checked={layer.enabled}
                  onChange={(e) => {
                    e.stopPropagation();
                    updateLayer(index, { ...layer, enabled: e.target.checked });
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="layer-name">{layer.name}</span>
                <span className="layer-info">
                  {AVAILABLE_SHADERS.find(s => s.id === layer.shaderId)?.name} •
                  Opacity: {Math.round(layer.opacity * 100)}% •
                  {layer.blendMode}
                </span>
              </div>

              {expandedLayers.has(layer.id) && (
                <LayerEditor
                  layer={layer}
                  onChange={(updated) => updateLayer(index, updated)}
                  onDelete={() => deleteLayer(index)}
                  onMoveUp={() => moveLayer(index, 'up')}
                  onMoveDown={() => moveLayer(index, 'down')}
                  canMoveUp={index > 0}
                  canMoveDown={index < layers.length - 1}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
