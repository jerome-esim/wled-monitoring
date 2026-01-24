import { useEffect, useRef, useState, useCallback } from 'react';
import type { ClientMessage, ServerMessage, ShaderLayer, ShaderParams, StripConfig } from '../types';

const WS_URL = 'ws://localhost:3001/ws';
const RECONNECT_DELAY = 2000;

interface WebSocketState {
  connected: boolean;
  fps: number;
  frameData: { data: string; width: number; height: number } | null;
  error: string | null;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number>();
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    fps: 0,
    frameData: null,
    error: null
  });

  const send = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setState(prev => ({ ...prev, connected: true, error: null }));
      };

      ws.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data);

          console.log('WebSocket message received:', message.type);

          switch (message.type) {
            case 'fpsUpdate':
              console.log('FPS Update:', message.fps);
              setState(prev => ({ ...prev, fps: message.fps }));
              break;
            case 'frameUpdate':
              console.log('Frame Update:', {
                width: message.width,
                height: message.height,
                dataLength: message.data.length
              });
              setState(prev => ({
                ...prev,
                frameData: {
                  data: message.data,
                  width: message.width,
                  height: message.height
                }
              }));
              break;
            case 'error':
              console.error('Server error:', message.message);
              setState(prev => ({ ...prev, error: message.message }));
              break;
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err, event.data.substring(0, 100));
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({ ...prev, error: 'WebSocket connection error' }));
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setState(prev => ({ ...prev, connected: false }));
        wsRef.current = null;

        // Attempt to reconnect
        reconnectTimeoutRef.current = window.setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, RECONNECT_DELAY);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setState(prev => ({ ...prev, error: 'Failed to connect to WebSocket' }));
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const updateLayers = useCallback((layers: ShaderLayer[]) => {
    send({ type: 'updateLayers', layers });
  }, [send]);

  const updateStrips = useCallback((strips: StripConfig[]) => {
    console.log('Sending strips to backend:', strips.length, 'strips');
    send({ type: 'updateStrips', strips });
  }, [send]);

  const updateGlobalParams = useCallback((params: ShaderParams) => {
    send({ type: 'updateGlobalParams', params });
  }, [send]);

  const setPlaying = useCallback((playing: boolean) => {
    send({ type: 'setPlaying', playing });
  }, [send]);

  const setMasterBrightness = useCallback((brightness: number) => {
    send({ type: 'setMasterBrightness', brightness });
  }, [send]);

  return {
    ...state,
    updateLayers,
    updateStrips,
    updateGlobalParams,
    setPlaying,
    setMasterBrightness
  };
}
