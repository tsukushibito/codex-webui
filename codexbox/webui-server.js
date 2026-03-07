const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const { openSseStream, writeSse } = require("./server/sse");
const {
  approvalDefaultResult,
  createSessionStore,
  listPendingApprovals,
  listPendingUserInputs,
  normalizeUserInputResult,
  serializeSessionSnapshot,
} = require("./server/session-store");
const { createSessionRuntime } = require("./server/session-runtime");
const { createTurnChangeService } = require("./server/turn-changes");
const { createWorkspaceService } = require("./server/workspace-service");

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";
const CODEX_BIN = process.env.CODEX_BIN || "codex";
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || process.cwd();
const SESSION_IDLE_TIMEOUT_MS = Number(process.env.SESSION_IDLE_TIMEOUT_MS || 15 * 60 * 1000);
const SESSION_SWEEP_INTERVAL_MS = Number(process.env.SESSION_SWEEP_INTERVAL_MS || 30 * 1000);
const APPROVAL_TIMEOUT_MS = Number(process.env.APPROVAL_TIMEOUT_MS || 2 * 60 * 1000);
const USER_INPUT_TIMEOUT_MS = Number(process.env.USER_INPUT_TIMEOUT_MS || 2 * 60 * 1000);
const RPC_TIMEOUT_MS = Number(process.env.RPC_TIMEOUT_MS || 60 * 1000);
const CODEX_DEFAULT_APPROVAL_POLICY = process.env.CODEX_DEFAULT_APPROVAL_POLICY || "untrusted";
const CODEX_DEFAULT_SANDBOX = process.env.CODEX_DEFAULT_SANDBOX || "read-only";
const STATIC_DIR = path.join(__dirname, "public");
const PREACT_STATIC_DIR = process.env.PREACT_STATIC_DIR || path.join(STATIC_DIR, "preact");
const PREACT_INDEX_PATH = path.join(PREACT_STATIC_DIR, "index.html");
const MAX_FILE_BYTES = Number(process.env.MAX_FILE_BYTES || 256 * 1024);

const VALID_APPROVAL_POLICIES = new Set(["untrusted", "on-failure", "on-request", "never"]);
const VALID_SANDBOX_MODES = new Set(["read-only", "workspace-write", "danger-full-access"]);
const WORKSPACE_ROOT_REALPATH = fs.realpathSync.native(WORKSPACE_ROOT);

function nowMs() {
  return Date.now();
}

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    "content-type": "text/plain; charset=utf-8",
    "content-length": Buffer.byteLength(text),
  });
  res.end(text);
}

function normalizeError(err) {
  if (!err) {
    return "unknown error";
  }
  if (typeof err === "string") {
    return err;
  }
  if (err && typeof err.message === "string") {
    return err.message;
  }
  return JSON.stringify(err);
}

function assertValidServerSafetyDefaults() {
  if (!VALID_APPROVAL_POLICIES.has(CODEX_DEFAULT_APPROVAL_POLICY)) {
    throw new Error(
      `Invalid CODEX_DEFAULT_APPROVAL_POLICY: ${CODEX_DEFAULT_APPROVAL_POLICY}`,
    );
  }
  if (!VALID_SANDBOX_MODES.has(CODEX_DEFAULT_SANDBOX)) {
    throw new Error(`Invalid CODEX_DEFAULT_SANDBOX: ${CODEX_DEFAULT_SANDBOX}`);
  }
}

function assertNoUnsafeOverrides(source, blockedKeys, endpointPath) {
  if (!source || typeof source !== "object") {
    return;
  }

  for (const key of blockedKeys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      throw new Error(
        `${endpointPath} does not allow overriding '${key}'; server-side safety policy is enforced`,
      );
    }
  }
}

const workspaceService = createWorkspaceService({
  maxFileBytes: MAX_FILE_BYTES,
  workspaceRootRealPath: WORKSPACE_ROOT_REALPATH,
});

const {
  captureWorkspaceSnapshot,
  listWorkspaceCatalog,
  readGitDiff,
  readGitFile,
  readWorkspaceFile,
} = workspaceService;

const sessionStore = createSessionStore({
  randomUUID,
  nowMs,
});

const {
  sessions,
  createSession: makeSession,
  emitSessionEvent,
  ensureSession,
  shutdownSession,
  touchSession,
} = sessionStore;

const turnChangeService = createTurnChangeService({
  captureWorkspaceSnapshot,
  emitSessionEvent,
  normalizeError,
  nowMs,
});

const {
  finalizeTurnChanges,
  getCompletedTurnChanges,
  rememberActiveTurnSnapshot,
} = turnChangeService;

const {
  resolveApproval,
  resolveUserInputRequest,
  rpcRequest,
  startSessionRuntime,
} = createSessionRuntime({
  codexBin: CODEX_BIN,
  workspaceRoot: WORKSPACE_ROOT,
  approvalTimeoutMs: APPROVAL_TIMEOUT_MS,
  userInputTimeoutMs: USER_INPUT_TIMEOUT_MS,
  rpcTimeoutMs: RPC_TIMEOUT_MS,
  emitSessionEvent,
  normalizeError,
  nowMs,
  onTurnCompleted: finalizeTurnChanges,
  shutdownSession,
  touchSession,
});

function readExecPrompt(body) {
  if (typeof body?.prompt === "string" && body.prompt.trim()) {
    return body.prompt;
  }
  if (typeof body?.text === "string" && body.text.trim()) {
    return body.text;
  }
  throw new Error("prompt is required");
}

async function readRequestBody(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) {
      throw new Error("request body too large");
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) {
    return {};
  }

  return JSON.parse(text);
}

function serveStaticFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      sendText(res, 404, "Not found");
      return;
    }

    res.writeHead(200, {
      "content-type": contentType,
      "content-length": buf.length,
      "cache-control": "no-store",
    });
    res.end(buf);
  });
}

function serveBuiltFrontend(res) {
  fs.readFile(PREACT_INDEX_PATH, (err, buf) => {
    if (err) {
      sendText(res, 503, "Frontend build not found");
      return;
    }

    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "content-length": buf.length,
      "cache-control": "no-store",
    });
    res.end(buf);
  });
}

function staticContentTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".html") {
    return "text/html; charset=utf-8";
  }
  if (extension === ".js") {
    return "text/javascript; charset=utf-8";
  }
  if (extension === ".css") {
    return "text/css; charset=utf-8";
  }
  return null;
}

function servePublicAsset(res, requestPath) {
  const relativePath = String(requestPath || "").replace(/^\/static\//, "");
  if (!relativePath) {
    sendText(res, 404, "Not found");
    return;
  }

  const assetPath = path.resolve(STATIC_DIR, relativePath);
  const relativeAssetPath = path.relative(STATIC_DIR, assetPath);
  if (
    relativeAssetPath.startsWith("..") ||
    path.isAbsolute(relativeAssetPath)
  ) {
    sendText(res, 404, "Not found");
    return;
  }

  const contentType = staticContentTypeFor(assetPath);
  if (!contentType) {
    sendText(res, 404, "Not found");
    return;
  }

  serveStaticFile(res, assetPath, contentType);
}

async function handleSessionStartRoute(req, res) {
  const session = makeSession();
  try {
    const initResult = await startSessionRuntime(session);
    sendJson(res, 200, {
      ok: true,
      sessionId: session.id,
      initResult,
      idleTimeoutMs: SESSION_IDLE_TIMEOUT_MS,
      approvalTimeoutMs: APPROVAL_TIMEOUT_MS,
      userInputTimeoutMs: USER_INPUT_TIMEOUT_MS,
    });
  } catch (err) {
    shutdownSession(session, `startup_failed: ${normalizeError(err)}`);
    sendJson(res, 500, {
      ok: false,
      error: `failed to start session: ${normalizeError(err)}`,
    });
  }
}

async function handleSessionEndRoute(req, res, body) {
  const session = ensureSession(body.sessionId);
  shutdownSession(session, "session ended by client");
  sendJson(res, 200, { ok: true });
}

async function handleSessionReconnectRoute(req, res, body) {
  const session = ensureSession(body.sessionId);
  touchSession(session);
  sendJson(res, 200, {
    ok: true,
    ...serializeSessionSnapshot(session),
    idleTimeoutMs: SESSION_IDLE_TIMEOUT_MS,
    approvalTimeoutMs: APPROVAL_TIMEOUT_MS,
    userInputTimeoutMs: USER_INPUT_TIMEOUT_MS,
  });
}

async function handleThreadStartRoute(req, res, body, pathname) {
  const session = ensureSession(body.sessionId);
  const rawParams = body.params && typeof body.params === "object" ? body.params : {};
  assertNoUnsafeOverrides(rawParams, ["approvalPolicy", "sandbox", "cwd"], pathname);

  const params = {
    ...rawParams,
    approvalPolicy: CODEX_DEFAULT_APPROVAL_POLICY,
    sandbox: CODEX_DEFAULT_SANDBOX,
  };

  const result = await rpcRequest(session, "thread/start", params);
  if (typeof result?.thread?.id === "string") {
    session.threadId = result.thread.id;
  }
  touchSession(session);
  sendJson(res, 200, { ok: true, result });
}

async function handleTurnStartRoute(req, res, body, pathname) {
  const session = ensureSession(body.sessionId);
  const params = body.params && typeof body.params === "object" ? { ...body.params } : {};
  assertNoUnsafeOverrides(params, ["approvalPolicy", "sandboxPolicy", "cwd"], pathname);

  if (!params.threadId) {
    params.threadId = body.threadId || session.threadId;
  }
  if (!params.threadId) {
    throw new Error("threadId is required (call /api/thread/start first)");
  }

  if (!Array.isArray(params.input)) {
    if (Array.isArray(body.input)) {
      params.input = body.input;
    } else if (typeof body.prompt === "string") {
      params.input = [{ type: "text", text: body.prompt }];
    } else if (typeof body.text === "string") {
      params.input = [{ type: "text", text: body.text }];
    } else {
      throw new Error("input is required (set params.input array or prompt/text string)");
    }
  }

  const turnStartedAt = nowMs();
  const turnSnapshot = await captureWorkspaceSnapshot();
  const result = await rpcRequest(session, "turn/start", params);
  const turnId = String(result?.turn?.id || "").trim();
  if (turnId) {
    rememberActiveTurnSnapshot(session, {
      turnId,
      threadId: String(params.threadId || session.threadId || "").trim() || null,
      startedAt: turnStartedAt,
      snapshot: turnSnapshot,
    });
  }
  touchSession(session);
  sendJson(res, 200, { ok: true, result });
}

async function handleThreadReadRoute(req, res, body) {
  const session = ensureSession(body.sessionId);
  const threadId = String(body.threadId || session.threadId || "").trim();
  if (!threadId) {
    throw new Error("threadId is required");
  }

  const includeTurns = body.includeTurns !== false;
  const result = await rpcRequest(session, "thread/read", {
    threadId,
    includeTurns,
  });
  if (typeof result?.thread?.id === "string") {
    session.threadId = result.thread.id;
  }
  touchSession(session);
  sendJson(res, 200, { ok: true, result });
}

async function handleApprovalRespondRoute(req, res, body) {
  const session = ensureSession(body.sessionId);
  const requestId = body.requestId;
  if (requestId === undefined || requestId === null) {
    throw new Error("requestId is required");
  }

  const approval = session.pendingApprovals.get(String(requestId));
  if (!approval) {
    throw new Error(`pending approval not found: ${requestId}`);
  }

  const result = body.result && typeof body.result === "object"
    ? body.result
    : approvalDefaultResult(approval.method, body.decision || "deny");

  if (!result) {
    throw new Error(`unsupported approval method: ${approval.method}`);
  }

  const resolved = resolveApproval(session, requestId, result, "manual");
  sendJson(res, 200, {
    ok: true,
    resolved,
  });
}

async function handleUserInputRespondRoute(req, res, body) {
  const session = ensureSession(body.sessionId);
  const requestId = body.requestId;
  if (requestId === undefined || requestId === null) {
    throw new Error("requestId is required");
  }

  const request = session.pendingUserInputs.get(String(requestId));
  if (!request) {
    throw new Error(`pending user input request not found: ${requestId}`);
  }

  const result = normalizeUserInputResult(request, body);
  const resolved = resolveUserInputRequest(session, requestId, result, "manual");
  sendJson(res, 200, {
    ok: true,
    resolved,
  });
}

async function handleExecRoute(req, res, body) {
  const prompt = readExecPrompt(body);
  const jobId = randomUUID();
  let nextEventId = 1;
  let stdoutBuffer = "";
  let finished = false;

  const writeExecEvent = (eventName, payload) => {
    if (res.writableEnded) {
      return;
    }
    writeSse(res, eventName, { jobId, ...payload }, nextEventId++);
  };

  const flushStdoutLine = (line) => {
    const text = String(line || "").trim();
    if (!text) {
      return;
    }

    try {
      writeExecEvent("exec/event", {
        event: JSON.parse(text),
      });
    } catch (err) {
      writeExecEvent("exec/error", {
        error: `failed to parse exec json: ${normalizeError(err)}`,
        line: text,
      });
    }
  };

  const child = spawn(
    CODEX_BIN,
    [
      "exec",
      "--json",
      "--skip-git-repo-check",
      "--sandbox",
      CODEX_DEFAULT_SANDBOX,
      "-C",
      WORKSPACE_ROOT,
      prompt,
    ],
    {
      cwd: WORKSPACE_ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  openSseStream(res);
  writeExecEvent("exec/started", {
    command: "codex exec --json",
    sandbox: CODEX_DEFAULT_SANDBOX,
  });

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdoutBuffer += chunk;
    const parts = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = parts.pop() || "";
    for (const part of parts) {
      flushStdoutLine(part);
    }
  });

  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    writeExecEvent("exec/stderr", {
      chunk: String(chunk),
    });
  });

  child.on("error", (err) => {
    if (finished) {
      return;
    }
    finished = true;
    writeExecEvent("exec/error", {
      error: `failed to start exec: ${normalizeError(err)}`,
    });
    writeExecEvent("exec/completed", {
      exitCode: null,
      signal: null,
    });
    res.end();
  });

  child.on("exit", (code, signal) => {
    if (finished) {
      return;
    }
    finished = true;
    flushStdoutLine(stdoutBuffer);
    writeExecEvent("exec/completed", {
      exitCode: code === null ? null : code,
      signal: signal || null,
    });
    res.end();
  });

  res.on("close", () => {
    if (!finished && child && !child.killed) {
      child.kill("SIGTERM");
    }
  });
}

async function handleHealthzRoute(req, res) {
  sendJson(res, 200, {
    ok: true,
    service: "codexbox",
    sessions: sessions.size,
    now: nowMs(),
  });
}

async function handleSessionEventsRoute(req, res, searchParams) {
  const session = ensureSession(searchParams.get("sessionId"));

  openSseStream(res);
  session.sseClients.add(res);
  touchSession(session);

  writeSse(
    res,
    "session/snapshot",
    serializeSessionSnapshot(session),
    session.nextSseId++,
  );

  const heartbeat = setInterval(() => {
    if (!res.writableEnded) {
      res.write(`: heartbeat ${Date.now()}\n\n`);
    }
  }, 15000);

  req.on("close", () => {
    clearInterval(heartbeat);
    session.sseClients.delete(res);
  });
}

async function handleApprovalsRoute(req, res, searchParams) {
  const session = ensureSession(searchParams.get("sessionId"));
  sendJson(res, 200, {
    ok: true,
    pendingApprovals: listPendingApprovals(session),
  });
}

async function handleUserInputRoute(req, res, searchParams) {
  const session = ensureSession(searchParams.get("sessionId"));
  sendJson(res, 200, {
    ok: true,
    pendingUserInputs: listPendingUserInputs(session),
  });
}

async function handleTurnChangesRoute(req, res, searchParams) {
  const session = ensureSession(searchParams.get("sessionId"));
  const turnId = String(searchParams.get("turnId") || "").trim();
  if (!turnId) {
    throw new Error("turnId is required");
  }

  const turnChanges = getCompletedTurnChanges(session, turnId);
  if (!turnChanges) {
    throw new Error(`turn changes not found: ${turnId}`);
  }

  sendJson(res, 200, {
    ok: true,
    turnChanges,
  });
}

async function handleFsTreeRoute(req, res) {
  const { entries, tree } = await listWorkspaceCatalog();
  sendJson(res, 200, {
    ok: true,
    rootPath: ".",
    entries,
    tree,
  });
}

async function handleFsFileRoute(req, res, searchParams) {
  const file = await readWorkspaceFile(searchParams.get("path"));
  sendJson(res, 200, {
    ok: true,
    file,
  });
}

async function handleGitShowRoute(req, res, searchParams) {
  const ref = String(searchParams.get("ref") || "HEAD").trim() || "HEAD";
  const file = await readGitFile(searchParams.get("path"), ref);
  sendJson(res, 200, {
    ok: true,
    file,
  });
}

async function handleGitDiffRoute(req, res, searchParams) {
  const diff = await readGitDiff(searchParams.get("path"));
  sendJson(res, 200, {
    ok: true,
    diff,
  });
}

const postApiRoutes = {
  "/api/session/start": handleSessionStartRoute,
  "/api/session/end": handleSessionEndRoute,
  "/api/session/reconnect": handleSessionReconnectRoute,
  "/api/thread/start": handleThreadStartRoute,
  "/api/turn/start": handleTurnStartRoute,
  "/api/thread/read": handleThreadReadRoute,
  "/api/approvals/respond": handleApprovalRespondRoute,
  "/api/user-input/respond": handleUserInputRespondRoute,
  "/api/exec": handleExecRoute,
};

const getApiRoutes = {
  "/api/healthz": handleHealthzRoute,
  "/api/session/events": handleSessionEventsRoute,
  "/api/approvals": handleApprovalsRoute,
  "/api/user-input": handleUserInputRoute,
  "/api/turn/changes": handleTurnChangesRoute,
  "/api/fs/tree": handleFsTreeRoute,
  "/api/fs/file": handleFsFileRoute,
  "/api/git/show": handleGitShowRoute,
  "/api/git/diff": handleGitDiffRoute,
};

async function handlePostApi(req, res, pathname) {
  const routeHandler = postApiRoutes[pathname];
  if (!routeHandler) {
    sendJson(res, 404, { ok: false, error: "not found" });
    return;
  }

  const body = await readRequestBody(req);
  await routeHandler(req, res, body, pathname);
}

async function handleGetApi(req, res, pathname, searchParams) {
  const routeHandler = getApiRoutes[pathname];
  if (!routeHandler) {
    sendJson(res, 404, { ok: false, error: "not found" });
    return;
  }

  await routeHandler(req, res, searchParams, pathname);
}

assertValidServerSafetyDefaults();

const server = http.createServer(async (req, res) => {
  const method = req.method || "GET";
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = requestUrl.pathname;

  try {
    if (method === "GET" && pathname === "/") {
      servePublicAsset(res, "/static/index.html");
      return;
    }

    if (method === "GET" && (pathname === "/app" || pathname === "/app/")) {
      serveBuiltFrontend(res);
      return;
    }

    if (method === "GET" && pathname.startsWith("/static/")) {
      servePublicAsset(res, pathname);
      return;
    }

    if (pathname.startsWith("/api/")) {
      if (method === "GET") {
        await handleGetApi(req, res, pathname, requestUrl.searchParams);
        return;
      }
      if (method === "POST") {
        await handlePostApi(req, res, pathname);
        return;
      }
      sendJson(res, 405, { ok: false, error: "method not allowed" });
      return;
    }

    sendText(res, 404, "Not found");
  } catch (err) {
    sendJson(res, 400, {
      ok: false,
      error: normalizeError(err),
    });
  }
});

const sessionSweep = setInterval(() => {
  const threshold = nowMs() - SESSION_IDLE_TIMEOUT_MS;
  for (const session of sessions.values()) {
    if (session.lastActivityAt < threshold) {
      shutdownSession(session, "idle timeout");
    }
  }
}, SESSION_SWEEP_INTERVAL_MS);
sessionSweep.unref();

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    for (const session of Array.from(sessions.values())) {
      shutdownSession(session, `process signal ${signal}`);
    }
    server.close(() => {
      process.exit(0);
    });
  });
}

server.listen(PORT, HOST, () => {
  console.log(`codexbox webui server listening on ${HOST}:${PORT}`);
});
