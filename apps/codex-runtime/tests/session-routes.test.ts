import fs from "node:fs/promises";
import path from "node:path";

import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import type { NativeSessionGateway } from "../src/domain/sessions/native-session-gateway.js";
import { approvals, sessions, workspaces } from "../src/db/schema.js";
import { createTempDatabase, createTempWorkspaceRoot } from "./helpers.js";

const cleanupPaths: string[] = [];

class StubNativeSessionGateway implements NativeSessionGateway {
  constructor(
    private readonly sessionIds: string[],
    private readonly turnIds: string[] = [],
    readonly interrupts: Array<{ sessionId: string; turnId: string }> = [],
    readonly sentMessages: Array<{ sessionId: string; content: string }> = [],
    readonly resolvedApprovals: Array<{
      sessionId: string;
      approvalId: string;
      resolution: "approved" | "denied";
    }> = [],
  ) {}

  async createSession() {
    const sessionId = this.sessionIds.shift();
    if (!sessionId) {
      throw new Error("no stub session id available");
    }

    return { sessionId };
  }

  async sendUserMessage(input: { sessionId: string; content: string }) {
    this.sentMessages.push(input);

    return {
      turnId:
        this.turnIds.shift() ?? `turn_${this.sentMessages.length.toString().padStart(3, "0")}`,
    };
  }

  async resolveApproval(input: {
    sessionId: string;
    approvalId: string;
    resolution: "approved" | "denied";
  }) {
    this.resolvedApprovals.push(input);
  }

  async interruptSessionTurn(input: { sessionId: string; turnId: string }) {
    this.interrupts.push(input);
  }
}

function seedWaitingInputSession(
  database: Awaited<ReturnType<typeof createTempDatabase>>,
  options: {
    workspaceId?: string;
    sessionId?: string;
    title?: string;
    activeSessionId?: string | null;
  } = {},
) {
  const workspaceId = options.workspaceId ?? "ws_alpha";
  const sessionId = options.sessionId ?? "thread_001";
  const now = "2026-04-04T12:00:00.000Z";

  database.db
    .insert(workspaces)
    .values({
      workspaceId,
      workspaceName: "alpha",
      directoryName: "alpha",
      createdAt: now,
      updatedAt: now,
      activeSessionId: options.activeSessionId ?? sessionId,
      pendingApprovalCount: 0,
    })
    .run();

  database.db
    .insert(sessions)
    .values({
      sessionId,
      workspaceId,
      title: options.title ?? "Fix build error",
      status: "waiting_input",
      createdAt: now,
      updatedAt: now,
      startedAt: now,
      lastMessageAt: null,
      activeApprovalId: null,
      currentTurnId: null,
      appSessionOverlayState: "open",
    })
    .run();

  return { workspaceId, sessionId };
}

function seedWaitingApprovalMismatchSession(
  database: Awaited<ReturnType<typeof createTempDatabase>>,
  options: {
    workspaceId?: string;
    sessionId?: string;
    activeApprovalId?: string | null;
    approvalStatus?: "pending" | "approved" | "denied" | "canceled";
    approvalResolution?: "approved" | "denied" | "canceled" | null;
    insertApproval?: boolean;
    pendingApprovalId?: string | null;
  } = {},
) {
  const workspaceId = options.workspaceId ?? "ws_alpha";
  const sessionId = options.sessionId ?? "thread_001";
  const activeApprovalId =
    Object.prototype.hasOwnProperty.call(options, "activeApprovalId")
      ? (options.activeApprovalId ?? null)
      : "apr_stale";
  const now = "2026-04-04T12:00:00.000Z";

  database.db
    .insert(workspaces)
    .values({
      workspaceId,
      workspaceName: "alpha",
      directoryName: "alpha",
      createdAt: now,
      updatedAt: now,
      activeSessionId: sessionId,
      pendingApprovalCount: 1,
    })
    .run();

  database.db
    .insert(sessions)
    .values({
      sessionId,
      workspaceId,
      title: "Fix build error",
      status: "waiting_approval",
      createdAt: now,
      updatedAt: now,
      startedAt: now,
      lastMessageAt: now,
      activeApprovalId,
      currentTurnId: "turn_001",
      pendingAssistantMessageId: null,
      appSessionOverlayState: "open",
    })
    .run();

  if (options.insertApproval ?? true) {
    database.db
      .insert(approvals)
      .values({
        approvalId: activeApprovalId ?? "apr_stale",
        sessionId,
        workspaceId,
        status: options.approvalStatus ?? "denied",
        resolution: options.approvalResolution ?? "denied",
        approvalCategory: "external_side_effect",
        summary: "Run git push",
        reason: "Codex requests permission to push changes to remote.",
        operationSummary: null,
        context: null,
        createdAt: now,
        resolvedAt: now,
        nativeRequestKind: "approval_request",
      })
      .run();
  }

  if (options.pendingApprovalId) {
    database.db
      .insert(approvals)
      .values({
        approvalId: options.pendingApprovalId,
        sessionId,
        workspaceId,
        status: "pending",
        resolution: null,
        approvalCategory: "external_side_effect",
        summary: "Run git push",
        reason: "Codex requests permission to push changes to remote.",
        operationSummary: null,
        context: null,
        createdAt: "2026-04-04T12:01:00.000Z",
        resolvedAt: null,
        nativeRequestKind: "approval_request",
      })
      .run();
  }

  return { workspaceId, sessionId, activeApprovalId };
}

function seedWorkspaceActiveSessionMismatch(
  database: Awaited<ReturnType<typeof createTempDatabase>>,
  options: {
    workspaceId?: string;
    staleSessionId?: string | null;
    activeSessionId?: string;
    activeSessionStatus?: "running" | "waiting_approval";
  } = {},
) {
  const workspaceId = options.workspaceId ?? "ws_alpha";
  const staleSessionId =
    Object.prototype.hasOwnProperty.call(options, "staleSessionId")
      ? (options.staleSessionId ?? null)
      : "thread_stale";
  const activeSessionId = options.activeSessionId ?? "thread_active";
  const now = "2026-04-04T12:00:00.000Z";

  database.db
    .insert(workspaces)
    .values({
      workspaceId,
      workspaceName: "alpha",
      directoryName: "alpha",
      createdAt: now,
      updatedAt: now,
      activeSessionId: staleSessionId,
      pendingApprovalCount: 0,
    })
    .run();

  if (staleSessionId) {
    database.db
      .insert(sessions)
      .values({
        sessionId: staleSessionId,
        workspaceId,
        title: "Stale session",
        status: "waiting_input",
        createdAt: now,
        updatedAt: now,
        startedAt: now,
        lastMessageAt: now,
        activeApprovalId: null,
        currentTurnId: null,
        pendingAssistantMessageId: null,
        appSessionOverlayState: "open",
      })
      .run();
  }

  database.db
    .insert(sessions)
    .values({
      sessionId: activeSessionId,
      workspaceId,
      title: "Active session",
      status: options.activeSessionStatus ?? "running",
      createdAt: now,
      updatedAt: "2026-04-04T12:01:00.000Z",
      startedAt: now,
      lastMessageAt: now,
      activeApprovalId: null,
      currentTurnId: "turn_001",
      pendingAssistantMessageId: null,
      appSessionOverlayState: "open",
    })
    .run();

  return { workspaceId, activeSessionId };
}

async function listSessionEvents(
  app: Awaited<ReturnType<typeof buildApp>>,
  sessionId: string,
  query = "",
) {
  const response = await app.inject({
    method: "GET",
    url: `/api/v1/sessions/${sessionId}/events${query}`,
  });

  expect(response.statusCode).toBe(200);
  return response.json();
}

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

afterEach(async () => {
  await Promise.all(
    cleanupPaths.splice(0).map((entryPath) =>
      fs.rm(entryPath, { recursive: true, force: true }),
    ),
  );
});

describe("session routes", () => {
  it("creates, lists, and reads persisted sessions", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const nativeSessionGateway = new StubNativeSessionGateway(["thread_001"]);
    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
      services: {
        nativeSessionGateway,
      },
    });

    const workspaceResponse = await app.inject({
      method: "POST",
      url: "/api/v1/workspaces",
      payload: {
        workspace_name: "alpha",
      },
    });
    const workspace = workspaceResponse.json();

    const createResponse = await app.inject({
      method: "POST",
      url: `/api/v1/workspaces/${workspace.workspace_id}/sessions`,
      payload: {
        title: "Fix build error",
      },
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toEqual({
      session_id: "thread_001",
      workspace_id: workspace.workspace_id,
      title: "Fix build error",
      status: "created",
      created_at: expect.any(String),
      updated_at: expect.any(String),
      started_at: null,
      last_message_at: null,
      active_approval_id: null,
      current_turn_id: null,
      app_session_overlay_state: "open",
    });

    const listResponse = await app.inject({
      method: "GET",
      url: `/api/v1/workspaces/${workspace.workspace_id}/sessions`,
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({
      has_more: false,
      next_cursor: null,
      items: [
        {
          session_id: "thread_001",
          workspace_id: workspace.workspace_id,
          title: "Fix build error",
          status: "created",
        },
      ],
    });

    const getResponse = await app.inject({
      method: "GET",
      url: "/api/v1/sessions/thread_001",
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toMatchObject({
      session_id: "thread_001",
      workspace_id: workspace.workspace_id,
      title: "Fix build error",
      status: "created",
    });

    await app.close();
  });

  it("starts and stops sessions while enforcing one active session per workspace", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const nativeSessionGateway = new StubNativeSessionGateway([
      "thread_001",
      "thread_002",
    ]);
    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
      services: {
        nativeSessionGateway,
      },
    });

    const workspaceResponse = await app.inject({
      method: "POST",
      url: "/api/v1/workspaces",
      payload: {
        workspace_name: "alpha",
      },
    });
    const workspace = workspaceResponse.json();

    for (const sessionId of ["thread_001", "thread_002"]) {
      const response = await app.inject({
        method: "POST",
        url: `/api/v1/workspaces/${workspace.workspace_id}/sessions`,
        payload: {
          title: `Session ${sessionId}`,
        },
      });

      expect(response.statusCode).toBe(201);
    }

    const startFirst = await app.inject({
      method: "POST",
      url: "/api/v1/sessions/thread_001/start",
      payload: {},
    });

    expect(startFirst.statusCode).toBe(200);
    expect(startFirst.json()).toMatchObject({
      session_id: "thread_001",
      status: "running",
      started_at: expect.any(String),
    });

    const workspaceAfterStart = await app.inject({
      method: "GET",
      url: `/api/v1/workspaces/${workspace.workspace_id}`,
    });

    expect(workspaceAfterStart.statusCode).toBe(200);
    expect(workspaceAfterStart.json()).toMatchObject({
      active_session_id: "thread_001",
      active_session_summary: {
        session_id: "thread_001",
        status: "running",
        last_message_at: null,
      },
    });

    const conflictingStart = await app.inject({
      method: "POST",
      url: "/api/v1/sessions/thread_002/start",
      payload: {},
    });

    expect(conflictingStart.statusCode).toBe(409);
    expect(conflictingStart.json()).toEqual({
      error: {
        code: "session_conflict_active_exists",
        message: "another active session already exists in this workspace",
        details: {
          workspace_id: workspace.workspace_id,
          active_session_id: "thread_001",
        },
      },
    });

    const stopFirst = await app.inject({
      method: "POST",
      url: "/api/v1/sessions/thread_001/stop",
      payload: {},
    });

    expect(stopFirst.statusCode).toBe(200);
    expect(stopFirst.json()).toEqual({
      session: {
        session_id: "thread_001",
        workspace_id: workspace.workspace_id,
        title: "Session thread_001",
        status: "stopped",
        created_at: expect.any(String),
        updated_at: expect.any(String),
        started_at: expect.any(String),
        last_message_at: null,
        active_approval_id: null,
        current_turn_id: null,
        app_session_overlay_state: "closed",
      },
      canceled_approval: null,
    });

    const workspaceAfterStop = await app.inject({
      method: "GET",
      url: `/api/v1/workspaces/${workspace.workspace_id}`,
    });

    expect(workspaceAfterStop.statusCode).toBe(200);
    expect(workspaceAfterStop.json()).toMatchObject({
      active_session_id: null,
      active_session_summary: null,
    });

    const startSecond = await app.inject({
      method: "POST",
      url: "/api/v1/sessions/thread_002/start",
      payload: {},
    });

    expect(startSecond.statusCode).toBe(200);
    expect(startSecond.json()).toMatchObject({
      session_id: "thread_002",
      status: "running",
    });

    await app.close();
  });

  it("validates session titles and session state transitions", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const nativeSessionGateway = new StubNativeSessionGateway(["thread_001"]);
    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
      services: {
        nativeSessionGateway,
      },
    });

    const workspaceResponse = await app.inject({
      method: "POST",
      url: "/api/v1/workspaces",
      payload: {
        workspace_name: "alpha",
      },
    });
    const workspace = workspaceResponse.json();

    const invalidTitle = await app.inject({
      method: "POST",
      url: `/api/v1/workspaces/${workspace.workspace_id}/sessions`,
      payload: {
        title: "   ",
      },
    });

    expect(invalidTitle.statusCode).toBe(422);
    expect(invalidTitle.json()).toEqual({
      error: {
        code: "session_title_invalid",
        message: "session title must be 1-200 non-empty characters",
        details: {
          issues: expect.any(Array),
        },
      },
    });

    await app.inject({
      method: "POST",
      url: `/api/v1/workspaces/${workspace.workspace_id}/sessions`,
      payload: {
        title: "Fix build error",
      },
    });

    const stopCreated = await app.inject({
      method: "POST",
      url: "/api/v1/sessions/thread_001/stop",
      payload: {},
    });

    expect(stopCreated.statusCode).toBe(409);
    expect(stopCreated.json()).toEqual({
      error: {
        code: "session_invalid_state",
        message: "session is not stoppable",
        details: {
          session_id: "thread_001",
          status: "created",
        },
      },
    });

    await app.close();
  });

  it("accepts a message, keeps the session running, and lists projected user history", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const nativeSessionGateway = new StubNativeSessionGateway([], ["turn_001"]);
    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
      services: {
        nativeSessionGateway,
      },
    });

    const { sessionId } = seedWaitingInputSession(database);

    const sendResponse = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/messages`,
      payload: {
        client_message_id: "msgclient_001",
        content: "Please explain the diff.",
      },
    });

    expect(sendResponse.statusCode).toBe(202);
    expect(sendResponse.json()).toEqual({
      message_id: expect.stringMatching(/^msg_user_/),
      session_id: sessionId,
      role: "user",
      content: "Please explain the diff.",
      created_at: expect.any(String),
      source_item_type: "user_message",
    });
    expect(nativeSessionGateway.sentMessages).toEqual([
      {
        sessionId,
        content: "Please explain the diff.",
      },
    ]);

    const sessionResponse = await app.inject({
      method: "GET",
      url: `/api/v1/sessions/${sessionId}`,
    });

    expect(sessionResponse.statusCode).toBe(200);
    expect(sessionResponse.json()).toMatchObject({
      session_id: sessionId,
      status: "running",
      current_turn_id: "turn_001",
      last_message_at: expect.any(String),
    });

    const workspaceResponse = await app.inject({
      method: "GET",
      url: "/api/v1/workspaces/ws_alpha",
    });

    expect(workspaceResponse.statusCode).toBe(200);
    expect(workspaceResponse.json()).toMatchObject({
      active_session_id: sessionId,
      active_session_summary: {
        session_id: sessionId,
        status: "running",
      },
    });

    const listResponse = await app.inject({
      method: "GET",
      url: `/api/v1/sessions/${sessionId}/messages`,
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toEqual({
      items: [
        {
          message_id: expect.stringMatching(/^msg_user_/),
          session_id: sessionId,
          role: "user",
          content: "Please explain the diff.",
          created_at: expect.any(String),
          source_item_type: "user_message",
        },
      ],
      next_cursor: null,
      has_more: false,
    });

    await app.close();
  });

  it("ingests assistant delta and completed events with a stable assistant message id", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const nativeSessionGateway = new StubNativeSessionGateway([], ["turn_001"]);
    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
      services: {
        nativeSessionGateway,
      },
    });

    const { sessionId } = seedWaitingInputSession(database);

    const sendResponse = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/messages`,
      payload: {
        client_message_id: "msgclient_001",
        content: "Please explain the diff.",
      },
    });

    const deltaResponse = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/assistant-events`,
      payload: {
        event_type: "message.assistant.delta",
        turn_id: "turn_001",
        delta: "I checked the diff",
      },
    });

    expect(deltaResponse.statusCode).toBe(202);
    expect(deltaResponse.json()).toEqual({
      message_id: expect.stringMatching(/^msg_assistant_/),
      session_id: sessionId,
      event_type: "message.assistant.delta",
      turn_id: "turn_001",
      delta: "I checked the diff",
    });

    const assistantMessageResponse = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/assistant-events`,
      payload: {
        event_type: "message.assistant.completed",
        turn_id: "turn_001",
        content: "I checked the diff and summarized the changes.",
      },
    });

    const assistantMessage = assistantMessageResponse.json();

    expect(assistantMessageResponse.statusCode).toBe(202);
    expect(assistantMessage).toEqual({
      message_id: deltaResponse.json().message_id,
      session_id: sessionId,
      role: "assistant",
      content: "I checked the diff and summarized the changes.",
      created_at: expect.any(String),
      source_item_type: "agent_message",
    });

    const sessionResponse = await app.inject({
      method: "GET",
      url: `/api/v1/sessions/${sessionId}`,
    });

    expect(sessionResponse.statusCode).toBe(200);
    expect(sessionResponse.json()).toMatchObject({
      session_id: sessionId,
      status: "waiting_input",
      current_turn_id: null,
      last_message_at: assistantMessage.created_at,
    });

    const workspaceResponse = await app.inject({
      method: "GET",
      url: "/api/v1/workspaces/ws_alpha",
    });

    expect(workspaceResponse.statusCode).toBe(200);
    expect(workspaceResponse.json()).toMatchObject({
      active_session_id: null,
      active_session_summary: null,
    });

    const listResponse = await app.inject({
      method: "GET",
      url: `/api/v1/sessions/${sessionId}/messages`,
    });

    const expectedItems = [sendResponse.json(), assistantMessage].sort((left, right) => {
      if (left.created_at === right.created_at) {
        return left.message_id.localeCompare(right.message_id);
      }

      return left.created_at.localeCompare(right.created_at);
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toEqual({
      items: expectedItems,
      next_cursor: null,
      has_more: false,
    });

    const eventsResponse = await app.inject({
      method: "GET",
      url: `/api/v1/sessions/${sessionId}/events`,
    });

    expect(eventsResponse.statusCode).toBe(200);
    expect(eventsResponse.json()).toEqual({
      items: [
        {
          event_id: expect.stringMatching(/^evt_/),
          session_id: sessionId,
          event_type: "message.user",
          sequence: 1,
          occurred_at: sendResponse.json().created_at,
          payload: {
            message_id: sendResponse.json().message_id,
            content: "Please explain the diff.",
          },
          native_event_name: null,
        },
        {
          event_id: expect.stringMatching(/^evt_/),
          session_id: sessionId,
          event_type: "session.status_changed",
          sequence: 2,
          occurred_at: sendResponse.json().created_at,
          payload: {
            from_status: "waiting_input",
            to_status: "running",
          },
          native_event_name: null,
        },
        {
          event_id: expect.stringMatching(/^evt_/),
          session_id: sessionId,
          event_type: "message.assistant.delta",
          sequence: 3,
          occurred_at: expect.any(String),
          payload: {
            message_id: deltaResponse.json().message_id,
            turn_id: "turn_001",
            delta: "I checked the diff",
          },
          native_event_name: "item/agent_message/delta",
        },
        {
          event_id: expect.stringMatching(/^evt_/),
          session_id: sessionId,
          event_type: "message.assistant.completed",
          sequence: 4,
          occurred_at: assistantMessage.created_at,
          payload: {
            message_id: deltaResponse.json().message_id,
            turn_id: "turn_001",
            content: "I checked the diff and summarized the changes.",
          },
          native_event_name: "item/agent_message/completed",
        },
        {
          event_id: expect.stringMatching(/^evt_/),
          session_id: sessionId,
          event_type: "session.status_changed",
          sequence: 5,
          occurred_at: assistantMessage.created_at,
          payload: {
            from_status: "running",
            to_status: "waiting_input",
          },
          native_event_name: null,
        },
      ],
      next_cursor: null,
      has_more: false,
    });

    const reversedEventsResponse = await app.inject({
      method: "GET",
      url: `/api/v1/sessions/${sessionId}/events?sort=-occurred_at&limit=2`,
    });

    expect(reversedEventsResponse.statusCode).toBe(200);
    expect(reversedEventsResponse.json()).toEqual({
      items: [
        {
          event_id: expect.any(String),
          session_id: sessionId,
          event_type: "session.status_changed",
          sequence: 5,
          occurred_at: assistantMessage.created_at,
          payload: {
            from_status: "running",
            to_status: "waiting_input",
          },
          native_event_name: null,
        },
        {
          event_id: expect.any(String),
          session_id: sessionId,
          event_type: "message.assistant.completed",
          sequence: 4,
          occurred_at: assistantMessage.created_at,
          payload: {
            message_id: deltaResponse.json().message_id,
            turn_id: "turn_001",
            content: "I checked the diff and summarized the changes.",
          },
          native_event_name: "item/agent_message/completed",
        },
      ],
      next_cursor: null,
      has_more: false,
    });

    await app.close();
  });

  it("opens the session stream route and publishes canonical session events", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const nativeSessionGateway = new StubNativeSessionGateway([], ["turn_001"]);
    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
      services: {
        nativeSessionGateway,
      },
    });

    const { sessionId } = seedWaitingInputSession(database);
    await app.listen({ port: 0, host: "127.0.0.1" });

    const controller = new AbortController();
    const response = await fetch(`${resolveBaseUrl(app)}/api/v1/sessions/${sessionId}/stream`, {
      signal: controller.signal,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");

    const nextEvent = createSseReader(response);

    const sendResponse = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/messages`,
      payload: {
        client_message_id: "msgclient_stream_001",
        content: "Please explain the diff.",
      },
    });

    expect(sendResponse.statusCode).toBe(202);
    await expect(nextEvent()).resolves.toMatchObject({
      session_id: sessionId,
      event_type: "message.user",
      payload: {
        message_id: sendResponse.json().message_id,
        content: "Please explain the diff.",
      },
    });

    controller.abort();
    await app.close();
  });

  it("rejects assistant events when the session is not running", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
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
        nativeSessionGateway: new StubNativeSessionGateway([]),
      },
    });

    const { sessionId } = seedWaitingInputSession(database);

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/assistant-events`,
      payload: {
        event_type: "message.assistant.delta",
        turn_id: "turn_001",
        delta: "I checked the diff",
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: {
        code: "session_invalid_state",
        message: "session is not ready to ingest assistant events",
        details: {
          session_id: sessionId,
          current_status: "waiting_input",
          current_turn_id: null,
          requested_turn_id: "turn_001",
        },
      },
    });

    await app.close();
  });

  it("rejects assistant events when the incoming turn does not match the active turn", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
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
        nativeSessionGateway: new StubNativeSessionGateway([], ["turn_001"]),
      },
    });

    const { sessionId } = seedWaitingInputSession(database);

    await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/messages`,
      payload: {
        client_message_id: "msgclient_001",
        content: "Please explain the diff.",
      },
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/assistant-events`,
      payload: {
        event_type: "message.assistant.completed",
        turn_id: "turn_999",
        content: "I checked the diff and summarized the changes.",
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: {
        code: "session_invalid_state",
        message: "session is not ready to ingest assistant events",
        details: {
          session_id: sessionId,
          current_status: "running",
          current_turn_id: "turn_001",
          requested_turn_id: "turn_999",
        },
      },
    });

    await app.close();
  });

  it("ingests approval requests and exposes approval projections", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const nativeSessionGateway = new StubNativeSessionGateway([], ["turn_001"]);
    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
      services: {
        nativeSessionGateway,
      },
    });

    const { sessionId } = seedWaitingInputSession(database);

    await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/messages`,
      payload: {
        client_message_id: "msgclient_001",
        content: "Please explain the diff.",
      },
    });

    const ingestResponse = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/approval-requests`,
      payload: {
        turn_id: "turn_001",
        approval_category: "external_side_effect",
        summary: "Run git push",
        reason: "Codex requests permission to push changes to remote.",
        operation_summary: "git push origin main",
        context: {
          command: "git push origin main",
        },
        native_request_kind: "approval_request",
      },
    });

    const approval = ingestResponse.json();

    expect(ingestResponse.statusCode).toBe(202);
    expect(approval).toEqual({
      approval_id: expect.stringMatching(/^apr_/),
      session_id: sessionId,
      workspace_id: "ws_alpha",
      status: "pending",
      resolution: null,
      approval_category: "external_side_effect",
      summary: "Run git push",
      reason: "Codex requests permission to push changes to remote.",
      operation_summary: "git push origin main",
      context: {
        command: "git push origin main",
      },
      created_at: expect.any(String),
      resolved_at: null,
      native_request_kind: "approval_request",
    });

    const sessionResponse = await app.inject({
      method: "GET",
      url: `/api/v1/sessions/${sessionId}`,
    });

    expect(sessionResponse.statusCode).toBe(200);
    expect(sessionResponse.json()).toMatchObject({
      session_id: sessionId,
      status: "waiting_approval",
      active_approval_id: approval.approval_id,
      current_turn_id: "turn_001",
    });

    const workspaceResponse = await app.inject({
      method: "GET",
      url: "/api/v1/workspaces/ws_alpha",
    });

    expect(workspaceResponse.statusCode).toBe(200);
    expect(workspaceResponse.json()).toMatchObject({
      active_session_id: sessionId,
      pending_approval_count: 1,
      active_session_summary: {
        session_id: sessionId,
        status: "waiting_approval",
      },
    });

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/v1/approvals",
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toEqual({
      items: [approval],
      next_cursor: null,
      has_more: false,
    });

    const detailResponse = await app.inject({
      method: "GET",
      url: `/api/v1/approvals/${approval.approval_id}`,
    });

    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json()).toEqual(approval);

    const summaryResponse = await app.inject({
      method: "GET",
      url: "/api/v1/approvals/summary",
    });

    expect(summaryResponse.statusCode).toBe(200);
    expect(summaryResponse.json()).toEqual({
      pending_approval_count: 1,
      updated_at: approval.created_at,
    });

    expect(await listSessionEvents(app, sessionId, "?sort=-occurred_at&limit=2")).toEqual({
      items: [
        {
          event_id: expect.any(String),
          session_id: sessionId,
          event_type: "session.status_changed",
          sequence: 4,
          occurred_at: approval.created_at,
          payload: {
            from_status: "running",
            to_status: "waiting_approval",
          },
          native_event_name: null,
        },
        {
          event_id: expect.any(String),
          session_id: sessionId,
          event_type: "approval.requested",
          sequence: 3,
          occurred_at: approval.created_at,
          payload: {
            approval_id: approval.approval_id,
            workspace_id: "ws_alpha",
            approval_category: "external_side_effect",
            summary: "Run git push",
          },
          native_event_name: "request/started",
        },
      ],
      next_cursor: null,
      has_more: false,
    });

    await app.close();
  });

  it("cancels a pending approval when the session is stopped", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const nativeSessionGateway = new StubNativeSessionGateway([], ["turn_001"]);
    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
      services: {
        nativeSessionGateway,
      },
    });

    const { sessionId } = seedWaitingInputSession(database);

    await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/messages`,
      payload: {
        client_message_id: "msgclient_001",
        content: "Please explain the diff.",
      },
    });

    const approvalResponse = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/approval-requests`,
      payload: {
        turn_id: "turn_001",
        approval_category: "external_side_effect",
        summary: "Run git push",
        reason: "Codex requests permission to push changes to remote.",
        native_request_kind: "approval_request",
      },
    });

    const approval = approvalResponse.json();

    const stopResponse = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/stop`,
      payload: {},
    });

    expect(stopResponse.statusCode).toBe(200);
    expect(stopResponse.json()).toEqual({
      session: {
        session_id: sessionId,
        workspace_id: "ws_alpha",
        title: "Fix build error",
        status: "stopped",
        created_at: expect.any(String),
        updated_at: expect.any(String),
        started_at: expect.any(String),
        last_message_at: expect.any(String),
        active_approval_id: null,
        current_turn_id: null,
        app_session_overlay_state: "closed",
      },
      canceled_approval: {
        ...approval,
        status: "canceled",
        resolution: "canceled",
        resolved_at: expect.any(String),
      },
    });

    const workspaceResponse = await app.inject({
      method: "GET",
      url: "/api/v1/workspaces/ws_alpha",
    });

    expect(workspaceResponse.statusCode).toBe(200);
    expect(workspaceResponse.json()).toMatchObject({
      active_session_id: null,
      pending_approval_count: 0,
      active_session_summary: null,
    });

    const detailResponse = await app.inject({
      method: "GET",
      url: `/api/v1/approvals/${approval.approval_id}`,
    });

    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json()).toMatchObject({
      approval_id: approval.approval_id,
      status: "canceled",
      resolution: "canceled",
      resolved_at: expect.any(String),
    });

    expect(await listSessionEvents(app, sessionId, "?sort=-occurred_at&limit=2")).toEqual({
      items: [
        {
          event_id: expect.any(String),
          session_id: sessionId,
          event_type: "session.status_changed",
          sequence: 6,
          occurred_at: stopResponse.json().session.updated_at,
          payload: {
            from_status: "waiting_approval",
            to_status: "stopped",
          },
          native_event_name: null,
        },
        {
          event_id: expect.any(String),
          session_id: sessionId,
          event_type: "approval.resolved",
          sequence: 5,
          occurred_at: stopResponse.json().session.updated_at,
          payload: {
            approval_id: approval.approval_id,
            workspace_id: "ws_alpha",
            approval_category: "external_side_effect",
            summary: "Run git push",
            resolution: "canceled",
          },
          native_event_name: null,
        },
      ],
      next_cursor: null,
      has_more: false,
    });

    await app.close();
  });

  it("resolves approvals with approved and keeps the session running", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const nativeSessionGateway = new StubNativeSessionGateway([], ["turn_001"]);
    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
      services: {
        nativeSessionGateway,
      },
    });

    const { sessionId } = seedWaitingInputSession(database);

    await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/messages`,
      payload: {
        client_message_id: "msgclient_001",
        content: "Please explain the diff.",
      },
    });

    const approvalResponse = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/approval-requests`,
      payload: {
        turn_id: "turn_001",
        approval_category: "external_side_effect",
        summary: "Run git push",
        reason: "Codex requests permission to push changes to remote.",
        native_request_kind: "approval_request",
      },
    });

    const approval = approvalResponse.json();

    const resolveResponse = await app.inject({
      method: "POST",
      url: `/api/v1/approvals/${approval.approval_id}/resolve`,
      payload: {
        resolution: "approved",
      },
    });

    expect(resolveResponse.statusCode).toBe(200);
    expect(resolveResponse.json()).toEqual({
      approval: {
        ...approval,
        status: "approved",
        resolution: "approved",
        resolved_at: expect.any(String),
      },
      session: {
        session_id: sessionId,
        workspace_id: "ws_alpha",
        title: "Fix build error",
        status: "running",
        created_at: expect.any(String),
        updated_at: expect.any(String),
        started_at: expect.any(String),
        last_message_at: expect.any(String),
        active_approval_id: null,
        current_turn_id: "turn_001",
        app_session_overlay_state: "open",
      },
    });
    expect(nativeSessionGateway.resolvedApprovals).toEqual([
      {
        sessionId,
        approvalId: approval.approval_id,
        resolution: "approved",
      },
    ]);

    const workspaceResponse = await app.inject({
      method: "GET",
      url: "/api/v1/workspaces/ws_alpha",
    });

    expect(workspaceResponse.statusCode).toBe(200);
    expect(workspaceResponse.json()).toMatchObject({
      active_session_id: sessionId,
      pending_approval_count: 0,
      active_session_summary: {
        session_id: sessionId,
        status: "running",
      },
    });

    expect(await listSessionEvents(app, sessionId, "?sort=-occurred_at&limit=2")).toEqual({
      items: [
        {
          event_id: expect.any(String),
          session_id: sessionId,
          event_type: "session.status_changed",
          sequence: 6,
          occurred_at: resolveResponse.json().session.updated_at,
          payload: {
            from_status: "waiting_approval",
            to_status: "running",
          },
          native_event_name: null,
        },
        {
          event_id: expect.any(String),
          session_id: sessionId,
          event_type: "approval.resolved",
          sequence: 5,
          occurred_at: resolveResponse.json().session.updated_at,
          payload: {
            approval_id: approval.approval_id,
            workspace_id: "ws_alpha",
            approval_category: "external_side_effect",
            summary: "Run git push",
            resolution: "approved",
          },
          native_event_name: null,
        },
      ],
      next_cursor: null,
      has_more: false,
    });

    await app.close();
  });

  it("resolves approvals with denied and returns the session to waiting_input", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const nativeSessionGateway = new StubNativeSessionGateway([], ["turn_001"]);
    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
      services: {
        nativeSessionGateway,
      },
    });

    const { sessionId } = seedWaitingInputSession(database);

    await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/messages`,
      payload: {
        client_message_id: "msgclient_001",
        content: "Please explain the diff.",
      },
    });

    const approvalResponse = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/approval-requests`,
      payload: {
        turn_id: "turn_001",
        approval_category: "external_side_effect",
        summary: "Run git push",
        reason: "Codex requests permission to push changes to remote.",
        native_request_kind: "approval_request",
      },
    });

    const approval = approvalResponse.json();

    const resolveResponse = await app.inject({
      method: "POST",
      url: `/api/v1/approvals/${approval.approval_id}/resolve`,
      payload: {
        resolution: "denied",
      },
    });

    expect(resolveResponse.statusCode).toBe(200);
    expect(resolveResponse.json()).toEqual({
      approval: {
        ...approval,
        status: "denied",
        resolution: "denied",
        resolved_at: expect.any(String),
      },
      session: {
        session_id: sessionId,
        workspace_id: "ws_alpha",
        title: "Fix build error",
        status: "waiting_input",
        created_at: expect.any(String),
        updated_at: expect.any(String),
        started_at: expect.any(String),
        last_message_at: expect.any(String),
        active_approval_id: null,
        current_turn_id: null,
        app_session_overlay_state: "open",
      },
    });
    expect(nativeSessionGateway.resolvedApprovals).toEqual([
      {
        sessionId,
        approvalId: approval.approval_id,
        resolution: "denied",
      },
    ]);

    const workspaceResponse = await app.inject({
      method: "GET",
      url: "/api/v1/workspaces/ws_alpha",
    });

    expect(workspaceResponse.statusCode).toBe(200);
    expect(workspaceResponse.json()).toMatchObject({
      active_session_id: null,
      pending_approval_count: 0,
      active_session_summary: null,
    });

    expect(await listSessionEvents(app, sessionId, "?sort=-occurred_at&limit=2")).toEqual({
      items: [
        {
          event_id: expect.any(String),
          session_id: sessionId,
          event_type: "session.status_changed",
          sequence: 6,
          occurred_at: resolveResponse.json().session.updated_at,
          payload: {
            from_status: "waiting_approval",
            to_status: "waiting_input",
          },
          native_event_name: null,
        },
        {
          event_id: expect.any(String),
          session_id: sessionId,
          event_type: "approval.resolved",
          sequence: 5,
          occurred_at: resolveResponse.json().session.updated_at,
          payload: {
            approval_id: approval.approval_id,
            workspace_id: "ws_alpha",
            approval_category: "external_side_effect",
            summary: "Run git push",
            resolution: "denied",
          },
          native_event_name: null,
        },
      ],
      next_cursor: null,
      has_more: false,
    });

    await app.close();
  });

  it("returns idempotent success for the same approval resolution and rejects later changes", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const nativeSessionGateway = new StubNativeSessionGateway([], ["turn_001"]);
    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
      services: {
        nativeSessionGateway,
      },
    });

    const { sessionId } = seedWaitingInputSession(database);

    await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/messages`,
      payload: {
        client_message_id: "msgclient_001",
        content: "Please explain the diff.",
      },
    });

    const approvalResponse = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/approval-requests`,
      payload: {
        turn_id: "turn_001",
        approval_category: "external_side_effect",
        summary: "Run git push",
        reason: "Codex requests permission to push changes to remote.",
        native_request_kind: "approval_request",
      },
    });

    const approval = approvalResponse.json();

    const firstResolve = await app.inject({
      method: "POST",
      url: `/api/v1/approvals/${approval.approval_id}/resolve`,
      payload: {
        resolution: "approved",
      },
    });
    const idempotentResolve = await app.inject({
      method: "POST",
      url: `/api/v1/approvals/${approval.approval_id}/resolve`,
      payload: {
        resolution: "approved",
      },
    });
    const conflictingResolve = await app.inject({
      method: "POST",
      url: `/api/v1/approvals/${approval.approval_id}/resolve`,
      payload: {
        resolution: "denied",
      },
    });

    expect(firstResolve.statusCode).toBe(200);
    expect(idempotentResolve.statusCode).toBe(200);
    expect(idempotentResolve.json()).toEqual(firstResolve.json());
    expect(conflictingResolve.statusCode).toBe(409);
    expect(conflictingResolve.json()).toEqual({
      error: {
        code: "approval_not_pending",
        message: "approval is not pending",
        details: {
          approval_id: approval.approval_id,
          status: "approved",
        },
      },
    });

    await app.close();
  });

  it("opens the approvals stream route and publishes approval events", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const nativeSessionGateway = new StubNativeSessionGateway([], ["turn_001"]);
    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
      services: {
        nativeSessionGateway,
      },
    });

    const { sessionId } = seedWaitingInputSession(database);
    await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/messages`,
      payload: {
        client_message_id: "msgclient_approval_stream_001",
        content: "Please explain the diff.",
      },
    });

    await app.listen({ port: 0, host: "127.0.0.1" });

    const controller = new AbortController();
    const response = await fetch(`${resolveBaseUrl(app)}/api/v1/approvals/stream`, {
      signal: controller.signal,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");

    const nextEvent = createSseReader(response);

    const approvalResponse = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/approval-requests`,
      payload: {
        turn_id: "turn_001",
        approval_category: "external_side_effect",
        summary: "Run git push",
        reason: "Codex requests permission to push changes to remote.",
        native_request_kind: "approval_request",
      },
    });

    expect(approvalResponse.statusCode).toBe(202);
    await expect(nextEvent()).resolves.toMatchObject({
      session_id: sessionId,
      event_type: "approval.requested",
      payload: {
        approval_id: approvalResponse.json().approval_id,
        workspace_id: "ws_alpha",
        approval_category: "external_side_effect",
        summary: "Run git push",
      },
      native_event_name: "request/started",
    });

    controller.abort();
    await app.close();
  });

  it("surfaces resolved approval mismatches as recovery_pending and reconciles them", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
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
        nativeSessionGateway: new StubNativeSessionGateway([]),
      },
    });

    const { sessionId, activeApprovalId } = seedWaitingApprovalMismatchSession(database, {
      approvalStatus: "denied",
      approvalResolution: "denied",
    });

    const getResponse = await app.inject({
      method: "GET",
      url: `/api/v1/sessions/${sessionId}`,
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toMatchObject({
      session_id: sessionId,
      status: "waiting_approval",
      active_approval_id: activeApprovalId,
      app_session_overlay_state: "recovery_pending",
    });

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/v1/workspaces/ws_alpha/sessions",
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().items).toEqual([
      expect.objectContaining({
        session_id: sessionId,
        app_session_overlay_state: "recovery_pending",
      }),
    ]);

    const reconcileResponse = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/reconcile`,
      payload: {},
    });

    expect(reconcileResponse.statusCode).toBe(200);
    expect(reconcileResponse.json()).toEqual({
      session: {
        session_id: sessionId,
        workspace_id: "ws_alpha",
        title: "Fix build error",
        status: "waiting_input",
        created_at: expect.any(String),
        updated_at: expect.any(String),
        started_at: expect.any(String),
        last_message_at: expect.any(String),
        active_approval_id: null,
        current_turn_id: null,
        app_session_overlay_state: "open",
      },
    });

    const workspaceResponse = await app.inject({
      method: "GET",
      url: "/api/v1/workspaces/ws_alpha",
    });

    expect(workspaceResponse.statusCode).toBe(200);
    expect(workspaceResponse.json()).toMatchObject({
      active_session_id: null,
      pending_approval_count: 0,
      active_session_summary: null,
    });

    await app.close();
  });

  it("repairs a missing active approval id by relinking the pending approval", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
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
        nativeSessionGateway: new StubNativeSessionGateway([]),
      },
    });

    const { sessionId } = seedWaitingApprovalMismatchSession(database, {
      activeApprovalId: null,
      insertApproval: false,
      pendingApprovalId: "apr_pending_001",
    });

    const getResponse = await app.inject({
      method: "GET",
      url: `/api/v1/sessions/${sessionId}`,
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toMatchObject({
      session_id: sessionId,
      status: "waiting_approval",
      active_approval_id: null,
      app_session_overlay_state: "recovery_pending",
    });

    const reconcileResponse = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/reconcile`,
      payload: {},
    });

    expect(reconcileResponse.statusCode).toBe(200);
    expect(reconcileResponse.json()).toEqual({
      session: {
        session_id: sessionId,
        workspace_id: "ws_alpha",
        title: "Fix build error",
        status: "waiting_approval",
        created_at: expect.any(String),
        updated_at: expect.any(String),
        started_at: expect.any(String),
        last_message_at: expect.any(String),
        active_approval_id: "apr_pending_001",
        current_turn_id: "turn_001",
        app_session_overlay_state: "open",
      },
    });

    const workspaceResponse = await app.inject({
      method: "GET",
      url: "/api/v1/workspaces/ws_alpha",
    });

    expect(workspaceResponse.statusCode).toBe(200);
    expect(workspaceResponse.json()).toMatchObject({
      active_session_id: sessionId,
      pending_approval_count: 1,
      active_session_summary: {
        session_id: sessionId,
        status: "waiting_approval",
      },
    });

    await app.close();
  });

  it("surfaces workspace active-session drift as recovery_pending and clears it after workspace reconciliation", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
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
        nativeSessionGateway: new StubNativeSessionGateway([]),
      },
    });

    const { workspaceId, activeSessionId } = seedWorkspaceActiveSessionMismatch(database);

    const beforeResponse = await app.inject({
      method: "GET",
      url: `/api/v1/sessions/${activeSessionId}`,
    });

    expect(beforeResponse.statusCode).toBe(200);
    expect(beforeResponse.json()).toMatchObject({
      session_id: activeSessionId,
      status: "running",
      app_session_overlay_state: "recovery_pending",
    });

    const reconcileResponse = await app.inject({
      method: "POST",
      url: `/api/v1/workspaces/${workspaceId}/reconcile`,
      payload: {},
    });

    expect(reconcileResponse.statusCode).toBe(200);

    const afterResponse = await app.inject({
      method: "GET",
      url: `/api/v1/sessions/${activeSessionId}`,
    });

    expect(afterResponse.statusCode).toBe(200);
    expect(afterResponse.json()).toMatchObject({
      session_id: activeSessionId,
      status: "running",
      app_session_overlay_state: "open",
    });

    await app.close();
  });

  it("rejects approval request ingestion when the session turn does not match", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const nativeSessionGateway = new StubNativeSessionGateway([], ["turn_001"]);
    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
      services: {
        nativeSessionGateway,
      },
    });

    const { sessionId } = seedWaitingInputSession(database);

    await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/messages`,
      payload: {
        client_message_id: "msgclient_001",
        content: "Please explain the diff.",
      },
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/approval-requests`,
      payload: {
        turn_id: "turn_999",
        approval_category: "external_side_effect",
        summary: "Run git push",
        reason: "Codex requests permission to push changes to remote.",
        native_request_kind: "approval_request",
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: {
        code: "session_invalid_state",
        message: "session is not ready to ingest approval requests",
        details: {
          session_id: sessionId,
          current_status: "running",
          current_turn_id: "turn_001",
          active_approval_id: null,
          requested_turn_id: "turn_999",
        },
      },
    });

    await app.close();
  });

  it("returns the existing projected user message for idempotent retries", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const nativeSessionGateway = new StubNativeSessionGateway([], ["turn_001"]);
    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
      services: {
        nativeSessionGateway,
      },
    });

    const { sessionId } = seedWaitingInputSession(database);

    const firstResponse = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/messages`,
      payload: {
        client_message_id: "msgclient_001",
        content: "Please explain the diff.",
      },
    });
    const retryResponse = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/messages`,
      payload: {
        client_message_id: "msgclient_001",
        content: "Please explain the diff.",
      },
    });

    expect(firstResponse.statusCode).toBe(202);
    expect(retryResponse.statusCode).toBe(202);
    expect(retryResponse.json()).toEqual(firstResponse.json());
    expect(nativeSessionGateway.sentMessages).toHaveLength(1);

    const listResponse = await app.inject({
      method: "GET",
      url: `/api/v1/sessions/${sessionId}/messages`,
    });

    expect(listResponse.json().items).toHaveLength(1);

    await app.close();
  });

  it("rejects conflicting retries that reuse a client message id with different content", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const nativeSessionGateway = new StubNativeSessionGateway([], ["turn_001"]);
    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
      services: {
        nativeSessionGateway,
      },
    });

    const { sessionId } = seedWaitingInputSession(database);

    await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/messages`,
      payload: {
        client_message_id: "msgclient_001",
        content: "Please explain the diff.",
      },
    });

    const conflictResponse = await app.inject({
      method: "POST",
      url: `/api/v1/sessions/${sessionId}/messages`,
      payload: {
        client_message_id: "msgclient_001",
        content: "Please summarize the diff.",
      },
    });

    expect(conflictResponse.statusCode).toBe(409);
    expect(conflictResponse.json()).toEqual({
      error: {
        code: "message_idempotency_conflict",
        message: "client message id conflicts with a different message payload",
        details: {
          session_id: sessionId,
          client_message_id: "msgclient_001",
        },
      },
    });

    await app.close();
  });

  it("lists projected messages with stable created_at sorting and limit handling", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
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
        nativeSessionGateway: new StubNativeSessionGateway([]),
      },
    });

    const { sessionId } = seedWaitingInputSession(database, {
      activeSessionId: null,
    });

    database.db.insert(sessions).values({
      sessionId: "thread_002",
      workspaceId: "ws_alpha",
      title: "Background session",
      status: "created",
      createdAt: "2026-04-04T12:05:00.000Z",
      updatedAt: "2026-04-04T12:05:00.000Z",
      startedAt: null,
      lastMessageAt: null,
      activeApprovalId: null,
      currentTurnId: null,
      appSessionOverlayState: "open",
    }).run();

    database.sqlite
      .prepare(
        `
          INSERT INTO messages (
            message_id,
            session_id,
            role,
            content,
            created_at,
            source_item_type,
            client_message_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run("msg_user_001", sessionId, "user", "first", "2026-04-04T12:00:01.000Z", "user_message", "msgclient_001");
    database.sqlite
      .prepare(
        `
          INSERT INTO messages (
            message_id,
            session_id,
            role,
            content,
            created_at,
            source_item_type,
            client_message_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run("msg_assistant_001", sessionId, "assistant", "second", "2026-04-04T12:00:02.000Z", "agent_message", null);
    database.sqlite
      .prepare(
        `
          INSERT INTO messages (
            message_id,
            session_id,
            role,
            content,
            created_at,
            source_item_type,
            client_message_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run("msg_user_002", sessionId, "user", "third", "2026-04-04T12:00:03.000Z", "user_message", "msgclient_002");

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/sessions/${sessionId}/messages?sort=-created_at&limit=2`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      items: [
        {
          message_id: "msg_user_002",
          session_id: sessionId,
          role: "user",
          content: "third",
          created_at: "2026-04-04T12:00:03.000Z",
          source_item_type: "user_message",
        },
        {
          message_id: "msg_assistant_001",
          session_id: sessionId,
          role: "assistant",
          content: "second",
          created_at: "2026-04-04T12:00:02.000Z",
          source_item_type: "agent_message",
        },
      ],
      next_cursor: null,
      has_more: false,
    });

    await app.close();
  });
});
