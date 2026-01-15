import * as THREE from 'three';
import type { ShaderUniforms, ShaderLayer, BlendMode } from '@shared/types';
import { MatrixShaderRenderer } from './matrixShaderEngine';

/**
 * Layered Shader Renderer
 * Combines multiple shader layers with blending modes
 */
export class LayeredShaderRenderer {
  private stripCount: number;
  private ledCount: number;
  private layers: Map<string, MatrixShaderRenderer> = new Map();
  private finalRenderer: THREE.WebGLRenderer;
  private finalRenderTarget: THREE.WebGLRenderTarget;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private composeMaterial: THREE.ShaderMaterial;
  private plane: THREE.Mesh;

  constructor(stripCount: number, ledCount: number) {
    this.stripCount = stripCount;
    this.ledCount = ledCount;

    // Create final compositing renderer
    this.finalRenderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
    });
    this.finalRenderer.setSize(stripCount, ledCount);

    // Create final render target
    this.finalRenderTarget = new THREE.WebGLRenderTarget(stripCount, ledCount, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });

    // Create scene for compositing
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Create plane for compositing
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.composeMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D layers[8];
        uniform float opacities[8];
        uniform int blendModes[8];
        uniform int layerCount;

        vec3 blendNormal(vec3 base, vec3 blend, float alpha) {
          return mix(base, blend, alpha);
        }

        vec3 blendAdd(vec3 base, vec3 blend, float alpha) {
          return base + blend * alpha;
        }

        vec3 blendMultiply(vec3 base, vec3 blend, float alpha) {
          return mix(base, base * blend, alpha);
        }

        vec3 blendScreen(vec3 base, vec3 blend, float alpha) {
          vec3 result = vec3(1.0) - (vec3(1.0) - base) * (vec3(1.0) - blend);
          return mix(base, result, alpha);
        }

        void main() {
          vec3 finalColor = vec3(0.0);

          for (int i = 0; i < 8; i++) {
            if (i >= layerCount) break;

            vec4 layerColor = texture2D(layers[i], vUv);
            float opacity = opacities[i] * layerColor.a;

            if (i == 0) {
              finalColor = layerColor.rgb * opacity;
            } else {
              int mode = blendModes[i];
              if (mode == 0) { // normal
                finalColor = blendNormal(finalColor, layerColor.rgb, opacity);
              } else if (mode == 1) { // add
                finalColor = blendAdd(finalColor, layerColor.rgb, opacity);
              } else if (mode == 2) { // multiply
                finalColor = blendMultiply(finalColor, layerColor.rgb, opacity);
              } else if (mode == 3) { // screen
                finalColor = blendScreen(finalColor, layerColor.rgb, opacity);
              }
            }
          }

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      uniforms: {
        layers: { value: [] },
        opacities: { value: [] },
        blendModes: { value: [] },
        layerCount: { value: 0 },
      },
    });

    this.plane = new THREE.Mesh(geometry, this.composeMaterial);
    this.scene.add(this.plane);
  }

  /**
   * Add or update a layer
   */
  addLayer(layerId: string, fragmentShader: string, uniforms: Partial<ShaderUniforms>): boolean {
    let renderer = this.layers.get(layerId);

    if (!renderer) {
      renderer = new MatrixShaderRenderer(this.stripCount, this.ledCount);
      this.layers.set(layerId, renderer);
    }

    return renderer.updateShader(fragmentShader, uniforms);
  }

  /**
   * Remove a layer
   */
  removeLayer(layerId: string): void {
    const renderer = this.layers.get(layerId);
    if (renderer) {
      renderer.dispose();
      this.layers.delete(layerId);
    }
  }

  /**
   * Update layer uniforms
   */
  updateLayerUniforms(layerId: string, uniforms: Partial<ShaderUniforms>): void {
    const renderer = this.layers.get(layerId);
    if (renderer) {
      renderer.updateUniforms(uniforms);
    }
  }

  /**
   * Render all layers and composite them
   */
  render(layerConfigs: ShaderLayer[]): Uint8Array {
    // Filter enabled layers and sort by order
    const enabledLayers = layerConfigs
      .filter(layer => layer.enabled && this.layers.has(layer.id))
      .sort((a, b) => a.order - b.order);

    if (enabledLayers.length === 0) {
      return new Uint8Array(this.stripCount * this.ledCount * 3);
    }

    // Render each layer
    const textures: THREE.Texture[] = [];
    const opacities: number[] = [];
    const blendModes: number[] = [];

    enabledLayers.forEach(layerConfig => {
      const renderer = this.layers.get(layerConfig.id)!;

      // Render the layer
      renderer.render();

      // Get the render target texture
      const renderTarget = (renderer as any).renderTarget as THREE.WebGLRenderTarget;
      textures.push(renderTarget.texture);
      opacities.push(layerConfig.opacity);
      blendModes.push(this.blendModeToInt(layerConfig.blendMode));
    });

    // Update compositing shader uniforms
    this.composeMaterial.uniforms.layers.value = textures;
    this.composeMaterial.uniforms.opacities.value = opacities;
    this.composeMaterial.uniforms.blendModes.value = blendModes;
    this.composeMaterial.uniforms.layerCount.value = textures.length;

    // Render composite
    this.finalRenderer.setRenderTarget(this.finalRenderTarget);
    this.finalRenderer.render(this.scene, this.camera);

    // Read pixels
    const pixelBuffer = new Uint8Array(this.stripCount * this.ledCount * 4);
    this.finalRenderer.readRenderTargetPixels(
      this.finalRenderTarget,
      0,
      0,
      this.stripCount,
      this.ledCount,
      pixelBuffer
    );

    // Convert RGBA to RGB
    const rgbData = new Uint8Array(this.stripCount * this.ledCount * 3);
    for (let i = 0; i < this.stripCount * this.ledCount; i++) {
      rgbData[i * 3] = pixelBuffer[i * 4];
      rgbData[i * 3 + 1] = pixelBuffer[i * 4 + 1];
      rgbData[i * 3 + 2] = pixelBuffer[i * 4 + 2];
    }

    return rgbData;
  }

  /**
   * Extract RGB data for a specific strip (column)
   */
  extractStripData(stripIndex: number, matrixData: Uint8Array): Uint8Array {
    const stripData = new Uint8Array(this.ledCount * 3);

    for (let led = 0; led < this.ledCount; led++) {
      const pixelIndex = (led * this.stripCount + stripIndex) * 3;
      stripData[led * 3] = matrixData[pixelIndex];
      stripData[led * 3 + 1] = matrixData[pixelIndex + 1];
      stripData[led * 3 + 2] = matrixData[pixelIndex + 2];
    }

    return stripData;
  }

  private blendModeToInt(mode: BlendMode): number {
    switch (mode) {
      case 'normal': return 0;
      case 'add': return 1;
      case 'multiply': return 2;
      case 'screen': return 3;
      default: return 0;
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.layers.forEach(renderer => renderer.dispose());
    this.layers.clear();
    this.finalRenderer.dispose();
    this.finalRenderTarget.dispose();
    this.plane.geometry.dispose();
    this.composeMaterial.dispose();
  }
}
