"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
const SERVER_PATH = path.join(__dirname, "webui-server.js");

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

async function startServer(t) {
  const port = await findFreePort();
  const child = spawn(process.execPath, [SERVER_PATH], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      MAX_FILE_BYTES: "128",
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
