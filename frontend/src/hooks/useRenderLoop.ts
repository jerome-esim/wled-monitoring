import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { ShaderRenderer } from '../services/shaderEngine';

interface RendererMap {
  [stripId: number]: ShaderRenderer;
}

export const useRenderLoop = () => {
  const { strips, shaders, assignments, playbackState, globalUniforms, setPreviewData } =
    useAppStore();
  const renderersRef = useRef<RendererMap>({});
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());

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

    const renderLoop = () => {
      const currentTime = (Date.now() - startTimeRef.current) / 1000; // Convert to seconds

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


        // Send to backend via fetch (non-blocking)
        sendArtNetData(strip.id, rgbData).catch((err) => {
          console.error('Failed to send Art-Net data:', err);
        });
      });

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

// Helper function to send Art-Net data to backend
async function sendArtNetData(stripId: number, rgbData: Uint8Array): Promise<void> {
  try {
    await fetch('/api/artnet/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stripId,
        rgbData: Array.from(rgbData), // Convert Uint8Array to regular array for JSON
      }),
    });
  } catch (error) {
    throw error;
  }
}
