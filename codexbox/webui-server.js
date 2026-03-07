const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const { spawn, execFile } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const { promisify } = require("node:util");

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
const MAX_FILE_BYTES = Number(process.env.MAX_FILE_BYTES || 256 * 1024);
const execFileAsync = promisify(execFile);

const sessions = new Map();
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

function isPathInside(parentPath, childPath) {
  const relativePath = path.relative(parentPath, childPath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function resolveWorkspacePath(requestedPath) {
  const rawPath = String(requestedPath || "").trim();
  if (!rawPath) {
    throw new Error("path is required");
  }

  const candidatePath = path.resolve(WORKSPACE_ROOT_REALPATH, rawPath);
  let resolvedPath;
  try {
    resolvedPath = fs.realpathSync.native(candidatePath);
  } catch (err) {
    if (err && err.code === "ENOENT") {
      throw new Error(`path not found: ${rawPath}`);
    }
    throw err;
  }

  if (!isPathInside(WORKSPACE_ROOT_REALPATH, resolvedPath)) {
    throw new Error(`path escapes workspace: ${rawPath}`);
  }

  return {
    rawPath,
    absolutePath: resolvedPath,
    relativePath: path.relative(WORKSPACE_ROOT_REALPATH, resolvedPath).split(path.sep).join("/"),
  };
}

function normalizeRepoRelativePath(requestedPath) {
  const rawPath = String(requestedPath || "").trim();
  if (!rawPath) {
    throw new Error("path is required");
  }

  const candidatePath = path.resolve(WORKSPACE_ROOT_REALPATH, rawPath);
  if (!isPathInside(WORKSPACE_ROOT_REALPATH, candidatePath)) {
    throw new Error(`path escapes workspace: ${rawPath}`);
  }

  const relativePath = path.relative(WORKSPACE_ROOT_REALPATH, candidatePath).split(path.sep).join("/");
  if (!relativePath || relativePath === ".") {
    throw new Error("path must point to a file");
  }

  return {
    rawPath,
    absolutePath: candidatePath,
    relativePath,
  };
}

async function runGit(args) {
  const { stdout } = await execFileAsync("git", ["-C", WORKSPACE_ROOT_REALPATH, ...args], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  return stdout;
}

async function runGitBuffer(args) {
  const { stdout } = await execFileAsync("git", ["-C", WORKSPACE_ROOT_REALPATH, ...args], {
    encoding: "buffer",
    maxBuffer: 8 * 1024 * 1024,
  });
  return stdout;
}

function isGitMissingObjectError(err) {
  if (typeof err?.stderr !== "string") {
    return false;
  }
  return (
    err.stderr.includes("exists on disk, but not in") ||
    err.stderr.includes("pathspec") ||
    err.stderr.includes("Not a valid object name") ||
    err.stderr.includes("invalid object name") ||
    err.stderr.includes("does not exist in")
  );
}

function parseGitStatusPorcelain(output) {
  const statuses = new Map();
  const records = output.split("\0");

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (!record) {
      continue;
    }

    const code = record.slice(0, 2);
    const currentPath = record.slice(3);
    if (!currentPath) {
      continue;
    }

    if (code.includes("R") || code.includes("C")) {
      index += 1;
    }

    statuses.set(currentPath, {
      code,
      indexStatus: code[0],
      worktreeStatus: code[1],
      isUntracked: code === "??",
    });
  }

  return statuses;
}

function createDirectoryNode(name, nodePath) {
  return {
    type: "directory",
    name,
    path: nodePath,
    children: [],
  };
}

function createFileNode(name, nodePath, metadata) {
  return {
    type: "file",
    name,
    path: nodePath,
    tracked: metadata.tracked,
    gitStatus: metadata.gitStatus,
    indexStatus: metadata.indexStatus,
    worktreeStatus: metadata.worktreeStatus,
  };
}

function sortTreeNodes(nodes) {
  nodes.sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === "directory" ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });

  for (const node of nodes) {
    if (node.type === "directory") {
      sortTreeNodes(node.children);
    }
  }
}

function buildFileTree(fileEntries) {
  const root = [];
  const directories = new Map([["", { children: root }]]);

  for (const entry of fileEntries) {
    const parts = entry.path.split("/").filter(Boolean);
    let parentPath = "";
    let parentNode = directories.get(parentPath);

    for (let index = 0; index < parts.length; index += 1) {
      const name = parts[index];
      const nodePath = parentPath ? `${parentPath}/${name}` : name;
      const isLeaf = index === parts.length - 1;

      if (isLeaf) {
        parentNode.children.push(createFileNode(name, nodePath, entry));
        continue;
      }

      let directoryNode = directories.get(nodePath);
      if (!directoryNode) {
        directoryNode = createDirectoryNode(name, nodePath);
        directories.set(nodePath, directoryNode);
        parentNode.children.push(directoryNode);
      }

      parentPath = nodePath;
      parentNode = directoryNode;
    }
  }

  sortTreeNodes(root);
  return root;
}

function ensureTextFile(buffer, requestedPath) {
  if (buffer.includes(0)) {
    throw new Error(`binary files are not supported: ${requestedPath}`);
  }
}

function toTextPayload(pathname, ref, exists, buffer) {
  if (!exists) {
    return {
      path: pathname,
      ref,
      exists: false,
      size: 0,
      content: "",
    };
  }

  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error(`file is too large: ${pathname}`);
  }
  ensureTextFile(buffer, pathname);

  return {
    path: pathname,
    ref,
    exists: true,
    size: buffer.length,
    content: buffer.toString("utf8"),
  };
}

async function listWorkspaceFiles() {
  const [trackedOutput, statusOutput] = await Promise.all([
    runGit(["ls-files", "-z", "--cached"]),
    runGit(["status", "--porcelain=v1", "-z", "--untracked-files=all"]),
  ]);

  const statuses = parseGitStatusPorcelain(statusOutput);
  const entries = new Map();

  for (const trackedPath of trackedOutput.split("\0")) {
    if (!trackedPath) {
      continue;
    }

    entries.set(trackedPath, {
      path: trackedPath,
      tracked: true,
      gitStatus: statuses.get(trackedPath)?.code || "  ",
      indexStatus: statuses.get(trackedPath)?.indexStatus || " ",
      worktreeStatus: statuses.get(trackedPath)?.worktreeStatus || " ",
    });
  }

  for (const [filePath, status] of statuses.entries()) {
    if (!status.isUntracked) {
      continue;
    }

    entries.set(filePath, {
      path: filePath,
      tracked: false,
      gitStatus: status.code,
      indexStatus: status.indexStatus,
      worktreeStatus: status.worktreeStatus,
    });
  }

  const visibleEntries = [];
  for (const entry of entries.values()) {
    const absolutePath = path.resolve(WORKSPACE_ROOT_REALPATH, entry.path);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    let stat;
    try {
      const resolvedPath = fs.realpathSync.native(absolutePath);
      if (!isPathInside(WORKSPACE_ROOT_REALPATH, resolvedPath)) {
        continue;
      }
      stat = fs.statSync(resolvedPath);
    } catch {
      continue;
    }

    if (!stat.isFile()) {
      continue;
    }

    visibleEntries.push(entry);
  }

  visibleEntries.sort((left, right) => left.path.localeCompare(right.path));
  return visibleEntries;
}

async function readWorkspaceFile(requestedPath) {
  const resolved = resolveWorkspacePath(requestedPath);
  const stat = await fs.promises.stat(resolved.absolutePath);

  if (!stat.isFile()) {
    throw new Error(`path is not a file: ${requestedPath}`);
  }
  if (stat.size > MAX_FILE_BYTES) {
    throw new Error(`file is too large: ${requestedPath}`);
  }

  const buffer = await fs.promises.readFile(resolved.absolutePath);
  ensureTextFile(buffer, requestedPath);

  return {
    path: resolved.relativePath,
    size: buffer.length,
    content: buffer.toString("utf8"),
  };
}

async function gitObjectExists(ref, relativePath) {
  try {
    await runGit(["cat-file", "-e", `${ref}:${relativePath}`]);
    return true;
  } catch (err) {
    if (typeof err?.code === "number" && isGitMissingObjectError(err)) {
      return false;
    }
    throw err;
  }
}

async function assertGitRefExists(ref) {
  try {
    await runGit(["rev-parse", "--verify", "--quiet", `${ref}^{object}`]);
  } catch (err) {
    if (typeof err?.code === "number") {
      throw new Error(`invalid ref: ${ref}`);
    }
    throw err;
  }
}

async function gitObjectType(ref, relativePath) {
  const output = await runGit(["cat-file", "-t", `${ref}:${relativePath}`]);
  return output.trim();
}

async function readGitFile(requestedPath, ref = "HEAD") {
  const normalized = normalizeRepoRelativePath(requestedPath);
  await assertGitRefExists(ref);
  const exists = await gitObjectExists(ref, normalized.relativePath);
  if (!exists) {
    return toTextPayload(normalized.relativePath, ref, false, Buffer.alloc(0));
  }

  const objectType = await gitObjectType(ref, normalized.relativePath);
  if (objectType !== "blob") {
    throw new Error(`path is not a file: ${requestedPath}`);
  }

  const buffer = await runGitBuffer(["show", `${ref}:${normalized.relativePath}`]);
  return toTextPayload(normalized.relativePath, ref, true, buffer);
}

async function readWorkspaceFileVersion(requestedPath) {
  const normalized = normalizeRepoRelativePath(requestedPath);
  if (!fs.existsSync(normalized.absolutePath)) {
    return toTextPayload(normalized.relativePath, "WORKTREE", false, Buffer.alloc(0));
  }

  const entryStat = await fs.promises.lstat(normalized.absolutePath);
  if (entryStat.isSymbolicLink()) {
    const resolvedPath = fs.realpathSync.native(normalized.absolutePath);
    if (!isPathInside(WORKSPACE_ROOT_REALPATH, resolvedPath)) {
      throw new Error(`path escapes workspace: ${requestedPath}`);
    }
    const linkTarget = await fs.promises.readlink(normalized.absolutePath, "utf8");
    return toTextPayload(normalized.relativePath, "WORKTREE", true, Buffer.from(linkTarget, "utf8"));
  }

  const resolved = resolveWorkspacePath(normalized.relativePath);
  const stat = await fs.promises.stat(resolved.absolutePath);
  if (!stat.isFile()) {
    throw new Error(`path is not a file: ${requestedPath}`);
  }

  const buffer = await fs.promises.readFile(resolved.absolutePath);
  return toTextPayload(normalized.relativePath, "WORKTREE", true, buffer);
}

async function readGitStatus(requestedPath) {
  const normalized = normalizeRepoRelativePath(requestedPath);
  const output = await runGit([
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=all",
    "--",
    normalized.relativePath,
  ]);
  const status = parseGitStatusPorcelain(output).get(normalized.relativePath);

  return {
    path: normalized.relativePath,
    gitStatus: status?.code || "  ",
    indexStatus: status?.indexStatus || " ",
    worktreeStatus: status?.worktreeStatus || " ",
  };
}

async function readGitDiff(requestedPath) {
  const status = await readGitStatus(requestedPath);
  const [left, right] = await Promise.all([
    readGitFile(status.path, "HEAD"),
    readWorkspaceFileVersion(status.path),
  ]);

  if (!left.exists && !right.exists) {
    throw new Error(`path not found: ${status.path}`);
  }

  return {
    path: status.path,
    gitStatus: status.gitStatus,
    indexStatus: status.indexStatus,
    worktreeStatus: status.worktreeStatus,
    left,
    right,
  };
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
    pendingUserInputs: new Map(),
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

function userInputDefaultResponse(params) {
  const answers = {};
  const questions = Array.isArray(params?.questions) ? params.questions : [];
  for (const question of questions) {
    const id = question && typeof question.id === "string" ? question.id : null;
    if (!id) {
      continue;
    }
    answers[id] = { answers: [] };
  }
  return { answers };
}

function serializeUserInputRequest(request) {
  return {
    requestId: request.requestId,
    method: request.method,
    params: request.params,
    createdAt: request.createdAt,
    expiresAt: request.expiresAt,
  };
}

function listPendingUserInputs(session) {
  return Array.from(session.pendingUserInputs.values())
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(serializeUserInputRequest);
}

function serializeSessionSnapshot(session) {
  return {
    sessionId: session.id,
    threadId: session.threadId,
    pendingApprovals: listPendingApprovals(session),
    pendingUserInputs: listPendingUserInputs(session),
  };
}

function normalizeUserInputResult(request, body) {
  if (body.result && typeof body.result === "object") {
    return body.result;
  }

  const result = userInputDefaultResponse(request.params);
  const rawAnswers = body.answers;
  if (!rawAnswers || typeof rawAnswers !== "object") {
    return result;
  }

  for (const [questionId, rawAnswer] of Object.entries(rawAnswers)) {
    if (Array.isArray(rawAnswer)) {
      result.answers[questionId] = { answers: rawAnswer.map((value) => String(value)) };
      continue;
    }
    if (rawAnswer && typeof rawAnswer === "object" && Array.isArray(rawAnswer.answers)) {
      result.answers[questionId] = {
        answers: rawAnswer.answers.map((value) => String(value)),
      };
    }
  }

  return result;
}

function resolveUserInputRequest(session, requestId, result, resolutionType) {
  const key = String(requestId);
  const request = session.pendingUserInputs.get(key);
  if (!request) {
    throw new Error(`user input request ${requestId} not found`);
  }

  clearTimeout(request.timeoutHandle);
  session.pendingUserInputs.delete(key);

  rpcRespond(session, request.rpcId, result);
  emitSessionEvent(session, "user_input/resolved", {
    resolutionType,
    request: serializeUserInputRequest(request),
    result,
  });
  touchSession(session);

  return {
    requestId: request.requestId,
    resolutionType,
    result,
  };
}

function handleUserInputTimeout(session, requestId) {
  const key = String(requestId);
  const request = session.pendingUserInputs.get(key);
  if (!request) {
    return;
  }

  const timeoutResult = userInputDefaultResponse(request.params);
  try {
    resolveUserInputRequest(session, requestId, timeoutResult, "timeout");
  } catch (err) {
    session.pendingUserInputs.delete(key);
    emitSessionEvent(session, "user_input/timed_out", {
      request: serializeUserInputRequest(request),
      reason: normalizeError(err),
    });
  }
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

  if (method === "item/tool/requestUserInput") {
    const requestId = String(message.id);
    const createdAt = nowMs();
    const request = {
      requestId,
      rpcId: message.id,
      method,
      params: message.params || {},
      createdAt,
      expiresAt: createdAt + USER_INPUT_TIMEOUT_MS,
      timeoutHandle: null,
    };

    request.timeoutHandle = setTimeout(() => {
      handleUserInputTimeout(session, requestId);
    }, USER_INPUT_TIMEOUT_MS);

    session.pendingUserInputs.set(requestId, request);
    emitSessionEvent(session, "user_input/pending", {
      request: serializeUserInputRequest(request),
    });
    touchSession(session);
    return;
  }

  if (method === "item/tool/call") {
    const result = {
      success: false,
      contentItems: [
        {
          type: "inputText",
          text: "Dynamic tool execution is not supported in this bridge.",
        },
      ],
    };
    rpcRespond(session, message.id, result);
    emitSessionEvent(session, "tool_call/unsupported", {
      requestId: String(message.id),
      method,
      params: message.params || {},
      result,
    });
    touchSession(session);
    return;
  }

  rpcError(session, message.id, `Unsupported server request method: ${method}`);
  emitSessionEvent(session, "rpc/server_request_unsupported", {
    requestId: String(message.id),
    method: typeof method === "string" ? method : null,
    reason: "unsupported-server-request-method",
  });
  touchSession(session);
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

  for (const request of session.pendingUserInputs.values()) {
    clearTimeout(request.timeoutHandle);
  }
  session.pendingUserInputs.clear();

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
        userInputTimeoutMs: USER_INPUT_TIMEOUT_MS,
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

  if (pathname === "/api/session/reconnect") {
    const session = ensureSession(body.sessionId);
    touchSession(session);
    sendJson(res, 200, {
      ok: true,
      ...serializeSessionSnapshot(session),
      idleTimeoutMs: SESSION_IDLE_TIMEOUT_MS,
      approvalTimeoutMs: APPROVAL_TIMEOUT_MS,
      userInputTimeoutMs: USER_INPUT_TIMEOUT_MS,
    });
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

  if (pathname === "/api/thread/read") {
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

  if (pathname === "/api/user-input/respond") {
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
    return;
  }

  sendJson(res, 404, { ok: false, error: "not found" });
}

async function handleGetApi(req, res, pathname, searchParams) {
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

  if (pathname === "/api/user-input") {
    const session = ensureSession(searchParams.get("sessionId"));
    sendJson(res, 200, {
      ok: true,
      pendingUserInputs: listPendingUserInputs(session),
    });
    return;
  }

  if (pathname === "/api/fs/tree") {
    const entries = await listWorkspaceFiles();
    sendJson(res, 200, {
      ok: true,
      rootPath: ".",
      entries,
      tree: buildFileTree(entries),
    });
    return;
  }

  if (pathname === "/api/fs/file") {
    const file = await readWorkspaceFile(searchParams.get("path"));
    sendJson(res, 200, {
      ok: true,
      file,
    });
    return;
  }

  if (pathname === "/api/git/show") {
    const ref = String(searchParams.get("ref") || "HEAD").trim() || "HEAD";
    const file = await readGitFile(searchParams.get("path"), ref);
    sendJson(res, 200, {
      ok: true,
      file,
    });
    return;
  }

  if (pathname === "/api/git/diff") {
    const diff = await readGitDiff(searchParams.get("path"));
    sendJson(res, 200, {
      ok: true,
      diff,
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
