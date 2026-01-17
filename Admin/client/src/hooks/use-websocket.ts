import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface WebSocketMessage {
  type: string;
  data: any;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Get current user ID from localStorage or context
    const currentUserId = localStorage.getItem("userId") || "anonymous";
    
    // Determine WebSocket protocol based on current protocol
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${currentUserId}`;

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log("WebSocket connected");
      };

      socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      socket.onclose = (event) => {
        console.log("WebSocket disconnected:", event.reason);
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            // Recursive call to reconnect
            useWebSocket();
          }
        }, 3000);
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleWebSocketMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case "USER_UPDATED":
        toast({
          title: "User Updated",
          description: `User ${message.data.username} has been updated`,
        });
        break;

      case "USER_DELETED":
        toast({
          title: "User Deleted",
          description: "A user has been removed from the system",
          variant: "destructive",
        });
        break;

      case "SCHOLARSHIP_CREATED":
        toast({
          title: "New Scholarship",
          description: `Scholarship "${message.data.title}" has been created`,
        });
        break;

      case "APPLICATION_SUBMITTED":
        toast({
          title: "New Application",
          description: "A new application has been submitted for review",
        });
        break;

      case "CONTENT_FLAGGED":
        toast({
          title: "Content Flagged",
          description: "Content has been flagged by moderation system",
          variant: "destructive",
        });
        break;

      case "NOTIFICATION":
        toast({
          title: message.data.title || "Notification",
          description: message.data.message,
          variant: message.data.type === "error" ? "destructive" : "default",
        });
        break;

      default:
        console.log("Unknown WebSocket message type:", message.type);
    }
  };

  const sendMessage = (message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected");
    }
  };

  return { sendMessage };
}
