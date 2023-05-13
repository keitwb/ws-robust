# Robust WebSocket

Sometimes you just want a simple WebSocket client that is reliable against the manifold forces that
seek to destroy connections across the internet.

I have found myself implementing this kind of thing multiple times now so it seems good to make it a
library.

## Features:

 - `send` will ensure the socket has a `readyState` of `OPEN` before attempting to send
 - The socket will attempt to reconnect if disconnected
 - A single `onmessage` callback will be automatically attached to any new WebSocket instances
   created due to reconnects.

## Installation

```sh
$ npm install --save ws-robust
```

## Usage

Basic usage with a simple callback that processes each message received:

```javascript
    import RobustWebSocket from "ws-robust";

    const rs = new RobustWebSocket(url, msg => {
      console.log("Received message: ", msg);
    });

    rs.send("outgoing message");

    rs.close();
```

If you want to consume messages with a `for await` async iterator, there is a helper
`messageAsyncIterator` that facilitates this:

```javascript
    import RobustWebSocket from "ws-robust";

    const messages = messageAsyncIterator<MyMessageType>();
    const rs = new RobustWebSocket(url, messages.onMessage, {
      onDisconnect: messages.onDisconnect,
    });

    for await (const m of messages) {
        // m.data: MyMessageType
        console.log("Received message: ", m.data);
    }
    // This will only be reached if rs is manually closed from the client side.
```

## Development

To upgrade this package commit the changes desired to the master branch, then run

```
npm version <new version>
npm publish
```
