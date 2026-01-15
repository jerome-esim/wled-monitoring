import { useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import { useRenderLoop } from './hooks/useRenderLoop';
import { useAppStore } from './store/appStore';
// import { ShaderLibrary } from './components/ShaderLibrary/ShaderLibrary';
// import { ShaderEditor } from './components/ShaderEditor/ShaderEditor';
import { StripCanvas } from './components/Canvas/StripCanvas';
import { Controls } from './components/Controls/Controls';
import { LayerManager } from './components/LayerManager/LayerManager';
import type { ShaderConfig, LayoutConfig } from '@shared/types';

// Jerome's default configuration - 12 strips
const DEFAULT_LAYOUT: LayoutConfig = {
  name: 'Live Setup Jerome - 12 Strips',
  strips: [
    { id: 1, name: 'Strip 1', universe: 0, startChannel: 1, ledCount: 250, position: { x: 50, y: 50 }, orientation: 'horizontal', ipAddress: '192.168.1.10' },
    { id: 2, name: 'Strip 2', universe: 2, startChannel: 1, ledCount: 250, position: { x: 50, y: 100 }, orientation: 'horizontal', ipAddress: '192.168.1.11' },
    { id: 3, name: 'Strip 3', universe: 4, startChannel: 1, ledCount: 250, position: { x: 50, y: 150 }, orientation: 'horizontal', ipAddress: '192.168.1.12' },
    { id: 4, name: 'Strip 4', universe: 6, startChannel: 1, ledCount: 250, position: { x: 50, y: 200 }, orientation: 'horizontal', ipAddress: '192.168.1.13' },
    { id: 5, name: 'Strip 5', universe: 8, startChannel: 1, ledCount: 250, position: { x: 50, y: 250 }, orientation: 'horizontal', ipAddress: '192.168.1.14' },
    { id: 6, name: 'Strip 6', universe: 10, startChannel: 1, ledCount: 250, position: { x: 50, y: 300 }, orientation: 'horizontal', ipAddress: '192.168.1.15' },
    { id: 7, name: 'Strip 7', universe: 12, startChannel: 1, ledCount: 250, position: { x: 50, y: 350 }, orientation: 'horizontal', ipAddress: '192.168.1.16' },
    { id: 8, name: 'Strip 8', universe: 14, startChannel: 1, ledCount: 250, position: { x: 50, y: 400 }, orientation: 'horizontal', ipAddress: '192.168.1.17' },
    { id: 9, name: 'Strip 9', universe: 16, startChannel: 1, ledCount: 250, position: { x: 50, y: 450 }, orientation: 'horizontal', ipAddress: '192.168.1.18' },
    { id: 10, name: 'Strip 10', universe: 18, startChannel: 1, ledCount: 250, position: { x: 50, y: 500 }, orientation: 'horizontal', ipAddress: '192.168.1.19' },
    { id: 11, name: 'Strip 11', universe: 20, startChannel: 1, ledCount: 250, position: { x: 50, y: 550 }, orientation: 'horizontal', ipAddress: '192.168.1.20' },
    { id: 12, name: 'Strip 12', universe: 22, startChannel: 1, ledCount: 250, position: { x: 50, y: 600 }, orientation: 'horizontal', ipAddress: '192.168.1.21' },
  ],
};

function App() {
  const { connected, on, updateConfig } = useSocket();
  const { setShaders, setStrips, strips } = useAppStore();

  // Start render loop for Art-Net output
  useRenderLoop();

  // Initialize on mount
  useEffect(() => {
    // Load default layout if no strips configured
    if (strips.length === 0) {
      setStrips(DEFAULT_LAYOUT.strips);
      updateConfig(DEFAULT_LAYOUT.strips);
    }

    // Subscribe to shader list updates
    const unsubscribe = on<ShaderConfig[]>('shaders:list', (shaders) => {
      setShaders(shaders);
    });

    return unsubscribe;
  }, [on, setShaders, setStrips, strips.length, updateConfig]);

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
