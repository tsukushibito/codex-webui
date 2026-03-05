const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const { randomUUID } = require("node:crypto");

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";
const CODEX_BIN = process.env.CODEX_BIN || "codex";
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || process.cwd();
const SESSION_IDLE_TIMEOUT_MS = Number(process.env.SESSION_IDLE_TIMEOUT_MS || 15 * 60 * 1000);
const SESSION_SWEEP_INTERVAL_MS = Number(process.env.SESSION_SWEEP_INTERVAL_MS || 30 * 1000);
const APPROVAL_TIMEOUT_MS = Number(process.env.APPROVAL_TIMEOUT_MS || 2 * 60 * 1000);
const RPC_TIMEOUT_MS = Number(process.env.RPC_TIMEOUT_MS || 60 * 1000);
const CODEX_DEFAULT_APPROVAL_POLICY = process.env.CODEX_DEFAULT_APPROVAL_POLICY || "untrusted";
const CODEX_DEFAULT_SANDBOX = process.env.CODEX_DEFAULT_SANDBOX || "read-only";
const STATIC_DIR = path.join(__dirname, "public");

const sessions = new Map();
const VALID_APPROVAL_POLICIES = new Set(["untrusted", "on-failure", "on-request", "never"]);
const VALID_SANDBOX_MODES = new Set(["read-only", "workspace-write", "danger-full-access"]);

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

function makeSession() {
  const sessionId = randomUUID();
  const session = {
    id: sessionId,
    createdAt: nowMs(),
    lastActivityAt: nowMs(),
    nextRpcId: 1,
    nextSseId: 1,
    stdoutBuffer: "",
    child: null,
    closed: false,
    pendingRequests: new Map(),
    pendingApprovals: new Map(),
    sseClients: new Set(),
    threadId: null,
  };
  sessions.set(sessionId, session);
  return session;
}

function touchSession(session) {
  session.lastActivityAt = nowMs();
}

function writeSse(res, eventName, data, eventId) {
  res.write(`id: ${eventId}\n`);
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function emitSessionEvent(session, eventName, payload) {
  const eventId = session.nextSseId++;
  const data = {
    sessionId: session.id,
    emittedAt: nowMs(),
    ...payload,
  };

  for (const client of session.sseClients) {
    if (client.writableEnded || client.destroyed) {
      session.sseClients.delete(client);
      continue;
    }
    try {
      writeSse(client, eventName, data, eventId);
    } catch {
      session.sseClients.delete(client);
    }
  }
}

function rpcWrite(session, message) {
  if (!session.child || session.closed) {
    throw new Error("session is not running");
  }
  const line = JSON.stringify(message);
  session.child.stdin.write(`${line}\n`);
  touchSession(session);
}

function rpcNotify(session, method, params) {
  const message = {
    jsonrpc: "2.0",
    method,
  };
  if (params !== undefined) {
    message.params = params;
  }
  rpcWrite(session, message);
}

function rpcRespond(session, requestId, result) {
  rpcWrite(session, {
    jsonrpc: "2.0",
    id: requestId,
    result,
  });
}

function rpcError(session, requestId, message, code = -32601, data = null) {
  rpcWrite(session, {
    jsonrpc: "2.0",
    id: requestId,
    error: {
      code,
      message,
      data,
    },
  });
}

function rpcRequest(session, method, params) {
  const requestId = session.nextRpcId++;
  const key = String(requestId);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      session.pendingRequests.delete(key);
      reject(new Error(`RPC timeout for method ${method}`));
    }, RPC_TIMEOUT_MS);

    session.pendingRequests.set(key, {
      method,
      resolve,
      reject,
      timeout,
    });

    try {
      rpcWrite(session, {
        jsonrpc: "2.0",
        id: requestId,
        method,
        params,
      });
    } catch (err) {
      clearTimeout(timeout);
      session.pendingRequests.delete(key);
      reject(err);
    }
  });
}

function handleRpcResponse(session, message) {
  const key = String(message.id);
  const pending = session.pendingRequests.get(key);
  if (!pending) {
    return;
  }

  clearTimeout(pending.timeout);
  session.pendingRequests.delete(key);

  if (message.error) {
    pending.reject(new Error(normalizeError(message.error)));
    return;
  }

  pending.resolve(message.result);
}

function approvalDefaultResult(method, decision) {
  const normalized = String(decision || "deny").toLowerCase();

  if (method === "item/commandExecution/requestApproval") {
    if (normalized === "allow") return { decision: "accept" };
    if (normalized === "cancel") return { decision: "cancel" };
    return { decision: "decline" };
  }

  if (method === "item/fileChange/requestApproval") {
    if (normalized === "allow") return { decision: "accept" };
    if (normalized === "cancel") return { decision: "cancel" };
    return { decision: "decline" };
  }

  if (method === "execCommandApproval" || method === "applyPatchApproval") {
    if (normalized === "allow") return { decision: "approved" };
    if (normalized === "cancel") return { decision: "abort" };
    return { decision: "denied" };
  }

  return null;
}

function serializeApproval(approval) {
  return {
    requestId: approval.requestId,
    method: approval.method,
    params: approval.params,
    createdAt: approval.createdAt,
    expiresAt: approval.expiresAt,
  };
}

function listPendingApprovals(session) {
  return Array.from(session.pendingApprovals.values())
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(serializeApproval);
}

function resolveApproval(session, requestId, result, resolutionType) {
  const key = String(requestId);
  const approval = session.pendingApprovals.get(key);
  if (!approval) {
    throw new Error(`approval ${requestId} not found`);
  }

  clearTimeout(approval.timeoutHandle);
  session.pendingApprovals.delete(key);

  rpcRespond(session, approval.requestId, result);
  emitSessionEvent(session, "approval/resolved", {
    resolutionType,
    approval: serializeApproval(approval),
    result,
  });
  touchSession(session);

  return {
    requestId: approval.requestId,
    resolutionType,
    result,
  };
}

function handleApprovalTimeout(session, requestId) {
  const key = String(requestId);
  const approval = session.pendingApprovals.get(key);
  if (!approval) {
    return;
  }

  const timeoutResult = approvalDefaultResult(approval.method, "cancel");
  if (!timeoutResult) {
    session.pendingApprovals.delete(key);
    emitSessionEvent(session, "approval/timed_out", {
      approval: serializeApproval(approval),
      reason: "unsupported-approval-type",
    });
    return;
  }

  try {
    resolveApproval(session, requestId, timeoutResult, "timeout");
  } catch (err) {
    emitSessionEvent(session, "approval/timed_out", {
      approval: serializeApproval(approval),
      reason: normalizeError(err),
    });
  }
}

function isApprovalRequestMethod(method) {
  return (
    method === "item/commandExecution/requestApproval" ||
    method === "item/fileChange/requestApproval" ||
    method === "execCommandApproval" ||
    method === "applyPatchApproval"
  );
}

function handleRpcRequestFromServer(session, message) {
  const method = message.method;

  if (isApprovalRequestMethod(method)) {
    const requestId = String(message.id);
    const createdAt = nowMs();
    const approval = {
      requestId,
      method,
      params: message.params || {},
      createdAt,
      expiresAt: createdAt + APPROVAL_TIMEOUT_MS,
      timeoutHandle: null,
    };

    approval.timeoutHandle = setTimeout(() => {
      handleApprovalTimeout(session, requestId);
    }, APPROVAL_TIMEOUT_MS);

    session.pendingApprovals.set(requestId, approval);
    emitSessionEvent(session, "approval/pending", {
      approval: serializeApproval(approval),
    });
    touchSession(session);
    return;
  }

  rpcError(session, message.id, `Unsupported server request method: ${method}`);
  emitSessionEvent(session, "rpc/server_request_unsupported", {
    message,
  });
}

function handleRpcNotification(session, message) {
  emitSessionEvent(session, "rpc/notification", { message });

  if (message.method === "thread/started") {
    const threadId = message.params?.thread?.id;
    if (typeof threadId === "string") {
      session.threadId = threadId;
    }
  }

  if (message.method === "item/agentMessage/delta") {
    emitSessionEvent(session, "chat/delta", {
      params: message.params || {},
    });
  }

  touchSession(session);
}

function handleRpcMessage(session, message) {
  if (!message || typeof message !== "object") {
    return;
  }

  if (Object.prototype.hasOwnProperty.call(message, "id") && Object.prototype.hasOwnProperty.call(message, "method")) {
    handleRpcRequestFromServer(session, message);
    return;
  }

  if (Object.prototype.hasOwnProperty.call(message, "id")) {
    handleRpcResponse(session, message);
    return;
  }

  if (Object.prototype.hasOwnProperty.call(message, "method")) {
    handleRpcNotification(session, message);
  }
}

function handleChildStdout(session, chunk) {
  session.stdoutBuffer += chunk;
  const parts = session.stdoutBuffer.split(/\r?\n/);
  session.stdoutBuffer = parts.pop() || "";

  for (const part of parts) {
    const line = part.trim();
    if (!line) {
      continue;
    }

    try {
      const parsed = JSON.parse(line);
      handleRpcMessage(session, parsed);
    } catch (err) {
      emitSessionEvent(session, "rpc/parse_error", {
        line,
        error: normalizeError(err),
      });
    }
  }
}

function shutdownSession(session, reason) {
  if (!session || session.closed) {
    return;
  }

  session.closed = true;

  for (const pending of session.pendingRequests.values()) {
    clearTimeout(pending.timeout);
    pending.reject(new Error(`session closed: ${reason}`));
  }
  session.pendingRequests.clear();

  for (const approval of session.pendingApprovals.values()) {
    clearTimeout(approval.timeoutHandle);
  }
  session.pendingApprovals.clear();

  if (session.child && !session.child.killed) {
    session.child.kill("SIGTERM");
    setTimeout(() => {
      if (session.child && !session.child.killed) {
        session.child.kill("SIGKILL");
      }
    }, 1000).unref();
  }

  emitSessionEvent(session, "session/closed", { reason });

  for (const client of session.sseClients) {
    try {
      client.end();
    } catch {
      // no-op
    }
  }
  session.sseClients.clear();

  sessions.delete(session.id);
}

async function startSessionRuntime(session) {
  const child = spawn(CODEX_BIN, ["app-server", "--listen", "stdio://"], {
    cwd: WORKSPACE_ROOT,
    env: process.env,
    stdio: ["pipe", "pipe", "pipe"],
  });

  session.child = child;

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    handleChildStdout(session, chunk);
  });

  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    emitSessionEvent(session, "rpc/stderr", { chunk: String(chunk) });
  });

  child.on("error", (err) => {
    if (session.closed) {
      return;
    }
    emitSessionEvent(session, "session/error", {
      error: `app-server process error: ${normalizeError(err)}`,
    });
    shutdownSession(session, `app-server process error: ${normalizeError(err)}`);
  });

  child.on("exit", (code, signal) => {
    if (session.closed) {
      return;
    }
    shutdownSession(session, `app-server exited (code=${code}, signal=${signal})`);
  });

  const initResult = await rpcRequest(session, "initialize", {
    clientInfo: {
      name: "codex-webui",
      version: "0.1.0",
    },
    capabilities: {
      experimentalApi: true,
    },
  });

  rpcNotify(session, "initialized");
  emitSessionEvent(session, "session/started", { initResult });
  touchSession(session);

  return initResult;
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

function ensureSession(sessionId) {
  const id = String(sessionId || "").trim();
  if (!id) {
    throw new Error("sessionId is required");
  }

  const session = sessions.get(id);
  if (!session) {
    throw new Error(`session not found: ${id}`);
  }

  if (session.closed) {
    throw new Error(`session is closed: ${id}`);
  }

  return session;
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

async function handlePostApi(req, res, pathname) {
  const body = await readRequestBody(req);

  if (pathname === "/api/session/start") {
    const session = makeSession();
    try {
      const initResult = await startSessionRuntime(session);
      sendJson(res, 200, {
        ok: true,
        sessionId: session.id,
        initResult,
        idleTimeoutMs: SESSION_IDLE_TIMEOUT_MS,
        approvalTimeoutMs: APPROVAL_TIMEOUT_MS,
      });
      return;
    } catch (err) {
      shutdownSession(session, `startup_failed: ${normalizeError(err)}`);
      sendJson(res, 500, {
        ok: false,
        error: `failed to start session: ${normalizeError(err)}`,
      });
      return;
    }
  }

  if (pathname === "/api/session/end") {
    const session = ensureSession(body.sessionId);
    shutdownSession(session, "session ended by client");
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === "/api/thread/start") {
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
    return;
  }

  if (pathname === "/api/turn/start") {
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

    const result = await rpcRequest(session, "turn/start", params);
    touchSession(session);
    sendJson(res, 200, { ok: true, result });
    return;
  }

  if (pathname === "/api/approvals/respond") {
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
    return;
  }

  sendJson(res, 404, { ok: false, error: "not found" });
}

function handleGetApi(req, res, pathname, searchParams) {
  if (pathname === "/api/healthz") {
    sendJson(res, 200, {
      ok: true,
      service: "codexbox",
      sessions: sessions.size,
      now: nowMs(),
    });
    return;
  }

  if (pathname === "/api/session/events") {
    const session = ensureSession(searchParams.get("sessionId"));

    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    });
    res.write("retry: 1500\n\n");

    session.sseClients.add(res);
    touchSession(session);

    writeSse(
      res,
      "session/snapshot",
      {
        sessionId: session.id,
        threadId: session.threadId,
        pendingApprovals: listPendingApprovals(session),
      },
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

    return;
  }

  if (pathname === "/api/approvals") {
    const session = ensureSession(searchParams.get("sessionId"));
    sendJson(res, 200, {
      ok: true,
      pendingApprovals: listPendingApprovals(session),
    });
    return;
  }

  sendJson(res, 404, { ok: false, error: "not found" });
}

assertValidServerSafetyDefaults();

const server = http.createServer(async (req, res) => {
  const method = req.method || "GET";
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = requestUrl.pathname;

  try {
    if (method === "GET" && pathname === "/") {
      serveStaticFile(res, path.join(STATIC_DIR, "index.html"), "text/html; charset=utf-8");
      return;
    }

    if (method === "GET" && pathname === "/static/app.js") {
      serveStaticFile(res, path.join(STATIC_DIR, "app.js"), "text/javascript; charset=utf-8");
      return;
    }

    if (method === "GET" && pathname === "/static/styles.css") {
      serveStaticFile(res, path.join(STATIC_DIR, "styles.css"), "text/css; charset=utf-8");
      return;
    }

    if (pathname.startsWith("/api/")) {
      if (method === "GET") {
        handleGetApi(req, res, pathname, requestUrl.searchParams);
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
