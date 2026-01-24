interface PlaybackControlsProps {
  isPlaying: boolean;
  masterBrightness: number;
  connected: boolean;
  onPlayPause: (playing: boolean) => void;
  onBrightnessChange: (brightness: number) => void;
}

export function PlaybackControls({
  isPlaying,
  masterBrightness,
  connected,
  onPlayPause,
  onBrightnessChange
}: PlaybackControlsProps) {
  return (
    <div className="playback-controls">
      <div className="connection-status">
        <div className={`status-indicator ${connected ? 'connected' : 'disconnected'}`} />
        <span>{connected ? 'Connected' : 'Disconnected'}</span>
      </div>

      <button
        className={`play-pause-btn ${isPlaying ? 'playing' : 'paused'}`}
        onClick={() => onPlayPause(!isPlaying)}
        disabled={!connected}
      >
        {isPlaying ? '⏸ Pause' : '▶ Play'}
      </button>

      <div className="brightness-control">
        <label>Master Brightness</label>
        <div className="brightness-slider">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={masterBrightness}
            onChange={(e) => onBrightnessChange(parseFloat(e.target.value))}
            disabled={!connected}
          />
          <span className="brightness-value">{Math.round(masterBrightness * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
