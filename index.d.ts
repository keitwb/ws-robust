export interface WebSocketOptions {
    reconnectTimeoutMillis?: number;
    onOpen?: (ws: WebSocketLike) => (Promise<void> | void);
}
export interface WebSocketLike {
    onclose: ((ev: {
        code: any;
        reason?: any;
    }) => any) | null;
    onerror: ((ev: {
        code?: any;
        reason?: any;
    }) => any) | null;
    onmessage: ((ev: {
        data: any;
    }) => any) | null;
    onopen: ((ev: any) => any) | null;
    readonly readyState: number;
    readonly url?: string;
    close?(code?: number, reason?: string): void;
    send(data: string | ArrayBufferLike | ArrayBufferView): void;
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
    send(msg: string | ArrayBufferLike | ArrayBufferView): void;
    close(code?: number, reason?: string): void;
}
