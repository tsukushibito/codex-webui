"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn, execFile } = require("node:child_process");
const { promisify } = require("node:util");

const REPO_ROOT = path.resolve(__dirname, "..");
const SERVER_PATH = path.join(__dirname, "webui-server.js");
const execFileAsync = promisify(execFile);

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(address.port);
      });
    });
    server.on("error", reject);
  });
}

async function waitForServer(port) {
  const deadline = Date.now() + 5000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/healthz`);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the process is ready.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error("server did not become ready in time");
}

async function git(repoDir, args) {
  const result = await execFileAsync("git", ["-C", repoDir, ...args], {
    encoding: "utf8",
  });
  return result.stdout;
}

async function createTempGitRepo(t) {
  const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-webui-git-"));
  t.after(async () => {
    await fs.rm(repoDir, { recursive: true, force: true });
  });

  await git(repoDir, ["init", "-q"]);
  await git(repoDir, ["config", "user.email", "test@example.com"]);
  await git(repoDir, ["config", "user.name", "Test User"]);

  await fs.writeFile(path.join(repoDir, "tracked.txt"), "tracked-v1\n");
  await fs.mkdir(path.join(repoDir, "nested"), { recursive: true });
  await fs.writeFile(path.join(repoDir, "nested", "keep.txt"), "nested-v1\n");
  await git(repoDir, ["add", "."]);
  await git(repoDir, ["commit", "-qm", "init"]);

  return repoDir;
}

async function startServer(t, options = {}) {
  const port = await findFreePort();
  const child = spawn(process.execPath, [SERVER_PATH], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      CODEX_BIN: options.codexBin || process.env.CODEX_BIN || "codex",
      MAX_FILE_BYTES: options.maxFileBytes || "128",
      WORKSPACE_ROOT: options.workspaceRoot || REPO_ROOT,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  t.after(() => {
    child.kill("SIGTERM");
  });

  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      process.stderr.write(stderr);
    }
  });

  await waitForServer(port);
  return { port };
}

async function createFakeCodexBin(t, scriptSource) {
  const binDir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-webui-fake-codex-"));
  const binPath = path.join(binDir, "codex");
  await fs.writeFile(binPath, scriptSource, { mode: 0o755 });
  t.after(async () => {
    await fs.rm(binDir, { recursive: true, force: true });
  });
  return binPath;
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
