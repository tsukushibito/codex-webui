import crypto from "node:crypto";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { RuntimeDatabase } from "../../db/database.js";
import { approvals, messages, sessionEvents, sessions, workspaces } from "../../db/schema.js";
import { RuntimeError } from "../../errors.js";
import type {
  ApprovalCategory,
  ApprovalProjection,
  ApprovalResolution,
  ApprovalStatus,
  ApprovalSummary,
} from "../approvals/types.js";
import type { WorkspaceFilesystem } from "../workspaces/workspace-filesystem.js";
import type { WorkspaceRegistry } from "../workspaces/workspace-registry.js";
import { type NativeSessionGateway, resolveWorkspaceSessionCwd } from "./native-session-gateway.js";
import {
  mapSessionEventProjection,
  type SessionEventPublisher,
} from "./session-event-publisher.js";
import type {
  ApprovalStreamEventProjection,
  AppSessionOverlayState,
  MessageProjection,
  MessageRole,
  MessageSourceItemType,
  SessionEventProjection,
  SessionEventType,
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

function mapSessionSummaryWithOverlay(
  record: typeof sessions.$inferSelect,
  overlayState: AppSessionOverlayState,
): SessionSummary {
  return {
    ...mapSessionSummary(record),
    app_session_overlay_state: overlayState,
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

function parseApprovalContext(value: string | null) {
  if (!value) {
    return null;
  }

  return JSON.parse(value) as Record<string, unknown>;
}

function mapApprovalProjection(record: typeof approvals.$inferSelect): ApprovalProjection {
  return {
    approval_id: record.approvalId,
    session_id: record.sessionId,
    workspace_id: record.workspaceId,
    status: record.status as ApprovalStatus,
    resolution: (record.resolution ?? null) as ApprovalResolution | null,
    approval_category: record.approvalCategory as ApprovalCategory,
    summary: record.summary,
    reason: record.reason,
    operation_summary: record.operationSummary,
    context: parseApprovalContext(record.context),
    created_at: record.createdAt,
    resolved_at: record.resolvedAt,
    native_request_kind: record.nativeRequestKind,
  };
}

function generateApprovalId() {
  return `apr_${crypto.randomUUID().replaceAll("-", "")}`;
}

function firstRequiredRow<T>(rows: T[], notFound: () => never) {
  const row = firstRow(rows);
  if (!row) {
    notFound();
  }

  return row;
}

type TurnStartConvergenceGateway = NativeSessionGateway & {
  acknowledgeTurnStartPersisted?: (input: { sessionId: string; turnId: string }) => Promise<void>;
};

export class SessionService {
  constructor(
    private readonly database: RuntimeDatabase,
    private readonly workspaceRegistry: WorkspaceRegistry,
    private readonly workspaceFilesystem: WorkspaceFilesystem,
    private readonly nativeSessionGateway: NativeSessionGateway,
    private readonly sessionEventPublisher: SessionEventPublisher,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async acknowledgeTurnStartPersisted(sessionId: string, turnId: string) {
    await (
      this.nativeSessionGateway as TurnStartConvergenceGateway
    ).acknowledgeTurnStartPersisted?.({
      sessionId,
      turnId,
    });
  }

  subscribeSessionEvents(sessionId: string, listener: (event: SessionEventProjection) => void) {
    return this.sessionEventPublisher.subscribeSessionEvents(sessionId, listener);
  }

  subscribeApprovalEvents(listener: (event: ApprovalStreamEventProjection) => void) {
    return this.sessionEventPublisher.subscribeApprovalEvents(listener);
  }

  private appendSessionEvent(input: {
    sessionId: string;
    eventType: SessionEventType;
    occurredAt: string;
    payload: Record<string, unknown>;
    nativeEventName?: string | null;
  }) {
    this.sessionEventPublisher.appendSessionEvent(input);
  }

  private appendSessionStatusChangedEvent(input: {
    sessionId: string;
    occurredAt: string;
    fromStatus: SessionStatus;
    toStatus: SessionStatus;
    nativeEventName?: string | null;
  }) {
    this.sessionEventPublisher.appendSessionStatusChangedEvent(input);
  }

  private markSessionRecoveryPending(input: {
    sessionId: string;
    workspaceId: string;
    updatedAt: string;
    currentTurnId: string;
  }) {
    this.database.sqlite.transaction(() => {
      this.database.db
        .update(sessions)
        .set({
          status: "running",
          updatedAt: input.updatedAt,
          lastMessageAt: input.updatedAt,
          currentTurnId: input.currentTurnId,
          pendingAssistantMessageId: null,
          appSessionOverlayState: "recovery_pending",
        })
        .where(eq(sessions.sessionId, input.sessionId))
        .run();

      this.database.db
        .update(workspaces)
        .set({
          updatedAt: input.updatedAt,
        })
        .where(eq(workspaces.workspaceId, input.workspaceId))
        .run();
    })();
  }

  private getSessionRecord(sessionId: string) {
    return firstRequiredRow(
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
  }

  private getPendingApprovalForSession(sessionId: string) {
    return firstRow(
      this.database.db
        .select()
        .from(approvals)
        .where(and(eq(approvals.sessionId, sessionId), eq(approvals.status, "pending")))
        .orderBy(desc(approvals.createdAt), desc(approvals.approvalId))
        .limit(1)
        .all(),
    );
  }

  private getActiveApprovalRecord(session: typeof sessions.$inferSelect) {
    if (session.activeApprovalId === null) {
      return null;
    }

    return firstRow(
      this.database.db
        .select()
        .from(approvals)
        .where(eq(approvals.approvalId, session.activeApprovalId))
        .limit(1)
        .all(),
    );
  }

  private detectApprovalRecoveryMismatch(session: typeof sessions.$inferSelect) {
    if (session.status !== "waiting_approval") {
      return null;
    }

    if (session.activeApprovalId === null) {
      return {
        kind: "missing_active_approval_id" as const,
        approval: null,
        pendingApproval: this.getPendingApprovalForSession(session.sessionId),
      };
    }

    const approval = this.getActiveApprovalRecord(session);
    if (!approval) {
      return {
        kind: "active_approval_missing" as const,
        approval: null,
        pendingApproval: this.getPendingApprovalForSession(session.sessionId),
      };
    }

    if (approval.status !== "pending") {
      return {
        kind: "active_approval_resolved" as const,
        approval,
        pendingApproval: this.getPendingApprovalForSession(session.sessionId),
      };
    }

    return null;
  }

  private async materializeSessionSummary(record: typeof sessions.$inferSelect) {
    const mismatch = this.detectApprovalRecoveryMismatch(record);
    return mapSessionSummaryWithOverlay(
      record,
      mismatch ? "recovery_pending" : (record.appSessionOverlayState as AppSessionOverlayState),
    );
  }

  async listSessions(workspaceId: string) {
    await this.workspaceRegistry.getWorkspace(workspaceId);

    const rows = this.database.db
      .select()
      .from(sessions)
      .where(eq(sessions.workspaceId, workspaceId))
      .orderBy(desc(sessions.updatedAt), desc(sessions.sessionId))
      .all();

    return Promise.all(rows.map((row) => this.materializeSessionSummary(row)));
  }

  async getSession(sessionId: string) {
    return this.materializeSessionSummary(this.getSessionRecord(sessionId));
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

    const now = toIsoString(this.now());
    const readyAt = toIsoString(this.now());

    this.database.sqlite.transaction(() => {
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
          updatedAt: now,
        })
        .where(eq(workspaces.workspaceId, session.workspace_id))
        .run();

      this.appendSessionStatusChangedEvent({
        sessionId,
        occurredAt: now,
        fromStatus: session.status,
        toStatus: "running",
      });

      this.database.db
        .update(sessions)
        .set({
          status: "waiting_input",
          updatedAt: readyAt,
          appSessionOverlayState: "open",
        })
        .where(eq(sessions.sessionId, sessionId))
        .run();

      this.database.db
        .update(workspaces)
        .set({
          updatedAt: readyAt,
        })
        .where(eq(workspaces.workspaceId, session.workspace_id))
        .run();

      this.appendSessionStatusChangedEvent({
        sessionId,
        occurredAt: readyAt,
        fromStatus: "running",
        toStatus: "waiting_input",
      });
    })();

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

    let activeApprovalRecord: typeof approvals.$inferSelect | null = null;
    if (session.status === "waiting_approval" && session.active_approval_id !== null) {
      activeApprovalRecord = firstRequiredRow(
        this.database.db
          .select()
          .from(approvals)
          .where(eq(approvals.approvalId, session.active_approval_id))
          .limit(1)
          .all(),
        () => {
          throw new RuntimeError(404, "approval_not_found", "approval was not found", {
            approval_id: session.active_approval_id,
          });
        },
      );

      if (activeApprovalRecord.status === "pending") {
        await this.nativeSessionGateway.cancelPendingApproval({
          sessionId,
          approvalId: activeApprovalRecord.approvalId,
        });
      }
    }

    const now = toIsoString(this.now());
    let canceledApproval: ApprovalProjection | null = null;

    this.database.sqlite.transaction(() => {
      if (activeApprovalRecord?.status === "pending") {
        this.database.db
          .update(approvals)
          .set({
            status: "canceled",
            resolution: "canceled",
            resolvedAt: now,
          })
          .where(eq(approvals.approvalId, activeApprovalRecord.approvalId))
          .run();

        const updatedApproval = firstRequiredRow(
          this.database.db
            .select()
            .from(approvals)
            .where(eq(approvals.approvalId, activeApprovalRecord.approvalId))
            .limit(1)
            .all(),
          () => {
            throw new RuntimeError(404, "approval_not_found", "approval was not found", {
              approval_id: activeApprovalRecord.approvalId,
            });
          },
        );
        canceledApproval = mapApprovalProjection(updatedApproval);

        this.appendSessionEvent({
          sessionId,
          eventType: "approval.resolved",
          occurredAt: now,
          payload: {
            approval_id: activeApprovalRecord.approvalId,
            workspace_id: activeApprovalRecord.workspaceId,
            approval_category: activeApprovalRecord.approvalCategory,
            summary: activeApprovalRecord.summary,
            resolution: "canceled",
          },
        });
      }

      this.database.db
        .update(sessions)
        .set({
          status: "stopped",
          updatedAt: now,
          currentTurnId: null,
          activeApprovalId: null,
          pendingAssistantMessageId: null,
          appSessionOverlayState: "closed",
        })
        .where(eq(sessions.sessionId, sessionId))
        .run();

      this.database.db
        .update(workspaces)
        .set({
          updatedAt: now,
        })
        .where(eq(workspaces.workspaceId, session.workspace_id))
        .run();

      this.appendSessionStatusChangedEvent({
        sessionId,
        occurredAt: now,
        fromStatus: session.status,
        toStatus: "stopped",
      });
    })();

    return {
      session: await this.getSession(sessionId),
      canceled_approval: canceledApproval,
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

    return new Map(
      await Promise.all(
        rows.map(
          async (row) => [row.sessionId, await this.materializeSessionSummary(row)] as const,
        ),
      ),
    );
  }

  async listMessages(
    sessionId: string,
    options: {
      limit?: number;
      sort?: "created_at" | "-created_at";
    } = {},
  ) {
    const session = await this.getSession(sessionId);
    if (session.app_session_overlay_state === "recovery_pending") {
      return {
        items: [],
        next_cursor: null,
        has_more: false,
      };
    }

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

  async listSessionEvents(
    sessionId: string,
    options: {
      limit?: number;
      sort?: "occurred_at" | "-occurred_at";
    } = {},
  ) {
    const session = await this.getSession(sessionId);
    if (session.app_session_overlay_state === "recovery_pending") {
      return {
        items: [],
        next_cursor: null,
        has_more: false,
      };
    }

    const limit = Math.max(1, Math.min(options.limit ?? 100, 100));
    const sort = options.sort ?? "occurred_at";
    const orderBy =
      sort === "-occurred_at"
        ? [
            desc(sessionEvents.occurredAt),
            desc(sessionEvents.sequence),
            desc(sessionEvents.eventId),
          ]
        : [asc(sessionEvents.occurredAt), asc(sessionEvents.sequence), asc(sessionEvents.eventId)];

    const rows = this.database.db
      .select()
      .from(sessionEvents)
      .where(eq(sessionEvents.sessionId, sessionId))
      .orderBy(...orderBy)
      .limit(limit)
      .all();

    return {
      items: rows.map(mapSessionEventProjection),
      next_cursor: null,
      has_more: false,
    };
  }

  async reconcileSession(sessionId: string) {
    const session = this.getSessionRecord(sessionId);
    const mismatch = this.detectApprovalRecoveryMismatch(session);

    if (!mismatch) {
      return {
        session: await this.getSession(sessionId),
      };
    }

    const updatedAt = toIsoString(this.now());
    const pendingApproval = mismatch.pendingApproval;

    this.database.sqlite.transaction(() => {
      if (pendingApproval) {
        this.database.db
          .update(sessions)
          .set({
            status: "waiting_approval",
            updatedAt,
            activeApprovalId: pendingApproval.approvalId,
            appSessionOverlayState: "open",
          })
          .where(eq(sessions.sessionId, sessionId))
          .run();

        this.database.db
          .update(workspaces)
          .set({
            updatedAt,
          })
          .where(eq(workspaces.workspaceId, session.workspaceId))
          .run();

        return;
      }

      const resolvedApproval = mismatch.approval;
      const nextStatus =
        resolvedApproval?.resolution === "canceled"
          ? "stopped"
          : resolvedApproval?.resolution === "approved"
            ? session.currentTurnId
              ? "running"
              : "waiting_input"
            : "waiting_input";
      const nextOverlayState = nextStatus === "stopped" ? "closed" : ("open" as const);
      this.database.db
        .update(sessions)
        .set({
          status: nextStatus,
          updatedAt,
          activeApprovalId: null,
          currentTurnId:
            nextStatus === "waiting_input" || nextStatus === "stopped"
              ? null
              : session.currentTurnId,
          pendingAssistantMessageId:
            nextStatus === "running" ? session.pendingAssistantMessageId : null,
          appSessionOverlayState: nextOverlayState,
        })
        .where(eq(sessions.sessionId, sessionId))
        .run();

      this.database.db
        .update(workspaces)
        .set({
          updatedAt,
        })
        .where(eq(workspaces.workspaceId, session.workspaceId))
        .run();
    })();

    return {
      session: await this.getSession(sessionId),
    };
  }

  async listApprovals(
    options: {
      status?: ApprovalStatus;
      workspace_id?: string;
      limit?: number;
      sort?: "created_at" | "-created_at";
    } = {},
  ) {
    const limit = Math.max(1, Math.min(options.limit ?? 50, 100));
    const sort = options.sort ?? "-created_at";
    const conditions = [];

    if (options.status) {
      conditions.push(eq(approvals.status, options.status));
    } else {
      conditions.push(eq(approvals.status, "pending"));
    }

    if (options.workspace_id) {
      conditions.push(eq(approvals.workspaceId, options.workspace_id));
    }

    const orderBy =
      sort === "created_at"
        ? [asc(approvals.createdAt), asc(approvals.approvalId)]
        : [desc(approvals.createdAt), desc(approvals.approvalId)];

    const rows = this.database.db
      .select()
      .from(approvals)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]!)
      .orderBy(...orderBy)
      .limit(limit)
      .all();

    return {
      items: rows.map(mapApprovalProjection),
      next_cursor: null,
      has_more: false,
    };
  }

  async getApproval(approvalId: string) {
    const row = firstRequiredRow(
      this.database.db
        .select()
        .from(approvals)
        .where(eq(approvals.approvalId, approvalId))
        .limit(1)
        .all(),
      () => {
        throw new RuntimeError(404, "approval_not_found", "approval was not found", {
          approval_id: approvalId,
        });
      },
    );

    return mapApprovalProjection(row);
  }

  async resolveApproval(
    approvalId: string,
    input: {
      resolution: Extract<ApprovalResolution, "approved" | "denied">;
    },
  ) {
    const approval = firstRequiredRow(
      this.database.db
        .select()
        .from(approvals)
        .where(eq(approvals.approvalId, approvalId))
        .limit(1)
        .all(),
      () => {
        throw new RuntimeError(404, "approval_not_found", "approval was not found", {
          approval_id: approvalId,
        });
      },
    );

    if (approval.status !== "pending") {
      if (approval.resolution === input.resolution) {
        return {
          approval: mapApprovalProjection(approval),
          session: await this.getSession(approval.sessionId),
        };
      }

      throw new RuntimeError(409, "approval_not_pending", "approval is not pending", {
        approval_id: approvalId,
        status: approval.status,
      });
    }

    const session = firstRequiredRow(
      this.database.db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionId, approval.sessionId))
        .limit(1)
        .all(),
      () => {
        throw new RuntimeError(404, "session_not_found", "session was not found", {
          session_id: approval.sessionId,
        });
      },
    );
    const resolvedAt = toIsoString(this.now());
    const nextSessionStatus = input.resolution === "approved" ? "running" : "waiting_input";
    const nextTurnId = input.resolution === "approved" ? session.currentTurnId : null;

    await this.nativeSessionGateway.resolveApproval({
      sessionId: approval.sessionId,
      approvalId,
      resolution: input.resolution,
    });

    this.database.sqlite.transaction(() => {
      this.database.db
        .update(approvals)
        .set({
          status: input.resolution,
          resolution: input.resolution,
          resolvedAt,
        })
        .where(eq(approvals.approvalId, approvalId))
        .run();

      this.database.db
        .update(sessions)
        .set({
          status: nextSessionStatus,
          updatedAt: resolvedAt,
          activeApprovalId: null,
          currentTurnId: nextTurnId,
          pendingAssistantMessageId:
            input.resolution === "approved" ? session.pendingAssistantMessageId : null,
        })
        .where(eq(sessions.sessionId, approval.sessionId))
        .run();

      this.database.db
        .update(workspaces)
        .set({
          updatedAt: resolvedAt,
        })
        .where(eq(workspaces.workspaceId, approval.workspaceId))
        .run();

      this.appendSessionEvent({
        sessionId: approval.sessionId,
        eventType: "approval.resolved",
        occurredAt: resolvedAt,
        payload: {
          approval_id: approvalId,
          workspace_id: approval.workspaceId,
          approval_category: approval.approvalCategory,
          summary: approval.summary,
          resolution: input.resolution,
        },
      });

      this.appendSessionStatusChangedEvent({
        sessionId: approval.sessionId,
        occurredAt: resolvedAt,
        fromStatus: session.status as SessionStatus,
        toStatus: nextSessionStatus,
      });
    })();

    return {
      approval: await this.getApproval(approvalId),
      session: await this.getSession(approval.sessionId),
    };
  }

  async getApprovalSummary(): Promise<ApprovalSummary> {
    const rows = this.database.db.select().from(approvals).all();
    const pendingApprovalCount = rows.filter((row) => row.status === "pending").length;
    const updatedAt =
      rows
        .map((row) => row.resolvedAt ?? row.createdAt)
        .sort((left, right) => right.localeCompare(left))[0] ?? toIsoString(this.now());

    return {
      pending_approval_count: pendingApprovalCount,
      updated_at: updatedAt,
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

    const nativeTurn = await this.nativeSessionGateway.sendUserMessage({
      sessionId,
      content: input.content,
    });
    const userMessageId = generateMessageId("user");
    const userCreatedAt = toIsoString(this.now());

    try {
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

        this.appendSessionEvent({
          sessionId,
          eventType: "message.user",
          occurredAt: userCreatedAt,
          payload: {
            message_id: userMessageId,
            content: input.content,
          },
        });

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
            updatedAt: userCreatedAt,
          })
          .where(eq(workspaces.workspaceId, session.workspace_id))
          .run();

        this.appendSessionStatusChangedEvent({
          sessionId,
          occurredAt: userCreatedAt,
          fromStatus: session.status,
          toStatus: "running",
        });
      })();
      await this.acknowledgeTurnStartPersisted(sessionId, nativeTurn.turnId);
    } catch (error) {
      try {
        this.markSessionRecoveryPending({
          sessionId,
          workspaceId: session.workspace_id,
          updatedAt: userCreatedAt,
          currentTurnId: nativeTurn.turnId,
        });
      } catch {
        // Keep the original post-native persistence failure as the primary error.
      }

      throw error;
    }

    return {
      message_id: userMessageId,
      session_id: sessionId,
      role: "user",
      content: input.content,
      created_at: userCreatedAt,
      source_item_type: "user_message",
    } satisfies MessageProjection;
  }

  async ingestApprovalRequest(
    sessionId: string,
    input: {
      turn_id: string;
      approval_category: ApprovalCategory;
      summary: string;
      reason: string;
      operation_summary?: string;
      context?: Record<string, unknown>;
      native_request_kind: string;
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

    if (
      session.status !== "running" ||
      session.currentTurnId !== input.turn_id ||
      session.activeApprovalId !== null
    ) {
      throw new RuntimeError(
        409,
        "session_invalid_state",
        "session is not ready to ingest approval requests",
        {
          session_id: sessionId,
          current_status: session.status,
          current_turn_id: session.currentTurnId,
          active_approval_id: session.activeApprovalId,
          requested_turn_id: input.turn_id,
        },
      );
    }

    const approvalId = generateApprovalId();
    const createdAt = toIsoString(this.now());

    this.database.sqlite.transaction(() => {
      this.database.db
        .insert(approvals)
        .values({
          approvalId,
          sessionId,
          workspaceId: session.workspaceId,
          status: "pending",
          resolution: null,
          approvalCategory: input.approval_category,
          summary: input.summary,
          reason: input.reason,
          operationSummary: input.operation_summary ?? null,
          context: input.context ? JSON.stringify(input.context) : null,
          createdAt,
          resolvedAt: null,
          nativeRequestKind: input.native_request_kind,
        })
        .run();

      this.database.db
        .update(sessions)
        .set({
          status: "waiting_approval",
          updatedAt: createdAt,
          activeApprovalId: approvalId,
        })
        .where(eq(sessions.sessionId, sessionId))
        .run();

      this.database.db
        .update(workspaces)
        .set({
          updatedAt: createdAt,
        })
        .where(eq(workspaces.workspaceId, session.workspaceId))
        .run();

      this.appendSessionEvent({
        sessionId,
        eventType: "approval.requested",
        occurredAt: createdAt,
        payload: {
          approval_id: approvalId,
          workspace_id: session.workspaceId,
          approval_category: input.approval_category,
          summary: input.summary,
        },
        nativeEventName: "request/started",
      });

      this.appendSessionStatusChangedEvent({
        sessionId,
        occurredAt: createdAt,
        fromStatus: session.status as SessionStatus,
        toStatus: "waiting_approval",
      });
    })();

    return this.getApproval(approvalId);
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

    const assistantMessageId = session.pendingAssistantMessageId ?? generateMessageId("assistant");
    const updatedAt = toIsoString(this.now());

    this.database.sqlite.transaction(() => {
      this.database.db
        .update(sessions)
        .set({
          updatedAt,
          pendingAssistantMessageId: assistantMessageId,
        })
        .where(eq(sessions.sessionId, sessionId))
        .run();

      this.appendSessionEvent({
        sessionId,
        eventType: "message.assistant.delta",
        occurredAt: updatedAt,
        payload: {
          message_id: assistantMessageId,
          turn_id: input.turn_id,
          delta: input.delta,
        },
        nativeEventName: "item/agent_message/delta",
      });
    })();

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

    const assistantMessageId = session.pendingAssistantMessageId ?? generateMessageId("assistant");
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

      this.appendSessionEvent({
        sessionId,
        eventType: "message.assistant.completed",
        occurredAt: assistantCreatedAt,
        payload: {
          message_id: assistantMessageId,
          turn_id: input.turn_id,
          content: input.content,
          created_at: assistantCreatedAt,
        },
        nativeEventName: "item/agent_message/completed",
      });

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
          updatedAt: assistantCreatedAt,
        })
        .where(eq(workspaces.workspaceId, session.workspaceId))
        .run();

      this.appendSessionStatusChangedEvent({
        sessionId,
        occurredAt: assistantCreatedAt,
        fromStatus: session.status as SessionStatus,
        toStatus: "waiting_input",
      });
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

  async completeTurnWithoutAssistantMessage(
    sessionId: string,
    input: {
      turn_id: string;
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
        "session is not ready to complete the current turn",
        {
          session_id: sessionId,
          current_status: session.status,
          current_turn_id: session.currentTurnId,
          requested_turn_id: input.turn_id,
        },
      );
    }

    const completedAt = toIsoString(this.now());

    this.database.sqlite.transaction(() => {
      this.database.db
        .update(sessions)
        .set({
          status: "waiting_input",
          updatedAt: completedAt,
          currentTurnId: null,
          pendingAssistantMessageId: null,
          appSessionOverlayState: "open",
        })
        .where(eq(sessions.sessionId, sessionId))
        .run();

      this.database.db
        .update(workspaces)
        .set({
          updatedAt: completedAt,
        })
        .where(eq(workspaces.workspaceId, session.workspaceId))
        .run();

      this.appendSessionStatusChangedEvent({
        sessionId,
        occurredAt: completedAt,
        fromStatus: session.status as SessionStatus,
        toStatus: "waiting_input",
      });
    })();

    return this.getSession(sessionId);
  }

  async convergeSessionWaitingForInput(
    sessionId: string,
    input: {
      native_event_name: string;
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

    if (session.status !== "running") {
      return this.getSession(sessionId);
    }

    const updatedAt = toIsoString(this.now());

    this.database.sqlite.transaction(() => {
      this.database.db
        .update(sessions)
        .set({
          status: "waiting_input",
          updatedAt,
          currentTurnId: null,
          pendingAssistantMessageId: null,
          appSessionOverlayState: "open",
        })
        .where(eq(sessions.sessionId, sessionId))
        .run();

      this.database.db
        .update(workspaces)
        .set({
          updatedAt,
        })
        .where(eq(workspaces.workspaceId, session.workspaceId))
        .run();

      this.appendSessionStatusChangedEvent({
        sessionId,
        occurredAt: updatedAt,
        fromStatus: session.status as SessionStatus,
        toStatus: "waiting_input",
        nativeEventName: input.native_event_name,
      });
    })();

    return this.getSession(sessionId);
  }
}
