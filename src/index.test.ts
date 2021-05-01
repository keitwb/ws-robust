import WS from "jest-websocket-mock";

import RobustWebSocket from "./index";

async function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe("RobustWebSocket", () => {
  const url = "ws://localhost:8080";
  let server: WS;

  let messages = [] as string[];
  const onMessage = (msg: MessageEvent) => {
    messages.push(msg.data);
  }

  beforeEach(() => {
    server = new WS(url);
    messages = [];
  });

  afterEach(() => {
    WS.clean();
  });

  test("yields all messages received in order", async () => {
    const rs = new RobustWebSocket(url, onMessage);
    await server.connected;

    server.send("a");
    server.send("b");
    await wait(1);
    server.send("c");
    await wait(1);

    expect(messages).toEqual(["a", "b", "c"]);

    rs.close();
  });

  test("reestablishes when websocket reconnects", async () => {
    const rs = new RobustWebSocket(url, onMessage, {
      reconnectTimeoutMillis: 50,
    });
    await server.connected;

    server.send("a");
    server.send("b");

    server.close({ code: 1006, reason: "test", wasClean: false });

    server = new WS(url);
    await server.connected;

    server.send("c");
    server.send("d");

    expect(messages).toEqual(["a", "b", "c", "d"]);

    server.error();

    server = new WS(url);
    await server.connected;

    server.send("e");
    server.send("f");

    expect(messages).toEqual(["a", "b", "c", "d", "e", "f"]);

    rs.close();
  });

  test("sends messages between connections", async () => {
    const rs = new RobustWebSocket(url, onMessage, {
      reconnectTimeoutMillis: 500,
    });
    await server.connected;

    rs.send("a");
    rs.send("b");
    await wait(1);

    await expect(server).toReceiveMessage("a");
    await expect(server).toReceiveMessage("b");

    server.close({ code: 1006, reason: "test", wasClean: false });

    await wait(1);

    rs.send("c");

    const newServer = new WS(url);
    await newServer.connected;

    rs.send("d");

    await expect(newServer).toReceiveMessage("c");
    await expect(newServer).toReceiveMessage("d");
  });

});
