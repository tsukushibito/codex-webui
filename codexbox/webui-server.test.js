"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const {
  createFakeCodexBin,
  createTempGitRepo,
  git,
  parseSseTranscript,
  REPO_ROOT,
  startServer,
} = require("./test-helpers/server-harness.js");

async function waitForCondition(check, description) {
  const deadline = Date.now() + 5000;

  while (Date.now() < deadline) {
    const result = await check();
    if (result) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(description);
}

test("GET /api/fs/tree returns tracked files", async (t) => {
  const { port } = await startServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/api/fs/tree`);
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.ok(Array.isArray(body.entries));
  assert.ok(body.entries.some((entry) => entry.path === "README.md"));
});

test("GET /static serves split frontend assets", async (t) => {
  const { port } = await startServer(t);

  const indexResponse = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(indexResponse.status, 200);
  const indexHtml = await indexResponse.text();
  assert.match(indexHtml, /\/static\/app-transport\.js/);
  assert.match(indexHtml, /\/static\/app-session\.js/);
  assert.match(indexHtml, /\/static\/app-render\.js/);

  const scriptResponse = await fetch(`http://127.0.0.1:${port}/static/app-transport.js`);
  assert.equal(scriptResponse.status, 200);
  assert.match(scriptResponse.headers.get("content-type") || "", /text\/javascript/);
  const scriptBody = await scriptResponse.text();
  assert.match(scriptBody, /createApiClient/);
});

test("GET /api/fs/file returns text content for a workspace file", async (t) => {
  const { port } = await startServer(t);
  const response = await fetch(
    `http://127.0.0.1:${port}/api/fs/file?path=${encodeURIComponent("README.md")}`,
  );
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.file.path, "README.md");
  assert.match(body.file.content, /codex-webui/);
});

test("GET /api/fs/file blocks path traversal", async (t) => {
  const { port } = await startServer(t);
  const response = await fetch(
    `http://127.0.0.1:${port}/api/fs/file?path=${encodeURIComponent("../etc/passwd")}`,
  );
  assert.equal(response.status, 400);

  const body = await response.json();
  assert.equal(body.ok, false);
  assert.match(body.error, /path escapes workspace|path not found/);
});

test("GET /api/fs/file rejects binary files", async (t) => {
  const binaryPath = path.join(REPO_ROOT, ".tmp", "fs-api-binary.bin");
  await fs.mkdir(path.dirname(binaryPath), { recursive: true });
  await fs.writeFile(binaryPath, Buffer.from([0x00, 0x01, 0x02]));
  t.after(async () => {
    await fs.rm(binaryPath, { force: true });
  });

  const { port } = await startServer(t);
  const response = await fetch(
    `http://127.0.0.1:${port}/api/fs/file?path=${encodeURIComponent(".tmp/fs-api-binary.bin")}`,
  );
  assert.equal(response.status, 400);

  const body = await response.json();
  assert.equal(body.ok, false);
  assert.match(body.error, /binary files are not supported/);
});

test("GET /api/fs/file rejects oversized files", async (t) => {
  const largePath = path.join(REPO_ROOT, ".tmp", "fs-api-large.txt");
  await fs.mkdir(path.dirname(largePath), { recursive: true });
  await fs.writeFile(largePath, "x".repeat(129));
  t.after(async () => {
    await fs.rm(largePath, { force: true });
  });

  const { port } = await startServer(t);
  const response = await fetch(
    `http://127.0.0.1:${port}/api/fs/file?path=${encodeURIComponent(".tmp/fs-api-large.txt")}`,
  );
  assert.equal(response.status, 400);

  const body = await response.json();
  assert.equal(body.ok, false);
  assert.match(body.error, /file is too large/);
});

test("GET /api/git/show returns HEAD content for a tracked file", async (t) => {
  const repoDir = await createTempGitRepo(t);
  await fs.writeFile(path.join(repoDir, "tracked.txt"), "tracked-v2\n");

  const { port } = await startServer(t, { workspaceRoot: repoDir });
  const response = await fetch(
    `http://127.0.0.1:${port}/api/git/show?path=${encodeURIComponent("tracked.txt")}`,
  );
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.file.path, "tracked.txt");
  assert.equal(body.file.ref, "HEAD");
  assert.equal(body.file.exists, true);
  assert.equal(body.file.content, "tracked-v1\n");
});

test("GET /api/git/show rejects directories", async (t) => {
  const repoDir = await createTempGitRepo(t);

  const { port } = await startServer(t, { workspaceRoot: repoDir });
  const response = await fetch(
    `http://127.0.0.1:${port}/api/git/show?path=${encodeURIComponent("nested")}`,
  );
  assert.equal(response.status, 400);

  const body = await response.json();
  assert.equal(body.ok, false);
  assert.match(body.error, /path is not a file/);
});

test("GET /api/git/show rejects invalid refs", async (t) => {
  const repoDir = await createTempGitRepo(t);

  const { port } = await startServer(t, { workspaceRoot: repoDir });
  const response = await fetch(
    `http://127.0.0.1:${port}/api/git/show?path=${encodeURIComponent("tracked.txt")}&ref=${encodeURIComponent("does-not-exist")}`,
  );
  assert.equal(response.status, 400);

  const body = await response.json();
  assert.equal(body.ok, false);
  assert.match(body.error, /invalid ref/);
});

test("GET /api/git/diff returns HEAD and worktree content for modified files", async (t) => {
  const repoDir = await createTempGitRepo(t);
  await fs.writeFile(path.join(repoDir, "tracked.txt"), "tracked-v2\n");

  const { port } = await startServer(t, { workspaceRoot: repoDir });
  const response = await fetch(
    `http://127.0.0.1:${port}/api/git/diff?path=${encodeURIComponent("tracked.txt")}`,
  );
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.diff.path, "tracked.txt");
  assert.equal(body.diff.left.content, "tracked-v1\n");
  assert.equal(body.diff.right.content, "tracked-v2\n");
  assert.equal(body.diff.left.exists, true);
  assert.equal(body.diff.right.exists, true);
  assert.match(body.diff.gitStatus, /M/);
});

test("GET /api/git/diff uses an empty left side for new files", async (t) => {
  const repoDir = await createTempGitRepo(t);
  await fs.writeFile(path.join(repoDir, "new-file.txt"), "brand-new\n");

  const { port } = await startServer(t, { workspaceRoot: repoDir });
  const response = await fetch(
    `http://127.0.0.1:${port}/api/git/diff?path=${encodeURIComponent("new-file.txt")}`,
  );
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.diff.left.exists, false);
  assert.equal(body.diff.left.content, "");
  assert.equal(body.diff.right.exists, true);
  assert.equal(body.diff.right.content, "brand-new\n");
  assert.equal(body.diff.right.ref, "WORKTREE");
  assert.equal(body.diff.gitStatus, "??");
});

test("GET /api/git/diff compares symlink paths as symlink entries", async (t) => {
  const repoDir = await createTempGitRepo(t);
  await fs.writeFile(path.join(repoDir, "target.txt"), "target-v1\n");
  await fs.symlink("target.txt", path.join(repoDir, "link.txt"));
  await git(repoDir, ["add", "target.txt", "link.txt"]);
  await git(repoDir, ["commit", "-qm", "add symlink"]);
  await fs.writeFile(path.join(repoDir, "target.txt"), "target-v2\n");

  const { port } = await startServer(t, { workspaceRoot: repoDir });
  const response = await fetch(
    `http://127.0.0.1:${port}/api/git/diff?path=${encodeURIComponent("link.txt")}`,
  );
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.diff.left.exists, true);
  assert.equal(body.diff.right.exists, true);
  assert.equal(body.diff.left.content, "target.txt");
  assert.equal(body.diff.right.content, "target.txt");
  assert.equal(body.diff.gitStatus, "  ");
});

test("GET /api/git/diff uses an empty right side for deleted files", async (t) => {
  const repoDir = await createTempGitRepo(t);
  await fs.rm(path.join(repoDir, "tracked.txt"));

  const { port } = await startServer(t, { workspaceRoot: repoDir });
  const response = await fetch(
    `http://127.0.0.1:${port}/api/git/diff?path=${encodeURIComponent("tracked.txt")}`,
  );
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.diff.left.exists, true);
  assert.equal(body.diff.left.content, "tracked-v1\n");
  assert.equal(body.diff.right.exists, false);
  assert.equal(body.diff.right.content, "");
  assert.match(body.diff.gitStatus, /D/);
});

test("GET /api/git/diff blocks path traversal", async (t) => {
  const repoDir = await createTempGitRepo(t);

  const { port } = await startServer(t, { workspaceRoot: repoDir });
  const response = await fetch(
    `http://127.0.0.1:${port}/api/git/diff?path=${encodeURIComponent("../etc/passwd")}`,
  );
  assert.equal(response.status, 400);

  const body = await response.json();
  assert.equal(body.ok, false);
  assert.match(body.error, /path escapes workspace/);
});

test("session reconnect returns snapshot and thread/read resyncs transcript", async (t) => {
  const fakeCodex = await createFakeCodexBin(
    t,
    `#!/usr/bin/env node
const readline = require("node:readline");

const rl = readline.createInterface({ input: process.stdin });
let approvalSent = false;

function send(message) {
  process.stdout.write(JSON.stringify(message) + "\\n");
}

rl.on("line", (line) => {
  const message = JSON.parse(line);

  if (message.method === "initialize") {
    send({ jsonrpc: "2.0", id: message.id, result: { protocolVersion: "2026-03-01" } });
    return;
  }

  if (message.method === "thread/start") {
    send({
      jsonrpc: "2.0",
      id: message.id,
      result: {
        thread: {
          id: "thread-1",
        },
      },
    });
    if (!approvalSent) {
      approvalSent = true;
      send({
        jsonrpc: "2.0",
        id: "approval-1",
        method: "item/commandExecution/requestApproval",
        params: {
          command: ["pwd"],
          cwd: "/workspace",
        },
      });
    }
    return;
  }

  if (message.method === "thread/read") {
    send({
      jsonrpc: "2.0",
      id: message.id,
      result: {
        thread: {
          id: "thread-1",
          cliVersion: "0.111.0",
          createdAt: 1,
          cwd: "/workspace",
          ephemeral: false,
          modelProvider: "openai",
          preview: "Hello",
          source: "appServer",
          status: "idle",
          updatedAt: 2,
          turns: [
            {
              id: "turn-1",
              status: "completed",
              items: [
                {
                  id: "user-1",
                  type: "userMessage",
                  content: [{ type: "text", text: "Hello" }],
                },
                {
                  id: "assistant-1",
                  type: "agentMessage",
                  text: "Hi there",
                },
              ],
            },
          ],
        },
      },
    });
    return;
  }

  if (Object.prototype.hasOwnProperty.call(message, "id")) {
    send({ jsonrpc: "2.0", id: message.id, result: {} });
  }
});
`,
  );

  const { port } = await startServer(t, { codexBin: fakeCodex });

  const startResponse = await fetch(`http://127.0.0.1:${port}/api/session/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(startResponse.status, 200);
  const startBody = await startResponse.json();
  assert.equal(startBody.ok, true);

  const threadResponse = await fetch(`http://127.0.0.1:${port}/api/thread/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: startBody.sessionId,
      params: {},
    }),
  });
  assert.equal(threadResponse.status, 200);
  const threadBody = await threadResponse.json();
  assert.equal(threadBody.ok, true);
  assert.equal(threadBody.result.thread.id, "thread-1");

  await new Promise((resolve) => setTimeout(resolve, 25));

  const reconnectResponse = await fetch(`http://127.0.0.1:${port}/api/session/reconnect`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: startBody.sessionId,
    }),
  });
  assert.equal(reconnectResponse.status, 200);

  const reconnectBody = await reconnectResponse.json();
  assert.equal(reconnectBody.ok, true);
  assert.equal(reconnectBody.sessionId, startBody.sessionId);
  assert.equal(reconnectBody.threadId, "thread-1");
  assert.equal(reconnectBody.pendingApprovals.length, 1);
  assert.equal(reconnectBody.pendingApprovals[0].requestId, "approval-1");

  const readResponse = await fetch(`http://127.0.0.1:${port}/api/thread/read`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: startBody.sessionId,
      threadId: "thread-1",
    }),
  });
  assert.equal(readResponse.status, 200);

  const readBody = await readResponse.json();
  assert.equal(readBody.ok, true);
  assert.equal(readBody.result.thread.id, "thread-1");
  assert.equal(readBody.result.thread.turns.length, 1);
  assert.equal(readBody.result.thread.turns[0].items[0].type, "userMessage");
  assert.equal(readBody.result.thread.turns[0].items[1].text, "Hi there");
});

test("approval, user input, and session closeout keep runtime state transitions intact", async (t) => {
  const logDir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-webui-runtime-"));
  const logPath = path.join(logDir, "runtime.log");
  t.after(async () => {
    await fs.rm(logDir, { recursive: true, force: true });
  });

  const fakeCodex = await createFakeCodexBin(
    t,
    `#!/usr/bin/env node
const fs = require("node:fs");
const readline = require("node:readline");

const logPath = ${JSON.stringify(logPath)};
const rl = readline.createInterface({ input: process.stdin });

function send(message) {
  process.stdout.write(JSON.stringify(message) + "\\n");
}

function log(line) {
  fs.appendFileSync(logPath, line + "\\n");
}

rl.on("line", (line) => {
  if (!line.trim()) {
    return;
  }

  const message = JSON.parse(line);

  if (message.method === "initialize") {
    send({ jsonrpc: "2.0", id: message.id, result: { protocolVersion: "2026-03-01" } });
    return;
  }

  if (message.method === "thread/start") {
    send({
      jsonrpc: "2.0",
      id: message.id,
      result: {
        thread: {
          id: "thread-runtime",
        },
      },
    });
    send({
      jsonrpc: "2.0",
      id: "approval-1",
      method: "execCommandApproval",
      params: {
        command: ["pwd"],
      },
    });
    return;
  }

  if (message.id === "approval-1") {
    log("approval:" + JSON.stringify(message.result));
    send({
      jsonrpc: "2.0",
      id: "user-input-1",
      method: "item/tool/requestUserInput",
      params: {
        questions: [
          {
            id: "choice",
            prompt: "Pick one",
          },
        ],
      },
    });
    return;
  }

  if (message.id === "user-input-1") {
    log("user-input:" + JSON.stringify(message.result));
  }
});
`,
  );

  const { port } = await startServer(t, { codexBin: fakeCodex });
  const startResponse = await fetch(`http://127.0.0.1:${port}/api/session/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(startResponse.status, 200);
  const startBody = await startResponse.json();
  assert.equal(startBody.ok, true);

  const threadResponse = await fetch(`http://127.0.0.1:${port}/api/thread/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: startBody.sessionId,
      params: {},
    }),
  });
  assert.equal(threadResponse.status, 200);

  const approvalsBody = await waitForCondition(async () => {
    const response = await fetch(
      `http://127.0.0.1:${port}/api/approvals?sessionId=${encodeURIComponent(startBody.sessionId)}`,
    );
    const body = await response.json();
    return body.pendingApprovals.length === 1 ? body : null;
  }, "approval did not become pending");
  assert.equal(approvalsBody.pendingApprovals[0].requestId, "approval-1");

  const approvalResponse = await fetch(`http://127.0.0.1:${port}/api/approvals/respond`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: startBody.sessionId,
      requestId: "approval-1",
      decision: "allow",
    }),
  });
  assert.equal(approvalResponse.status, 200);
  const approvalBody = await approvalResponse.json();
  assert.equal(approvalBody.ok, true);
  assert.equal(approvalBody.resolved.result.decision, "approved");

  const userInputBody = await waitForCondition(async () => {
    const response = await fetch(
      `http://127.0.0.1:${port}/api/user-input?sessionId=${encodeURIComponent(startBody.sessionId)}`,
    );
    const body = await response.json();
    return body.pendingUserInputs.length === 1 ? body : null;
  }, "user input did not become pending");
  assert.equal(userInputBody.pendingUserInputs[0].requestId, "user-input-1");

  const userInputResponse = await fetch(`http://127.0.0.1:${port}/api/user-input/respond`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: startBody.sessionId,
      requestId: "user-input-1",
      answers: {
        choice: ["alpha"],
      },
    }),
  });
  assert.equal(userInputResponse.status, 200);
  const userInputResolved = await userInputResponse.json();
  assert.equal(userInputResolved.ok, true);
  assert.deepEqual(userInputResolved.resolved.result.answers.choice.answers, ["alpha"]);

  const logText = await waitForCondition(async () => {
    try {
      const text = await fs.readFile(logPath, "utf8");
      return text.includes("approval:") && text.includes("user-input:") ? text : null;
    } catch {
      return null;
    }
  }, "runtime did not record approval and user-input responses");
  assert.match(logText, /approval:\{"decision":"approved"\}/);
  assert.match(logText, /user-input:\{"answers":\{"choice":\{"answers":\["alpha"\]\}\}\}/);

  const endResponse = await fetch(`http://127.0.0.1:${port}/api/session/end`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: startBody.sessionId,
    }),
  });
  assert.equal(endResponse.status, 200);
  const endBody = await endResponse.json();
  assert.equal(endBody.ok, true);

  const reconnectResponse = await fetch(`http://127.0.0.1:${port}/api/session/reconnect`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: startBody.sessionId,
    }),
  });
  assert.equal(reconnectResponse.status, 400);
  const reconnectBody = await reconnectResponse.json();
  assert.equal(reconnectBody.ok, false);
  assert.match(reconnectBody.error, /session not found/);
});

test("GET /api/turn/changes returns snapshot-based turn-local changed files", async (t) => {
  const repoDir = await createTempGitRepo(t);
  await fs.writeFile(path.join(repoDir, "preexisting.txt"), "base-before\n");
  await fs.writeFile(path.join(repoDir, "remove-me.txt"), "remove-me\n");
  await fs.writeFile(path.join(repoDir, "deleted-before.txt"), "deleted-before\n");
  await git(repoDir, ["add", "preexisting.txt", "remove-me.txt", "deleted-before.txt"]);
  await git(repoDir, ["commit", "-qm", "add more tracked files"]);

  await fs.writeFile(path.join(repoDir, "preexisting.txt"), "dirty-before\n");
  await fs.writeFile(path.join(repoDir, "existing-untracked.txt"), "untracked-before\n");
  await fs.rm(path.join(repoDir, "deleted-before.txt"));

  const fakeCodex = await createFakeCodexBin(
    t,
    `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const rl = readline.createInterface({ input: process.stdin });

function send(message) {
  process.stdout.write(JSON.stringify(message) + "\\n");
}

rl.on("line", (line) => {
  const message = JSON.parse(line);

  if (message.method === "initialize") {
    send({ jsonrpc: "2.0", id: message.id, result: { protocolVersion: "2026-03-01" } });
    return;
  }

  if (message.method === "thread/start") {
    send({
      jsonrpc: "2.0",
      id: message.id,
      result: { thread: { id: "thread-1" } },
    });
    return;
  }

  if (message.method === "turn/start") {
    const cwd = process.cwd();
    fs.writeFileSync(path.join(cwd, "tracked.txt"), "changed-during-turn\\n");
    fs.writeFileSync(path.join(cwd, "preexisting.txt"), "dirty-after\\n");
    fs.writeFileSync(path.join(cwd, "new-turn-file.txt"), "created-in-turn\\n");
    fs.rmSync(path.join(cwd, "remove-me.txt"));

    send({
      jsonrpc: "2.0",
      id: message.id,
      result: {
        turn: {
          id: "turn-1",
          status: "inProgress",
          items: [],
        },
      },
    });

    setTimeout(() => {
      send({
        jsonrpc: "2.0",
        method: "turn/completed",
        params: {
          threadId: "thread-1",
          turn: {
            id: "turn-1",
            status: "completed",
            items: [],
          },
        },
      });
    }, 20);
    return;
  }

  if (Object.prototype.hasOwnProperty.call(message, "id")) {
    send({ jsonrpc: "2.0", id: message.id, result: {} });
  }
});
`,
  );

  const { port } = await startServer(t, {
    workspaceRoot: repoDir,
    codexBin: fakeCodex,
  });

  const startResponse = await fetch(`http://127.0.0.1:${port}/api/session/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  const startBody = await startResponse.json();

  const threadResponse = await fetch(`http://127.0.0.1:${port}/api/thread/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: startBody.sessionId,
      params: {},
    }),
  });
  const threadBody = await threadResponse.json();
  assert.equal(threadBody.result.thread.id, "thread-1");

  const turnResponse = await fetch(`http://127.0.0.1:${port}/api/turn/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: startBody.sessionId,
      threadId: "thread-1",
      prompt: "Change files",
    }),
  });
  assert.equal(turnResponse.status, 200);
  const turnBody = await turnResponse.json();
  assert.equal(turnBody.ok, true);
  assert.equal(turnBody.result.turn.id, "turn-1");

  await new Promise((resolve) => setTimeout(resolve, 80));

  const changesResponse = await fetch(
    `http://127.0.0.1:${port}/api/turn/changes?sessionId=${encodeURIComponent(startBody.sessionId)}&turnId=turn-1`,
  );
  assert.equal(changesResponse.status, 200);
  const changesBody = await changesResponse.json();
  assert.equal(changesBody.ok, true);
  assert.equal(changesBody.turnChanges.turnId, "turn-1");
  assert.equal(changesBody.turnChanges.threadId, "thread-1");

  const changedPaths = changesBody.turnChanges.changedFiles.map((entry) => entry.path).sort();
  assert.deepEqual(changedPaths, [
    "new-turn-file.txt",
    "preexisting.txt",
    "remove-me.txt",
    "tracked.txt",
  ]);

  const preexisting = changesBody.turnChanges.changedFiles.find((entry) => entry.path === "preexisting.txt");
  assert.equal(preexisting.changeType, "updated");
  assert.equal(preexisting.before.gitStatus, " M");
  assert.equal(preexisting.after.gitStatus, " M");

  const created = changesBody.turnChanges.changedFiles.find((entry) => entry.path === "new-turn-file.txt");
  assert.equal(created.changeType, "created");
  assert.equal(created.before.exists, false);
  assert.equal(created.after.exists, true);

  const deleted = changesBody.turnChanges.changedFiles.find((entry) => entry.path === "remove-me.txt");
  assert.equal(deleted.changeType, "deleted");
  assert.equal(deleted.before.exists, true);
  assert.equal(deleted.after.exists, false);

  assert.equal(changedPaths.includes("existing-untracked.txt"), false);
  assert.equal(changedPaths.includes("deleted-before.txt"), false);

  const missingResponse = await fetch(
    `http://127.0.0.1:${port}/api/turn/changes?sessionId=${encodeURIComponent(startBody.sessionId)}&turnId=does-not-exist`,
  );
  assert.equal(missingResponse.status, 400);
  const missingBody = await missingResponse.json();
  assert.equal(missingBody.ok, false);
  assert.match(missingBody.error, /turn changes not found/);
});

test("POST /api/exec streams one-shot codex exec output without creating a session", async (t) => {
  const fakeCodex = await createFakeCodexBin(
    t,
    `#!/usr/bin/env node
if (process.argv[2] === "exec") {
  process.stdout.write(JSON.stringify({ type: "thread.started", thread_id: "thread-1" }) + "\\n");
  process.stdout.write(JSON.stringify({ type: "turn.started" }) + "\\n");
  process.stderr.write("exec stderr line\\n");
  process.stdout.write(JSON.stringify({
    type: "item.completed",
    item: { id: "item_0", type: "agent_message", text: "ok" },
  }) + "\\n");
  process.stdout.write(JSON.stringify({
    type: "turn.completed",
    usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1 },
  }) + "\\n");
  process.exit(0);
}

process.stderr.write("unsupported fake codex mode\\n");
process.exit(1);
`,
  );

  const { port } = await startServer(t, { codexBin: fakeCodex });

  const response = await fetch(`http://127.0.0.1:${port}/api/exec`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      prompt: "reply with ok",
    }),
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /text\/event-stream/);

  const transcript = await response.text();
  const sseEvents = parseSseTranscript(transcript).filter((entry) => entry.event);
  const eventNames = sseEvents.map((entry) => entry.event);

  assert.equal(eventNames[0], "exec/started");
  assert.equal(eventNames[eventNames.length - 1], "exec/completed");
  assert.equal(eventNames.filter((name) => name === "exec/event").length, 4);
  assert.ok(eventNames.includes("exec/stderr"));

  const jobId = sseEvents[0].data.jobId;
  assert.ok(jobId);
  const execEvents = sseEvents.filter((entry) => entry.event === "exec/event");
  const stderrEvent = sseEvents.find((entry) => entry.event === "exec/stderr");
  const completedEvent = sseEvents.find((entry) => entry.event === "exec/completed");

  assert.ok(execEvents.every((entry) => entry.data.jobId === jobId));
  assert.equal(execEvents[0].data.event.type, "thread.started");
  assert.equal(execEvents[3].data.event.type, "turn.completed");
  assert.match(stderrEvent.data.chunk, /exec stderr line/);
  assert.equal(completedEvent.data.exitCode, 0);
  assert.equal(completedEvent.data.signal, null);

  const healthzResponse = await fetch(`http://127.0.0.1:${port}/api/healthz`);
  const healthzBody = await healthzResponse.json();
  assert.equal(healthzBody.sessions, 0);

  const missingPromptResponse = await fetch(`http://127.0.0.1:${port}/api/exec`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(missingPromptResponse.status, 400);
  const missingPromptBody = await missingPromptResponse.json();
  assert.equal(missingPromptBody.ok, false);
  assert.match(missingPromptBody.error, /prompt is required/);
});
