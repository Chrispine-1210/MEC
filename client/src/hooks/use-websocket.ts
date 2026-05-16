import { useEffect, useRef, useState } from "react";

interface WebSocketMessage {
  type: string;
  data?: unknown;
  channels?: string[];
}

export function useWebSocket(channels: string[] = []) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const clearReconnect = () => {
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const connect = () => {
      const token = localStorage.getItem("token");
      if (!token) {
        return;
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(
        `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`,
      );
      socketRef.current = socket;

      socket.onopen = () => {
        if (!isMounted) return;
        setIsConnected(true);
        if (channels.length > 0) {
          socket.send(JSON.stringify({ type: "subscribe", channels }));
        }
      };

      socket.onclose = () => {
        if (!isMounted) return;
        setIsConnected(false);
        clearReconnect();
        reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
      };

      socket.onerror = (error) => {
        console.error("Admin websocket error:", error);
      };
    };

    connect();

    return () => {
      isMounted = false;
      clearReconnect();
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [channels.join(",")]);

  const sendMessage = (message: WebSocketMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  };

  return { isConnected, sendMessage };
}
