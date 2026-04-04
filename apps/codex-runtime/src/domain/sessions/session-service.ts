import crypto from "node:crypto";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { RuntimeError } from "../../errors.js";
import type { RuntimeDatabase } from "../../db/database.js";
import { messages, sessions, workspaces } from "../../db/schema.js";
import { WorkspaceRegistry } from "../workspaces/workspace-registry.js";
import { WorkspaceFilesystem } from "../workspaces/workspace-filesystem.js";
import {
  type NativeSessionGateway,
  resolveWorkspaceSessionCwd,
} from "./native-session-gateway.js";
import type {
  AppSessionOverlayState,
  MessageProjection,
  MessageRole,
  MessageSourceItemType,
  SessionStatus,
  SessionStopResult,
  SessionSummary,
} from "./types.js";

function toIsoString(date: Date) {
  return date.toISOString();
}

function firstRow<T>(rows: T[]) {
  return rows[0];
}

function mapSessionSummary(record: typeof sessions.$inferSelect): SessionSummary {
  return {
    session_id: record.sessionId,
    workspace_id: record.workspaceId,
    title: record.title,
    status: record.status as SessionStatus,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    started_at: record.startedAt,
    last_message_at: record.lastMessageAt,
    active_approval_id: record.activeApprovalId,
    current_turn_id: record.currentTurnId,
    app_session_overlay_state: record.appSessionOverlayState as AppSessionOverlayState,
  };
}

function generateMessageId(role: MessageRole) {
  const prefix = role === "user" ? "msg_user" : "msg_assistant";
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

function mapMessageProjection(record: typeof messages.$inferSelect): MessageProjection {
  return {
    message_id: record.messageId,
    session_id: record.sessionId,
    role: record.role as MessageRole,
    content: record.content,
    created_at: record.createdAt,
    source_item_type: record.sourceItemType as MessageSourceItemType,
  };
}

function firstRequiredRow<T>(rows: T[], notFound: () => never) {
  const row = firstRow(rows);
  if (!row) {
    notFound();
  }

  return row;
}

export class SessionService {
  constructor(
    private readonly database: RuntimeDatabase,
    private readonly workspaceRegistry: WorkspaceRegistry,
    private readonly workspaceFilesystem: WorkspaceFilesystem,
    private readonly nativeSessionGateway: NativeSessionGateway,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async listSessions(workspaceId: string) {
    await this.workspaceRegistry.getWorkspace(workspaceId);

    const rows = this.database.db
      .select()
      .from(sessions)
      .where(eq(sessions.workspaceId, workspaceId))
      .orderBy(desc(sessions.updatedAt), desc(sessions.sessionId))
      .all();

    return rows.map(mapSessionSummary);
  }

  async getSession(sessionId: string) {
    const row = firstRow(
      this.database.db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionId, sessionId))
        .limit(1)
        .all(),
    );

    if (!row) {
      throw new RuntimeError(404, "session_not_found", "session was not found", {
        session_id: sessionId,
      });
    }

    return mapSessionSummary(row);
  }

  async createSession(workspaceId: string, title: string) {
    const workspace = await this.workspaceRegistry.getWorkspace(workspaceId);
    const now = toIsoString(this.now());
    const { sessionId } = await this.nativeSessionGateway.createSession({
      cwd: resolveWorkspaceSessionCwd(
        this.workspaceFilesystem.getWorkspaceRoot(),
        workspace.directory_name,
      ),
      title,
    });

    await this.workspaceRegistry.attachSession(workspaceId, sessionId);

    this.database.db
      .insert(sessions)
      .values({
        sessionId,
        workspaceId,
        title,
        status: "created",
        createdAt: now,
        updatedAt: now,
        startedAt: null,
        lastMessageAt: null,
        activeApprovalId: null,
        currentTurnId: null,
        appSessionOverlayState: "open",
      })
      .run();

    this.database.db
      .update(workspaces)
      .set({
        updatedAt: now,
      })
      .where(eq(workspaces.workspaceId, workspaceId))
      .run();

    return this.getSession(sessionId);
  }

  async startSession(sessionId: string) {
    const session = await this.getSession(sessionId);

    if (session.status === "running" || session.status === "waiting_input") {
      return session;
    }

    if (session.status !== "created") {
      throw new RuntimeError(409, "session_invalid_state", "session is not startable", {
        session_id: sessionId,
        status: session.status,
      });
    }

    const workspace = await this.workspaceRegistry.getWorkspace(session.workspace_id);
    if (
      workspace.active_session_id !== null &&
      workspace.active_session_id !== session.session_id
    ) {
      throw new RuntimeError(
        409,
        "session_conflict_active_exists",
        "another active session already exists in this workspace",
        {
          workspace_id: session.workspace_id,
          active_session_id: workspace.active_session_id,
        },
      );
    }

    const now = toIsoString(this.now());

    this.database.db
      .update(sessions)
      .set({
        status: "running",
        updatedAt: now,
        startedAt: session.started_at ?? now,
        appSessionOverlayState: "open",
      })
      .where(eq(sessions.sessionId, sessionId))
      .run();

    this.database.db
      .update(workspaces)
      .set({
        activeSessionId: sessionId,
        updatedAt: now,
      })
      .where(eq(workspaces.workspaceId, session.workspace_id))
      .run();

    return this.getSession(sessionId);
  }

  async stopSession(sessionId: string): Promise<SessionStopResult> {
    const session = await this.getSession(sessionId);

    if (session.status === "stopped") {
      return {
        session,
        canceled_approval: null,
      };
    }

    if (
      session.status !== "running" &&
      session.status !== "waiting_input" &&
      session.status !== "waiting_approval"
    ) {
      throw new RuntimeError(409, "session_invalid_state", "session is not stoppable", {
        session_id: sessionId,
        status: session.status,
      });
    }

    if (session.status === "running" && session.current_turn_id) {
      await this.nativeSessionGateway.interruptSessionTurn({
        sessionId,
        turnId: session.current_turn_id,
      });
    }

    const now = toIsoString(this.now());

    this.database.db
      .update(sessions)
      .set({
        status: "stopped",
        updatedAt: now,
        currentTurnId: null,
        activeApprovalId: null,
        appSessionOverlayState: "closed",
      })
      .where(eq(sessions.sessionId, sessionId))
      .run();

    this.database.db
      .update(workspaces)
      .set({
        activeSessionId: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(workspaces.workspaceId, session.workspace_id),
          eq(workspaces.activeSessionId, sessionId),
        ),
      )
      .run();

    return {
      session: await this.getSession(sessionId),
      canceled_approval: null,
    };
  }

  async listSessionSummariesById(sessionIds: string[]) {
    if (sessionIds.length === 0) {
      return new Map<string, SessionSummary>();
    }

    const rows = this.database.db
      .select()
      .from(sessions)
      .where(inArray(sessions.sessionId, sessionIds))
      .all();

    return new Map(rows.map((row) => [row.sessionId, mapSessionSummary(row)]));
  }

  async listMessages(
    sessionId: string,
    options: {
      limit?: number;
      sort?: "created_at" | "-created_at";
    } = {},
  ) {
    await this.getSession(sessionId);

    const limit = Math.max(1, Math.min(options.limit ?? 100, 100));
    const sort = options.sort ?? "created_at";
    const orderBy =
      sort === "-created_at"
        ? [desc(messages.createdAt), desc(messages.messageId)]
        : [asc(messages.createdAt), asc(messages.messageId)];

    const rows = this.database.db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(...orderBy)
      .limit(limit)
      .all();

    return {
      items: rows.map(mapMessageProjection),
      next_cursor: null,
      has_more: false,
    };
  }

  async acceptMessage(
    sessionId: string,
    input: {
      client_message_id: string;
      content: string;
    },
  ) {
    const existing = firstRow(
      this.database.db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.sessionId, sessionId),
            eq(messages.clientMessageId, input.client_message_id),
          ),
        )
        .limit(1)
        .all(),
    );

    if (existing) {
      if (existing.content !== input.content) {
        throw new RuntimeError(
          409,
          "message_idempotency_conflict",
          "client message id conflicts with a different message payload",
          {
            session_id: sessionId,
            client_message_id: input.client_message_id,
          },
        );
      }

      return mapMessageProjection(existing);
    }

    const session = await this.getSession(sessionId);

    if (session.status !== "waiting_input") {
      throw new RuntimeError(
        409,
        "session_invalid_state",
        "session is not ready to accept messages",
        {
          session_id: sessionId,
          current_status: session.status,
        },
      );
    }

    const workspace = await this.workspaceRegistry.getWorkspace(session.workspace_id);
    if (
      workspace.active_session_id !== null &&
      workspace.active_session_id !== session.session_id
    ) {
      throw new RuntimeError(
        409,
        "session_conflict_active_exists",
        "another active session already exists in this workspace",
        {
          workspace_id: session.workspace_id,
          active_session_id: workspace.active_session_id,
        },
      );
    }

    const nativeTurn = await this.nativeSessionGateway.sendUserMessage({
      sessionId,
      content: input.content,
    });
    const userMessageId = generateMessageId("user");
    const userCreatedAt = toIsoString(this.now());

    this.database.sqlite.transaction(() => {
      this.database.db
        .insert(messages)
        .values({
          messageId: userMessageId,
          sessionId,
          role: "user",
          content: input.content,
          createdAt: userCreatedAt,
          sourceItemType: "user_message",
          clientMessageId: input.client_message_id,
        })
        .run();

      this.database.db
        .update(sessions)
        .set({
          status: "running",
          updatedAt: userCreatedAt,
          lastMessageAt: userCreatedAt,
          currentTurnId: nativeTurn.turnId,
          pendingAssistantMessageId: null,
          appSessionOverlayState: "open",
        })
        .where(eq(sessions.sessionId, sessionId))
        .run();

      this.database.db
        .update(workspaces)
        .set({
          activeSessionId: sessionId,
          updatedAt: userCreatedAt,
        })
        .where(eq(workspaces.workspaceId, session.workspace_id))
        .run();
    })();

    return {
      message_id: userMessageId,
      session_id: sessionId,
      role: "user",
      content: input.content,
      created_at: userCreatedAt,
      source_item_type: "user_message",
    } satisfies MessageProjection;
  }

  async ingestAssistantDelta(
    sessionId: string,
    input: {
      turn_id: string;
      delta: string;
    },
  ) {
    const session = firstRequiredRow(
      this.database.db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionId, sessionId))
        .limit(1)
        .all(),
      () => {
        throw new RuntimeError(404, "session_not_found", "session was not found", {
          session_id: sessionId,
        });
      },
    );

    if (session.status !== "running" || session.currentTurnId !== input.turn_id) {
      throw new RuntimeError(
        409,
        "session_invalid_state",
        "session is not ready to ingest assistant events",
        {
          session_id: sessionId,
          current_status: session.status,
          current_turn_id: session.currentTurnId,
          requested_turn_id: input.turn_id,
        },
      );
    }

    const assistantMessageId =
      session.pendingAssistantMessageId ?? generateMessageId("assistant");
    const updatedAt = toIsoString(this.now());

    this.database.db
      .update(sessions)
      .set({
        updatedAt,
        pendingAssistantMessageId: assistantMessageId,
      })
      .where(eq(sessions.sessionId, sessionId))
      .run();

    return {
      message_id: assistantMessageId,
      session_id: sessionId,
      event_type: "message.assistant.delta" as const,
      turn_id: input.turn_id,
      delta: input.delta,
    };
  }

  async applyAssistantMessageCompletion(
    sessionId: string,
    input: {
      turn_id: string;
      content: string;
    },
  ) {
    const session = firstRequiredRow(
      this.database.db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionId, sessionId))
        .limit(1)
        .all(),
      () => {
        throw new RuntimeError(404, "session_not_found", "session was not found", {
          session_id: sessionId,
        });
      },
    );

    if (session.status !== "running" || session.currentTurnId !== input.turn_id) {
      throw new RuntimeError(
        409,
        "session_invalid_state",
        "session is not ready to ingest assistant events",
        {
          session_id: sessionId,
          current_status: session.status,
          current_turn_id: session.currentTurnId,
          requested_turn_id: input.turn_id,
        },
      );
    }

    const assistantMessageId =
      session.pendingAssistantMessageId ?? generateMessageId("assistant");
    const assistantCreatedAt = toIsoString(this.now());

    this.database.sqlite.transaction(() => {
      this.database.db
        .insert(messages)
        .values({
          messageId: assistantMessageId,
          sessionId,
          role: "assistant",
          content: input.content,
          createdAt: assistantCreatedAt,
          sourceItemType: "agent_message",
          clientMessageId: null,
        })
        .run();

      this.database.db
        .update(sessions)
        .set({
          status: "waiting_input",
          updatedAt: assistantCreatedAt,
          lastMessageAt: assistantCreatedAt,
          currentTurnId: null,
          pendingAssistantMessageId: null,
          appSessionOverlayState: "open",
        })
        .where(eq(sessions.sessionId, sessionId))
        .run();

      this.database.db
        .update(workspaces)
        .set({
          activeSessionId: null,
          updatedAt: assistantCreatedAt,
        })
        .where(
          and(
            eq(workspaces.workspaceId, session.workspaceId),
            eq(workspaces.activeSessionId, sessionId),
          ),
        )
        .run();
    })();

    return {
      message_id: assistantMessageId,
      session_id: sessionId,
      role: "assistant",
      content: input.content,
      created_at: assistantCreatedAt,
      source_item_type: "agent_message",
    } satisfies MessageProjection;
  }
}
