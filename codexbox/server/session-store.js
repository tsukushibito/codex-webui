"use strict";

const { writeSse } = require("./sse");

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

function createSessionStore({ randomUUID, nowMs }) {
  const sessions = new Map();

  function createSession() {
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
      activeTurnSnapshots: new Map(),
      completedTurnChanges: new Map(),
      sseClients: new Set(),
      threadId: null,
    };
    sessions.set(sessionId, session);
    return session;
  }

  function touchSession(session) {
    session.lastActivityAt = nowMs();
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
    session.activeTurnSnapshots.clear();
    session.completedTurnChanges.clear();

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

  return {
    sessions,
    createSession,
    touchSession,
    emitSessionEvent,
    ensureSession,
    shutdownSession,
    listPendingApprovals,
    listPendingUserInputs,
    serializeSessionSnapshot,
  };
}

module.exports = {
  approvalDefaultResult,
  createSessionStore,
  listPendingApprovals,
  listPendingUserInputs,
  normalizeUserInputResult,
  serializeApproval,
  serializeSessionSnapshot,
  serializeUserInputRequest,
  userInputDefaultResponse,
};
