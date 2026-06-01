import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type User } from "@shared/schema";
import { isRealtimeEnabled, resolveWebSocketUrl } from "@/lib/api-base";
import { queryClient } from "@/lib/queryClient";

type AdminRealtimeContextValue = {
  isConnected: boolean;
};

const AdminRealtimeContext = createContext<AdminRealtimeContextValue | undefined>(undefined);

const DEFAULT_CHANNELS = [
  "scholarships",
  "jobs",
  "applications",
  "partners",
  "testimonials",
  "blog-posts",
  "team-members",
  "user_activity",
  "admin-dashboard",
  "admin-notifications",
  "admin-roles",
  "admin-settings",
];

const invalidateByPrefix = (prefixes: string[]) => {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === "string" && prefixes.some((prefix) => key.startsWith(prefix));
    },
  });
};

export function AdminRealtimeProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const hasToken = typeof window !== "undefined" && Boolean(localStorage.getItem("token"));
  const { data: user } = useQuery<User | null>({
    queryKey: ["/api/user"],
    retry: false,
    enabled: hasToken,
  });

  useEffect(() => {
    if (!isRealtimeEnabled() || !hasToken || !user) {
      setIsConnected(false);
      return;
    }

    let isMounted = true;
    let socket: WebSocket | null = null;

    const clearReconnect = () => {
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const connect = () => {
      const tokenFromStorage = localStorage.getItem("token");
      let socketUrl: string;

      try {
        socketUrl = resolveWebSocketUrl("/ws", tokenFromStorage);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Admin realtime URL error:", error);
        }
        setIsConnected(false);
        return;
      }

      socket = new WebSocket(socketUrl);

      socket.onopen = () => {
        if (!isMounted || !socket) return;
        clearReconnect();
        setIsConnected(true);
        socket.send(JSON.stringify({ type: "subscribe", channels: DEFAULT_CHANNELS }));
      };

      socket.onmessage = (event) => {
        try {
          const { channel } = JSON.parse(event.data) as { channel?: string };

          switch (channel) {
            case "scholarships":
              invalidateByPrefix(["/api/admin/scholarships", "/api/scholarships", "/api/admin/dashboard"]);
              break;
            case "jobs":
              invalidateByPrefix(["/api/admin/jobs", "/api/jobs", "/api/admin/dashboard"]);
              break;
            case "partners":
              invalidateByPrefix(["/api/admin/partners", "/api/partners", "/api/partner-videos", "/api/admin/dashboard"]);
              break;
            case "testimonials":
              invalidateByPrefix(["/api/testimonials", "/api/admin/dashboard"]);
              break;
            case "blog-posts":
              invalidateByPrefix(["/api/admin/blog", "/api/blog-posts", "/api/admin/dashboard"]);
              break;
            case "team-members":
              invalidateByPrefix(["/api/admin/team", "/api/team-members", "/api/admin/dashboard"]);
              break;
            case "applications":
              invalidateByPrefix(["/api/admin/applications", "/api/applications", "/api/admin/dashboard"]);
              break;
            case "user_activity":
              invalidateByPrefix([
                "/api/admin/users",
                "/api/admin/dashboard",
                "/api/analytics",
                "/api/admin/notifications",
              ]);
              break;
            case "admin-dashboard":
              invalidateByPrefix(["/api/admin/dashboard", "/api/analytics"]);
              break;
            case "admin-notifications":
              invalidateByPrefix(["/api/admin/notifications", "/api/admin/dashboard", "/api/analytics"]);
              break;
            case "admin-roles":
              invalidateByPrefix(["/api/admin/roles"]);
              break;
            case "admin-settings":
              invalidateByPrefix(["/api/admin/settings"]);
              break;
          }
        } catch (error) {
          console.error("Admin realtime message error:", error);
        }
      };

      socket.onclose = () => {
        if (!isMounted) return;
        setIsConnected(false);
        clearReconnect();
        reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
      };

      socket.onerror = (error) => {
        console.error("Admin realtime socket error:", error);
      };
    };

    connect();

    return () => {
      isMounted = false;
      clearReconnect();
      if (socket) {
        socket.close();
      }
    };
  }, [hasToken, user]);

  const value = useMemo(() => ({ isConnected }), [isConnected]);

  return <AdminRealtimeContext.Provider value={value}>{children}</AdminRealtimeContext.Provider>;
}

export function useAdminRealtime() {
  const context = useContext(AdminRealtimeContext);
  if (!context) {
    throw new Error("useAdminRealtime must be used within an AdminRealtimeProvider");
  }
  return context;
}
