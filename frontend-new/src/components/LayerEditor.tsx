import { ShaderLayer, AVAILABLE_SHADERS, BlendMode } from '../types';
import { ShaderParamControl } from './ShaderParamControl';

interface LayerEditorProps {
  layer: ShaderLayer;
  onChange: (layer: ShaderLayer) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export function LayerEditor({
  layer,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown
}: LayerEditorProps) {
  const shaderDef = AVAILABLE_SHADERS.find(s => s.id === layer.shaderId);

  const updateParam = (key: string, value: any) => {
    onChange({
      ...layer,
      params: {
        ...layer.params,
        [key]: value
      }
    });
  };

  const updateLayerProp = (key: keyof ShaderLayer, value: any) => {
    onChange({
      ...layer,
      [key]: value
    });
  };

  return (
    <div className={`layer-editor ${!layer.enabled ? 'disabled' : ''}`}>
      <div className="layer-header">
        <div className="layer-header-left">
          <input
            type="checkbox"
            checked={layer.enabled}
            onChange={(e) => updateLayerProp('enabled', e.target.checked)}
            title="Enable/Disable layer"
          />
          <input
            type="text"
            value={layer.name}
            onChange={(e) => updateLayerProp('name', e.target.value)}
            className="layer-name-input"
          />
          <span className="shader-type">{shaderDef?.name}</span>
        </div>
        <div className="layer-header-right">
          <button onClick={onMoveUp} disabled={!canMoveUp} title="Move up">↑</button>
          <button onClick={onMoveDown} disabled={!canMoveDown} title="Move down">↓</button>
          <button onClick={onDelete} className="delete-btn" title="Delete layer">×</button>
        </div>
      </div>

      <div className="layer-controls">
        <div className="layer-general-controls">
          <div className="param-control">
            <label>Opacity</label>
            <div className="number-control">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={layer.opacity}
                onChange={(e) => updateLayerProp('opacity', parseFloat(e.target.value))}
              />
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={layer.opacity}
                onChange={(e) => updateLayerProp('opacity', parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="param-control">
            <label>Blend Mode</label>
            <select
              value={layer.blendMode}
              onChange={(e) => updateLayerProp('blendMode', e.target.value as BlendMode)}
            >
              <option value="normal">Normal</option>
              <option value="add">Add</option>
              <option value="multiply">Multiply</option>
              <option value="screen">Screen</option>
            </select>
          </div>
        </div>

        {shaderDef && (
          <div className="shader-params">
            <h4>Shader Parameters</h4>
            {Object.entries(shaderDef.params).map(([key, paramDef]) => (
              <ShaderParamControl
                key={key}
                paramKey={key}
                paramDef={paramDef}
                value={layer.params[key as keyof typeof layer.params]}
                onChange={updateParam}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
