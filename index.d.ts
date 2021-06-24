export interface WebSocketOptions {
    reconnectTimeoutMillis?: number;
    onOpen?: (ws: RobustWebSocket) => void;
}
export default class RobustWebSocket {
    readonly url: string;
    readonly onmessage: (msg: MessageEvent) => unknown;
    private ws;
    private isClosed;
    private options;
    private pendingOnOpens;
    constructor(url: string, onmessage: (msg: MessageEvent) => unknown, options?: WebSocketOptions);
    private init;
    private _doWhenOpen;
    /**
     * Send a message to the server. If the socket is not open, the message will be queued until the
     * connection is reestablished, at which point it will be sent in order.  It is still possible
     * that messages can be lost if the connection is broken in transit or right before.
     */
    send(msg: string | ArrayBufferLike | Blob | ArrayBufferView): void;
    close(code?: number, reason?: string): void;
}
