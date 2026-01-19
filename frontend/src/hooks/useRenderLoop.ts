import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { LayeredShaderRenderer } from '../services/layeredShaderEngine';
import { MatrixShaderRenderer } from '../services/matrixShaderEngine';

const TARGET_FPS = 40; // 40 FPS for Art-Net
const FRAME_INTERVAL = 1000 / TARGET_FPS; // 25ms

export const useRenderLoop = () => {
  const { strips, shaders, layers, activeShaderId, playbackState, globalUniforms, setMatrixData, masterBrightness } =
    useAppStore();
  const layeredRendererRef = useRef<LayeredShaderRenderer | null>(null);
  const legacyRendererRef = useRef<MatrixShaderRenderer | null>(null);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());
  const lastFrameTimeRef = useRef<number>(Date.now());
  const batchedDataRef = useRef<Map<number, Uint8Array>>(new Map());
  const layerHashRef = useRef<string>('');
  const currentShaderIdRef = useRef<string | null>(null);
  const wasPlayingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!playbackState.isPlaying) {
      // Stop rendering
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      wasPlayingRef.current = false;
      return;
    }

    // Only reset time when starting fresh (not on parameter changes)
    if (!wasPlayingRef.current) {
      startTimeRef.current = Date.now();
      lastFrameTimeRef.current = Date.now();
      wasPlayingRef.current = true;
    }

    const renderLoop = () => {
      const now = Date.now();
      const deltaTime = now - lastFrameTimeRef.current;

      // Throttle to target FPS
      if (deltaTime < FRAME_INTERVAL) {
        animationFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      lastFrameTimeRef.current = now - (deltaTime % FRAME_INTERVAL);
      const currentTime = (now - startTimeRef.current) / 1000; // Convert to seconds

      // Check if we have strips
      if (strips.length === 0) {
        animationFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      // Determine which mode to use: layers or legacy
      const useLayers = layers.length > 0;
      const useLegacy = !useLayers && activeShaderId;

      if (!useLayers && !useLegacy) {
        // No content to render
        animationFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      // Get matrix dimensions
      const stripCount = strips.length;
      const ledCount = strips[0]?.ledCount || 250; // Assuming all strips have same LED count

      let matrixData: Uint8Array;

      if (useLayers) {
        // === LAYERS MODE ===
        // Create renderer if needed
        if (!layeredRendererRef.current) {
          layeredRendererRef.current = new LayeredShaderRenderer(stripCount, ledCount);
        }

        // Compute hash of layer configuration
        const currentLayerHash = JSON.stringify(
          layers.map(l => ({ id: l.id, shaderId: l.shaderId, enabled: l.enabled }))
        );

        // Update layers if configuration changed
        if (currentLayerHash !== layerHashRef.current) {
          layerHashRef.current = currentLayerHash;

          // Add/update all enabled layers
          layers.forEach(layer => {
            const shader = shaders.find(s => s.id === layer.shaderId);
            if (shader && layer.enabled) {
              const layerUniforms = {
                ...globalUniforms,
                ...layer.params,
                time: currentTime,
                resolution: [stripCount, ledCount] as [number, number],
              };
              layeredRendererRef.current!.addLayer(layer.id, shader.fragmentShader, layerUniforms);
            }
          });
        }

        // Update uniforms for all layers
        layers.forEach(layer => {
          if (layer.enabled) {
            const layerUniforms = {
              ...globalUniforms,
              ...layer.params,
              time: currentTime,
            };
            layeredRendererRef.current!.updateLayerUniforms(layer.id, layerUniforms);
          }
        });

        // Render all layers composited
        matrixData = layeredRendererRef.current.render(layers);
      } else {
        // === LEGACY MODE (activeShaderId) ===
        const activeShader = shaders.find((s) => s.id === activeShaderId);
        if (!activeShader) {
          animationFrameRef.current = requestAnimationFrame(renderLoop);
          return;
        }

        // Create or recreate renderer if needed
        if (!legacyRendererRef.current || currentShaderIdRef.current !== activeShaderId) {
          if (legacyRendererRef.current) {
            legacyRendererRef.current.dispose();
          }
          legacyRendererRef.current = new MatrixShaderRenderer(stripCount, ledCount);
          currentShaderIdRef.current = activeShaderId;

          // Compile shader
          const uniforms = {
            ...globalUniforms,
            time: currentTime,
            resolution: [stripCount, ledCount] as [number, number],
          };
          const success = legacyRendererRef.current.updateShader(activeShader.fragmentShader, uniforms);
          if (!success) {
            console.error('Failed to compile shader:', activeShaderId);
            animationFrameRef.current = requestAnimationFrame(renderLoop);
            return;
          }
        } else {
          // Just update uniforms
          const uniforms = {
            ...globalUniforms,
            time: currentTime,
          };
          legacyRendererRef.current.updateUniforms(uniforms);
        }

        // Render the global matrix
        matrixData = legacyRendererRef.current.render();
      }

      // Apply master brightness / dimmer
      if (masterBrightness < 1.0) {
        for (let i = 0; i < matrixData.length; i++) {
          matrixData[i] = Math.round(matrixData[i] * masterBrightness);
        }
      }

      // Store for preview visualization
      setMatrixData(matrixData);

      // Clear batched data
      batchedDataRef.current.clear();

      // Extract data for each strip
      const renderer = useLayers ? layeredRendererRef.current! : legacyRendererRef.current!;
      strips.forEach((strip, index) => {
        const stripData = renderer.extractStripData(index, matrixData);
        batchedDataRef.current.set(strip.id, stripData);
      });

      // NOTE: Art-Net sending disabled - Rust backend handles it
      // The frontend only renders for local preview
      // if (batchedDataRef.current.size > 0) {
      //   sendBatchedArtNetData(batchedDataRef.current).catch((err) => {
      //     console.error('Failed to send Art-Net data:', err);
      //   });
      // }

      // Continue loop
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    playbackState.isPlaying,
    strips,
    shaders,
    layers,
    activeShaderId,
    globalUniforms,
    setMatrixData,
    masterBrightness,
  ]);

  // Cleanup renderers when component unmounts
  useEffect(() => {
    return () => {
      if (layeredRendererRef.current) {
        layeredRendererRef.current.dispose();
        layeredRendererRef.current = null;
      }
      if (legacyRendererRef.current) {
        legacyRendererRef.current.dispose();
        legacyRendererRef.current = null;
      }
    };
  }, []);
};

// Helper function to send batched Art-Net data to backend
async function sendBatchedArtNetData(dataMap: Map<number, Uint8Array>): Promise<void> {
  try {
    // Convert Map to array of {stripId, rgbData}
    const batchedData = Array.from(dataMap.entries()).map(([stripId, rgbData]) => ({
      stripId,
      rgbData: Array.from(rgbData), // Convert Uint8Array to regular array for JSON
    }));

    await fetch('/api/artnet/send-batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ strips: batchedData }),
    });
  } catch (error) {
    // Silently fail - backend might not be running
    // Preview will still work
  }
}
