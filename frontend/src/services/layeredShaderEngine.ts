import * as THREE from 'three';
import type { ShaderUniforms, ShaderLayer, BlendMode } from '@shared/types';

/**
 * Layer data: material + render target for each layer
 */
interface LayerData {
  material: THREE.ShaderMaterial;
  renderTarget: THREE.WebGLRenderTarget;
  mesh: THREE.Mesh;
  scene: THREE.Scene;
}

/**
 * Layered Shader Renderer
 * Combines multiple shader layers with blending modes
 */
export class LayeredShaderRenderer {
  private stripCount: number;
  private ledCount: number;
  private layers: Map<string, LayerData> = new Map();
  private renderer: THREE.WebGLRenderer;  // Single shared renderer
  private finalRenderTarget: THREE.WebGLRenderTarget;
  private compositeScene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private composeMaterial: THREE.ShaderMaterial;
  private plane: THREE.Mesh;

  constructor(stripCount: number, ledCount: number) {
    this.stripCount = stripCount;
    this.ledCount = ledCount;

    // Create single shared renderer for all layers AND compositing
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
    });
    this.renderer.setSize(stripCount, ledCount);

    // Create final render target for composite
    this.finalRenderTarget = new THREE.WebGLRenderTarget(stripCount, ledCount, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });

    // Create scene for compositing
    this.compositeScene = new THREE.Scene();
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

        vec3 applyBlend(vec3 base, vec3 blend, float alpha, int mode) {
          if (mode == 0) { // normal
            return blendNormal(base, blend, alpha);
          } else if (mode == 1) { // add
            return blendAdd(base, blend, alpha);
          } else if (mode == 2) { // multiply
            return blendMultiply(base, blend, alpha);
          } else if (mode == 3) { // screen
            return blendScreen(base, blend, alpha);
          }
          return base;
        }

        void main() {
          vec3 finalColor = vec3(0.0);

          // Manually unroll loop for WebGL 1.0 compatibility
          // (array indexing with non-constant expressions not allowed for samplers)

          if (layerCount > 0) {
            vec4 layerColor = texture2D(layers[0], vUv);
            finalColor = layerColor.rgb * opacities[0];
          }

          if (layerCount > 1) {
            vec4 layerColor = texture2D(layers[1], vUv);
            float opacity = opacities[1] * layerColor.a;
            finalColor = applyBlend(finalColor, layerColor.rgb, opacity, blendModes[1]);
          }

          if (layerCount > 2) {
            vec4 layerColor = texture2D(layers[2], vUv);
            float opacity = opacities[2] * layerColor.a;
            finalColor = applyBlend(finalColor, layerColor.rgb, opacity, blendModes[2]);
          }

          if (layerCount > 3) {
            vec4 layerColor = texture2D(layers[3], vUv);
            float opacity = opacities[3] * layerColor.a;
            finalColor = applyBlend(finalColor, layerColor.rgb, opacity, blendModes[3]);
          }

          if (layerCount > 4) {
            vec4 layerColor = texture2D(layers[4], vUv);
            float opacity = opacities[4] * layerColor.a;
            finalColor = applyBlend(finalColor, layerColor.rgb, opacity, blendModes[4]);
          }

          if (layerCount > 5) {
            vec4 layerColor = texture2D(layers[5], vUv);
            float opacity = opacities[5] * layerColor.a;
            finalColor = applyBlend(finalColor, layerColor.rgb, opacity, blendModes[5]);
          }

          if (layerCount > 6) {
            vec4 layerColor = texture2D(layers[6], vUv);
            float opacity = opacities[6] * layerColor.a;
            finalColor = applyBlend(finalColor, layerColor.rgb, opacity, blendModes[6]);
          }

          if (layerCount > 7) {
            vec4 layerColor = texture2D(layers[7], vUv);
            float opacity = opacities[7] * layerColor.a;
            finalColor = applyBlend(finalColor, layerColor.rgb, opacity, blendModes[7]);
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
    this.compositeScene.add(this.plane);
  }

  /**
   * Add or update a layer
   */
  addLayer(layerId: string, fragmentShader: string, uniforms: Partial<ShaderUniforms>): boolean {
    let layerData = this.layers.get(layerId);

    if (!layerData) {
      // Create new layer with its own scene and render target
      const scene = new THREE.Scene();
      const geometry = new THREE.PlaneGeometry(2, 2);

      const renderTarget = new THREE.WebGLRenderTarget(this.stripCount, this.ledCount, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
      });

      // Vertex shader (passthrough UV)
      const vertexShader = `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `;

      // Create shader uniforms
      const shaderUniforms: Record<string, THREE.IUniform> = {
        time: { value: uniforms.time || 0 },
        bpm: { value: uniforms.bpm || 120 },
        resolution: { value: new THREE.Vector2(this.stripCount, this.ledCount) },
        color1: {
          value: new THREE.Vector4(...(uniforms.color1 || [1, 1, 1, 1])),
        },
        color2: {
          value: new THREE.Vector4(...(uniforms.color2 || [1, 1, 1, 1])),
        },
        speed: { value: uniforms.speed || 1.0 },
        intensity: { value: (uniforms as any).intensity || 1.0 },
        direction: {
          value: new THREE.Vector2(...((uniforms as any).direction || [1.0, 0.0]))
        },
        trailLength: { value: (uniforms as any).trailLength || 0.2 },
        chaserSize: { value: (uniforms as any).chaserSize || 0.05 },
        density: { value: (uniforms as any).density || 1.0 },
        reverse: { value: (uniforms as any).reverse || 0.0 },
        warmupDuration: { value: (uniforms as any).warmupDuration || 0.5 },
        onDuration: { value: (uniforms as any).onDuration || 2.0 },
        offDuration: { value: (uniforms as any).offDuration || 0.3 },
      };

      // Create material with user's fragment shader
      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: shaderUniforms,
      });

      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      layerData = { material, renderTarget, mesh, scene };
      this.layers.set(layerId, layerData);
    } else {
      // Update existing layer material if needed
      // For now, we'll recreate the material
      const vertexShader = `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `;

      const shaderUniforms: Record<string, THREE.IUniform> = {
        time: { value: uniforms.time || 0 },
        bpm: { value: uniforms.bpm || 120 },
        resolution: { value: new THREE.Vector2(this.stripCount, this.ledCount) },
        color1: {
          value: new THREE.Vector4(...(uniforms.color1 || [1, 1, 1, 1])),
        },
        color2: {
          value: new THREE.Vector4(...(uniforms.color2 || [1, 1, 1, 1])),
        },
        speed: { value: uniforms.speed || 1.0 },
        intensity: { value: (uniforms as any).intensity || 1.0 },
        direction: {
          value: new THREE.Vector2(...((uniforms as any).direction || [1.0, 0.0]))
        },
        trailLength: { value: (uniforms as any).trailLength || 0.2 },
        chaserSize: { value: (uniforms as any).chaserSize || 0.05 },
        density: { value: (uniforms as any).density || 1.0 },
        reverse: { value: (uniforms as any).reverse || 0.0 },
        warmupDuration: { value: (uniforms as any).warmupDuration || 0.5 },
        onDuration: { value: (uniforms as any).onDuration || 2.0 },
        offDuration: { value: (uniforms as any).offDuration || 0.3 },
      };

      layerData.material.dispose();
      layerData.material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: shaderUniforms,
      });
      layerData.mesh.material = layerData.material;
    }

    return true;
  }

  /**
   * Remove a layer
   */
  removeLayer(layerId: string): void {
    const layerData = this.layers.get(layerId);
    if (layerData) {
      layerData.material.dispose();
      layerData.renderTarget.dispose();
      layerData.mesh.geometry.dispose();
      this.layers.delete(layerId);
    }
  }

  /**
   * Update layer uniforms
   */
  updateLayerUniforms(layerId: string, uniforms: Partial<ShaderUniforms>): void {
    const layerData = this.layers.get(layerId);
    if (!layerData) return;

    const material = layerData.material;
    if (uniforms.time !== undefined) {
      material.uniforms.time.value = uniforms.time;
    }
    if (uniforms.bpm !== undefined) {
      material.uniforms.bpm.value = uniforms.bpm;
    }
    if (uniforms.speed !== undefined) {
      material.uniforms.speed.value = uniforms.speed;
    }
    if ((uniforms as any).intensity !== undefined) {
      material.uniforms.intensity.value = (uniforms as any).intensity;
    }
    if ((uniforms as any).direction !== undefined) {
      const dir = (uniforms as any).direction;
      if (Array.isArray(dir)) {
        material.uniforms.direction.value.set(dir[0], dir[1]);
      }
    }
    if (uniforms.color1) {
      material.uniforms.color1.value.set(...uniforms.color1);
    }
    if (uniforms.color2) {
      material.uniforms.color2.value.set(...uniforms.color2);
    }
    if ((uniforms as any).trailLength !== undefined) {
      material.uniforms.trailLength.value = (uniforms as any).trailLength;
    }
    if ((uniforms as any).chaserSize !== undefined) {
      material.uniforms.chaserSize.value = (uniforms as any).chaserSize;
    }
    if ((uniforms as any).density !== undefined) {
      material.uniforms.density.value = (uniforms as any).density;
    }
    if ((uniforms as any).reverse !== undefined) {
      material.uniforms.reverse.value = (uniforms as any).reverse;
    }
    if ((uniforms as any).warmupDuration !== undefined) {
      material.uniforms.warmupDuration.value = (uniforms as any).warmupDuration;
    }
    if ((uniforms as any).onDuration !== undefined) {
      material.uniforms.onDuration.value = (uniforms as any).onDuration;
    }
    if ((uniforms as any).offDuration !== undefined) {
      material.uniforms.offDuration.value = (uniforms as any).offDuration;
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

    // Render each layer to its own render target using THE SAME renderer
    const textures: THREE.Texture[] = [];
    const opacities: number[] = [];
    const blendModes: number[] = [];

    enabledLayers.forEach(layerConfig => {
      const layerData = this.layers.get(layerConfig.id);
      if (!layerData) {
        console.error('[LayeredRenderer] Layer data not found for:', layerConfig.id);
        return;
      }

      // Render this layer to its render target using the shared renderer
      this.renderer.setRenderTarget(layerData.renderTarget);
      this.renderer.render(layerData.scene, this.camera);

      // Collect texture for compositing
      textures.push(layerData.renderTarget.texture);
      opacities.push(layerConfig.opacity);
      blendModes.push(this.blendModeToInt(layerConfig.blendMode));
    });

    // Update compositing shader uniforms
    this.composeMaterial.uniforms.layers.value = textures;
    this.composeMaterial.uniforms.opacities.value = opacities;
    this.composeMaterial.uniforms.blendModes.value = blendModes;
    this.composeMaterial.uniforms.layerCount.value = textures.length;

    // Render composite using the same shared renderer
    this.renderer.setRenderTarget(this.finalRenderTarget);
    this.renderer.render(this.compositeScene, this.camera);

    // Read pixels from final composite
    const pixelBuffer = new Uint8Array(this.stripCount * this.ledCount * 4);
    this.renderer.readRenderTargetPixels(
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
    this.layers.forEach(layerData => {
      layerData.material.dispose();
      layerData.renderTarget.dispose();
      layerData.mesh.geometry.dispose();
    });
    this.layers.clear();
    this.renderer.dispose();
    this.finalRenderTarget.dispose();
    this.plane.geometry.dispose();
    this.composeMaterial.dispose();
  }
}
