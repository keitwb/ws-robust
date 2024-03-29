export interface WebSocketOptions<T extends WebSocket> {
  // How long to wait after an unexpected close until attempting to reconnect.
  reconnectTimeoutMillis?: number;
  // A function that will be called every time the socket opens, either initially or after a
  // reconnect.
  onOpen?: (ws: T) => (Promise<void> | void);
  onDisconnect?: (ws: T, wantsReconnect: boolean) => (Promise<void> | void);
}

export type WSFactory<T> = string | (() => T) | (() => Promise<T>);

export class RobustWebSocket<T extends WebSocket> {
  private ws!: T;
  private isOpen = false;
  private closedManually = false;
  private wantReconnect = true;

  private options: WebSocketOptions<T> = {
    reconnectTimeoutMillis: 5000,
    onOpen: (_: T) => { }, // eslint-disable-line
    onDisconnect: (_: T, _2: boolean) => { }, // eslint-disable-line
  };

  private pendingOnOpens: (() => void)[] = [];

  constructor(private urlOrFactory: WSFactory<T>, readonly onmessage: (msg: MessageEvent) => unknown, options?: WebSocketOptions<T>) {
    if (options) {
      this.options = { ...this.options, ...options };
    }
    this.init()
  }

  private async init() {
    this.closedManually = false;
    this.wantReconnect = true;
    this.isOpen = false;

    if (typeof this.urlOrFactory === "string") {
      // @ts-ignore  Ignore the error that comes from the compiler not being able to guarantee that
      // this.ws will always be set to the same subtype of WebSocketLike.  We know it will be since
      // this.urlOrFactory can only be set once.
      this.ws = new WebSocket(this.urlOrFactory);
    } else {
      const factory = this.urlOrFactory();
      if (factory instanceof Promise) {
        this.ws = await factory;
      } else {
        this.ws = factory;
      }
    }

    let reinited = false;
    this.ws.onclose = async ev => {
      if (this.options.onDisconnect) {
        const maybePromise = this.options.onDisconnect(this.ws, this.closedManually);
        if (maybePromise) {
          await maybePromise;
        }
      }
      if (!this.wantReconnect) {
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

    this.ws.onmessage = ev => {
      this.onmessage(ev);
    }

    if (this.ws.readyState === this.ws.OPEN) {
      this._doOnOpen();
    } else {
      this.ws.onopen = () => this._doOnOpen();
    }
  }

  private async _doOnOpen() {
    if (this.options.onOpen) {
      const maybePromise = this.options.onOpen(this.ws);
      if (maybePromise) {
        await maybePromise;
      }
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
    if (!this.isOpen || this.ws.readyState !== this.ws.OPEN) {
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
    this.wantReconnect = false;
    if (this.ws.close) {
      this.ws.close(code, reason);
    }
  }

  forceReconnect() {
    this.closedManually = true;
    this.ws.close();
  }
}

interface MessageEventAsyncIterable<T> extends AsyncIterable<MessageEvent<T>>, AsyncIterator<MessageEvent<T>> {
  onMessage(msg: MessageEvent<T>): void;
  onDisconnect(_: unknown, wanted: boolean): void;
}

export function messageAsyncIterator<T>(): MessageEventAsyncIterable<T> {
  let done = false;
  let nextResolve: ((res: IteratorResult<MessageEvent<T>, unknown>) => void) | null = null;
  const messages = [] as MessageEvent<T>[];

  return {
    onMessage: (msg: MessageEvent<T>) => {
      if (nextResolve !== null) {
        nextResolve({
          done: false,
          value: msg,
        });
        return;
      }
      messages.push(msg);
    },
    onDisconnect(_: unknown, wanted: boolean) {
      done = wanted;
      if (nextResolve) {
        nextResolve({
          done: true,
          value: null,
        });
      }
    },
    next(): Promise<IteratorResult<MessageEvent<T>>> {
      if (messages.length > 0) {
        return Promise.resolve({
          done: false,
          value: messages.shift()!, // eslint-disable-line
        });
      }
      if (done) {
        return Promise.resolve({
          done: true,
          value: null,
        });
      }
      return new Promise((resolve) => {
        nextResolve = resolve;
      });
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };
}
