import { create } from 'zustand';
import type {
  StripConfig,
  ShaderConfig,
  StripShaderAssignment,
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
  selectedShaderId: string | null;
  setSelectedShaderId: (id: string | null) => void;

  // Strip-Shader Assignments
  assignments: StripShaderAssignment[];
  setAssignment: (assignment: StripShaderAssignment) => void;
  getAssignment: (stripId: number) => StripShaderAssignment | undefined;
  removeAssignment: (stripId: number) => void;

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

  // Preview data for visual feedback
  previewData: Map<number, Uint8Array>;
  setPreviewData: (stripId: number, data: Uint8Array) => void;
  clearPreviewData: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
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
  selectedShaderId: null,
  setSelectedShaderId: (id) => set({ selectedShaderId: id }),

  // Assignments
  assignments: [],
  setAssignment: (assignment) =>
    set((state) => {
      const existing = state.assignments.find((a) => a.stripId === assignment.stripId);
      if (existing) {
        return {
          assignments: state.assignments.map((a) =>
            a.stripId === assignment.stripId ? assignment : a
          ),
        };
      }
      return {
        assignments: [...state.assignments, assignment],
      };
    }),
  getAssignment: (stripId) => {
    return get().assignments.find((a) => a.stripId === stripId);
  },
  removeAssignment: (stripId) =>
    set((state) => ({
      assignments: state.assignments.filter((a) => a.stripId !== stripId),
    })),

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

  // Preview data
  previewData: new Map(),
  setPreviewData: (stripId, data) =>
    set((state) => {
      const newMap = new Map(state.previewData);
      newMap.set(stripId, data);
      return { previewData: newMap };
    }),
  clearPreviewData: () => set({ previewData: new Map() }),
}));
