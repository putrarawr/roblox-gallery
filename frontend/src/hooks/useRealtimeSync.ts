import { useEffect, useRef, useState, useCallback } from 'react';
import type { Screenshot } from '../types.js';
import { getWebSocketUrl } from '../utils/api.js';

interface UseRealtimeSyncOptions {
  onNewScreenshot: (screenshot: Screenshot) => void;
}

export function useRealtimeSync({ onNewScreenshot }: UseRealtimeSyncOptions) {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const onNewScreenshotRef = useRef(onNewScreenshot);

  useEffect(() => {
    onNewScreenshotRef.current = onNewScreenshot;
  }, [onNewScreenshot]);

  const connect = useCallback(() => {
    // Clean up existing socket if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus('connecting');

    // Build WebSocket URL
    const wsUrl = getWebSocketUrl();

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setStatus('connected');
        console.log('[WS] Connected to Roblox Sync Hub');
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'new_screenshot' && payload.data) {
            console.log('[WS] Received new screenshot:', payload.data.id);
            onNewScreenshotRef.current(payload.data);
          }
        } catch (err) {
          console.error('[WS] Parse error:', err);
        }
      };

      socket.onclose = () => {
        setStatus('disconnected');
        console.log('[WS] Connection closed. Retrying in 3s...');
        scheduleReconnect();
      };

      socket.onerror = (err) => {
        console.warn('[WS] Socket error:', err);
        socket.close();
      };
    } catch (e) {
      setStatus('disconnected');
      scheduleReconnect();
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectTimeoutRef.current = window.setTimeout(() => {
      connect();
    }, 3000);
  }, [connect]);

  useEffect(() => {
    connect();

    // Ping interval to keep connection alive
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    status,
    reconnect: connect
  };
}
