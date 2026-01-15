import { create } from 'zustand';
import type {
  StripConfig,
  ShaderConfig,
  ShaderUniforms,
  PlaybackState,
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

  // Active global shader (one shader for all strips)
  activeShaderId: string | null;
  setActiveShaderId: (id: string | null) => void;
  selectedShaderId: string | null;
  setSelectedShaderId: (id: string | null) => void;

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

  // Active shader (global for all strips)
  activeShaderId: null,
  setActiveShaderId: (id) => set({ activeShaderId: id }),
  selectedShaderId: null,
  setSelectedShaderId: (id) => set({ selectedShaderId: id }),

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
}));
