import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { ShaderRenderer } from '../services/shaderEngine';

interface RendererMap {
  [stripId: number]: ShaderRenderer;
}

const TARGET_FPS = 40; // 40 FPS for Art-Net
const FRAME_INTERVAL = 1000 / TARGET_FPS; // 25ms

export const useRenderLoop = () => {
  const { strips, shaders, assignments, playbackState, globalUniforms, setPreviewData } =
    useAppStore();
  const renderersRef = useRef<RendererMap>({});
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());
  const lastFrameTimeRef = useRef<number>(Date.now());
  const batchedDataRef = useRef<Map<number, Uint8Array>>(new Map());

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

      // Clear batched data
      batchedDataRef.current.clear();

      // Render each strip that has a shader assigned
      assignments.forEach((assignment) => {
        const strip = strips.find((s) => s.id === assignment.stripId);
        const shader = shaders.find((s) => s.id === assignment.shaderId);

        if (!strip || !shader) return;

        // Get or create renderer for this strip
        if (!renderersRef.current[strip.id]) {
          renderersRef.current[strip.id] = new ShaderRenderer(strip.ledCount);
        }

        const renderer = renderersRef.current[strip.id];

        // Merge global uniforms with assignment-specific params
        const uniforms = {
          ...globalUniforms,
          ...assignment.params,
          time: currentTime,
          resolution: [strip.ledCount, 1] as [number, number],
        };

        // Check if shader needs to be updated
        const currentShader = (renderer as any).currentShaderId;
        if (currentShader !== shader.id) {
          const success = renderer.updateShader(shader.fragmentShader, uniforms);
          if (success) {
            (renderer as any).currentShaderId = shader.id;
          } else {
            console.error('Failed to compile shader:', shader.id);
            return;
          }
        } else {
          // Just update uniforms
          renderer.updateUniforms(uniforms);
        }

        // Render and get RGB data
        const rgbData = renderer.render();

        // Store for preview visualization
        setPreviewData(strip.id, rgbData);

        // Batch data for sending
        batchedDataRef.current.set(strip.id, rgbData);
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
    assignments,
    globalUniforms,
    setPreviewData,
  ]);

  // Cleanup renderers when component unmounts
  useEffect(() => {
    return () => {
      Object.values(renderersRef.current).forEach((renderer) => {
        renderer.dispose();
      });
      renderersRef.current = {};
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
