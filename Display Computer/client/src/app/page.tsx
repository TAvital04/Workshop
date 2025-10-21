"use client";

import { useState, useEffect, useRef } from "react"

interface LatestData {
  yValues: number
}

export default function Home() {
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [latestData, setLatestData] = useState<LatestData | null>(null)
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const telemetryUpdateCounterRef = useRef<number>(0);

  // Single WebSocket connection for the entire app
  useEffect(() => {
    const connectWebSocket = () => {
      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
      }

      setConnectionStatus('connecting');
      const websocket = new WebSocket('ws://localhost:8080');

      websocket.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus('connected');
        wsRef.current = websocket;
      };

      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'update' && message.data && message.data.length > 0) {
            console.log('Received latest data:', message.data.length, 'rows');
            telemetryUpdateCounterRef.current++;
            setLatestData(message.data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      websocket.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus('disconnected');
        wsRef.current = null;

        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('disconnected');
      };

      wsRef.current = websocket;
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return (
    <>
      
    </>
  )
}