import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { useSocket } from '../../hooks/useSocket';

export const Controls: React.FC = () => {
  const { playbackState, globalUniforms, setPlaybackState, updateUniform, masterBrightness, setMasterBrightness } = useAppStore();
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
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <span className="w-1 h-5 bg-gradient-to-b from-green-500 to-blue-500 rounded"></span>
        Global Controls
      </h2>

      {/* Play/Stop */}
      <div>
        <button
          onClick={handlePlayPause}
          className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg ${
            playbackState.isPlaying
              ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-red-500/50'
              : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-green-500/50'
          }`}
        >
          {playbackState.isPlaying ? '⏸ Stop' : '▶ Play'}
        </button>
      </div>

      {/* FPS Display */}
      <div className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 backdrop-blur-sm rounded-lg p-4 text-center border border-gray-600/50">
        <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          {fps} FPS
        </div>
        <div className="text-xs text-gray-400 mt-1 uppercase tracking-wide">Rendering Performance</div>
      </div>

      {/* Master Brightness / Dimmer */}
      <div className="bg-gradient-to-br from-gray-700/30 to-gray-800/30 backdrop-blur-sm rounded-lg p-4 border border-gray-600/30">
        <label className="block text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
          <span className="text-lg">💡</span>
          Master Brightness
          <span className="ml-auto text-blue-400 font-mono">{Math.round(masterBrightness * 100)}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={masterBrightness}
          onChange={(e) => setMasterBrightness(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex gap-2 mt-3">
          {[0.25, 0.5, 0.75, 1.0].map((value) => (
            <button
              key={value}
              onClick={() => setMasterBrightness(value)}
              className="flex-1 px-2 py-1.5 bg-gray-600/50 hover:bg-blue-600 text-white text-xs rounded-md transition-all duration-200 font-semibold border border-gray-500/30 hover:border-blue-500"
            >
              {Math.round(value * 100)}%
            </button>
          ))}
        </div>
      </div>

      {/* BPM Control */}
      <div className="bg-gradient-to-br from-gray-700/30 to-gray-800/30 backdrop-blur-sm rounded-lg p-4 border border-gray-600/30">
        <label className="block text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
          <span className="text-lg">🎵</span>
          BPM
          <span className="ml-auto text-purple-400 font-mono">{bpm}</span>
        </label>
        <input
          type="range"
          min="60"
          max="180"
          value={bpm}
          onChange={(e) => handleBpmChange(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex gap-2 mt-3">
          {[90, 120, 140, 160].map((value) => (
            <button
              key={value}
              onClick={() => handleBpmChange(value)}
              className="flex-1 px-2 py-1.5 bg-gray-600/50 hover:bg-purple-600 text-white text-xs rounded-md transition-all duration-200 font-semibold border border-gray-500/30 hover:border-purple-500"
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {/* Speed Control */}
      <div className="bg-gradient-to-br from-gray-700/30 to-gray-800/30 backdrop-blur-sm rounded-lg p-4 border border-gray-600/30">
        <label className="block text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
          <span className="text-lg">⚡</span>
          Speed
          <span className="ml-auto text-green-400 font-mono">{speed.toFixed(2)}x</span>
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
      <div className="bg-gradient-to-br from-gray-700/30 to-gray-800/30 backdrop-blur-sm rounded-lg p-4 border border-gray-600/30">
        <label className="block text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
          <span className="text-lg">🔆</span>
          Intensity
          <span className="ml-auto text-orange-400 font-mono">{intensity.toFixed(2)}</span>
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
      <div className="bg-gradient-to-br from-gray-700/30 to-gray-800/30 backdrop-blur-sm rounded-lg p-4 border border-gray-600/30">
        <label className="block text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
          <span className="text-lg">🧭</span>
          Direction
          <span className="ml-auto text-cyan-400 font-mono text-xs">
            [{direction[0].toFixed(1)}, {direction[1].toFixed(1)}]
          </span>
        </label>
        {/* Directional Pad Grid */}
        <div className="grid grid-cols-3 gap-2">
          {/* Row 1 */}
          <button
            onClick={() => handleDirectionChange(-1, 1)}
            className="p-3 bg-gray-600/50 hover:bg-cyan-600 text-white text-lg rounded-lg transition-all duration-200 border border-gray-500/30 hover:border-cyan-500 shadow-sm hover:shadow-lg hover:shadow-cyan-500/30"
            title="Diagonal: Haut-Gauche"
          >
            ↖
          </button>
          <button
            onClick={() => handleDirectionChange(0, 1)}
            className="p-3 bg-gray-600/50 hover:bg-cyan-600 text-white text-lg rounded-lg transition-all duration-200 border border-gray-500/30 hover:border-cyan-500 shadow-sm hover:shadow-lg hover:shadow-cyan-500/30"
            title="Haut"
          >
            ↑
          </button>
          <button
            onClick={() => handleDirectionChange(1, 1)}
            className="p-3 bg-gray-600/50 hover:bg-cyan-600 text-white text-lg rounded-lg transition-all duration-200 border border-gray-500/30 hover:border-cyan-500 shadow-sm hover:shadow-lg hover:shadow-cyan-500/30"
            title="Diagonal: Haut-Droite"
          >
            ↗
          </button>
          {/* Row 2 */}
          <button
            onClick={() => handleDirectionChange(-1, 0)}
            className="p-3 bg-gray-600/50 hover:bg-cyan-600 text-white text-lg rounded-lg transition-all duration-200 border border-gray-500/30 hover:border-cyan-500 shadow-sm hover:shadow-lg hover:shadow-cyan-500/30"
            title="Gauche"
          >
            ←
          </button>
          <button
            onClick={() => handleDirectionChange(0, 0)}
            className="p-3 bg-gray-600/50 hover:bg-red-600 text-white text-lg rounded-lg transition-all duration-200 border border-gray-500/30 hover:border-red-500 shadow-sm hover:shadow-lg hover:shadow-red-500/30"
            title="Stop"
          >
            ⏸
          </button>
          <button
            onClick={() => handleDirectionChange(1, 0)}
            className="p-3 bg-gray-600/50 hover:bg-cyan-600 text-white text-lg rounded-lg transition-all duration-200 border border-gray-500/30 hover:border-cyan-500 shadow-sm hover:shadow-lg hover:shadow-cyan-500/30"
            title="Droite"
          >
            →
          </button>
          {/* Row 3 */}
          <button
            onClick={() => handleDirectionChange(-1, -1)}
            className="p-3 bg-gray-600/50 hover:bg-cyan-600 text-white text-lg rounded-lg transition-all duration-200 border border-gray-500/30 hover:border-cyan-500 shadow-sm hover:shadow-lg hover:shadow-cyan-500/30"
            title="Diagonal: Bas-Gauche"
          >
            ↙
          </button>
          <button
            onClick={() => handleDirectionChange(0, -1)}
            className="p-3 bg-gray-600/50 hover:bg-cyan-600 text-white text-lg rounded-lg transition-all duration-200 border border-gray-500/30 hover:border-cyan-500 shadow-sm hover:shadow-lg hover:shadow-cyan-500/30"
            title="Bas"
          >
            ↓
          </button>
          <button
            onClick={() => handleDirectionChange(1, -1)}
            className="p-3 bg-gray-600/50 hover:bg-cyan-600 text-white text-lg rounded-lg transition-all duration-200 border border-gray-500/30 hover:border-cyan-500 shadow-sm hover:shadow-lg hover:shadow-cyan-500/30"
            title="Diagonal: Bas-Droite"
          >
            ↘
          </button>
        </div>
      </div>

      {/* Color Controls */}
      <div className="bg-gradient-to-br from-gray-700/30 to-gray-800/30 backdrop-blur-sm rounded-lg p-4 border border-gray-600/30">
        <label className="block text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
          <span className="text-lg">🎨</span>
          Colors
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-2 font-medium">
              Color 1
            </label>
            <input
              type="color"
              defaultValue="#ff0000"
              onChange={handleColor1Change}
              className="w-full h-12 rounded-lg cursor-pointer border-2 border-gray-600/50 hover:border-pink-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-2 font-medium">
              Color 2
            </label>
            <input
              type="color"
              defaultValue="#0000ff"
              onChange={handleColor2Change}
              className="w-full h-12 rounded-lg cursor-pointer border-2 border-gray-600/50 hover:border-blue-500/50 transition-colors"
            />
          </div>
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
