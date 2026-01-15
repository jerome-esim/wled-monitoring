import * as THREE from 'three';
import type { ShaderUniforms } from '@shared/types';

export class ShaderRenderer {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private renderTarget: THREE.WebGLRenderTarget;
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial | null = null;
  private ledCount: number;

  constructor(ledCount: number) {
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
    this.renderer.setSize(ledCount, 1);

    // Create render target (texture to render to)
    this.renderTarget = new THREE.WebGLRenderTarget(ledCount, 1, {
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
        resolution: { value: new THREE.Vector2(this.ledCount, 1) },
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
    if (uniforms.color1) {
      this.material.uniforms.color1.value.set(...uniforms.color1);
    }
    if (uniforms.color2) {
      this.material.uniforms.color2.value.set(...uniforms.color2);
    }
  }

  /**
   * Render the shader and extract RGB pixel data
   */
  render(): Uint8Array {
    if (!this.material) {
      // Return black pixels if no shader
      return new Uint8Array(this.ledCount * 3);
    }

    // Render to target
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);

    // Read pixels
    const pixelBuffer = new Uint8Array(this.ledCount * 4); // RGBA
    this.renderer.readRenderTargetPixels(
      this.renderTarget,
      0,
      0,
      this.ledCount,
      1,
      pixelBuffer
    );

    // Convert RGBA to RGB
    const rgbData = new Uint8Array(this.ledCount * 3);
    for (let i = 0; i < this.ledCount; i++) {
      rgbData[i * 3] = pixelBuffer[i * 4]; // R
      rgbData[i * 3 + 1] = pixelBuffer[i * 4 + 1]; // G
      rgbData[i * 3 + 2] = pixelBuffer[i * 4 + 2]; // B
    }

    return rgbData;
  }

  /**
   * Get a preview canvas for display
   */
  getPreviewCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Render current frame
    const rgbData = this.render();

    // Draw to canvas
    const imageData = ctx.createImageData(this.ledCount, 1);
    for (let i = 0; i < this.ledCount; i++) {
      imageData.data[i * 4] = rgbData[i * 3]; // R
      imageData.data[i * 4 + 1] = rgbData[i * 3 + 1]; // G
      imageData.data[i * 4 + 2] = rgbData[i * 3 + 2]; // B
      imageData.data[i * 4 + 3] = 255; // A
    }

    // Create temporary canvas at 1px height
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.ledCount;
    tempCanvas.height = 1;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.putImageData(imageData, 0, 0);
      // Scale up to preview size
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tempCanvas, 0, 0, width, height);
    }

    return canvas;
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
