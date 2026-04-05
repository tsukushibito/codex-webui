import { createInterface } from "node:readline";

const protocolVersion = "2025-03-26";
let threadCounter = 1;
let turnCounter = 1;
let itemCounter = 1;

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function nextId(prefix, counter) {
  return `${prefix}_${String(counter).padStart(3, "0")}`;
}

const lineReader = createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

lineReader.on("line", (line) => {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return;
  }

  const message = JSON.parse(trimmed);
  const method = String(message.method ?? "");

  if (method === "initialize") {
    send({
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocolVersion,
        serverInfo: {
          name: "fake-codex-app-server",
          version: "0.1.0",
        },
      },
    });
    return;
  }

  if (method === "notifications/initialized") {
    return;
  }

  if (method === "thread/start") {
    const threadId = nextId("thread_live", threadCounter++);
    send({
      jsonrpc: "2.0",
      id: message.id,
      result: {
        thread: {
          id: threadId,
        },
      },
    });
    return;
  }

  if (method === "turn/start") {
    const threadId = String(message.params?.threadId ?? "");
    const turnId = nextId("turn_live", turnCounter++);
    const itemId = nextId("item_live", itemCounter++);
    const prompt = String(message.params?.input?.[0]?.text ?? "");
    const finalText = `Synthetic assistant response for: ${prompt}`;

    send({
      jsonrpc: "2.0",
      id: message.id,
      result: {
        turn: {
          id: turnId,
        },
      },
    });

    setTimeout(() => {
      send({
        jsonrpc: "2.0",
        method: "turn/started",
        params: {
          threadId,
          turn: {
            id: turnId,
          },
        },
      });
      send({
        jsonrpc: "2.0",
        method: "item/started",
        params: {
          threadId,
          turnId,
          item: {
            id: itemId,
            type: "agentMessage",
            phase: "final_answer",
          },
        },
      });
      send({
        jsonrpc: "2.0",
        method: "item/agentMessage/delta",
        params: {
          threadId,
          turnId,
          itemId,
          delta: finalText,
        },
      });
      send({
        jsonrpc: "2.0",
        method: "item/completed",
        params: {
          threadId,
          turnId,
          item: {
            id: itemId,
            type: "agentMessage",
            phase: "final_answer",
            text: finalText,
          },
        },
      });
      send({
        jsonrpc: "2.0",
        method: "turn/completed",
        params: {
          threadId,
          turn: {
            id: turnId,
            status: "completed",
          },
        },
      });
    }, 10);
    return;
  }

  if (method === "turn/interrupt") {
    send({
      jsonrpc: "2.0",
      id: message.id,
      result: {
        turn: {
          id: String(message.params?.turnId ?? ""),
          status: "interrupted",
        },
      },
    });
  }
});

process.stdin.on("end", () => {
  process.exit(0);
});
