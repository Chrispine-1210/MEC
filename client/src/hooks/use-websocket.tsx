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
    if (!user) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const configuredApiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
    const apiUrl = configuredApiBase
      ? new URL(configuredApiBase, window.location.origin)
      : new URL(window.location.origin);
    const isViteDevClient = !configuredApiBase && apiUrl.port && apiUrl.port !== "5000";
    const apiOrigin = isViteDevClient ? `${apiUrl.hostname}:5000` : apiUrl.host;
    const protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";

    const wsUrl = `${protocol}//${apiOrigin}/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    setSocket(ws);

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);

      const isPrivilegedUser =
        user.role === "editor" || user.role === "admin" || user.role === "super_admin";

      const defaultChannels = [
        "scholarships",
        "jobs",
        "partners",
        "blog-posts",
        "team-members",
        "announcements",
        `applications:user:${user.id}`,
        `referrals:user:${user.id}`,
      ];

      if (isPrivilegedUser) {
        defaultChannels.push(
          "applications",
          "user_activity",
          "admin-dashboard",
          "admin-notifications",
        );
      }

      ws.send(JSON.stringify({ type: "subscribe", channels: defaultChannels }));
      setSubscriptions(defaultChannels);
    };

    ws.onmessage = (event) => {
      try {
        const { channel } = JSON.parse(event.data) as { channel?: string; data?: unknown };

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
          default:
            if (channel?.startsWith("applications:user:")) {
              invalidateByPrefix(["/api/applications"]);
              break;
            }
            if (channel?.startsWith("referrals:user:")) {
              invalidateByPrefix(["/api/referrals"]);
              break;
            }
            break;
          case "partners":
            invalidateByPrefix(["/api/partners"]);
            break;
          case "blog-posts":
            invalidateByPrefix(["/api/blog-posts"]);
            break;
          case "team-members":
            invalidateByPrefix(["/api/team-members"]);
            break;
          case "user_activity":
            if (user.role === "admin" || user.role === "super_admin") {
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
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    return () => {
      ws.close();
      setSocket(null);
      setSubscriptions([]);
    };
  }, [user]);

  const subscribe = (channels: string[]) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const newChannels = channels.filter((ch) => !subscriptions.includes(ch));
      if (newChannels.length > 0) {
        socket.send(JSON.stringify({ type: "subscribe", channels: newChannels }));
        setSubscriptions((prev) => [...prev, ...newChannels]);
      }
    }
  };

  const unsubscribe = (channels: string[]) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "unsubscribe", channels }));
      setSubscriptions((prev) => prev.filter((ch) => !channels.includes(ch)));
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
