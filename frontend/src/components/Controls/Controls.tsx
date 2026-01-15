import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { useSocket } from '../../hooks/useSocket';

export const Controls: React.FC = () => {
  const { playbackState, globalUniforms, setPlaybackState, updateUniform } = useAppStore();
  const { startPlayback, stopPlayback, updateBpm, updateParams, fps } = useSocket();

  const [bpm, setBpm] = useState(playbackState.bpm);
  const [speed, setSpeed] = useState(globalUniforms.speed || 1.0);
  const [intensity, setIntensity] = useState((globalUniforms as any).intensity || 1.0);
  const [direction, setDirection] = useState<[number, number]>(
    (globalUniforms.direction as [number, number]) || [1.0, 0.0]
  );

  useEffect(() => {
    setPlaybackState({ fps });
  }, [fps, setPlaybackState]);

  const handlePlayPause = () => {
    if (playbackState.isPlaying) {
      stopPlayback();
      setPlaybackState({ isPlaying: false });
    } else {
      startPlayback();
      setPlaybackState({ isPlaying: true, startTime: Date.now() });
    }
  };

  const handleBpmChange = (value: number) => {
    setBpm(value);
    updateBpm(value);
    updateUniform('bpm', value);
    setPlaybackState({ bpm: value });
  };

  const handleSpeedChange = (value: number) => {
    setSpeed(value);
    updateUniform('speed', value);
    updateParams({ speed: value });
  };

  const handleIntensityChange = (value: number) => {
    setIntensity(value);
    updateUniform('intensity', value);
    updateParams({ intensity: value });
  };

  const handleDirectionChange = (x: number, y: number) => {
    const newDirection: [number, number] = [x, y];
    setDirection(newDirection);
    updateUniform('direction', newDirection);
    updateParams({ direction: newDirection });
  };

  const handleColor1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    const rgb = hexToRgb(hex);
    updateUniform('color1', [...rgb, 1]);
    updateParams({ color1: [...rgb, 1] });
  };

  const handleColor2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    const rgb = hexToRgb(hex);
    updateUniform('color2', [...rgb, 1]);
    updateParams({ color2: [...rgb, 1] });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <h2 className="text-lg font-semibold text-white">Controls</h2>

      {/* Play/Stop */}
      <div>
        <button
          onClick={handlePlayPause}
          className={`w-full py-3 rounded font-semibold transition-colors ${
            playbackState.isPlaying
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {playbackState.isPlaying ? '⏸ Stop' : '▶ Play'}
        </button>
      </div>

      {/* FPS Display */}
      <div className="bg-gray-900 rounded p-3 text-center">
        <div className="text-2xl font-bold text-blue-400">{fps} FPS</div>
        <div className="text-xs text-gray-400 mt-1">Rendering Performance</div>
      </div>

      {/* BPM Control */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          BPM: {bpm}
        </label>
        <input
          type="range"
          min="60"
          max="180"
          value={bpm}
          onChange={(e) => handleBpmChange(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex gap-2 mt-2">
          {[90, 120, 140, 160].map((value) => (
            <button
              key={value}
              onClick={() => handleBpmChange(value)}
              className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {/* Speed Control */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Speed: {speed.toFixed(2)}x
        </label>
        <input
          type="range"
          min="0.1"
          max="3"
          step="0.1"
          value={speed}
          onChange={(e) => handleSpeedChange(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Intensity Control */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Intensity: {intensity.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={intensity}
          onChange={(e) => handleIntensityChange(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Direction Control */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Direction: [{direction[0].toFixed(1)}, {direction[1].toFixed(1)}]
        </label>
        {/* Directional Pad Grid */}
        <div className="grid grid-cols-3 gap-2">
          {/* Row 1 */}
          <button
            onClick={() => handleDirectionChange(-1, 1)}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white text-lg rounded transition-colors"
            title="Diagonal: Haut-Gauche"
          >
            ↖
          </button>
          <button
            onClick={() => handleDirectionChange(0, 1)}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white text-lg rounded transition-colors"
            title="Haut"
          >
            ↑
          </button>
          <button
            onClick={() => handleDirectionChange(1, 1)}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white text-lg rounded transition-colors"
            title="Diagonal: Haut-Droite"
          >
            ↗
          </button>
          {/* Row 2 */}
          <button
            onClick={() => handleDirectionChange(-1, 0)}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white text-lg rounded transition-colors"
            title="Gauche"
          >
            ←
          </button>
          <button
            onClick={() => handleDirectionChange(0, 0)}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white text-lg rounded transition-colors"
            title="Stop"
          >
            ⏸
          </button>
          <button
            onClick={() => handleDirectionChange(1, 0)}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white text-lg rounded transition-colors"
            title="Droite"
          >
            →
          </button>
          {/* Row 3 */}
          <button
            onClick={() => handleDirectionChange(-1, -1)}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white text-lg rounded transition-colors"
            title="Diagonal: Bas-Gauche"
          >
            ↙
          </button>
          <button
            onClick={() => handleDirectionChange(0, -1)}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white text-lg rounded transition-colors"
            title="Bas"
          >
            ↓
          </button>
          <button
            onClick={() => handleDirectionChange(1, -1)}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white text-lg rounded transition-colors"
            title="Diagonal: Bas-Droite"
          >
            ↘
          </button>
        </div>
      </div>

      {/* Color Controls */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Color 1
          </label>
          <input
            type="color"
            defaultValue="#ff0000"
            onChange={handleColor1Change}
            className="w-full h-10 rounded cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Color 2
          </label>
          <input
            type="color"
            defaultValue="#0000ff"
            onChange={handleColor2Change}
            className="w-full h-10 rounded cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};

// Helper function to convert hex to RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ]
    : [1, 1, 1];
}
