import React from 'react';
import { useAppStore } from '../../store/appStore';
import { useSocket } from '../../hooks/useSocket';
import type { ShaderConfig } from '@shared/types';

export const ShaderLibrary: React.FC = () => {
  const { shaders, selectedShaderId, setSelectedShaderId } = useAppStore();
  const { createShader, deleteShader } = useSocket();

  const handleCreateNew = () => {
    const newShader: ShaderConfig = {
      id: '',
      name: 'New Shader',
      category: 'Custom',
      fragmentShader: `precision highp float;

uniform float time;
uniform float speed;
uniform vec4 color1;
uniform vec2 resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;

  // Your shader code here
  float brightness = sin(time * speed) * 0.5 + 0.5;
  gl_FragColor = vec4(color1.rgb * brightness, 1.0);
}`,
      uniforms: {
        speed: 1.0,
        color1: [1, 1, 1, 1],
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    createShader(newShader);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this shader?')) {
      deleteShader(id);
      if (selectedShaderId === id) {
        setSelectedShaderId(null);
      }
    }
  };

  // Group shaders by category
  const categories = Array.from(new Set(shaders.map((s) => s.category)));

  return (
    <div className="h-full flex flex-col bg-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Shaders</h2>
        <button
          onClick={handleCreateNew}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
        >
          + New
        </button>
      </div>

      {/* Shader list */}
      <div className="flex-1 overflow-y-auto">
        {categories.map((category) => (
          <div key={category} className="mb-4">
            <div className="px-4 py-2 bg-gray-900 text-gray-400 text-sm font-medium sticky top-0">
              {category}
            </div>
            <div className="space-y-1 px-2">
              {shaders
                .filter((s) => s.category === category)
                .map((shader) => (
                  <div
                    key={shader.id}
                    onClick={() => setSelectedShaderId(shader.id)}
                    className={`p-3 rounded cursor-pointer transition-colors group flex items-center justify-between ${
                      selectedShaderId === shader.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    }`}
                  >
                    <span className="font-medium">{shader.name}</span>
                    <button
                      onClick={(e) => handleDelete(shader.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ))}

        {shaders.length === 0 && (
          <div className="p-4 text-center text-gray-400">
            No shaders yet. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
};
