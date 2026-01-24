import { useState } from 'react';
import { StripConfig, DEFAULT_STRIPS } from '../types';

interface StripConfigProps {
  strips: StripConfig[];
  onChange: (strips: StripConfig[]) => void;
}

export function StripConfigComponent({ strips, onChange }: StripConfigProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  const addStrip = () => {
    const newId = Math.max(...strips.map(s => s.id), 0) + 1;
    const newStrip: StripConfig = {
      id: newId,
      name: `Strip ${newId}`,
      universe: 0,
      startChannel: 1,
      ledCount: 250,
      ipAddress: '192.168.8.10',
      position: { x: 50, y: 50 },
      orientation: 'horizontal'
    };
    onChange([...strips, newStrip]);
    setEditingId(newId);
  };

  const updateStrip = (id: number, updates: Partial<StripConfig>) => {
    onChange(strips.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteStrip = (id: number) => {
    onChange(strips.filter(s => s.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const loadDefaults = () => {
    if (confirm('Load default strip configuration? This will replace your current setup.')) {
      onChange(DEFAULT_STRIPS);
    }
  };

  const clearAll = () => {
    if (confirm('Remove all strips? This will clear your configuration.')) {
      onChange([]);
    }
  };

  return (
    <div className="strip-config">
      <div className="strip-config-header" onClick={() => setExpanded(!expanded)}>
        <h3>
          <span className={`expand-icon ${expanded ? 'expanded' : ''}`}>▶</span>
          LED Strips Configuration ({strips.length} strips)
        </h3>
        <div className="strip-config-actions">
          <button onClick={(e) => { e.stopPropagation(); loadDefaults(); }} title="Load default 13 strips">
            Load Defaults
          </button>
          <button onClick={(e) => { e.stopPropagation(); addStrip(); }} title="Add new strip">
            + Add Strip
          </button>
          {strips.length > 0 && (
            <button onClick={(e) => { e.stopPropagation(); clearAll(); }} className="danger" title="Clear all">
              Clear All
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="strip-config-content">
          {strips.length === 0 ? (
            <div className="no-strips">
              No strips configured. Click "Load Defaults" to load Jerome's 13-strip setup,
              or "Add Strip" to configure manually.
            </div>
          ) : (
            <div className="strips-grid">
              {strips.map(strip => (
                <div key={strip.id} className={`strip-item ${editingId === strip.id ? 'editing' : ''}`}>
                  <div className="strip-item-header">
                    <input
                      type="text"
                      value={strip.name}
                      onChange={(e) => updateStrip(strip.id, { name: e.target.value })}
                      className="strip-name"
                      placeholder="Strip name"
                    />
                    <div className="strip-item-actions">
                      <button
                        onClick={() => setEditingId(editingId === strip.id ? null : strip.id)}
                        className="edit-btn"
                      >
                        {editingId === strip.id ? '✓' : '⚙'}
                      </button>
                      <button onClick={() => deleteStrip(strip.id)} className="delete-btn">×</button>
                    </div>
                  </div>

                  {editingId === strip.id && (
                    <div className="strip-item-details">
                      <div className="form-row">
                        <label>
                          IP Address:
                          <input
                            type="text"
                            value={strip.ipAddress}
                            onChange={(e) => updateStrip(strip.id, { ipAddress: e.target.value })}
                            placeholder="192.168.8.10"
                          />
                        </label>
                        <label>
                          Universe:
                          <input
                            type="number"
                            min="0"
                            value={strip.universe}
                            onChange={(e) => updateStrip(strip.id, { universe: parseInt(e.target.value) })}
                          />
                        </label>
                      </div>

                      <div className="form-row">
                        <label>
                          Start Channel:
                          <input
                            type="number"
                            min="1"
                            max="512"
                            value={strip.startChannel}
                            onChange={(e) => updateStrip(strip.id, { startChannel: parseInt(e.target.value) })}
                          />
                        </label>
                        <label>
                          LED Count:
                          <input
                            type="number"
                            min="1"
                            value={strip.ledCount}
                            onChange={(e) => updateStrip(strip.id, { ledCount: parseInt(e.target.value) })}
                          />
                        </label>
                      </div>

                      <div className="form-row">
                        <label>
                          Orientation:
                          <select
                            value={strip.orientation || 'horizontal'}
                            onChange={(e) => updateStrip(strip.id, { orientation: e.target.value as 'horizontal' | 'vertical' })}
                          >
                            <option value="horizontal">Horizontal</option>
                            <option value="vertical">Vertical</option>
                          </select>
                        </label>
                      </div>

                      <div className="strip-info">
                        <small>
                          RGB Channels: {strip.ledCount * 3} •
                          Universes needed: {Math.ceil((strip.ledCount * 3) / 512)}
                        </small>
                      </div>
                    </div>
                  )}

                  {editingId !== strip.id && (
                    <div className="strip-item-summary">
                      <small>
                        {strip.ipAddress} • Universe {strip.universe} • Ch {strip.startChannel} •
                        {strip.ledCount} LEDs
                      </small>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
