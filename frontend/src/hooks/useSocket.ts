import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  StripConfig,
  ShaderConfig,
  StripShaderAssignment,
  ShaderUniforms,
} from '@shared/types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    // Create socket connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to backend');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from backend');
      setConnected(false);
    });

    // Server events
    socket.on('fps:update', (data: { fps: number }) => {
      setFps(data.fps);
    });

    socket.on('artnet:error', (data: { message: string }) => {
      console.error('Art-Net error:', data.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Client methods
  const updateConfig = (strips: StripConfig[]) => {
    socketRef.current?.emit('config:update', strips);
  };

  const applyShader = (assignment: StripShaderAssignment) => {
    socketRef.current?.emit('shader:apply', assignment);
  };

  const updateParams = (params: Partial<ShaderUniforms>) => {
    socketRef.current?.emit('params:update', params);
  };

  const startPlayback = () => {
    socketRef.current?.emit('playback:start');
  };

  const stopPlayback = () => {
    socketRef.current?.emit('playback:stop');
  };

  const updateBpm = (bpm: number) => {
    socketRef.current?.emit('bpm:update', { bpm });
  };

  const createShader = (shader: ShaderConfig) => {
    socketRef.current?.emit('shader:create', shader);
  };

  const updateShader = (shader: ShaderConfig) => {
    socketRef.current?.emit('shader:update', shader);
  };

  const deleteShader = (id: string) => {
    socketRef.current?.emit('shader:delete', { id });
  };

  // Event subscription helper
  const on = <T,>(event: string, callback: (data: T) => void) => {
    socketRef.current?.on(event, callback);
    return () => {
      socketRef.current?.off(event, callback);
    };
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
    createShader,
    updateShader,
    deleteShader,
    on,
  };
};
