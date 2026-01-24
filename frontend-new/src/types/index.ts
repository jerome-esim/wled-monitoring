// Types matching backend-rust structures

export type BlendMode = 'normal' | 'add' | 'multiply' | 'screen';

export interface ShaderParams {
  color1?: [number, number, number, number];  // RGBA 0-1
  color2?: [number, number, number, number];  // RGBA 0-1
  speed?: number;
  intensity?: number;
  density?: number;
  chaserSize?: number;
  trailLength?: number;
  reverse?: number;  // 0.0 or 1.0
  direction?: [number, number];  // [x, y]
  bpm?: number;
  warmupDuration?: number;
  onDuration?: number;
  offDuration?: number;
}

export interface ShaderLayer {
  id: string;
  shaderId: string;
  name: string;
  enabled: boolean;
  opacity: number;  // 0.0-1.0
  blendMode: BlendMode;
  order: number;
  params: ShaderParams;
}

export interface StripConfig {
  id: number;
  name: string;
  universe: number;
  startChannel: number;
  ledCount: number;
  ipAddress: string;
}

// WebSocket Messages - Client to Server
export type ClientMessage =
  | { type: 'updateLayers'; layers: ShaderLayer[] }
  | { type: 'updateStrips'; strips: StripConfig[] }
  | { type: 'updateGlobalParams'; params: ShaderParams }
  | { type: 'setPlaying'; playing: boolean }
  | { type: 'setMasterBrightness'; brightness: number };

// WebSocket Messages - Server to Client
export type ServerMessage =
  | { type: 'fpsUpdate'; fps: number }
  | { type: 'frameUpdate'; data: string; width: number; height: number }
  | { type: 'error'; message: string };

// Shader definitions with their parameters
export interface ShaderDefinition {
  id: string;
  name: string;
  description: string;
  params: {
    [key: string]: {
      label: string;
      type: 'color' | 'number' | 'boolean' | 'direction';
      min?: number;
      max?: number;
      step?: number;
      default?: any;
    };
  };
}

export const AVAILABLE_SHADERS: ShaderDefinition[] = [
  {
    id: 'zigzag-chaser',
    name: 'Zigzag Chaser',
    description: 'Mobile chasers in zigzag pattern',
    params: {
      speed: { label: 'Speed', type: 'number', min: 0.1, max: 5, step: 0.1, default: 1.0 },
      density: { label: 'Density', type: 'number', min: 1, max: 10, step: 1, default: 1 },
      chaserSize: { label: 'Chaser Size', type: 'number', min: 0.01, max: 0.2, step: 0.01, default: 0.05 },
      trailLength: { label: 'Trail Length', type: 'number', min: 0.01, max: 0.5, step: 0.01, default: 0.1 },
      reverse: { label: 'Reverse', type: 'boolean', default: false },
      color1: { label: 'Color 1', type: 'color', default: [1, 0, 0, 1] },
      color2: { label: 'Color 2', type: 'color', default: [0, 0, 1, 1] }
    }
  },
  {
    id: 'continuous-zigzag-chaser',
    name: 'Continuous Zigzag Chaser',
    description: 'True continuous serpentine path',
    params: {
      speed: { label: 'Speed', type: 'number', min: 0.1, max: 5, step: 0.1, default: 1.0 },
      density: { label: 'Density', type: 'number', min: 1, max: 10, step: 1, default: 1 },
      chaserSize: { label: 'Chaser Size', type: 'number', min: 0.01, max: 0.2, step: 0.01, default: 0.05 },
      trailLength: { label: 'Trail Length', type: 'number', min: 0.01, max: 0.5, step: 0.01, default: 0.1 },
      reverse: { label: 'Reverse', type: 'boolean', default: false },
      color1: { label: 'Color 1', type: 'color', default: [0, 1, 0, 1] },
      color2: { label: 'Color 2', type: 'color', default: [0, 0, 1, 1] }
    }
  },
  {
    id: 'gradient-sweep',
    name: 'Gradient Sweep',
    description: 'Directional animated gradient',
    params: {
      speed: { label: 'Speed', type: 'number', min: 0.1, max: 5, step: 0.1, default: 1.0 },
      direction: { label: 'Direction', type: 'direction', default: [1, 0] },
      color1: { label: 'Color 1', type: 'color', default: [1, 0, 1, 1] },
      color2: { label: 'Color 2', type: 'color', default: [0, 1, 1, 1] },
      intensity: { label: 'Intensity', type: 'number', min: 0, max: 2, step: 0.1, default: 1.0 }
    }
  },
  {
    id: 'lightning-flash',
    name: 'Lightning Flash',
    description: 'BPM-synchronized lightning flashes',
    params: {
      bpm: { label: 'BPM', type: 'number', min: 60, max: 180, step: 1, default: 120 },
      color1: { label: 'Color', type: 'color', default: [1, 1, 1, 1] },
      intensity: { label: 'Intensity', type: 'number', min: 0, max: 2, step: 0.1, default: 1.0 }
    }
  },
  {
    id: 'right-to-left',
    name: 'Right to Left',
    description: 'Wave moving from right to left',
    params: {
      speed: { label: 'Speed', type: 'number', min: 0.1, max: 5, step: 0.1, default: 1.0 },
      color1: { label: 'Color 1', type: 'color', default: [1, 0.5, 0, 1] },
      color2: { label: 'Color 2', type: 'color', default: [0.5, 0, 1, 1] },
      trailLength: { label: 'Trail Length', type: 'number', min: 0.01, max: 0.5, step: 0.01, default: 0.1 }
    }
  },
  {
    id: 'neon-warmup',
    name: 'Neon Warmup',
    description: 'Neon lights warming up progressively',
    params: {
      speed: { label: 'Speed', type: 'number', min: 0.1, max: 5, step: 0.1, default: 1.0 },
      density: { label: 'Density', type: 'number', min: 1, max: 10, step: 1, default: 1 },
      color1: { label: 'Color 1', type: 'color', default: [1, 0, 0.5, 1] },
      color2: { label: 'Color 2', type: 'color', default: [0, 0.5, 1, 1] },
      warmupDuration: { label: 'Warmup Duration', type: 'number', min: 0.1, max: 2, step: 0.1, default: 0.5 },
      onDuration: { label: 'On Duration', type: 'number', min: 0.5, max: 5, step: 0.1, default: 2.0 },
      offDuration: { label: 'Off Duration', type: 'number', min: 0.1, max: 2, step: 0.1, default: 0.3 }
    }
  }
];
