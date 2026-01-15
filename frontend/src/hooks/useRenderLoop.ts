import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { LayeredShaderRenderer } from '../services/layeredShaderEngine';

const TARGET_FPS = 40; // 40 FPS for Art-Net
const FRAME_INTERVAL = 1000 / TARGET_FPS; // 25ms

export const useRenderLoop = () => {
  const { strips, shaders, layers, playbackState, globalUniforms, setMatrixData } =
    useAppStore();
  const rendererRef = useRef<LayeredShaderRenderer | null>(null);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());
  const lastFrameTimeRef = useRef<number>(Date.now());
  const batchedDataRef = useRef<Map<number, Uint8Array>>(new Map());
  const layerHashRef = useRef<string>('');

  useEffect(() => {
    if (!playbackState.isPlaying) {
      // Stop rendering
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    // Start rendering loop
    startTimeRef.current = Date.now();
    lastFrameTimeRef.current = Date.now();

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

      // Check if we have strips and layers
      if (strips.length === 0 || layers.length === 0) {
        animationFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      // Get matrix dimensions
      const stripCount = strips.length;
      const ledCount = strips[0]?.ledCount || 250; // Assuming all strips have same LED count

      // Create renderer if needed
      if (!rendererRef.current) {
        rendererRef.current = new LayeredShaderRenderer(stripCount, ledCount);
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
            rendererRef.current!.addLayer(layer.id, shader.fragmentShader, layerUniforms);
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
          rendererRef.current!.updateLayerUniforms(layer.id, layerUniforms);
        }
      });

      // Render all layers composited
      const matrixData = rendererRef.current.render(layers);

      // Store for preview visualization
      setMatrixData(matrixData);

      // Clear batched data
      batchedDataRef.current.clear();

      // Extract data for each strip
      strips.forEach((strip, index) => {
        const stripData = rendererRef.current!.extractStripData(index, matrixData);
        batchedDataRef.current.set(strip.id, stripData);
      });

      // Send all batched data in one request
      if (batchedDataRef.current.size > 0) {
        sendBatchedArtNetData(batchedDataRef.current).catch((err) => {
          console.error('Failed to send Art-Net data:', err);
        });
      }

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
    globalUniforms,
    setMatrixData,
  ]);

  // Cleanup renderer when component unmounts
  useEffect(() => {
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
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
