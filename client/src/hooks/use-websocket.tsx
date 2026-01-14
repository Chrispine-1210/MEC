import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./use-auth";
import { queryClient } from "@/lib/queryClient";

interface WebSocketContextType {
  isConnected: boolean;
  subscribe: (channels: string[]) => void;
  unsubscribe: (channels: string[]) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        
        // Subscribe to default channels
        const defaultChannels = ["scholarships", "jobs", "applications", "announcements"];
        ws.send(JSON.stringify({ type: "subscribe", channels: defaultChannels }));
        setSubscriptions(defaultChannels);
      };

      ws.onmessage = (event) => {
        try {
          const { channel, data } = JSON.parse(event.data);
          
          // Handle real-time updates
          switch (channel) {
            case "scholarships":
              queryClient.invalidateQueries({ queryKey: ["/api/scholarships"] });
              break;
            case "jobs":
              queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
              break;
            case "applications":
              queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
              break;
            case "user_activity":
              if (user.role === "admin" || user.role === "super_admin") {
                queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
              }
              break;
          }
        } catch (error) {
          console.error("WebSocket message error:", error);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };

      setSocket(ws);

      return () => {
        ws.close();
      };
    }
  }, [user]);

  const subscribe = (channels: string[]) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const newChannels = channels.filter(ch => !subscriptions.includes(ch));
      if (newChannels.length > 0) {
        socket.send(JSON.stringify({ type: "subscribe", channels: newChannels }));
        setSubscriptions(prev => [...prev, ...newChannels]);
      }
    }
  };

  const unsubscribe = (channels: string[]) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "unsubscribe", channels }));
      setSubscriptions(prev => prev.filter(ch => !channels.includes(ch)));
    }
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, subscribe, unsubscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}
