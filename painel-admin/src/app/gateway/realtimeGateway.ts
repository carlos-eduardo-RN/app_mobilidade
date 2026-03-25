type MessageHandler = (payload: any) => void;

type GatewayStatus = 'disconnected' | 'connecting' | 'connected';

export class RealtimeGateway {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, MessageHandler[]>();
  private statusListeners = new Set<(status: GatewayStatus) => void>();
  private status: GatewayStatus = 'disconnected';
  private retryCount = 0;
  private retryTimer: number | null = null;

  connect(url: string, token?: string) {
    if (this.ws && this.status === 'connected') return;
    this.setStatus('connecting');

    const wsUrl = new URL(url);
    if (token) {
      wsUrl.searchParams.set('token', token);
    }
    this.ws = new WebSocket(wsUrl.toString());

    this.ws.onopen = () => {
      this.retryCount = 0;
      this.setStatus('connected');
    };

    this.ws.onclose = () => {
      this.setStatus('disconnected');
      this.scheduleReconnect(url, token);
    };

    this.ws.onerror = () => {
      this.setStatus('disconnected');
      this.scheduleReconnect(url, token);
    };

    this.ws.onmessage = (message) => {
      const data = JSON.parse(message.data);
      const handlers = this.handlers.get(data.event) ?? [];
      handlers.forEach((handler) => handler(data.payload));
    };
  }

  disconnect() {
    if (this.retryTimer) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.setStatus('disconnected');
  }

  on(event: string, handler: MessageHandler) {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
  }

  onStatusChange(handler: (status: GatewayStatus) => void) {
    this.statusListeners.add(handler);
  }

  send(event: string, payload: unknown) {
    if (!this.ws || this.status !== 'connected') return;
    this.ws.send(JSON.stringify({ event, payload }));
  }

  private setStatus(next: GatewayStatus) {
    this.status = next;
    this.statusListeners.forEach((listener) => listener(next));
  }

  private scheduleReconnect(url: string, token?: string) {
    if (this.retryTimer) return;
    const delay = Math.min(15000, 1000 * Math.pow(2, this.retryCount));
    this.retryCount += 1;
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      this.connect(url, token);
    }, delay);
  }
}
