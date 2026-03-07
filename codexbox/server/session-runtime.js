"use strict";

const { spawn } = require("node:child_process");
const {
  approvalDefaultResult,
  normalizeUserInputResult,
  serializeApproval,
  serializeUserInputRequest,
  userInputDefaultResponse,
} = require("./session-store");

const APPROVAL_REQUEST_METHODS = new Set([
  "item/commandExecution/requestApproval",
  "item/fileChange/requestApproval",
  "execCommandApproval",
  "applyPatchApproval",
]);

function createSessionRuntime({
  codexBin,
  workspaceRoot,
  approvalTimeoutMs,
  userInputTimeoutMs,
  rpcTimeoutMs,
  emitSessionEvent,
  normalizeError,
  nowMs,
  onTurnCompleted,
  shutdownSession,
  touchSession,
}) {
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
      }, rpcTimeoutMs);

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

  function handleApprovalRequest(session, message) {
    const requestId = String(message.id);
    const createdAt = nowMs();
    const approval = {
      requestId,
      method: message.method,
      params: message.params || {},
      createdAt,
      expiresAt: createdAt + approvalTimeoutMs,
      timeoutHandle: null,
    };

    approval.timeoutHandle = setTimeout(() => {
      handleApprovalTimeout(session, requestId);
    }, approvalTimeoutMs);

    session.pendingApprovals.set(requestId, approval);
    emitSessionEvent(session, "approval/pending", {
      approval: serializeApproval(approval),
    });
    touchSession(session);
  }

  function handleUserInputRequestFromServer(session, message) {
    const requestId = String(message.id);
    const createdAt = nowMs();
    const request = {
      requestId,
      rpcId: message.id,
      method: message.method,
      params: message.params || {},
      createdAt,
      expiresAt: createdAt + userInputTimeoutMs,
      timeoutHandle: null,
    };

    request.timeoutHandle = setTimeout(() => {
      handleUserInputTimeout(session, requestId);
    }, userInputTimeoutMs);

    session.pendingUserInputs.set(requestId, request);
    emitSessionEvent(session, "user_input/pending", {
      request: serializeUserInputRequest(request),
    });
    touchSession(session);
  }

  function handleUnsupportedToolCall(session, message) {
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
      method: message.method,
      params: message.params || {},
      result,
    });
    touchSession(session);
  }

  const serverRequestHandlers = {
    "item/tool/requestUserInput": handleUserInputRequestFromServer,
    "item/tool/call": handleUnsupportedToolCall,
  };

  function handleRpcRequestFromServer(session, message) {
    const method = message.method;

    if (APPROVAL_REQUEST_METHODS.has(method)) {
      handleApprovalRequest(session, message);
      return;
    }

    const handler = serverRequestHandlers[method];
    if (handler) {
      handler(session, message);
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

  function handleThreadStartedNotification(session, message) {
    const threadId = message.params?.thread?.id;
    if (typeof threadId === "string") {
      session.threadId = threadId;
    }
  }

  function handleAgentMessageDeltaNotification(session, message) {
    emitSessionEvent(session, "chat/delta", {
      params: message.params || {},
    });
  }

  function handleTurnCompletedNotification(session, message) {
    if (typeof onTurnCompleted === "function") {
      onTurnCompleted(session, message.params || {});
    }
  }

  const notificationHandlers = {
    "thread/started": handleThreadStartedNotification,
    "item/agentMessage/delta": handleAgentMessageDeltaNotification,
    "turn/completed": handleTurnCompletedNotification,
  };

  function handleRpcNotification(session, message) {
    emitSessionEvent(session, "rpc/notification", { message });

    const handler = notificationHandlers[message.method];
    if (handler) {
      handler(session, message);
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

  async function startSessionRuntime(session) {
    const child = spawn(codexBin, ["app-server", "--listen", "stdio://"], {
      cwd: workspaceRoot,
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

  return {
    normalizeUserInputResult,
    resolveApproval,
    resolveUserInputRequest,
    rpcRequest,
    startSessionRuntime,
  };
}

module.exports = {
  createSessionRuntime,
};
