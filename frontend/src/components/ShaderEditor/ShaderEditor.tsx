import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useAppStore } from '../../store/appStore';
import { useSocket } from '../../hooks/useSocket';

export const ShaderEditor: React.FC = () => {
  const { shaders, selectedShaderId, setSelectedShaderId } = useAppStore();
  const { updateShader } = useSocket();

  const selectedShader = shaders.find((s) => s.id === selectedShaderId);
  const [code, setCode] = useState(selectedShader?.fragmentShader || '');
  const [shaderName, setShaderName] = useState(selectedShader?.name || '');

  useEffect(() => {
    if (selectedShader) {
      setCode(selectedShader.fragmentShader);
      setShaderName(selectedShader.name);
    }
  }, [selectedShader]);

  const handleSave = () => {
    if (!selectedShader) return;

    const updated = {
      ...selectedShader,
      fragmentShader: code,
      name: shaderName,
    };

    updateShader(updated);
  };

  if (!selectedShader) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-800 rounded-lg">
        <p className="text-gray-400">Select a shader to edit</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={shaderName}
            onChange={(e) => setShaderName(e.target.value)}
            className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
          />
          <span className="text-gray-400 text-sm">{selectedShader.category}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => setSelectedShaderId(null)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language="glsl"
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
          }}
        />
      </div>

      {/* Info */}
      <div className="p-4 bg-gray-900 border-t border-gray-700">
        <p className="text-sm text-gray-400">
          Available uniforms: <code className="text-blue-400">time</code>,{' '}
          <code className="text-blue-400">bpm</code>,{' '}
          <code className="text-blue-400">resolution</code>,{' '}
          <code className="text-blue-400">color1</code>,{' '}
          <code className="text-blue-400">color2</code>,{' '}
          <code className="text-blue-400">speed</code>
        </p>
      </div>
    </div>
  );
};
