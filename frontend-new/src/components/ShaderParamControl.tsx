interface ParamDef {
  label: string;
  type: 'color' | 'number' | 'boolean' | 'direction';
  min?: number;
  max?: number;
  step?: number;
  default?: any;
}

interface ShaderParamControlProps {
  paramKey: string;
  paramDef: ParamDef;
  value: any;
  onChange: (key: string, value: any) => void;
}

export function ShaderParamControl({
  paramKey,
  paramDef,
  value,
  onChange
}: ShaderParamControlProps) {
  const currentValue = value !== undefined ? value : paramDef.default;

  const handleColorChange = (index: number, val: number) => {
    const color = currentValue ? [...currentValue] : [1, 1, 1, 1];
    color[index] = val;
    onChange(paramKey, color);
  };

  const rgbaToHex = (rgba: number[]) => {
    if (!rgba) return '#ffffff';
    const r = Math.round(rgba[0] * 255);
    const g = Math.round(rgba[1] * 255);
    const b = Math.round(rgba[2] * 255);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const hexToRgba = (hex: string): [number, number, number, number] => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b, currentValue?.[3] ?? 1];
  };

  switch (paramDef.type) {
    case 'color':
      return (
        <div className="param-control">
          <label>{paramDef.label}</label>
          <div className="color-control">
            <input
              type="color"
              value={rgbaToHex(currentValue)}
              onChange={(e) => onChange(paramKey, hexToRgba(e.target.value))}
            />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={currentValue?.[3] ?? 1}
              onChange={(e) => handleColorChange(3, parseFloat(e.target.value))}
              title="Alpha"
            />
            <span className="alpha-value">α: {(currentValue?.[3] ?? 1).toFixed(2)}</span>
          </div>
        </div>
      );

    case 'boolean':
      return (
        <div className="param-control">
          <label>
            <input
              type="checkbox"
              checked={currentValue === 1 || currentValue === true}
              onChange={(e) => onChange(paramKey, e.target.checked ? 1 : 0)}
            />
            {paramDef.label}
          </label>
        </div>
      );

    case 'direction':
      return (
        <div className="param-control">
          <label>{paramDef.label}</label>
          <div className="direction-control">
            <div className="direction-input">
              <label>X:</label>
              <input
                type="number"
                min="-1"
                max="1"
                step="0.1"
                value={currentValue?.[0] ?? 1}
                onChange={(e) =>
                  onChange(paramKey, [parseFloat(e.target.value), currentValue?.[1] ?? 0])
                }
              />
            </div>
            <div className="direction-input">
              <label>Y:</label>
              <input
                type="number"
                min="-1"
                max="1"
                step="0.1"
                value={currentValue?.[1] ?? 0}
                onChange={(e) =>
                  onChange(paramKey, [currentValue?.[0] ?? 1, parseFloat(e.target.value)])
                }
              />
            </div>
          </div>
        </div>
      );

    case 'number':
    default:
      return (
        <div className="param-control">
          <label>{paramDef.label}</label>
          <div className="number-control">
            <input
              type="range"
              min={paramDef.min ?? 0}
              max={paramDef.max ?? 10}
              step={paramDef.step ?? 0.1}
              value={currentValue ?? paramDef.default ?? 1}
              onChange={(e) => onChange(paramKey, parseFloat(e.target.value))}
            />
            <input
              type="number"
              min={paramDef.min ?? 0}
              max={paramDef.max ?? 10}
              step={paramDef.step ?? 0.1}
              value={currentValue ?? paramDef.default ?? 1}
              onChange={(e) => onChange(paramKey, parseFloat(e.target.value))}
            />
          </div>
        </div>
      );
  }
}
