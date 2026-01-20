import { useEffect, useRef } from 'react';
import { useSocket } from './hooks/useSocket';
import { useRenderLoop } from './hooks/useRenderLoop'; // For local preview only
import { useAppStore } from './store/appStore';
// import { ShaderLibrary } from './components/ShaderLibrary/ShaderLibrary';
// import { ShaderEditor } from './components/ShaderEditor/ShaderEditor';
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
  const { setShaders, setStrips, strips, layers, playbackState } = useAppStore();

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

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">LED Shader Controller</h1>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-400">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        <div className="text-sm text-gray-400">
          {strips.length} strips configured
        </div>
      </header>

      {/* Main Layout - 3 Columns */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* Left Column - Layers Panel */}
        <div className="col-span-3 overflow-y-auto">
          <LayerManager />
        </div>

        {/* Center Column - Live Preview */}
        <div className="col-span-6 flex flex-col gap-4 overflow-hidden">
          <div className="h-full">
            <StripCanvas />
          </div>
        </div>

        {/* Right Column - Controls */}
        <div className="col-span-3 overflow-y-auto">
          <Controls />
        </div>
      </div>
    </div>
  );
}

export default App;
