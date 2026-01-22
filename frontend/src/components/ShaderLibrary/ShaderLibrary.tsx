import React from 'react';
import { useAppStore } from '../../store/appStore';
import { useSocket } from '../../hooks/useSocket';
import type { ShaderConfig } from '@shared/types';

export const ShaderLibrary: React.FC = () => {
  const { shaders, layers, selectedShaderId, setSelectedShaderId } = useAppStore();
  const { createShader, deleteShader } = useSocket();

  const handleShaderClick = (shaderId: string) => {
    // Just select the shader to view its parameters
    setSelectedShaderId(shaderId);
  };

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
    <div className="h-full flex flex-col">
      {/* Shader list */}
      <div className="flex-1 overflow-y-auto pr-2">
        {categories.map((category) => (
          <div key={category} className="mb-4">
            <div className="px-3 py-2 bg-gradient-to-r from-gray-700/50 to-gray-800/50 backdrop-blur-sm text-gray-300 text-xs font-semibold uppercase tracking-wide sticky top-0 rounded-lg mb-2 flex items-center gap-2 border border-gray-600/30">
              <span className="w-1 h-3 bg-gradient-to-b from-blue-500 to-purple-500 rounded"></span>
              {category}
            </div>
            <div className="space-y-2 px-1">
              {shaders
                .filter((s) => s.category === category)
                .map((shader) => {
                  const isInLayers = layers.some(l => l.shaderId === shader.id);
                  const isSelected = selectedShaderId === shader.id;

                  return (
                    <div
                      key={shader.id}
                      onClick={() => handleShaderClick(shader.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 group flex items-center justify-between border ${
                        isSelected
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/50 border-blue-400 scale-105'
                          : isInLayers
                          ? 'bg-gradient-to-r from-green-700/50 to-green-600/50 text-white border-green-500/30 hover:border-green-500/60'
                          : 'bg-gray-700/50 hover:bg-gray-600/70 text-gray-200 border-gray-600/30 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isInLayers && (
                          <div className="w-2 h-2 bg-green-400 rounded-full shadow-lg shadow-green-500/50 animate-pulse"></div>
                        )}
                        <span className="font-medium text-sm">{shader.name}</span>
                      </div>
                      {shader.type === 'custom' && (
                        <button
                          onClick={(e) => handleDelete(shader.id, e)}
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center bg-red-500/20 hover:bg-red-500/40 text-red-300 hover:text-red-100 rounded transition-all text-lg border border-red-500/30"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}

        {shaders.length === 0 && (
          <div className="p-6 text-center">
            <div className="text-gray-500 mb-2 text-4xl">🎨</div>
            <p className="text-gray-400 text-sm">No shaders yet.</p>
            <p className="text-gray-500 text-xs mt-1">Create one to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};
