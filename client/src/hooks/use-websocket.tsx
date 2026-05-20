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

  const invalidateByPrefix = (prefixes: string[]) => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === "string" && prefixes.some((prefix) => key.startsWith(prefix));
      },
    });
  };

  useEffect(() => {
    let reconnectTimer: number | null = null;
    let isMounted = true;
    let ws: WebSocket | null = null;

    const defaultChannels = [
      "scholarships",
      "jobs",
      "applications",
      "partners",
      "testimonials",
      "blog-posts",
      "team-members",
      "events",
      "user_activity",
      "announcements",
    ];

    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const token = localStorage.getItem("token");
      const wsUrl = `${protocol}//${window.location.host}/ws${token ? `?token=${encodeURIComponent(token)}` : ""}`;
      
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log("WebSocket connected");
        if (!isMounted || !ws) return;
        if (reconnectTimer !== null) {
          window.clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        setIsConnected(true);
        ws.send(JSON.stringify({ type: "subscribe", channels: defaultChannels }));
        setSubscriptions(defaultChannels);
      };

      ws.onmessage = (event) => {
        try {
          const { channel, data } = JSON.parse(event.data);
          
          // Handle real-time updates
          switch (channel) {
            case "scholarships":
              invalidateByPrefix(["/api/scholarships"]);
              break;
            case "jobs":
              invalidateByPrefix(["/api/jobs"]);
              break;
            case "applications":
              invalidateByPrefix(["/api/applications"]);
              break;
            case "partners":
              invalidateByPrefix(["/api/partners", "/api/partner-videos"]);
              break;
            case "testimonials":
              invalidateByPrefix(["/api/testimonials"]);
              break;
            case "blog-posts":
              invalidateByPrefix(["/api/blog-posts"]);
              break;
            case "team-members":
              invalidateByPrefix(["/api/team-members"]);
              break;
            case "events":
              invalidateByPrefix(["/api/events", "/api/admin/events"]);
              break;
            case "user_activity":
              if (user?.role === "admin" || user?.role === "super_admin") {
                invalidateByPrefix([
                  "/api/analytics",
                  "/api/admin/dashboard",
                  "/api/admin/notifications",
                  "/api/admin/users",
                ]);
              }
              break;
          }
        } catch (error) {
          console.error("WebSocket message error:", error);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        if (!isMounted) return;
        setIsConnected(false);
        reconnectTimer = window.setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };

      setSocket(ws);
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [user?.id, user?.role]);

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
