import type { ShaderConfig } from '../../../shared/types.js';

export class ShaderService {
  private shaders: Map<string, ShaderConfig> = new Map();

  constructor() {
    // Initialize with 3 base shaders
    this.initializeBaseShaders();
  }

  private initializeBaseShaders(): void {
    const baseShaders: ShaderConfig[] = [
      {
        id: 'rainbow-wave',
        name: 'Rainbow Wave',
        category: 'Waves',
        fragmentShader: `
precision highp float;

uniform float time;
uniform float speed;
uniform vec2 resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;

  float wave = sin(uv.x * 10.0 + time * speed) * 0.5 + 0.5;

  vec3 rainbow = vec3(
    sin(time + uv.x * 3.14159),
    sin(time + uv.x * 3.14159 + 2.0),
    sin(time + uv.x * 3.14159 + 4.0)
  ) * 0.5 + 0.5;

  gl_FragColor = vec4(rainbow * wave, 1.0);
}
`,
        uniforms: {
          speed: 1.0,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'strobe-bpm',
        name: 'Strobe BPM',
        category: 'Strobes',
        fragmentShader: `
precision highp float;

uniform float time;
uniform float bpm;
uniform vec4 color1;
uniform vec2 resolution;

void main() {
  float beat = mod(time * bpm / 60.0, 1.0);
  float strobe = step(0.5, beat);

  gl_FragColor = vec4(color1.rgb * strobe, 1.0);
}
`,
        uniforms: {
          bpm: 120.0,
          color1: [1.0, 1.0, 1.0, 1.0],
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'gradient-sweep',
        name: 'Gradient Sweep',
        category: 'Gradients',
        fragmentShader: `
precision highp float;

uniform float time;
uniform float speed;
uniform float direction;
uniform vec4 color1;
uniform vec4 color2;
uniform vec2 resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;

  float pos = mod(uv.x + time * speed * direction, 1.0);
  vec3 color = mix(color1.rgb, color2.rgb, pos);

  gl_FragColor = vec4(color, 1.0);
}
`,
        uniforms: {
          speed: 0.5,
          direction: 1.0,
          color1: [1.0, 0.0, 0.0, 1.0],
          color2: [0.0, 0.0, 1.0, 1.0],
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    baseShaders.forEach((shader) => {
      this.shaders.set(shader.id, shader);
    });
  }

  /**
   * Get all shaders
   */
  getAllShaders(): ShaderConfig[] {
    return Array.from(this.shaders.values());
  }

  /**
   * Get shader by ID
   */
  getShader(id: string): ShaderConfig | undefined {
    return this.shaders.get(id);
  }

  /**
   * Create a new shader
   */
  createShader(shader: Omit<ShaderConfig, 'id' | 'createdAt' | 'updatedAt'>): ShaderConfig {
    const id = this.generateId();
    const now = Date.now();
    const newShader: ShaderConfig = {
      ...shader,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.shaders.set(id, newShader);
    return newShader;
  }

  /**
   * Update an existing shader
   */
  updateShader(id: string, updates: Partial<ShaderConfig>): ShaderConfig | undefined {
    const shader = this.shaders.get(id);
    if (!shader) {
      return undefined;
    }

    const updatedShader: ShaderConfig = {
      ...shader,
      ...updates,
      id, // Prevent ID change
      createdAt: shader.createdAt, // Preserve creation time
      updatedAt: Date.now(),
    };

    this.shaders.set(id, updatedShader);
    return updatedShader;
  }

  /**
   * Delete a shader
   */
  deleteShader(id: string): boolean {
    return this.shaders.delete(id);
  }

  /**
   * Get shaders by category
   */
  getShadersByCategory(category: string): ShaderConfig[] {
    return Array.from(this.shaders.values()).filter((s) => s.category === category);
  }

  private generateId(): string {
    return `shader-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
