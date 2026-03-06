"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp, splitAnswerText } = require("./app.js");

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(...names) {
    for (const name of names) {
      this.values.add(name);
    }
  }

  remove(...names) {
    for (const name of names) {
      this.values.delete(name);
    }
  }

  toggle(name, force) {
    if (force === undefined) {
      if (this.values.has(name)) {
        this.values.delete(name);
        return false;
      }
      this.values.add(name);
      return true;
    }
    if (force) {
      this.values.add(name);
      return true;
    }
    this.values.delete(name);
    return false;
  }

  contains(name) {
    return this.values.has(name);
  }
}

class FakeElement {
  constructor(tagName, id = "") {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.listeners = new Map();
    this.classList = new FakeClassList();
    this._className = "";
    this._textContent = "";
    this.value = "";
    this.disabled = false;
    this.type = "";
    this.rows = 0;
    this.placeholder = "";
    this.title = "";
    this.scrollTop = 0;
    this.scrollHeight = 0;
  }

  set className(value) {
    this._className = String(value || "");
    this.classList = new FakeClassList();
    for (const name of this._className.split(/\s+/).filter(Boolean)) {
      this.classList.add(name);
    }
  }

  get className() {
    return Array.from(this.classList.values).join(" ");
  }

  set textContent(value) {
    this._textContent = String(value);
    this.children = [];
  }

  get textContent() {
    return this._textContent + this.children.map((child) => child.textContent).join("");
  }

  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  replaceChildren(...nodes) {
    this.children = [];
    this._textContent = "";
    for (const node of nodes) {
      this.appendChild(node);
    }
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(listener);
  }

  async dispatchEvent(event) {
    const listeners = this.listeners.get(event.type) || [];
    for (const listener of listeners) {
      await listener(event);
    }
  }
}

class FakeDocument {
  constructor() {
    this.nodes = new Map();
    for (const id of [
      "status",
      "session-id",
      "messages",
      "approvals",
      "user-inputs",
      "composer",
      "prompt",
      "send",
    ]) {
      this.nodes.set(id, new FakeElement("div", id));
    }
  }

  getElementById(id) {
    return this.nodes.get(id);
  }

  createElement(tagName) {
    return new FakeElement(tagName);
  }
}

function findFirst(node, predicate) {
  if (predicate(node)) {
    return node;
  }
  for (const child of node.children) {
    const found = findFirst(child, predicate);
    if (found) {
      return found;
    }
  }
  return null;
}

test("splitAnswerText keeps one answer per non-empty line", () => {
  assert.deepEqual(splitAnswerText("alpha\n\n beta \n"), ["alpha", "beta"]);
});

test("bundled UI renders and submits pending user-input requests", async () => {
  const document = new FakeDocument();
  const calls = [];
  const app = createApp({
    document,
    autoStart: false,
    EventSource: class {},
    fetch: async (requestPath, options) => {
      calls.push({
        requestPath,
        method: options.method,
        body: options.body ? JSON.parse(options.body) : null,
      });
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      };
    },
  });

  await app.init();
  app.state.sessionId = "session-1";
  app.applySessionSnapshot({
    threadId: "thread-1",
    pendingApprovals: [],
    pendingUserInputs: [
      {
        requestId: "42",
        method: "item/tool/requestUserInput",
        params: {
          questions: [
            {
              id: "color",
              header: "Color",
              question: "Pick a color",
              options: [
                { label: "Blue", description: "Recommended" },
                { label: "Red", description: "Alt" },
              ],
            },
          ],
        },
      },
    ],
  });

  const userInputRoot = document.getElementById("user-inputs");
  assert.equal(userInputRoot.classList.contains("empty"), false);
  assert.match(userInputRoot.textContent, /Pick a color/);

  const quickChoice = findFirst(
    userInputRoot,
    (node) => node.tagName === "BUTTON" && node.textContent === "Blue",
  );
  assert.ok(quickChoice);
  await quickChoice.dispatchEvent({ type: "click" });

  const textarea = findFirst(userInputRoot, (node) => node.tagName === "TEXTAREA");
  assert.ok(textarea);
  assert.equal(textarea.value, "Blue");
  textarea.value = "Blue\nGreen";

  const form = findFirst(userInputRoot, (node) => node.tagName === "FORM");
  assert.ok(form);
  await form.dispatchEvent({
    type: "submit",
    preventDefault() {},
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].requestPath, "/api/user-input/respond");
  assert.deepEqual(calls[0].body, {
    sessionId: "session-1",
    requestId: "42",
    answers: {
      color: ["Blue", "Green"],
    },
  });

  app.handleUserInputResolved({
    request: {
      requestId: "42",
    },
  });
  assert.match(userInputRoot.textContent, /No pending user input requests/);
});
