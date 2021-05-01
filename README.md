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

```javascript
    import RobustWebSocket from "ws-robust";

    const rs = new RobustWebSocket(url, msg => {
      console.log("Received message: ", msg);
    });

    rs.send("outgoing message");

    rs.close();
```
