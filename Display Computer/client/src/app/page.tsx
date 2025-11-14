"use client";

import { useState, useEffect, useRef } from "react"

interface LatestData {
  yValues: number
}

export default function Home() {
  // The connection status of the websocket for display purposes.
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [latestData, setLatestData] = useState<LatestData | null>(null)

  // The most recently connected websocket (if there is one)
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

      // Start the process of connecting to the web socket
      setConnectionStatus('connecting');
      const websocket = new WebSocket('ws://localhost:8080');

      // Function to perform when the client connects to a web socket server
      websocket.onopen = () => {
        // Announce the connection
        console.log('WebSocket connected');
        setConnectionStatus('connected');

        // Set the global reference to a web socket to this web socket
        wsRef.current = websocket;
      };

      // Fuction to perform when a message is received from the web socket
      websocket.onmessage = (event) => {
        try {
          // Store the message received as a JSON
          const message = JSON.parse(event.data);

          // Validate the message type and the existance of data in the message
          if (message.type === 'update' && message.data && message.data.length > 0) {
            console.log('Received latest data:', message.data.length, 'rows');

            // Update the count of update messages received
            telemetryUpdateCounterRef.current++;

            // Set the latest data to be rendered to the message received
            setLatestData(message.data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      // Function to perform when the client disconnects from the web socket server
      websocket.onclose = () => {
        // Announce the disconnection
        console.log('WebSocket disconnected');
        setConnectionStatus('disconnected');

        // Remove the reference to this web socket from global
        wsRef.current = null;

        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      // Function to perform when the client receives an error from the web socket server
      websocket.onerror = (error) => {
        // Announce the error and the disconnection
        console.error('WebSocket error:', error);
        setConnectionStatus('disconnected');

        // Remove the reference to this web socket from global
        wsRef.current = null;
      };

      // wsRef.current = websocket;
    };

    // Call the function that handles the web socket
    connectWebSocket();

    // Prepare for a safe rerender
    return () => {
      // Cleanly close the timeout that follows the closing of the web socket
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Cleanly close the web socket
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