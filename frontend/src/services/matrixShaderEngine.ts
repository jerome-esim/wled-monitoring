import * as THREE from 'three';
import type { ShaderUniforms } from '@shared/types';

/**
 * Matrix Shader Renderer
 * Renders a shader across the entire LED matrix (stripCount × ledCount)
 * One shader for all strips, like in MadMapper
 */
export class MatrixShaderRenderer {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private renderTarget: THREE.WebGLRenderTarget;
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial | null = null;
  private stripCount: number;
  private ledCount: number;

  constructor(stripCount: number, ledCount: number) {
    this.stripCount = stripCount;
    this.ledCount = ledCount;

    // Create scene
    this.scene = new THREE.Scene();

    // Create orthographic camera
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Create WebGL renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
    });
    this.renderer.setSize(stripCount, ledCount);

    // Create render target (texture: width = stripCount, height = ledCount)
    this.renderTarget = new THREE.WebGLRenderTarget(stripCount, ledCount, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });

    // Create plane geometry
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry);
    this.scene.add(this.mesh);
  }

  /**
   * Update the shader with new GLSL code and uniforms
   */
  updateShader(fragmentShader: string, uniforms: Partial<ShaderUniforms>): boolean {
    try {
      // Default vertex shader (passthrough)
      const vertexShader = `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `;

      // Create shader material with uniforms
      const shaderUniforms: Record<string, THREE.IUniform> = {
        time: { value: uniforms.time || 0 },
        bpm: { value: uniforms.bpm || 120 },
        resolution: { value: new THREE.Vector2(this.stripCount, this.ledCount) },
        color1: {
          value: new THREE.Vector4(
            ...(uniforms.color1 || [1, 1, 1, 1])
          ),
        },
        color2: {
          value: new THREE.Vector4(
            ...(uniforms.color2 || [1, 1, 1, 1])
          ),
        },
        speed: { value: uniforms.speed || 1.0 },
        direction: { value: (uniforms as any).direction || 1.0 },
      };

      // Create material
      this.material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: shaderUniforms,
      });

      this.mesh.material = this.material;

      return true;
    } catch (error) {
      console.error('Shader compilation error:', error);
      return false;
    }
  }

  /**
   * Update shader uniforms without recompiling
   */
  updateUniforms(uniforms: Partial<ShaderUniforms>): void {
    if (!this.material) return;

    if (uniforms.time !== undefined) {
      this.material.uniforms.time.value = uniforms.time;
    }
    if (uniforms.bpm !== undefined) {
      this.material.uniforms.bpm.value = uniforms.bpm;
    }
    if (uniforms.speed !== undefined) {
      this.material.uniforms.speed.value = uniforms.speed;
    }
    if ((uniforms as any).direction !== undefined) {
      this.material.uniforms.direction.value = (uniforms as any).direction;
    }
    if (uniforms.color1) {
      this.material.uniforms.color1.value.set(...uniforms.color1);
    }
    if (uniforms.color2) {
      this.material.uniforms.color2.value.set(...uniforms.color2);
    }
  }

  /**
   * Render the shader and extract RGB pixel data as a matrix
   * Returns Uint8Array with format: [strip0_led0_R, strip0_led0_G, strip0_led0_B, strip0_led1_R, ...]
   * The matrix is stored column-major (each column is a strip)
   */
  render(): Uint8Array {
    if (!this.material) {
      // Return black pixels if no shader
      return new Uint8Array(this.stripCount * this.ledCount * 3);
    }

    // Render to target
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);

    // Read pixels (RGBA format)
    const pixelBuffer = new Uint8Array(this.stripCount * this.ledCount * 4);
    this.renderer.readRenderTargetPixels(
      this.renderTarget,
      0,
      0,
      this.stripCount,
      this.ledCount,
      pixelBuffer
    );

    // Convert RGBA to RGB
    const rgbData = new Uint8Array(this.stripCount * this.ledCount * 3);
    for (let i = 0; i < this.stripCount * this.ledCount; i++) {
      rgbData[i * 3] = pixelBuffer[i * 4]; // R
      rgbData[i * 3 + 1] = pixelBuffer[i * 4 + 1]; // G
      rgbData[i * 3 + 2] = pixelBuffer[i * 4 + 2]; // B
    }

    return rgbData;
  }

  /**
   * Extract RGB data for a specific strip (column)
   * @param stripIndex 0-based strip index
   * @returns Uint8Array with RGB data for this strip
   */
  extractStripData(stripIndex: number, matrixData: Uint8Array): Uint8Array {
    const stripData = new Uint8Array(this.ledCount * 3);

    for (let led = 0; led < this.ledCount; led++) {
      // Matrix is stored as rows (each row is a horizontal line across all strips)
      // We need to extract a column (one strip)
      const pixelIndex = (led * this.stripCount + stripIndex) * 3;

      stripData[led * 3] = matrixData[pixelIndex]; // R
      stripData[led * 3 + 1] = matrixData[pixelIndex + 1]; // G
      stripData[led * 3 + 2] = matrixData[pixelIndex + 2]; // B
    }

    return stripData;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.renderer.dispose();
    this.renderTarget.dispose();
    this.mesh.geometry.dispose();
    if (this.material) {
      this.material.dispose();
    }
  }
}
