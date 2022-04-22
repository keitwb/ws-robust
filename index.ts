export interface WebSocketOptions {
  // How long to wait after an unexpected close until attempting to reconnect.
  reconnectTimeoutMillis?: number;
  // A function that will be called every time the socket opens, either initially or after a
  // reconnect.
  onOpen?: (ws: WebSocketLike) => (Promise<void> | void);
}

export interface WebSocketLike {
  onclose: ((ev: {code: any, reason?: any}) => any) | null;
  onerror: ((ev: {code?: any, reason?: any}) => any) | null;
  onmessage: ((ev: {data: any}) => any) | null;
  onopen: ((ev: any) => any) | null;
  readonly readyState: number;
  readonly url?: string;
  close?(code?: number, reason?: string): void;
  send(data: string | ArrayBufferLike | ArrayBufferView): void;
  readonly OPEN: number;
}

export default class RobustWebSocket<T extends WebSocketLike> {
  private ws: T;
  private isOpen = false;
  private closedManually = false;

  private options: WebSocketOptions = {
    reconnectTimeoutMillis: 5000,
    onOpen: (_: T) => { }, // eslint-disable-line
  };

  private pendingOnOpens: (() => void)[] = [];

  constructor(private urlOrFactory: string | (() => T), readonly onmessage: (msg: MessageEvent) => unknown, options?: WebSocketOptions) {
    if (options) {
      this.options = { ...this.options, ...options };
    }
    this.init()
  }

  private init() {
    this.closedManually = false;
    this.isOpen = false;
    if (typeof this.urlOrFactory === "string") {
      // @ts-ignore  Ignore the error that comes from the compiler not being able to guarantee that
      // this.ws will always be set to the same subtype of WebSocketLike.  We know it will be since
      // this.urlOrFactory can only be set once.
      this.ws = new WebSocket(this.urlOrFactory);
    } else {
      this.ws = this.urlOrFactory();
    }

    let reinited = false;
    this.ws.onerror = this.ws.onclose = ev => {
      // Check if we closed manually:
      if (this.closedManually) {
        return;
      }
      console.log(`Websocket to ${this.ws.url ?? "unknown"} closed or errored (code=${ev.code} reason=${ev.reason}), reconnecting...`);

      setTimeout(() => {
        if (!reinited) {
          // Set this in case we get both onerror and onclose for the same socket instance.
          reinited = true;
          this.init();
        }
      }, this.options.reconnectTimeoutMillis);
    };

    this.ws.onmessage = this.onmessage;

    if (this.ws.readyState === this.ws.OPEN) {
      this._doOnOpen();
    } else {
      this.ws.onopen = () => this._doOnOpen();
    }

  }

  private async _doOnOpen() {
    const maybePromise = this.options.onOpen(this.ws);
    if (maybePromise) {
      await maybePromise;
    }

    this.isOpen = true;

    for (const f of this.pendingOnOpens) {
      try {
        f();
      } catch (e) {
        console.error("Error running pending onOpen callback", e);
      }
    }
    this.pendingOnOpens = [];
  }

  private _doWhenOpen(f: () => void) {
    if (!this.isOpen || this.ws.readyState !== WebSocket.OPEN) {
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
  send(msg: string | ArrayBufferLike | ArrayBufferView): void {
    this._doWhenOpen(() => {
      this.ws.send(msg);
    });
  }

  // Close the connection to the server.  It will not be reestablished in this case.
  close(code?: number, reason?: string): void {
    this.closedManually = true;
    if (this.ws.close) {
      this.ws.close(code, reason);
    }
  }
}
