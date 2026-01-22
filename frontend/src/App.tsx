import { useEffect, useRef, useState } from 'react';
import { useSocket } from './hooks/useSocket';
import { useRenderLoop } from './hooks/useRenderLoop'; // For local preview only
import { useAppStore } from './store/appStore';
import { ShaderLibrary } from './components/ShaderLibrary/ShaderLibrary';
import { ShaderParameters } from './components/ShaderParameters/ShaderParameters';
import { StripCanvas } from './components/Canvas/StripCanvas';
import { Controls } from './components/Controls/Controls';
import { LayerManager } from './components/LayerManager/LayerManager';
import type { ShaderConfig, LayoutConfig } from '@shared/types';

// Jerome's configuration - 13 strips on 3 controllers
// Each strip: 250 LEDs = 750 channels (3 bytes per LED)
//
// Pattern per controller to maximize LED density:
// Strip 1: U0:1-512 (170 LEDs) + U1:1-240 (80 LEDs) = 250 LEDs
// Strip 2: U1:241-512 (90 LEDs) + U2:1-480 (160 LEDs) = 250 LEDs
// Strip 3: U2:481-512 (10 LEDs) + U3:1-512 (170 LEDs) + U4:1-210 (70 LEDs) = 250 LEDs
// Strip 4: U4:211-512 (100 LEDs) + U5:1-450 (150 LEDs) = 250 LEDs
// (5th strip if needed): U6:1-512 + U7:1-238 = 250 LEDs
const DEFAULT_LAYOUT: LayoutConfig = {
  name: 'Live Setup Jerome - 13 Strips / 3 Controllers',
  strips: [
    // Controller 1 - 192.168.8.10 (4 strips = 6 universes)
    { id: 1, name: 'Strip 1', universe: 0, startChannel: 1, ledCount: 250, position: { x: 50, y: 50 }, orientation: 'horizontal', ipAddress: '192.168.8.10' },
    { id: 2, name: 'Strip 2', universe: 1, startChannel: 241, ledCount: 250, position: { x: 50, y: 100 }, orientation: 'horizontal', ipAddress: '192.168.8.10' },
    { id: 3, name: 'Strip 3', universe: 2, startChannel: 481, ledCount: 250, position: { x: 50, y: 150 }, orientation: 'horizontal', ipAddress: '192.168.8.10' },
    { id: 4, name: 'Strip 4', universe: 4, startChannel: 211, ledCount: 250, position: { x: 50, y: 200 }, orientation: 'horizontal', ipAddress: '192.168.8.10' },

    // Controller 2 - 192.168.8.11 (5 strips = 8 universes)
    { id: 5, name: 'Strip 5', universe: 0, startChannel: 1, ledCount: 250, position: { x: 50, y: 250 }, orientation: 'horizontal', ipAddress: '192.168.8.11' },
    { id: 6, name: 'Strip 6', universe: 1, startChannel: 241, ledCount: 250, position: { x: 50, y: 300 }, orientation: 'horizontal', ipAddress: '192.168.8.11' },
    { id: 7, name: 'Strip 7', universe: 2, startChannel: 481, ledCount: 250, position: { x: 50, y: 350 }, orientation: 'horizontal', ipAddress: '192.168.8.11' },
    { id: 8, name: 'Strip 8', universe: 4, startChannel: 211, ledCount: 250, position: { x: 50, y: 400 }, orientation: 'horizontal', ipAddress: '192.168.8.11' },
    { id: 9, name: 'Strip 9', universe: 6, startChannel: 1, ledCount: 250, position: { x: 50, y: 450 }, orientation: 'horizontal', ipAddress: '192.168.8.11' },

    // Controller 3 - 192.168.8.12 (4 strips = 6 universes)
    { id: 10, name: 'Strip 10', universe: 0, startChannel: 1, ledCount: 250, position: { x: 50, y: 500 }, orientation: 'horizontal', ipAddress: '192.168.8.12' },
    { id: 11, name: 'Strip 11', universe: 1, startChannel: 241, ledCount: 250, position: { x: 50, y: 550 }, orientation: 'horizontal', ipAddress: '192.168.8.12' },
    { id: 12, name: 'Strip 12', universe: 2, startChannel: 481, ledCount: 250, position: { x: 50, y: 600 }, orientation: 'horizontal', ipAddress: '192.168.8.12' },
    { id: 13, name: 'Strip 13', universe: 4, startChannel: 211, ledCount: 250, position: { x: 50, y: 650 }, orientation: 'horizontal', ipAddress: '192.168.8.12' },
  ],
};

function App() {
  const { connected, on, updateConfig, updateLayers, startPlayback, stopPlayback } = useSocket();
  const { setShaders, setStrips, strips, layers, playbackState, shaders, selectedShaderId } = useAppStore();
  const [leftTab, setLeftTab] = useState<'layers' | 'shaders'>('layers');

  // DISABLED: Local render loop - Backend now streams frames directly via WebSocket
  // useRenderLoop();

  // Initialize default shaders once on mount
  // All shaders are now rendered on the Rust backend - no local WebGL needed!
  useEffect(() => {
    const defaultShaders: ShaderConfig[] = [
      {
        id: 'zigzag-chaser',
        name: 'Zigzag Chaser',
        code: '', // Built-in to Rust backend
        type: 'builtin',
        fragmentShader: '', // No longer needed - backend streams frames
      },
      {
        id: 'gradient-sweep',
        name: 'Gradient Sweep',
        code: '', // Built-in to Rust backend
        type: 'builtin',
        fragmentShader: '', // No longer needed - backend streams frames
      },
      {
        id: 'lightning-flash',
        name: 'Lightning Flash',
        code: '', // Built-in to Rust backend
        type: 'builtin',
        fragmentShader: '', // No longer needed - backend streams frames
      },
      {
        id: 'right-to-left',
        name: 'Right to Left',
        code: '', // Built-in to Rust backend
        type: 'builtin',
        fragmentShader: '', // No longer needed - backend streams frames
      },
      {
        id: 'neon-warmup',
        name: 'Neon Warmup',
        code: '', // Built-in to Rust backend
        type: 'builtin',
        fragmentShader: '', // No longer needed - backend streams frames
      },
      {
        id: 'continuous-zigzag-chaser',
        name: 'Continuous Zigzag Chaser',
        code: '', // Built-in to Rust backend
        type: 'builtin',
        fragmentShader: '', // No longer needed - backend streams frames
      },
    ];
    setShaders(defaultShaders);
  }, []); // Run only once on mount

  // Initialize strips on mount
  useEffect(() => {
    if (strips.length === 0) {
      setStrips(DEFAULT_LAYOUT.strips);
    }
  }, []); // Run only once on mount

  // Send strips to backend once when connected
  const hasSentStripsRef = useRef(false);
  useEffect(() => {
    if (connected && strips.length > 0 && !hasSentStripsRef.current) {
      console.log('📤 Sending strips config to backend:', strips.length);
      updateConfigRef.current(strips);
      hasSentStripsRef.current = true;
    }
    if (!connected) {
      hasSentStripsRef.current = false; // Reset on disconnect
    }
  }, [connected, strips]);

  // Subscribe to shader list updates
  useEffect(() => {
    const unsubscribe = on<ShaderConfig[]>('shaders:list', (shaders) => {
      setShaders(shaders);
    });

    return unsubscribe;
  }, [on, setShaders]);

  // Store socket functions in refs to avoid re-triggering on every render
  const updateLayersRef = useRef(updateLayers);
  const updateConfigRef = useRef(updateConfig);
  const startPlaybackRef = useRef(startPlayback);
  const stopPlaybackRef = useRef(stopPlayback);

  updateLayersRef.current = updateLayers;
  updateConfigRef.current = updateConfig;
  startPlaybackRef.current = startPlayback;
  stopPlaybackRef.current = stopPlayback;

  // Sync layers to backend whenever they change
  useEffect(() => {
    if (connected && layers.length >= 0) {
      console.log('📤 Sending layers to backend:', layers.length);
      updateLayersRef.current(layers);
    }
  }, [layers, connected]);

  // Sync playback state to backend
  useEffect(() => {
    if (connected) {
      if (playbackState.isPlaying) {
        console.log('▶️  Starting playback');
        startPlaybackRef.current();
      } else {
        console.log('⏸️  Stopping playback');
        stopPlaybackRef.current();
      }
    }
  }, [playbackState.isPlaying, connected]);

  // Find selected shader for parameters display
  const selectedShader = selectedShaderId ? shaders.find(s => s.id === selectedShaderId) : null;

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700/50 px-6 py-4 flex items-center justify-between shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            LED Shader Controller
          </h1>
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-700/50 rounded-full border border-gray-600/50">
            <div
              className={`w-2 h-2 rounded-full shadow-lg ${
                connected ? 'bg-green-500 shadow-green-500/50 animate-pulse' : 'bg-red-500 shadow-red-500/50'
              }`}
            />
            <span className="text-sm text-gray-300 font-medium">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        <div className="text-sm text-gray-400 bg-gray-700/30 px-4 py-2 rounded-lg border border-gray-600/30">
          <span className="font-semibold text-blue-400">{strips.length}</span> strips configured
        </div>
      </header>

      {/* Main Layout - 3 Columns */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* Left Column - Tabs (Layers / Shaders) */}
        <div className="col-span-3 flex flex-col gap-3 overflow-hidden">
          {/* Tab Buttons */}
          <div className="flex gap-2 bg-gray-800/50 p-1 rounded-lg border border-gray-700/50">
            <button
              onClick={() => setLeftTab('layers')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all duration-200 ${
                leftTab === 'layers'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              Layers ({layers.length})
            </button>
            <button
              onClick={() => setLeftTab('shaders')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all duration-200 ${
                leftTab === 'shaders'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              Shaders ({shaders.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto bg-gray-800/30 rounded-xl p-4 border border-gray-700/50 backdrop-blur-sm">
            {leftTab === 'layers' ? <LayerManager /> : <ShaderLibrary />}
          </div>
        </div>

        {/* Center Column - Live Preview */}
        <div className="col-span-6 flex flex-col gap-4 overflow-hidden">
          <div className="h-full bg-gray-800/30 rounded-xl overflow-hidden border border-gray-700/50 shadow-2xl backdrop-blur-sm">
            <StripCanvas />
          </div>
        </div>

        {/* Right Column - Controls or Shader Parameters */}
        <div className="col-span-3 overflow-y-auto">
          {selectedShader && leftTab === 'shaders' ? (
            <ShaderParameters shader={selectedShader} />
          ) : (
            <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50 backdrop-blur-sm">
              <Controls />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
