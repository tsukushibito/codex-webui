"use strict";

const fs = require("node:fs/promises");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn, execFile } = require("node:child_process");
const { promisify } = require("node:util");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SERVER_PATH = path.join(REPO_ROOT, "codexbox", "webui-server.js");
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

function parseSseTranscript(text) {
  return String(text || "")
    .split("\n\n")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const eventMatch = chunk.match(/^event: (.+)$/m);
      const dataMatch = chunk.match(/^data: (.+)$/m);
      return {
        event: eventMatch ? eventMatch[1] : null,
        data: dataMatch ? JSON.parse(dataMatch[1]) : null,
      };
    });
}

module.exports = {
  createFakeCodexBin,
  createTempGitRepo,
  git,
  parseSseTranscript,
  REPO_ROOT,
  startServer,
};
