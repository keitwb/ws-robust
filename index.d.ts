export interface WebSocketOptions {
    reconnectTimeoutMillis?: number;
    onOpen?: (ws: WebSocketLike) => (Promise<void> | void);
}
interface WebSocketLike {
    onclose: ((this: WebSocket, ev: CloseEvent) => any) | null;
    onerror: ((this: WebSocket, ev: Event) => any) | null;
    onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null;
    onopen: ((this: WebSocket, ev: Event) => any) | null;
    readonly readyState: number;
    readonly url?: string;
    close?(code?: number, reason?: string): void;
    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
    readonly OPEN: number;
}
export default class RobustWebSocket<T extends WebSocketLike> {
    private urlOrFactory;
    readonly onmessage: (msg: MessageEvent) => unknown;
    private ws;
    private isOpen;
    private closedManually;
    private options;
    private pendingOnOpens;
    constructor(urlOrFactory: string | (() => T), onmessage: (msg: MessageEvent) => unknown, options?: WebSocketOptions);
    private init;
    private _doOnOpen;
    private _doWhenOpen;
    /**
     * Send a message to the server. If the socket is not open, the message will be queued until the
     * connection is reestablished, at which point it will be sent in order.  It is still possible
     * that messages can be lost if the connection is broken in transit or right before.
     */
    send(msg: string | ArrayBufferLike | Blob | ArrayBufferView): void;
    close(code?: number, reason?: string): void;
}
export {};
