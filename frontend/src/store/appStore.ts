import { create } from 'zustand';
import type {
  StripConfig,
  ShaderConfig,
  ShaderUniforms,
  PlaybackState,
  ShaderLayer,
} from '@shared/types';

interface AppState {
  // Strips
  strips: StripConfig[];
  setStrips: (strips: StripConfig[]) => void;
  addStrip: (strip: StripConfig) => void;
  updateStrip: (id: number, updates: Partial<StripConfig>) => void;
  removeStrip: (id: number) => void;

  // Shaders
  shaders: ShaderConfig[];
  setShaders: (shaders: ShaderConfig[]) => void;
  addShader: (shader: ShaderConfig) => void;
  updateShaderInStore: (id: string, updates: Partial<ShaderConfig>) => void;
  removeShader: (id: string) => void;

  // Active global shader (one shader for all strips) - kept for backward compatibility
  activeShaderId: string | null;
  setActiveShaderId: (id: string | null) => void;
  selectedShaderId: string | null;
  setSelectedShaderId: (id: string | null) => void;

  // Layers (new multi-shader system)
  layers: ShaderLayer[];
  addLayer: (shaderId: string, name: string) => void;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<ShaderLayer>) => void;
  toggleLayer: (layerId: string) => void;
  moveLayer: (layerId: string, direction: 'up' | 'down') => void;
  selectedLayerId: string | null;
  setSelectedLayerId: (id: string | null) => void;

  // Playback
  playbackState: PlaybackState;
  setPlaybackState: (state: Partial<PlaybackState>) => void;

  // Global uniforms
  globalUniforms: Partial<ShaderUniforms>;
  setGlobalUniforms: (uniforms: Partial<ShaderUniforms>) => void;
  updateUniform: <K extends keyof ShaderUniforms>(
    key: K,
    value: ShaderUniforms[K]
  ) => void;

  // Global matrix preview data (stripCount × ledCount)
  matrixData: Uint8Array | null;
  setMatrixData: (data: Uint8Array) => void;
  clearMatrixData: () => void;

  // Master brightness / dimmer (0.0 to 1.0)
  masterBrightness: number;
  setMasterBrightness: (brightness: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Strips
  strips: [],
  setStrips: (strips) => set({ strips }),
  addStrip: (strip) =>
    set((state) => ({
      strips: [...state.strips, strip],
    })),
  updateStrip: (id, updates) =>
    set((state) => ({
      strips: state.strips.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),
  removeStrip: (id) =>
    set((state) => ({
      strips: state.strips.filter((s) => s.id !== id),
    })),

  // Shaders
  shaders: [],
  setShaders: (shaders) => set({ shaders }),
  addShader: (shader) =>
    set((state) => ({
      shaders: [...state.shaders, shader],
    })),
  updateShaderInStore: (id, updates) =>
    set((state) => ({
      shaders: state.shaders.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),
  removeShader: (id) =>
    set((state) => ({
      shaders: state.shaders.filter((s) => s.id !== id),
    })),

  // Active shader (global for all strips) - kept for backward compatibility
  activeShaderId: null,
  setActiveShaderId: (id) => set({ activeShaderId: id }),
  selectedShaderId: null,
  setSelectedShaderId: (id) => set({ selectedShaderId: id }),

  // Layers
  layers: [],
  addLayer: (shaderId, name) =>
    set((state) => {
      const maxOrder = state.layers.reduce((max, l) => Math.max(max, l.order), -1);
      const newLayer: ShaderLayer = {
        id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        shaderId,
        name,
        enabled: true,
        opacity: 1.0,
        blendMode: state.layers.length === 0 ? 'normal' : 'add',
        order: maxOrder + 1,
        params: {
          // Default parameters for all shaders
          speed: 1.0,
          intensity: 1.0,
          color1: [1.0, 0.0, 0.0, 1.0],
          color2: [0.0, 0.0, 1.0, 1.0],
          trailLength: 0.2,
          chaserSize: 0.05,
          density: 1.0,
          bpm: 120.0,
          direction: [1.0, 0.0],
          reverse: 0.0,
        },
      };
      return { layers: [...state.layers, newLayer] };
    }),
  removeLayer: (layerId) =>
    set((state) => ({
      layers: state.layers.filter((l) => l.id !== layerId),
    })),
  updateLayer: (layerId, updates) =>
    set((state) => ({
      layers: state.layers.map((l) => (l.id === layerId ? { ...l, ...updates } : l)),
    })),
  toggleLayer: (layerId) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, enabled: !l.enabled } : l
      ),
    })),
  moveLayer: (layerId, direction) =>
    set((state) => {
      const layers = [...state.layers].sort((a, b) => a.order - b.order);
      const index = layers.findIndex((l) => l.id === layerId);
      if (index === -1) return state;

      const newIndex = direction === 'up' ? index + 1 : index - 1;
      if (newIndex < 0 || newIndex >= layers.length) return state;

      // Swap orders
      const temp = layers[index].order;
      layers[index].order = layers[newIndex].order;
      layers[newIndex].order = temp;

      return { layers };
    }),
  selectedLayerId: null,
  setSelectedLayerId: (id) => set({ selectedLayerId: id }),

  // Playback
  playbackState: {
    isPlaying: false,
    bpm: 120,
    fps: 0,
    startTime: 0,
  },
  setPlaybackState: (state) =>
    set((prev) => ({
      playbackState: { ...prev.playbackState, ...state },
    })),

  // Global uniforms
  globalUniforms: {
    time: 0,
    bpm: 120,
    speed: 1.0,
    intensity: 1.0,
    direction: [1.0, 0.0], // [x, y] vector for gradient direction
    color1: [1, 0, 0, 1],
    color2: [0, 0, 1, 1],
  },
  setGlobalUniforms: (uniforms) =>
    set((state) => ({
      globalUniforms: { ...state.globalUniforms, ...uniforms },
    })),
  updateUniform: (key, value) =>
    set((state) => ({
      globalUniforms: { ...state.globalUniforms, [key]: value },
    })),

  // Global matrix data
  matrixData: null,
  setMatrixData: (data) => set({ matrixData: data }),
  clearMatrixData: () => set({ matrixData: null }),

  // Master brightness / dimmer
  masterBrightness: 1.0,
  setMasterBrightness: (brightness) => set({ masterBrightness: brightness }),
}));
