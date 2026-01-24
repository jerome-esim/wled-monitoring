import { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { ShaderLayer } from './types';
import { Preview } from './components/Preview';
import { LayerList } from './components/LayerList';
import { PlaybackControls } from './components/PlaybackControls';
import './App.css';

function App() {
  const {
    connected,
    fps,
    frameData,
    error,
    updateLayers,
    setPlaying,
    setMasterBrightness
  } = useWebSocket();

  const [layers, setLayers] = useState<ShaderLayer[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterBrightness, setMasterBrightnessState] = useState(1.0);

  // Send layers to backend whenever they change
  useEffect(() => {
    if (connected) {
      console.log('Sending layers to backend:', layers.length, 'layers');
      updateLayers(layers);
    }
  }, [layers, connected, updateLayers]);

  // Log connection status
  useEffect(() => {
    console.log('WebSocket connected:', connected);
  }, [connected]);

  // Log playing status and frame data
  useEffect(() => {
    console.log('Playing status:', isPlaying);
  }, [isPlaying]);

  useEffect(() => {
    if (frameData) {
      console.log('App: Frame data received');
    }
  }, [frameData]);

  const handlePlayPause = (playing: boolean) => {
    console.log('Play/Pause clicked:', playing);
    setIsPlaying(playing);
    setPlaying(playing);
  };

  const handleBrightnessChange = (brightness: number) => {
    setMasterBrightnessState(brightness);
    setMasterBrightness(brightness);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>WLED Monitoring - Shader Layers</h1>
        <PlaybackControls
          isPlaying={isPlaying}
          masterBrightness={masterBrightness}
          connected={connected}
          onPlayPause={handlePlayPause}
          onBrightnessChange={handleBrightnessChange}
        />
      </header>

      {error && (
        <div className="error-banner">
          Error: {error}
        </div>
      )}

      <div className="app-content">
        <div className="left-panel">
          <LayerList layers={layers} onChange={setLayers} />
        </div>

        <div className="right-panel">
          <Preview frameData={frameData} fps={fps} />
        </div>
      </div>
    </div>
  );
}

export default App;
