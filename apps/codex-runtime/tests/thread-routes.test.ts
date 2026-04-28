import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { approvals, messages, sessionEvents, sessions, workspaces } from "../src/db/schema.js";
import type { NativeSessionGateway } from "../src/domain/sessions/native-session-gateway.js";
import { RuntimeError } from "../src/errors.js";
import { createTempDatabase, createTempWorkspaceRoot } from "./helpers.js";

const cleanupPaths: string[] = [];

class StubNativeSessionGateway implements NativeSessionGateway {
  readonly sendUserMessages: Array<{ sessionId: string; content: string }> = [];

  constructor(
    private readonly sessionIds: string[] = [],
    private readonly turnIds: string[] = [],
    readonly resolveApprovals: Array<{
      sessionId: string;
      approvalId: string;
      resolution: "approved" | "denied";
    }> = [],
    readonly interrupts: Array<{ sessionId: string; turnId: string }> = [],
  ) {}

  async createSession() {
    const sessionId = this.sessionIds.shift();
    if (!sessionId) {
      throw new Error("no stub session id available");
    }

    return { sessionId };
  }

  async sendUserMessage(_input: { sessionId: string; content: string }) {
    this.sendUserMessages.push(_input);
    const turnId = this.turnIds.shift();
    if (!turnId) {
      throw new Error("no stub turn id available");
    }

    return { turnId };
  }

  async resolveApproval(input: {
    sessionId: string;
    approvalId: string;
    resolution: "approved" | "denied";
  }) {
    this.resolveApprovals.push(input);
  }

  async cancelPendingApproval(_input: { sessionId: string; approvalId: string }) {}

  async interruptSessionTurn(input: { sessionId: string; turnId: string }) {
    this.interrupts.push(input);
  }
}

class FailingSendNativeSessionGateway extends StubNativeSessionGateway {
  override async sendUserMessage(_input: {
    sessionId: string;
    content: string;
  }): Promise<{ turnId: string }> {
    throw new RuntimeError(502, "app_server_request_failed", "turn is already running", {
      rpc_method: "turn/start",
      rpc_error_code: "invalid_state",
    });
  }
}

class MissingThreadNativeSessionGateway extends StubNativeSessionGateway {
  override async sendUserMessage(_input: {
    sessionId: string;
    content: string;
  }): Promise<{ turnId: string }> {
    this.sendUserMessages.push(_input);
    throw new RuntimeError(502, "app_server_request_failed", "thread not found in app server", {
      rpc_method: "turn/start",
      rpc_error_code: "not_found",
      rpc_error_data: {
        threadId: _input.sessionId,
        reason: "persisted thread missing after restart",
      },
    });
  }
}

afterEach(async () => {
  await Promise.all(
    cleanupPaths.splice(0).map((entryPath) => fs.rm(entryPath, { recursive: true, force: true })),
  );
});

function resolveBaseUrl(app: Awaited<ReturnType<typeof buildApp>>) {
  const address = app.server.address();
  if (!address || typeof address === "string") {
    throw new Error("app server address is not available");
  }

  return `http://127.0.0.1:${address.port.toString()}`;
}

function createSseReader(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("response body is not readable");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  return async function nextEvent() {
    while (true) {
      const separatorIndex = buffer.indexOf("\n\n");
      if (separatorIndex >= 0) {
        const chunk = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);

        if (chunk.startsWith("data: ")) {
          return JSON.parse(chunk.slice(6)) as Record<string, unknown>;
        }
      }

      const { done, value } = await reader.read();
      if (done) {
        throw new Error("sse stream ended before the next data event was received");
      }

      buffer += decoder.decode(value, { stream: true });
    }
  };
}

async function waitForAssertion(assertion: () => Promise<void>, timeoutMs = 1_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      await assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  throw lastError;
}

describe("thread routes", () => {
  it("lists threads from the v0.9 workspace thread route", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("thread-routes-root");
    const database = await createTempDatabase("thread-routes-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerBridgeEnabled: false,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
    });

    database.db
      .insert(workspaces)
      .values({
        workspaceId: "ws_alpha",
        workspaceName: "alpha",
        directoryName: "alpha",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:00:00.000Z",
      })
      .run();

    database.db
      .insert(sessions)
      .values({
        sessionId: "thread_001",
        workspaceId: "ws_alpha",
        title: "Existing thread",
        status: "waiting_input",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:01:00.000Z",
        startedAt: "2026-04-09T00:00:00.000Z",
        lastMessageAt: null,
        activeApprovalId: null,
        currentTurnId: null,
        pendingAssistantMessageId: null,
        appSessionOverlayState: "open",
      })
      .run();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/workspaces/ws_alpha/threads",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      items: [
        {
          thread_id: "thread_001",
          workspace_id: "ws_alpha",
          derived_hints: {
            accepting_user_input: true,
            has_pending_request: false,
          },
        },
      ],
      next_cursor: null,
      has_more: false,
    });

    await app.close();
  });

  it("starts a thread from the first input and reuses the mapping idempotently", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("thread-routes-root");
    const database = await createTempDatabase("thread-routes-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerBridgeEnabled: false,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
    });

    const createWorkspaceResponse = await app.inject({
      method: "POST",
      url: "/api/v1/workspaces",
      payload: {
        workspace_name: "alpha",
      },
    });
    const workspaceId = createWorkspaceResponse.json().workspace_id as string;

    const firstResponse = await app.inject({
      method: "POST",
      url: `/api/v1/workspaces/${workspaceId}/inputs`,
      payload: {
        client_request_id: "req_start_001",
        content: "Plan the runtime cutover",
      },
    });

    expect(firstResponse.statusCode).toBe(202);
    const firstJson = firstResponse.json();
    expect(firstJson.thread.thread_id).toMatch(/^thread_/);

    const secondResponse = await app.inject({
      method: "POST",
      url: `/api/v1/workspaces/${workspaceId}/inputs`,
      payload: {
        client_request_id: "req_start_001",
        content: "Plan the runtime cutover",
      },
    });

    expect(secondResponse.statusCode).toBe(202);
    expect(secondResponse.json()).toMatchObject({
      thread: {
        thread_id: firstJson.thread.thread_id,
      },
    });

    await app.close();
  });

  it("surfaces native turn-start failures instead of returning an unexpected runtime failure", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("thread-routes-root");
    const database = await createTempDatabase("thread-routes-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerBridgeEnabled: false,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
      services: {
        nativeSessionGateway: new FailingSendNativeSessionGateway(["thread_001"]),
      },
    });

    database.db
      .insert(workspaces)
      .values({
        workspaceId: "ws_alpha",
        workspaceName: "alpha",
        directoryName: "alpha",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:00:00.000Z",
      })
      .run();

    database.db
      .insert(sessions)
      .values({
        sessionId: "thread_001",
        workspaceId: "ws_alpha",
        title: "Existing thread",
        status: "waiting_input",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:01:00.000Z",
        startedAt: "2026-04-09T00:00:00.000Z",
        lastMessageAt: null,
        activeApprovalId: null,
        currentTurnId: null,
        pendingAssistantMessageId: null,
        appSessionOverlayState: "open",
      })
      .run();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/threads/thread_001/inputs",
      payload: {
        client_request_id: "req_001",
        content: "Plan the runtime cutover",
      },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      error: {
        code: "app_server_request_failed",
        message: "turn is already running",
        details: {
          rpc_method: "turn/start",
          rpc_error_code: "invalid_state",
        },
      },
    });

    await app.close();
  });

  it("starts a new thread even when another thread is currently active in the workspace", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("thread-routes-root");
    const database = await createTempDatabase("thread-routes-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerBridgeEnabled: false,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
    });

    database.db
      .insert(workspaces)
      .values({
        workspaceId: "ws_alpha",
        workspaceName: "alpha",
        directoryName: "alpha",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:00:00.000Z",
      })
      .run();

    database.db
      .insert(sessions)
      .values({
        sessionId: "thread_active",
        workspaceId: "ws_alpha",
        title: "Foreground thread",
        status: "running",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:01:00.000Z",
        startedAt: "2026-04-09T00:00:00.000Z",
        lastMessageAt: "2026-04-09T00:00:30.000Z",
        activeApprovalId: null,
        currentTurnId: "turn_active_001",
        pendingAssistantMessageId: null,
        appSessionOverlayState: "open",
      })
      .run();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/workspaces/ws_alpha/inputs",
      payload: {
        client_request_id: "req_start_parallel_001",
        content: "Start another active thread",
      },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({
      thread: {
        workspace_id: "ws_alpha",
      },
    });
    expect(response.json().thread.thread_id).not.toBe("thread_active");

    await app.close();
  });

  it("resolves approved requests through thread routes without the session-service write seam", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("thread-routes-root");
    const database = await createTempDatabase("thread-routes-db");
    const nativeSessionGateway = new StubNativeSessionGateway();
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerBridgeEnabled: false,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
      services: {
        nativeSessionGateway,
      },
    });

    database.db
      .insert(workspaces)
      .values({
        workspaceId: "ws_alpha",
        workspaceName: "alpha",
        directoryName: "alpha",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:00:00.000Z",
      })
      .run();

    database.db
      .insert(sessions)
      .values({
        sessionId: "thread_001",
        workspaceId: "ws_alpha",
        title: "Existing thread",
        status: "waiting_approval",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:01:00.000Z",
        startedAt: "2026-04-09T00:00:00.000Z",
        lastMessageAt: "2026-04-09T00:00:30.000Z",
        activeApprovalId: "apr_001",
        currentTurnId: "turn_001",
        pendingAssistantMessageId: "msg_assistant_pending_001",
        appSessionOverlayState: "open",
      })
      .run();

    database.db
      .insert(approvals)
      .values({
        approvalId: "apr_001",
        sessionId: "thread_001",
        workspaceId: "ws_alpha",
        status: "pending",
        resolution: null,
        approvalCategory: "external_side_effect",
        summary: "Run git push",
        reason: "Codex requests permission to push changes to remote.",
        operationSummary: "git push origin main",
        context: null,
        createdAt: "2026-04-09T00:01:00.000Z",
        resolvedAt: null,
        nativeRequestKind: "approval",
      })
      .run();

    const pendingResponse = await app.inject({
      method: "GET",
      url: "/api/v1/threads/thread_001/pending_request",
    });

    expect(pendingResponse.statusCode).toBe(200);
    expect(pendingResponse.json()).toMatchObject({
      thread_id: "thread_001",
      pending_request: {
        request_id: "apr_001",
        thread_id: "thread_001",
        summary: "Run git push",
      },
      latest_resolved_request: null,
    });

    const detailResponse = await app.inject({
      method: "GET",
      url: "/api/v1/requests/apr_001",
    });

    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json()).toMatchObject({
      request_id: "apr_001",
      operation_summary: "git push origin main",
    });

    const resolveResponse = await app.inject({
      method: "POST",
      url: "/api/v1/requests/apr_001/response",
      payload: {
        decision: "approved",
      },
    });

    expect(resolveResponse.statusCode).toBe(200);
    expect(resolveResponse.json()).toMatchObject({
      request: {
        request_id: "apr_001",
        decision: "approved",
      },
      thread: {
        thread_id: "thread_001",
        derived_hints: {
          accepting_user_input: false,
          has_pending_request: false,
          blocked_reason: "turn_in_progress",
        },
      },
    });

    expect(nativeSessionGateway.resolveApprovals).toEqual([
      {
        sessionId: "thread_001",
        approvalId: "apr_001",
        resolution: "approved",
      },
    ]);

    const replayResponse = await app.inject({
      method: "POST",
      url: "/api/v1/requests/apr_001/response",
      payload: {
        decision: "approved",
      },
    });

    expect(replayResponse.statusCode).toBe(200);
    expect(nativeSessionGateway.resolveApprovals).toHaveLength(1);

    const conflictingReplayResponse = await app.inject({
      method: "POST",
      url: "/api/v1/requests/apr_001/response",
      payload: {
        decision: "denied",
      },
    });

    expect(conflictingReplayResponse.statusCode).toBe(409);
    expect(conflictingReplayResponse.json()).toMatchObject({
      error: {
        code: "request_not_pending",
        details: {
          request_id: "apr_001",
          status: "approved",
        },
      },
    });

    const approvalRecord = database.db
      .select()
      .from(approvals)
      .where(eq(approvals.approvalId, "apr_001"))
      .get();
    expect(approvalRecord).toMatchObject({
      status: "approved",
      resolution: "approved",
    });

    const sessionRecord = database.db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, "thread_001"))
      .get();
    expect(sessionRecord).toMatchObject({
      status: "running",
      activeApprovalId: null,
      currentTurnId: "turn_001",
      pendingAssistantMessageId: "msg_assistant_pending_001",
      appSessionOverlayState: "open",
    });

    const workspaceRecord = database.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.workspaceId, "ws_alpha"))
      .get();
    expect(workspaceRecord?.updatedAt).toBe(sessionRecord?.updatedAt);

    const emittedEvents = database.db
      .select()
      .from(sessionEvents)
      .where(eq(sessionEvents.sessionId, "thread_001"))
      .all();
    expect(emittedEvents).toHaveLength(2);
    expect(emittedEvents.map((event) => event.eventType)).toEqual([
      "approval.resolved",
      "session.status_changed",
    ]);
    expect(JSON.parse(emittedEvents[0]!.payload)).toMatchObject({
      approval_id: "apr_001",
      workspace_id: "ws_alpha",
      resolution: "approved",
    });
    expect(JSON.parse(emittedEvents[1]!.payload)).toMatchObject({
      from_status: "waiting_approval",
      to_status: "running",
    });

    await app.close();
  });

  it("returns the newest resolved request when no pending helper is reachable", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("thread-routes-root");
    const database = await createTempDatabase("thread-routes-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerBridgeEnabled: false,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
    });

    database.db
      .insert(workspaces)
      .values({
        workspaceId: "ws_alpha",
        workspaceName: "alpha",
        directoryName: "alpha",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:00:00.000Z",
      })
      .run();

    database.db
      .insert(sessions)
      .values({
        sessionId: "thread_001",
        workspaceId: "ws_alpha",
        title: "Existing thread",
        status: "waiting_input",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:03:00.000Z",
        startedAt: "2026-04-09T00:00:00.000Z",
        lastMessageAt: "2026-04-09T00:02:00.000Z",
        activeApprovalId: null,
        currentTurnId: null,
        pendingAssistantMessageId: null,
        appSessionOverlayState: "open",
      })
      .run();

    database.db
      .insert(approvals)
      .values([
        {
          approvalId: "apr_old",
          sessionId: "thread_001",
          workspaceId: "ws_alpha",
          status: "denied",
          resolution: "denied",
          approvalCategory: "external_side_effect",
          summary: "Declined old request",
          reason: "Older helper request.",
          operationSummary: "git push origin old-branch",
          context: null,
          createdAt: "2026-04-09T00:01:00.000Z",
          resolvedAt: "2026-04-09T00:02:00.000Z",
          nativeRequestKind: "approval",
        },
        {
          approvalId: "apr_new",
          sessionId: "thread_001",
          workspaceId: "ws_alpha",
          status: "approved",
          resolution: "approved",
          approvalCategory: "external_side_effect",
          summary: "Accepted newer request",
          reason: "Newer helper request.",
          operationSummary: "git push origin main",
          context: null,
          createdAt: "2026-04-09T00:01:30.000Z",
          resolvedAt: "2026-04-09T00:02:30.000Z",
          nativeRequestKind: "approval",
        },
      ])
      .run();

    const pendingResponse = await app.inject({
      method: "GET",
      url: "/api/v1/threads/thread_001/pending_request",
    });

    expect(pendingResponse.statusCode).toBe(200);
    expect(pendingResponse.json()).toMatchObject({
      thread_id: "thread_001",
      pending_request: null,
      latest_resolved_request: {
        request_id: "apr_new",
        thread_id: "thread_001",
        status: "resolved",
        decision: "approved",
        requested_at: "2026-04-09T00:01:30.000Z",
        responded_at: "2026-04-09T00:02:30.000Z",
      },
    });

    const viewResponse = await app.inject({
      method: "GET",
      url: "/api/v1/threads/thread_001/view",
    });

    expect(viewResponse.statusCode).toBe(200);
    expect(viewResponse.json()).toMatchObject({
      thread: {
        thread_id: "thread_001",
      },
      pending_request: null,
      latest_resolved_request: {
        request_id: "apr_new",
        thread_id: "thread_001",
        status: "resolved",
        decision: "approved",
      },
    });

    await app.close();
  });

  it("suppresses retained latest-resolved helpers when any pending request exists", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("thread-routes-root");
    const database = await createTempDatabase("thread-routes-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerBridgeEnabled: false,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
    });

    database.db
      .insert(workspaces)
      .values({
        workspaceId: "ws_alpha",
        workspaceName: "alpha",
        directoryName: "alpha",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:00:00.000Z",
      })
      .run();

    database.db
      .insert(sessions)
      .values({
        sessionId: "thread_001",
        workspaceId: "ws_alpha",
        title: "Existing thread",
        status: "waiting_approval",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:03:00.000Z",
        startedAt: "2026-04-09T00:00:00.000Z",
        lastMessageAt: "2026-04-09T00:02:30.000Z",
        activeApprovalId: "apr_pending",
        currentTurnId: "turn_001",
        pendingAssistantMessageId: "msg_assistant_pending_001",
        appSessionOverlayState: "open",
      })
      .run();

    database.db
      .insert(approvals)
      .values([
        {
          approvalId: "apr_resolved",
          sessionId: "thread_001",
          workspaceId: "ws_alpha",
          status: "approved",
          resolution: "approved",
          approvalCategory: "external_side_effect",
          summary: "Accepted earlier request",
          reason: "Earlier helper request.",
          operationSummary: "git push origin main",
          context: null,
          createdAt: "2026-04-09T00:01:00.000Z",
          resolvedAt: "2026-04-09T00:02:00.000Z",
          nativeRequestKind: "approval",
        },
        {
          approvalId: "apr_pending",
          sessionId: "thread_001",
          workspaceId: "ws_alpha",
          status: "pending",
          resolution: null,
          approvalCategory: "external_side_effect",
          summary: "Pending retained request",
          reason: "Current helper request.",
          operationSummary: "git push origin feature",
          context: null,
          createdAt: "2026-04-09T00:02:30.000Z",
          resolvedAt: null,
          nativeRequestKind: "approval",
        },
      ])
      .run();

    const pendingResponse = await app.inject({
      method: "GET",
      url: "/api/v1/threads/thread_001/pending_request",
    });

    expect(pendingResponse.statusCode).toBe(200);
    expect(pendingResponse.json()).toMatchObject({
      thread_id: "thread_001",
      pending_request: {
        request_id: "apr_pending",
        thread_id: "thread_001",
        summary: "Pending retained request",
        status: "pending",
      },
      latest_resolved_request: null,
    });

    const viewResponse = await app.inject({
      method: "GET",
      url: "/api/v1/threads/thread_001/view",
    });

    expect(viewResponse.statusCode).toBe(200);
    expect(viewResponse.json()).toMatchObject({
      thread: {
        thread_id: "thread_001",
      },
      pending_request: {
        request_id: "apr_pending",
        summary: "Pending retained request",
      },
      latest_resolved_request: null,
    });

    await app.close();
  });

  it("resolves denied requests through thread routes and clears turn-tracking state", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("thread-routes-root");
    const database = await createTempDatabase("thread-routes-db");
    const nativeSessionGateway = new StubNativeSessionGateway();
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerBridgeEnabled: false,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
      services: {
        nativeSessionGateway,
      },
    });

    database.db
      .insert(workspaces)
      .values({
        workspaceId: "ws_alpha",
        workspaceName: "alpha",
        directoryName: "alpha",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:00:00.000Z",
      })
      .run();

    database.db
      .insert(sessions)
      .values({
        sessionId: "thread_001",
        workspaceId: "ws_alpha",
        title: "Existing thread",
        status: "waiting_approval",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:01:00.000Z",
        startedAt: "2026-04-09T00:00:00.000Z",
        lastMessageAt: "2026-04-09T00:00:30.000Z",
        activeApprovalId: "apr_001",
        currentTurnId: "turn_001",
        pendingAssistantMessageId: "msg_assistant_pending_001",
        appSessionOverlayState: "open",
      })
      .run();

    database.db
      .insert(approvals)
      .values({
        approvalId: "apr_001",
        sessionId: "thread_001",
        workspaceId: "ws_alpha",
        status: "pending",
        resolution: null,
        approvalCategory: "external_side_effect",
        summary: "Run git push",
        reason: "Codex requests permission to push changes to remote.",
        operationSummary: "git push origin main",
        context: null,
        createdAt: "2026-04-09T00:01:00.000Z",
        resolvedAt: null,
        nativeRequestKind: "approval",
      })
      .run();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/requests/apr_001/response",
      payload: {
        decision: "denied",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      request: {
        request_id: "apr_001",
        decision: "denied",
      },
      thread: {
        thread_id: "thread_001",
        derived_hints: {
          accepting_user_input: true,
          has_pending_request: false,
          blocked_reason: null,
        },
      },
    });

    expect(nativeSessionGateway.resolveApprovals).toEqual([
      {
        sessionId: "thread_001",
        approvalId: "apr_001",
        resolution: "denied",
      },
    ]);

    const sessionRecord = database.db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, "thread_001"))
      .get();
    expect(sessionRecord).toMatchObject({
      status: "waiting_input",
      activeApprovalId: null,
      currentTurnId: null,
      pendingAssistantMessageId: null,
      appSessionOverlayState: "open",
    });

    const workspaceRecord = database.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.workspaceId, "ws_alpha"))
      .get();
    expect(workspaceRecord?.updatedAt).toBe(sessionRecord?.updatedAt);

    const emittedEvents = database.db
      .select()
      .from(sessionEvents)
      .where(eq(sessionEvents.sessionId, "thread_001"))
      .all();
    expect(emittedEvents.map((event) => event.eventType)).toEqual([
      "approval.resolved",
      "session.status_changed",
    ]);
    expect(JSON.parse(emittedEvents[0]!.payload)).toMatchObject({
      approval_id: "apr_001",
      workspace_id: "ws_alpha",
      resolution: "denied",
    });
    expect(JSON.parse(emittedEvents[1]!.payload)).toMatchObject({
      from_status: "waiting_approval",
      to_status: "waiting_input",
    });

    await app.close();
  });

  it("maps missing thread lookups to the v0.9 thread error vocabulary", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("thread-routes-root");
    const database = await createTempDatabase("thread-routes-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerBridgeEnabled: false,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/threads/thread_missing",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: {
        code: "thread_not_found",
        details: {
          thread_id: "thread_missing",
        },
      },
    });

    await app.close();
  });

  it("interrupts a running thread and persists the waiting_input transition", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("thread-routes-root");
    const database = await createTempDatabase("thread-routes-db");
    const nativeSessionGateway = new StubNativeSessionGateway();
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerBridgeEnabled: false,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
      services: {
        nativeSessionGateway,
      },
    });

    database.db
      .insert(workspaces)
      .values({
        workspaceId: "ws_alpha",
        workspaceName: "alpha",
        directoryName: "alpha",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:00:00.000Z",
      })
      .run();

    database.db
      .insert(sessions)
      .values({
        sessionId: "thread_001",
        workspaceId: "ws_alpha",
        title: "Running thread",
        status: "running",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:01:00.000Z",
        startedAt: "2026-04-09T00:00:00.000Z",
        lastMessageAt: "2026-04-09T00:00:30.000Z",
        activeApprovalId: null,
        currentTurnId: "turn_001",
        pendingAssistantMessageId: "msg_assistant_pending_001",
        appSessionOverlayState: "open",
      })
      .run();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/threads/thread_001/interrupt",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      thread: {
        thread_id: "thread_001",
        workspace_id: "ws_alpha",
        updated_at: expect.any(String),
        native_status: {
          thread_status: "idle",
          latest_turn_status: "completed",
          active_flags: [],
        },
        derived_hints: {
          accepting_user_input: true,
          has_pending_request: false,
          blocked_reason: null,
        },
      },
    });

    expect(nativeSessionGateway.interrupts).toEqual([
      {
        sessionId: "thread_001",
        turnId: "turn_001",
      },
    ]);

    const threadRecord = database.db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, "thread_001"))
      .get();
    expect(threadRecord).toMatchObject({
      status: "waiting_input",
      currentTurnId: null,
      pendingAssistantMessageId: null,
    });

    const workspaceRecord = database.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.workspaceId, "ws_alpha"))
      .get();
    expect(workspaceRecord?.updatedAt).toBe(threadRecord?.updatedAt);
    expect(threadRecord?.updatedAt).toBe(response.json().thread.updated_at);

    const statusEvent = database.db
      .select()
      .from(sessionEvents)
      .where(eq(sessionEvents.sessionId, "thread_001"))
      .get();
    expect(statusEvent).toMatchObject({
      eventType: "session.status_changed",
      occurredAt: threadRecord?.updatedAt,
    });
    expect(JSON.parse(statusEvent?.payload ?? "{}")).toMatchObject({
      from_status: "running",
      to_status: "waiting_input",
    });

    await app.close();
  });

  it("maps missing thread interrupts to thread_not_found", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("thread-routes-root");
    const database = await createTempDatabase("thread-routes-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerBridgeEnabled: false,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/threads/thread_missing/interrupt",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: {
        code: "thread_not_found",
        details: {
          thread_id: "thread_missing",
        },
      },
    });

    await app.close();
  });

  it("maps non-interruptible threads to thread_not_interruptible", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("thread-routes-root");
    const database = await createTempDatabase("thread-routes-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerBridgeEnabled: false,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
    });

    database.db
      .insert(workspaces)
      .values({
        workspaceId: "ws_alpha",
        workspaceName: "alpha",
        directoryName: "alpha",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:00:00.000Z",
      })
      .run();

    database.db
      .insert(sessions)
      .values({
        sessionId: "thread_001",
        workspaceId: "ws_alpha",
        title: "Idle thread",
        status: "waiting_input",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:01:00.000Z",
        startedAt: "2026-04-09T00:00:00.000Z",
        lastMessageAt: "2026-04-09T00:00:30.000Z",
        activeApprovalId: null,
        currentTurnId: null,
        pendingAssistantMessageId: null,
        appSessionOverlayState: "open",
      })
      .run();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/threads/thread_001/interrupt",
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: {
        code: "thread_not_interruptible",
        details: {
          thread_id: "thread_001",
          status: "waiting_input",
        },
      },
    });

    await app.close();
  });

  it("maps existing-thread input failures to thread_not_accepting_input", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("thread-routes-root");
    const database = await createTempDatabase("thread-routes-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerBridgeEnabled: false,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
    });

    database.db
      .insert(workspaces)
      .values({
        workspaceId: "ws_alpha",
        workspaceName: "alpha",
        directoryName: "alpha",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:00:00.000Z",
      })
      .run();

    database.db
      .insert(sessions)
      .values({
        sessionId: "thread_001",
        workspaceId: "ws_alpha",
        title: "Blocked thread",
        status: "waiting_approval",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:01:00.000Z",
        startedAt: "2026-04-09T00:00:00.000Z",
        lastMessageAt: null,
        activeApprovalId: "apr_001",
        currentTurnId: "turn_001",
        pendingAssistantMessageId: null,
        appSessionOverlayState: "open",
      })
      .run();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/threads/thread_001/inputs",
      payload: {
        client_request_id: "req_followup_001",
        content: "Continue the cutover",
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: {
        code: "thread_not_accepting_input",
        details: {
          thread_id: "thread_001",
          status: "waiting_approval",
        },
      },
    });

    await app.close();
  });

  it("marks a persisted thread recovery_pending when native turn/start reports thread missing", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("thread-routes-root");
    const database = await createTempDatabase("thread-routes-db");
    const nativeSessionGateway = new MissingThreadNativeSessionGateway();
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerBridgeEnabled: false,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
      services: {
        nativeSessionGateway,
      },
    });

    database.db
      .insert(workspaces)
      .values({
        workspaceId: "ws_alpha",
        workspaceName: "alpha",
        directoryName: "alpha",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:00:00.000Z",
      })
      .run();

    database.db
      .insert(sessions)
      .values({
        sessionId: "thread_001",
        workspaceId: "ws_alpha",
        title: "Recovered thread",
        status: "waiting_input",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:01:00.000Z",
        startedAt: "2026-04-09T00:00:00.000Z",
        lastMessageAt: null,
        activeApprovalId: null,
        currentTurnId: null,
        pendingAssistantMessageId: null,
        appSessionOverlayState: "open",
      })
      .run();

    const firstResponse = await app.inject({
      method: "POST",
      url: "/api/v1/threads/thread_001/inputs",
      payload: {
        client_request_id: "req_followup_missing_001",
        content: "Continue after runtime restart",
      },
    });

    expect(firstResponse.statusCode).toBe(409);
    expect(firstResponse.json()).toMatchObject({
      error: {
        code: "thread_recovery_pending",
        message: "thread requires recovery before accepting input",
        details: {
          thread_id: "thread_001",
          rpc_method: "turn/start",
          rpc_error_code: "not_found",
          rpc_error_data: {
            threadId: "thread_001",
          },
          native_error_message: "thread not found in app server",
        },
      },
    });

    expect(nativeSessionGateway.sendUserMessages).toEqual([
      {
        sessionId: "thread_001",
        content: "Continue after runtime restart",
      },
    ]);

    const persistedSession = database.db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, "thread_001"))
      .get();
    expect(persistedSession).toMatchObject({
      sessionId: "thread_001",
      status: "waiting_input",
      currentTurnId: null,
      pendingAssistantMessageId: null,
      appSessionOverlayState: "recovery_pending",
    });

    const persistedMessages = database.db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, "thread_001"))
      .all();
    expect(persistedMessages).toHaveLength(0);

    const persistedEvents = database.db
      .select()
      .from(sessionEvents)
      .where(eq(sessionEvents.sessionId, "thread_001"))
      .all();
    expect(persistedEvents).toHaveLength(0);

    const threadResponse = await app.inject({
      method: "GET",
      url: "/api/v1/threads/thread_001",
    });
    expect(threadResponse.statusCode).toBe(200);
    expect(threadResponse.json()).toMatchObject({
      thread_id: "thread_001",
      derived_hints: {
        accepting_user_input: false,
        blocked_reason: "thread_recovery_pending",
      },
    });

    const viewResponse = await app.inject({
      method: "GET",
      url: "/api/v1/threads/thread_001/view",
    });
    expect(viewResponse.statusCode).toBe(200);
    expect(viewResponse.json()).toMatchObject({
      thread: {
        thread_id: "thread_001",
        derived_hints: {
          accepting_user_input: false,
          blocked_reason: "thread_recovery_pending",
        },
      },
    });

    const retryResponse = await app.inject({
      method: "POST",
      url: "/api/v1/threads/thread_001/inputs",
      payload: {
        client_request_id: "req_followup_missing_002",
        content: "Retry after runtime restart",
      },
    });

    expect(retryResponse.statusCode).toBe(409);
    expect(retryResponse.json()).toMatchObject({
      error: {
        code: "thread_recovery_pending",
        details: {
          thread_id: "thread_001",
        },
      },
    });
    expect(nativeSessionGateway.sendUserMessages).toHaveLength(1);

    await app.close();
  });

  it("accepts existing-thread input even when another thread is currently active", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("thread-routes-root");
    const database = await createTempDatabase("thread-routes-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerBridgeEnabled: false,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
    });

    database.db
      .insert(workspaces)
      .values({
        workspaceId: "ws_alpha",
        workspaceName: "alpha",
        directoryName: "alpha",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:00:00.000Z",
      })
      .run();

    database.db
      .insert(sessions)
      .values([
        {
          sessionId: "thread_active",
          workspaceId: "ws_alpha",
          title: "Foreground thread",
          status: "running",
          createdAt: "2026-04-09T00:00:00.000Z",
          updatedAt: "2026-04-09T00:01:00.000Z",
          startedAt: "2026-04-09T00:00:00.000Z",
          lastMessageAt: "2026-04-09T00:00:30.000Z",
          activeApprovalId: null,
          currentTurnId: "turn_active_001",
          pendingAssistantMessageId: null,
          appSessionOverlayState: "open",
        },
        {
          sessionId: "thread_001",
          workspaceId: "ws_alpha",
          title: "Background thread",
          status: "waiting_input",
          createdAt: "2026-04-09T00:00:00.000Z",
          updatedAt: "2026-04-09T00:01:00.000Z",
          startedAt: "2026-04-09T00:00:00.000Z",
          lastMessageAt: null,
          activeApprovalId: null,
          currentTurnId: null,
          pendingAssistantMessageId: null,
          appSessionOverlayState: "open",
        },
      ])
      .run();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/threads/thread_001/inputs",
      payload: {
        client_request_id: "req_followup_parallel_001",
        content: "Continue the background thread",
      },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({
      thread: {
        thread_id: "thread_001",
      },
      accepted_input: {
        session_id: "thread_001",
        content: "Continue the background thread",
      },
    });

    await app.close();
  });

  it("maps missing and resolved request errors to the v0.9 request vocabulary", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("thread-routes-root");
    const database = await createTempDatabase("thread-routes-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerBridgeEnabled: false,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
    });

    const missingResponse = await app.inject({
      method: "GET",
      url: "/api/v1/requests/apr_missing",
    });

    expect(missingResponse.statusCode).toBe(404);
    expect(missingResponse.json()).toMatchObject({
      error: {
        code: "request_not_found",
        details: {
          request_id: "apr_missing",
        },
      },
    });

    database.db
      .insert(workspaces)
      .values({
        workspaceId: "ws_alpha",
        workspaceName: "alpha",
        directoryName: "alpha",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:00:00.000Z",
      })
      .run();

    database.db
      .insert(sessions)
      .values({
        sessionId: "thread_orphan",
        workspaceId: "ws_alpha",
        title: "Orphaned request thread",
        status: "waiting_approval",
        createdAt: "2026-04-09T00:00:30.000Z",
        updatedAt: "2026-04-09T00:01:30.000Z",
        startedAt: "2026-04-09T00:00:30.000Z",
        lastMessageAt: "2026-04-09T00:01:00.000Z",
        activeApprovalId: "apr_orphan",
        currentTurnId: "turn_orphan",
        pendingAssistantMessageId: null,
        appSessionOverlayState: "open",
      })
      .run();

    database.db
      .insert(approvals)
      .values({
        approvalId: "apr_orphan",
        sessionId: "thread_orphan",
        workspaceId: "ws_alpha",
        status: "pending",
        resolution: null,
        approvalCategory: "external_side_effect",
        summary: "Run git push",
        reason: "Codex requests permission to push changes to remote.",
        operationSummary: "git push origin main",
        context: null,
        createdAt: "2026-04-09T00:01:30.000Z",
        resolvedAt: null,
        nativeRequestKind: "approval",
      })
      .run();

    database.db
      .insert(sessions)
      .values({
        sessionId: "thread_001",
        workspaceId: "ws_alpha",
        title: "Resolved request thread",
        status: "waiting_input",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:01:00.000Z",
        startedAt: "2026-04-09T00:00:00.000Z",
        lastMessageAt: null,
        activeApprovalId: null,
        currentTurnId: null,
        pendingAssistantMessageId: null,
        appSessionOverlayState: "open",
      })
      .run();

    const orphanDetailResponse = await app.inject({
      method: "GET",
      url: "/api/v1/requests/apr_orphan",
    });

    expect(orphanDetailResponse.statusCode).toBe(200);
    expect(orphanDetailResponse.json()).toMatchObject({
      request_id: "apr_orphan",
      thread_id: "thread_orphan",
      status: "pending",
    });

    database.db
      .insert(approvals)
      .values({
        approvalId: "apr_001",
        sessionId: "thread_001",
        workspaceId: "ws_alpha",
        status: "approved",
        resolution: "approved",
        approvalCategory: "external_side_effect",
        summary: "Run git push",
        reason: "Codex requests permission to push changes to remote.",
        operationSummary: "git push origin main",
        context: null,
        createdAt: "2026-04-09T00:01:00.000Z",
        resolvedAt: "2026-04-09T00:02:00.000Z",
        nativeRequestKind: "approval",
      })
      .run();

    const resolvedResponse = await app.inject({
      method: "POST",
      url: "/api/v1/requests/apr_001/response",
      payload: {
        decision: "denied",
      },
    });

    expect(resolvedResponse.statusCode).toBe(409);
    expect(resolvedResponse.json()).toMatchObject({
      error: {
        code: "request_not_pending",
        details: {
          request_id: "apr_001",
          status: "approved",
        },
      },
    });

    app.runtimeServices.nativeSessionGateway.resolveApproval = async () => {
      throw new RuntimeError(404, "session_not_found", "session was not found", {
        session_id: "thread_orphan",
      });
    };

    const orphanResponse = await app.inject({
      method: "POST",
      url: "/api/v1/requests/apr_orphan/response",
      payload: {
        decision: "approved",
      },
    });

    expect(orphanResponse.statusCode).toBe(404);
    const orphanJson = orphanResponse.json();
    expect(orphanJson).toMatchObject({
      error: {
        code: "request_not_found",
        details: {
          request_id: "apr_orphan",
          thread_id: "thread_orphan",
        },
      },
    });
    expect(orphanJson.error.details).not.toHaveProperty("session_id");

    await app.close();
  });

  it("returns view, feed, and timeline helpers for an active thread", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("thread-routes-root");
    const database = await createTempDatabase("thread-routes-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const nativeSessionGateway = new StubNativeSessionGateway([], ["turn_001"]);

    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerBridgeEnabled: false,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
      services: {
        nativeSessionGateway,
      },
    });

    database.db
      .insert(workspaces)
      .values({
        workspaceId: "ws_alpha",
        workspaceName: "alpha",
        directoryName: "alpha",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:00:00.000Z",
      })
      .run();

    database.db
      .insert(sessions)
      .values({
        sessionId: "thread_001",
        workspaceId: "ws_alpha",
        title: "Existing thread",
        status: "waiting_input",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:01:00.000Z",
        startedAt: "2026-04-09T00:00:00.000Z",
        lastMessageAt: null,
        activeApprovalId: null,
        currentTurnId: null,
        pendingAssistantMessageId: null,
        appSessionOverlayState: "open",
      })
      .run();

    const inputResponse = await app.inject({
      method: "POST",
      url: "/api/v1/threads/thread_001/inputs",
      payload: {
        client_request_id: "req_followup_002",
        content: "Continue the runtime cutover",
      },
    });

    expect(inputResponse.statusCode).toBe(202);
    expect(nativeSessionGateway.sendUserMessages).toEqual([
      {
        sessionId: "thread_001",
        content: "Continue the runtime cutover",
      },
    ]);

    const persistedMessage = database.db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, "thread_001"))
      .all();
    expect(persistedMessage).toEqual([
      expect.objectContaining({
        sessionId: "thread_001",
        role: "user",
        content: "Continue the runtime cutover",
        clientMessageId: "req_followup_002",
      }),
    ]);

    const persistedThread = database.db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, "thread_001"))
      .limit(1)
      .all()[0];
    expect(persistedThread).toMatchObject({
      sessionId: "thread_001",
      status: "running",
      currentTurnId: "turn_001",
      lastMessageAt: expect.any(String),
    });

    const persistedWorkspace = database.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.workspaceId, "ws_alpha"))
      .limit(1)
      .all()[0];
    expect(persistedWorkspace.updatedAt).not.toBe("2026-04-09T00:00:00.000Z");

    const storedEvents = database.db
      .select()
      .from(sessionEvents)
      .where(eq(sessionEvents.sessionId, "thread_001"))
      .orderBy(sessionEvents.sequence)
      .all();
    expect(storedEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "message.user",
        }),
        expect.objectContaining({
          eventType: "session.status_changed",
          payload: JSON.stringify({
            from_status: "waiting_input",
            to_status: "running",
          }),
        }),
      ]),
    );

    const viewResponse = await app.inject({
      method: "GET",
      url: "/api/v1/threads/thread_001/view",
    });

    expect(viewResponse.statusCode).toBe(200);
    expect(viewResponse.json()).toMatchObject({
      thread: {
        thread_id: "thread_001",
      },
      pending_request: null,
      latest_resolved_request: null,
    });

    const feedResponse = await app.inject({
      method: "GET",
      url: "/api/v1/threads/thread_001/feed",
    });

    expect(feedResponse.statusCode).toBe(200);
    expect(feedResponse.json().items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          thread_id: "thread_001",
          event_type: "message.user",
        }),
      ]),
    );

    const timelineResponse = await app.inject({
      method: "GET",
      url: "/api/v1/threads/thread_001/timeline",
    });

    expect(timelineResponse.statusCode).toBe(200);
    expect(timelineResponse.json().items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          thread_id: "thread_001",
          item_kind: "message.user",
          summary: "user input accepted",
          content: "Continue the runtime cutover",
        }),
      ]),
    );

    await app.close();
  });

  it("preserves assistant completion content in the thread timeline", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("thread-routes-root");
    const database = await createTempDatabase("thread-routes-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerBridgeEnabled: false,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
    });

    database.db
      .insert(workspaces)
      .values({
        workspaceId: "ws_alpha",
        workspaceName: "alpha",
        directoryName: "alpha",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:00:00.000Z",
      })
      .run();

    database.db
      .insert(sessions)
      .values({
        sessionId: "thread_001",
        workspaceId: "ws_alpha",
        title: "Existing thread",
        status: "running",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:01:00.000Z",
        startedAt: "2026-04-09T00:00:00.000Z",
        lastMessageAt: "2026-04-09T00:00:30.000Z",
        activeApprovalId: null,
        currentTurnId: "turn_001",
        pendingAssistantMessageId: "msg_assistant_pending_001",
        appSessionOverlayState: "open",
      })
      .run();

    await app.runtimeServices.sessionService.applyAssistantMessageCompletion("thread_001", {
      turn_id: "turn_001",
      content: "Here is the explanation.",
    });

    const timelineResponse = await app.inject({
      method: "GET",
      url: "/api/v1/threads/thread_001/timeline",
    });

    expect(timelineResponse.statusCode).toBe(200);
    expect(timelineResponse.json().items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          thread_id: "thread_001",
          item_kind: "message.assistant.completed",
          summary: "assistant completed",
          content: "Here is the explanation.",
        }),
      ]),
    );

    await app.close();
  });

  it("converges a first-input-started thread after pre-ack assistant completion delivery", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("thread-routes-root");
    const database = await createTempDatabase("thread-routes-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerBridgeEnabled: true,
        appServerCommand: process.execPath,
        appServerArgs: [
          fileURLToPath(new URL("./fixtures/fake-codex-app-server.mjs", import.meta.url)),
          "--turn-start-mode=pre_ack_completion",
        ],
      },
      database,
    });

    const workspaceResponse = await app.inject({
      method: "POST",
      url: "/api/v1/workspaces",
      payload: {
        workspace_name: "alpha",
      },
    });

    expect(workspaceResponse.statusCode).toBe(201);
    const workspaceId = workspaceResponse.json().workspace_id as string;

    const startResponse = await app.inject({
      method: "POST",
      url: `/api/v1/workspaces/${workspaceId}/inputs`,
      payload: {
        client_request_id: "req_pre_ack_001",
        content: "Plan the runtime cutover",
      },
    });

    expect(startResponse.statusCode).toBe(202);
    const threadId = startResponse.json().thread.thread_id as string;

    await waitForAssertion(async () => {
      const persistedSession = database.db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionId, threadId))
        .limit(1)
        .all()[0];

      expect(persistedSession).toMatchObject({
        sessionId: threadId,
        status: "waiting_input",
        currentTurnId: null,
        pendingAssistantMessageId: null,
      });

      const threadResponse = await app.inject({
        method: "GET",
        url: `/api/v1/threads/${threadId}`,
      });
      expect(threadResponse.statusCode).toBe(200);
      expect(threadResponse.json()).toMatchObject({
        thread_id: threadId,
        native_status: {
          thread_status: "idle",
          latest_turn_status: "completed",
          active_flags: [],
        },
        derived_hints: {
          accepting_user_input: true,
          has_pending_request: false,
          blocked_reason: null,
        },
      });

      const viewResponse = await app.inject({
        method: "GET",
        url: `/api/v1/threads/${threadId}/view`,
      });
      expect(viewResponse.statusCode).toBe(200);
      expect(viewResponse.json()).toMatchObject({
        thread: {
          thread_id: threadId,
          native_status: {
            thread_status: "idle",
          },
          derived_hints: {
            accepting_user_input: true,
          },
        },
        pending_request: null,
      });

      const listResponse = await app.inject({
        method: "GET",
        url: `/api/v1/workspaces/${workspaceId}/threads`,
      });
      expect(listResponse.statusCode).toBe(200);
      expect(listResponse.json()).toMatchObject({
        items: [
          expect.objectContaining({
            thread_id: threadId,
            native_status: expect.objectContaining({
              thread_status: "idle",
            }),
            derived_hints: expect.objectContaining({
              accepting_user_input: true,
            }),
          }),
        ],
      });
      expect(listResponse.json().items).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            thread_id: threadId,
            native_status: expect.objectContaining({
              thread_status: "running",
            }),
          }),
        ]),
      );

      const storedMessages = database.db
        .select()
        .from(messages)
        .where(eq(messages.sessionId, threadId))
        .all();
      expect(storedMessages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: "user",
          }),
          expect.objectContaining({
            role: "assistant",
            content: "Synthetic assistant response for: Plan the runtime cutover",
          }),
        ]),
      );
    });

    const messageRows = database.db
      .select()
      .from(sessionEvents)
      .where(eq(sessionEvents.sessionId, threadId))
      .all();
    expect(messageRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "message.user",
        }),
        expect.objectContaining({
          eventType: "message.assistant.completed",
        }),
      ]),
    );

    const followUpResponse = await app.inject({
      method: "POST",
      url: `/api/v1/threads/${threadId}/inputs`,
      payload: {
        client_request_id: "req_pre_ack_followup_001",
        content: "Continue the runtime cutover",
      },
    });

    expect(followUpResponse.statusCode).toBe(202);
    expect(followUpResponse.json()).toMatchObject({
      thread: {
        thread_id: threadId,
      },
      accepted_input: {
        session_id: threadId,
        role: "user",
        content: "Continue the runtime cutover",
      },
    });

    await app.close();
  });

  it("opens thread and notification streams for v0.9 consumers", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("thread-routes-root");
    const database = await createTempDatabase("thread-routes-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
      services: {
        nativeSessionGateway: new StubNativeSessionGateway([], ["turn_stream_001"]),
      },
    });

    database.db
      .insert(workspaces)
      .values({
        workspaceId: "ws_alpha",
        workspaceName: "alpha",
        directoryName: "alpha",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:00:00.000Z",
      })
      .run();

    database.db
      .insert(sessions)
      .values({
        sessionId: "thread_001",
        workspaceId: "ws_alpha",
        title: "Existing thread",
        status: "waiting_input",
        createdAt: "2026-04-09T00:00:00.000Z",
        updatedAt: "2026-04-09T00:01:00.000Z",
        startedAt: "2026-04-09T00:00:00.000Z",
        lastMessageAt: null,
        activeApprovalId: null,
        currentTurnId: null,
        pendingAssistantMessageId: null,
        appSessionOverlayState: "open",
      })
      .run();

    await app.listen({ port: 0, host: "127.0.0.1" });

    const threadController = new AbortController();
    const threadStreamResponse = await fetch(
      `${resolveBaseUrl(app)}/api/v1/threads/thread_001/stream`,
      {
        signal: threadController.signal,
      },
    );

    expect(threadStreamResponse.status).toBe(200);
    expect(threadStreamResponse.headers.get("content-type")).toContain("text/event-stream");

    const nextThreadEvent = createSseReader(threadStreamResponse);

    const sendResponse = await app.inject({
      method: "POST",
      url: "/api/v1/threads/thread_001/inputs",
      payload: {
        client_request_id: "req_stream_001",
        content: "Explain the remaining runtime gaps",
      },
    });

    expect(sendResponse.statusCode).toBe(202);
    await expect(nextThreadEvent()).resolves.toMatchObject({
      session_id: "thread_001",
      event_type: "message.user",
    });

    const notificationController = new AbortController();
    const notificationResponse = await fetch(`${resolveBaseUrl(app)}/api/v1/notifications/stream`, {
      signal: notificationController.signal,
    });

    expect(notificationResponse.status).toBe(200);
    expect(notificationResponse.headers.get("content-type")).toContain("text/event-stream");

    const nextNotification = createSseReader(notificationResponse);

    database.db
      .update(sessions)
      .set({
        status: "running",
        updatedAt: "2026-04-09T00:02:00.000Z",
        currentTurnId: "turn_stream_approval_001",
      })
      .where(eq(sessions.sessionId, "thread_001"))
      .run();

    await app.runtimeServices.sessionService.ingestApprovalRequest("thread_001", {
      turn_id: "turn_stream_approval_001",
      approval_category: "external_side_effect",
      summary: "Run git push",
      reason: "Codex requests permission to push changes to remote.",
      native_request_kind: "approval",
    });

    await expect(nextNotification()).resolves.toMatchObject({
      thread_id: "thread_001",
      event_type: "approval.requested",
      high_priority: true,
    });

    threadController.abort();
    notificationController.abort();
    await app.close();
  });
});
