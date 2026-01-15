// Shared types for LED Shader Controller

export interface StripConfig {
  id: number;
  name: string;
  universe: number;
  startChannel: number;
  ledCount: number;
  position: {
    x: number;
    y: number;
  };
  orientation: 'horizontal' | 'vertical';
  ipAddress: string;
}

export interface LayoutConfig {
  name: string;
  strips: StripConfig[];
}

export interface ShaderUniforms {
  time: number;
  bpm: number;
  resolution: [number, number];
  color1: [number, number, number, number];
  color2: [number, number, number, number];
  speed: number;
  [key: string]: number | number[];
}

export interface ShaderConfig {
  id: string;
  name: string;
  category: string;
  fragmentShader: string;
  uniforms: Partial<ShaderUniforms>;
  createdAt: number;
  updatedAt: number;
}

export interface StripShaderAssignment {
  stripId: number;
  shaderId: string;
  params: Partial<ShaderUniforms>;
}

export interface PlaybackState {
  isPlaying: boolean;
  bpm: number;
  fps: number;
  startTime: number;
}

export interface PresetConfig {
  id: string;
  name: string;
  assignments: StripShaderAssignment[];
  globalParams: Partial<ShaderUniforms>;
  createdAt: number;
}

// WebSocket Events
export type WSClientEvents =
  | { event: 'config:update'; data: StripConfig[] }
  | { event: 'shader:apply'; data: StripShaderAssignment }
  | { event: 'params:update'; data: Partial<ShaderUniforms> }
  | { event: 'playback:start' }
  | { event: 'playback:stop' }
  | { event: 'bpm:update'; data: { bpm: number } }
  | { event: 'shader:create'; data: ShaderConfig }
  | { event: 'shader:update'; data: ShaderConfig }
  | { event: 'shader:delete'; data: { id: string } };

export type WSServerEvents =
  | { event: 'fps:update'; data: { fps: number } }
  | { event: 'artnet:error'; data: { message: string } }
  | { event: 'shader:compiled'; data: { id: string; success: boolean; error?: string } }
  | { event: 'playback:state'; data: PlaybackState };

// Art-Net Constants
export const ARTNET_PORT = 6454;
export const ARTNET_HEADER = 'Art-Net\0';
export const ARTNET_OPCODE_DMX = 0x5000;
export const ARTNET_PROTOCOL_VERSION = 14;
export const MAX_CHANNELS_PER_UNIVERSE = 512;
export const CHANNELS_PER_LED = 3; // RGB
export const MAX_LEDS_PER_UNIVERSE = Math.floor(MAX_CHANNELS_PER_UNIVERSE / CHANNELS_PER_LED); // 170
