import { useEffect, useRef, useState } from 'react';
import type {
  StripConfig,
  ShaderConfig,
  StripShaderAssignment,
  ShaderUniforms,
} from '@shared/types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'ws://localhost:3001/ws';

// Backend message types (matching Rust backend)
interface UpdateLayersMessage {
  type: 'updateLayers';
  layers: any[];
}

interface UpdateStripsMessage {
  type: 'updateStrips';
  strips: StripConfig[];
}

interface UpdateGlobalParamsMessage {
  type: 'updateGlobalParams';
  params: any;
}

interface SetPlayingMessage {
  type: 'setPlaying';
  playing: boolean;
}

interface SetMasterBrightnessMessage {
  type: 'setMasterBrightness';
  brightness: number;
}

type ClientMessage =
  | UpdateLayersMessage
  | UpdateStripsMessage
  | UpdateGlobalParamsMessage
  | SetPlayingMessage
  | SetMasterBrightnessMessage;

export const useSocket = () => {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [fps, setFps] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const eventHandlersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());

  const connect = () => {
    try {
      const socket = new WebSocket(SOCKET_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('✅ Connected to WLED Rust backend');
        setConnected(true);
      };

      socket.onclose = () => {
        console.log('❌ Disconnected from backend');
        setConnected(false);

        // Auto-reconnect after 2 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect...');
          connect();
        }, 2000);
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // Handle FPS updates
          if (message.type === 'fpsUpdate') {
            setFps(message.fps);
          }

          // Trigger registered event handlers
          const handlers = eventHandlersRef.current.get(message.type);
          if (handlers) {
            handlers.forEach(handler => handler(message));
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      socketRef.current?.close();
    };
  }, []);

  const sendMessage = (message: ClientMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  };

  // Client methods adapted to new backend
  const updateConfig = (strips: StripConfig[]) => {
    sendMessage({
      type: 'updateStrips',
      strips,
    });
  };

  const applyShader = (assignment: StripShaderAssignment) => {
    // Note: The Rust backend uses layers, not direct assignments
    // This would need to be adapted based on your layer structure
    console.warn('applyShader needs to be adapted to layer-based system');
  };

  const updateParams = (params: Partial<ShaderUniforms>) => {
    sendMessage({
      type: 'updateGlobalParams',
      params,
    });
  };

  const startPlayback = () => {
    sendMessage({
      type: 'setPlaying',
      playing: true,
    });
  };

  const stopPlayback = () => {
    sendMessage({
      type: 'setPlaying',
      playing: false,
    });
  };

  const updateBpm = (bpm: number) => {
    sendMessage({
      type: 'updateGlobalParams',
      params: { bpm },
    });
  };

  const updateLayers = (layers: any[]) => {
    sendMessage({
      type: 'updateLayers',
      layers,
    });
  };

  const setMasterBrightness = (brightness: number) => {
    sendMessage({
      type: 'setMasterBrightness',
      brightness,
    });
  };

  // Event subscription helper
  const on = <T,>(event: string, callback: (data: T) => void) => {
    if (!eventHandlersRef.current.has(event)) {
      eventHandlersRef.current.set(event, new Set());
    }
    eventHandlersRef.current.get(event)!.add(callback);

    return () => {
      const handlers = eventHandlersRef.current.get(event);
      if (handlers) {
        handlers.delete(callback);
        if (handlers.size === 0) {
          eventHandlersRef.current.delete(event);
        }
      }
    };
  };

  // Deprecated methods (kept for compatibility)
  const createShader = (shader: ShaderConfig) => {
    console.warn('createShader is deprecated in the new CPU backend');
  };

  const updateShader = (shader: ShaderConfig) => {
    console.warn('updateShader is deprecated in the new CPU backend');
  };

  const deleteShader = (id: string) => {
    console.warn('deleteShader is deprecated in the new CPU backend');
  };

  return {
    connected,
    fps,
    updateConfig,
    applyShader,
    updateParams,
    startPlayback,
    stopPlayback,
    updateBpm,
    updateLayers,
    setMasterBrightness,
    createShader,
    updateShader,
    deleteShader,
    on,
  };
};
