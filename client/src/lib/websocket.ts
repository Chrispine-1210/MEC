export interface WebSocketMessage {
  type: string;
  channel?: string;
  data?: any;
}

export class WebSocketClient {
  private socket: WebSocket | null = null;
  private subscriptions: string[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(private url: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.url);
        
        this.socket.onopen = () => {
          console.log("WebSocket connected");
          this.reconnectAttempts = 0;
          resolve();
        };

        this.socket.onclose = () => {
          console.log("WebSocket disconnected");
          this.attemptReconnect();
        };

        this.socket.onerror = (error) => {
          console.error("WebSocket error:", error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  send(message: WebSocketMessage): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  subscribe(channels: string[]): void {
    this.subscriptions = [...new Set([...this.subscriptions, ...channels])];
    this.send({ type: "subscribe", data: { channels } });
  }

  unsubscribe(channels: string[]): void {
    this.subscriptions = this.subscriptions.filter(ch => !channels.includes(ch));
    this.send({ type: "unsubscribe", data: { channels } });
  }

  onMessage(callback: (message: WebSocketMessage) => void): void {
    if (this.socket) {
      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          callback(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}
