export interface WebSocketOptions {
  reconnectTimeoutMillis: number;
}

export default class RobustWebSocket {
  private ws: WebSocket;
  private isClosed = false;

  private options: WebSocketOptions = {
    reconnectTimeoutMillis: 5000,
  };

  private pendingOnOpens: (() => void)[] = [];

  constructor(readonly url: string, readonly onmessage: (msg: MessageEvent) => unknown, options?: WebSocketOptions) {
    if (options) {
      this.options = {...this.options, ...options};
    }
    this.init()
  }

  private init() {
    this.ws = new WebSocket(this.url);

    this.ws.addEventListener("open", () => {
      for (const f of this.pendingOnOpens) {
        try {
          f();
        } catch (e) {
          console.error("Error running pending onOpen callback", e);
        }
      }
      this.pendingOnOpens = [];
    });

    let reinited = false;
    this.ws.onerror = this.ws.onclose = ev => {
      if (this.isClosed) {
        return;
      }
      console.log(`Websocket to ${this.url} closed or errored (code=${ev.code} reason=${ev.reason})`);

      setTimeout(() => {
        if (!reinited) {
          reinited = true;
          this.init();
        }
      }, this.options.reconnectTimeoutMillis);
    };

    this.ws.onmessage = this.onmessage;
  }

  private _doWhenOpen(f: () => void) {
    if (this.ws.readyState !== WebSocket.OPEN) {
      this.pendingOnOpens.push(f);
    } else {
      f();
    }
  }

  /**
   * Send a message to the server. If the socket is not open, the message will be queued until the
   * connection is reestablished, at which point it will be sent in order.  It is still possible
   * that messages can be lost if the connection is broken in transit or right before.
   */
  send(msg: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    this._doWhenOpen(() => {
      this.ws.send(msg);
    });
  }

  // Close the connection to the server.  It will not be reestablished in this case.
  close(code?: number, reason?: string): void {
    this.isClosed = true;
    this.ws.close(code, reason);
  }
}
