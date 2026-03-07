"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp, splitAnswerText } = require("./app.js");
const {
  FakeDocument,
  FakeEventSource,
  FakeStorage,
  findFirst,
} = require("../test-helpers/fake-dom.js");

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

test("bundled UI reconnects a stored session and rebuilds transcript from thread/read", async () => {
  const document = new FakeDocument();
  const storage = new FakeStorage({
    "codex-webui.sessionId": "session-restore",
  });
  const calls = [];
  FakeEventSource.instances = [];

  const app = createApp({
    document,
    storage,
    EventSource: FakeEventSource,
    fetch: async (requestPath, options) => {
      calls.push({
        requestPath,
        method: options.method,
        body: options.body ? JSON.parse(options.body) : null,
      });

      if (requestPath === "/api/fs/tree") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, tree: [] }),
        };
      }

      if (requestPath === "/api/session/reconnect") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            sessionId: "session-restore",
            threadId: "thread-restore",
            pendingApprovals: [
              {
                requestId: "approval-1",
                method: "item/commandExecution/requestApproval",
                params: { command: ["pwd"] },
              },
            ],
            pendingUserInputs: [],
          }),
        };
      }

      if (requestPath === "/api/thread/read") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            result: {
              thread: {
                id: "thread-restore",
                turns: [
                  {
                    id: "turn-1",
                    items: [
                      {
                        id: "user-1",
                        type: "userMessage",
                        content: [{ type: "text", text: "Reconnect me" }],
                      },
                      {
                        id: "assistant-1",
                        type: "agentMessage",
                        text: "Transcript restored",
                      },
                    ],
                  },
                ],
              },
            },
          }),
        };
      }

      throw new Error(`Unexpected request: ${requestPath}`);
    },
  });

  await app.init();

  const messages = document.getElementById("messages");
  const approvals = document.getElementById("approvals");

  assert.equal(app.state.sessionId, "session-restore");
  assert.equal(app.state.threadId, "thread-restore");
  assert.match(messages.textContent, /Reconnect me/);
  assert.match(messages.textContent, /Transcript restored/);
  assert.match(approvals.textContent, /item\/commandExecution\/requestApproval/);
  assert.equal(document.getElementById("session-id").textContent, "session-restore");
  assert.equal(FakeEventSource.instances.length, 1);
  assert.equal(FakeEventSource.instances[0].url, "/api/session/events?sessionId=session-restore");

  assert.ok(calls.some((call) => call.requestPath === "/api/session/reconnect"));
  assert.ok(calls.some((call) => call.requestPath === "/api/thread/read"));
  assert.equal(calls.some((call) => call.requestPath === "/api/session/start"), false);
  assert.equal(storage.getItem("codex-webui.sessionId"), "session-restore");
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
