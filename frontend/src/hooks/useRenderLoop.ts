import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { MatrixShaderRenderer } from '../services/matrixShaderEngine';

const TARGET_FPS = 40; // 40 FPS for Art-Net
const FRAME_INTERVAL = 1000 / TARGET_FPS; // 25ms

export const useRenderLoop = () => {
  const { strips, shaders, activeShaderId, playbackState, globalUniforms, setMatrixData } =
    useAppStore();
  const rendererRef = useRef<MatrixShaderRenderer | null>(null);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());
  const lastFrameTimeRef = useRef<number>(Date.now());
  const batchedDataRef = useRef<Map<number, Uint8Array>>(new Map());
  const currentShaderIdRef = useRef<string | null>(null);

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

      // Check if we have strips and an active shader
      if (strips.length === 0 || !activeShaderId) {
        animationFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      const activeShader = shaders.find((s) => s.id === activeShaderId);
      if (!activeShader) {
        animationFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      // Get matrix dimensions
      const stripCount = strips.length;
      const ledCount = strips[0]?.ledCount || 250; // Assuming all strips have same LED count

      // Create or recreate renderer if needed
      if (!rendererRef.current || currentShaderIdRef.current !== activeShaderId) {
        if (rendererRef.current) {
          rendererRef.current.dispose();
        }
        rendererRef.current = new MatrixShaderRenderer(stripCount, ledCount);
        currentShaderIdRef.current = activeShaderId;

        // Compile shader
        const uniforms = {
          ...globalUniforms,
          time: currentTime,
          resolution: [stripCount, ledCount] as [number, number],
        };
        const success = rendererRef.current.updateShader(activeShader.fragmentShader, uniforms);
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
        rendererRef.current.updateUniforms(uniforms);
      }

      // Render the global matrix
      const matrixData = rendererRef.current.render();

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
    activeShaderId,
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
