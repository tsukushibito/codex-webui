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
      "shell",
      "status",
      "session-id",
      "messages",
      "workspace-tree",
      "selected-path",
      "file-preview",
      "diff-view",
      "approvals",
      "user-inputs",
      "composer",
      "prompt",
      "send",
      "tab-chat",
      "tab-files",
      "tab-diff",
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

  const respondCall = calls.find((call) => call.requestPath === "/api/user-input/respond");
  assert.ok(respondCall);
  assert.deepEqual(respondCall.body, {
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

test("bundled UI renders workspace tree and Git-backed file inspection", async () => {
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
      });

      if (requestPath === "/api/fs/tree") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            tree: [
              {
                type: "file",
                name: "README.md",
                path: "README.md",
                tracked: true,
                gitStatus: " M",
                indexStatus: " ",
                worktreeStatus: "M",
              },
              {
                type: "directory",
                name: "docs",
                path: "docs",
                children: [
                  {
                    type: "file",
                    name: "notes.md",
                    path: "docs/notes.md",
                    tracked: true,
                    gitStatus: "??",
                    indexStatus: "?",
                    worktreeStatus: "?",
                  },
                ],
              },
            ],
          }),
        };
      }

      if (requestPath === "/api/fs/file?path=README.md") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            file: {
              path: "README.md",
              size: 12,
              content: "hello world\n",
            },
          }),
        };
      }

      if (requestPath === "/api/git/diff?path=README.md") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            diff: {
              path: "README.md",
              gitStatus: " M",
              left: {
                path: "README.md",
                ref: "HEAD",
                exists: true,
                size: 5,
                content: "hello",
              },
              right: {
                path: "README.md",
                ref: "WORKTREE",
                exists: true,
                size: 12,
                content: "hello world\n",
              },
            },
          }),
        };
      }

      if (requestPath === "/api/fs/file?path=docs%2Fnotes.md") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            file: {
              path: "docs/notes.md",
              size: 11,
              content: "notes here\n",
            },
          }),
        };
      }

      if (requestPath === "/api/git/diff?path=docs%2Fnotes.md") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            diff: {
              path: "docs/notes.md",
              gitStatus: "??",
              left: {
                path: "docs/notes.md",
                ref: "HEAD",
                exists: false,
                size: 0,
                content: "",
              },
              right: {
                path: "docs/notes.md",
                ref: "WORKTREE",
                exists: true,
                size: 11,
                content: "notes here\n",
              },
            },
          }),
        };
      }

      throw new Error(`Unexpected request: ${requestPath}`);
    },
  });

  await app.init();

  const workspaceTree = document.getElementById("workspace-tree");
  const filePreview = document.getElementById("file-preview");
  const diffView = document.getElementById("diff-view");

  assert.match(workspaceTree.textContent, /README\.md/);
  assert.match(workspaceTree.textContent, /notes\.md/);
  assert.match(filePreview.textContent, /hello world/);
  assert.match(diffView.textContent, /HEAD/);
  assert.match(diffView.textContent, /WORKTREE/);
  await document.getElementById("tab-files").dispatchEvent({ type: "click" });
  assert.equal(document.getElementById("shell").dataset.activePane, "files");

  const notesButton = findFirst(
    workspaceTree,
    (node) => node.tagName === "BUTTON" && node.dataset.path === "docs/notes.md",
  );
  assert.ok(notesButton);
  await notesButton.dispatchEvent({ type: "click" });

  assert.equal(app.state.selectedPath, "docs/notes.md");
  assert.equal(document.getElementById("shell").dataset.activePane, "diff");
  assert.match(filePreview.textContent, /notes here/);
  assert.match(diffView.textContent, /File does not exist on this side/);
  assert.ok(calls.some((call) => call.requestPath === "/api/fs/tree"));
  assert.ok(calls.some((call) => call.requestPath === "/api/git/diff?path=docs%2Fnotes.md"));
});
