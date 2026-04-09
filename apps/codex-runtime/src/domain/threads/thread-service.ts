import crypto from "node:crypto";

import { and, desc, eq } from "drizzle-orm";

import type { RuntimeDatabase } from "../../db/database.js";
import {
  type ApprovalRow,
  approvals,
  messages,
  type SessionRow,
  sessionEvents,
  sessions,
  threadInputRequests,
  workspaces,
} from "../../db/schema.js";
import { RuntimeError } from "../../errors.js";
import type { ApprovalProjection } from "../approvals/types.js";
import {
  type NativeSessionGateway,
  resolveWorkspaceSessionCwd,
} from "../sessions/native-session-gateway.js";
import type { SessionEventPublisher } from "../sessions/session-event-publisher.js";
import type {
  MessageProjection,
  SessionEventProjection,
  SessionStatus,
} from "../sessions/types.js";
import type { WorkspaceFilesystem } from "../workspaces/workspace-filesystem.js";
import type { WorkspaceRegistry } from "../workspaces/workspace-registry.js";
import type {
  LatestResolvedRequestSummary,
  NotificationEvent,
  PendingRequestSummary,
  RequestDetailView,
  ThreadSummary,
  ThreadViewHelper,
  TimelineItem,
} from "./types.js";

function toThreadSummary(session: SessionRow): ThreadSummary {
  const hasPendingRequest = session.status === "waiting_approval";
  const acceptingUserInput = session.status === "waiting_input";

  let threadStatus = "idle";
  let latestTurnStatus: string | null = "completed";
  let activeFlags: string[] = [];
  let blockedReason: string | null = null;

  if (session.status === "created") {
    threadStatus = "created";
    latestTurnStatus = null;
    blockedReason = "thread_not_started";
  } else if (session.status === "running") {
    threadStatus = "running";
    latestTurnStatus = "running";
    activeFlags = ["turn_in_progress"];
    blockedReason = "turn_in_progress";
  } else if (session.status === "waiting_approval") {
    threadStatus = "running";
    latestTurnStatus = "running";
    activeFlags = ["waiting_on_request"];
    blockedReason = "waiting_on_request";
  } else if (session.status === "failed") {
    threadStatus = "error";
    latestTurnStatus = "failed";
    blockedReason = "system_error";
  } else if (session.status === "stopped") {
    threadStatus = "interrupted";
    latestTurnStatus = "interrupted";
    blockedReason = "thread_closed";
  }

  return {
    thread_id: session.sessionId,
    workspace_id: session.workspaceId,
    title: session.title,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
    native_status: {
      thread_status: threadStatus,
      active_flags: activeFlags,
      latest_turn_status: latestTurnStatus,
    },
    derived_hints: {
      accepting_user_input: acceptingUserInput,
      has_pending_request: hasPendingRequest,
      blocked_reason: blockedReason,
    },
  };
}

function summarizeTimelineEvent(event: SessionEventProjection): string {
  switch (event.event_type) {
    case "message.user":
      return "user input accepted";
    case "message.assistant.delta":
      return "assistant streaming";
    case "message.assistant.completed":
      return "assistant completed";
    case "approval.requested":
      return "request pending";
    case "approval.resolved":
      return "request resolved";
    case "session.status_changed":
      return "thread status changed";
    default:
      return event.event_type;
  }
}

function toTimelineItem(event: SessionEventProjection): TimelineItem {
  const payload = event.payload as Record<string, unknown>;
  const requestId = typeof payload.approval_id === "string" ? payload.approval_id : null;

  return {
    timeline_item_id: event.event_id,
    thread_id: event.session_id,
    sequence: event.sequence,
    item_kind: event.event_type,
    occurred_at: event.occurred_at,
    summary: summarizeTimelineEvent(event),
    request_id: requestId,
  };
}

function toPendingRequestSummary(approval: ApprovalProjection): PendingRequestSummary {
  return {
    request_id: approval.approval_id,
    thread_id: approval.session_id,
    turn_id: null,
    item_id: approval.approval_id,
    request_kind: approval.native_request_kind,
    status: approval.status,
    risk_classification: approval.approval_category,
    summary: approval.summary,
    requested_at: approval.created_at,
  };
}

function toLatestResolvedRequestSummary(
  approval: ApprovalProjection,
): LatestResolvedRequestSummary | null {
  if (
    approval.status === "pending" ||
    approval.resolution === null ||
    approval.resolved_at === null
  ) {
    return null;
  }

  return {
    request_id: approval.approval_id,
    thread_id: approval.session_id,
    turn_id: null,
    item_id: approval.approval_id,
    request_kind: approval.native_request_kind,
    status: "resolved",
    decision: approval.resolution,
    requested_at: approval.created_at,
    responded_at: approval.resolved_at,
  };
}

function toRequestDetailView(approval: ApprovalProjection): RequestDetailView {
  return {
    request_id: approval.approval_id,
    thread_id: approval.session_id,
    turn_id: null,
    item_id: approval.approval_id,
    request_kind: approval.native_request_kind,
    status: approval.status === "pending" ? approval.status : "resolved",
    decision: approval.resolution,
    risk_classification: approval.approval_category,
    operation_summary: approval.operation_summary,
    reason: approval.reason,
    summary: approval.summary,
    requested_at: approval.created_at,
    responded_at: approval.resolved_at,
  };
}

function deriveThreadTitle(content: string) {
  const compact = content.replace(/\s+/g, " ").trim();
  return compact.length <= 48 ? compact : `${compact.slice(0, 45)}...`;
}

function generateMessageId() {
  return `msg_user_${crypto.randomUUID().replaceAll("-", "")}`;
}

function firstRow<T>(rows: T[]) {
  return rows[0] ?? null;
}

function asRuntimeError(error: unknown) {
  return error instanceof RuntimeError ? error : null;
}

function mapThreadInputError(error: unknown, threadId: string): never {
  const runtimeError = asRuntimeError(error);
  if (runtimeError === null) {
    throw error;
  }

  if (runtimeError.code === "session_not_found") {
    throw new RuntimeError(404, "thread_not_found", "thread was not found", {
      thread_id: threadId,
    });
  }

  if (runtimeError.code === "message_idempotency_conflict") {
    throw new RuntimeError(
      409,
      "idempotency_conflict",
      "client_request_id conflicts with a different input payload",
      {
        thread_id: threadId,
        client_request_id: runtimeError.details?.client_message_id ?? null,
      },
    );
  }

  if (
    runtimeError.code === "session_invalid_state" ||
    runtimeError.code === "session_conflict_active_exists"
  ) {
    throw new RuntimeError(
      409,
      "thread_not_accepting_input",
      "thread is not accepting user input",
      {
        thread_id: threadId,
        status: runtimeError.details?.current_status ?? runtimeError.details?.status ?? null,
        workspace_id: runtimeError.details?.workspace_id ?? null,
        active_thread_id: runtimeError.details?.active_session_id ?? null,
      },
    );
  }

  throw error;
}

function mapRequestError(error: unknown, requestId: string): never {
  const runtimeError = asRuntimeError(error);
  if (runtimeError === null) {
    throw error;
  }

  if (runtimeError.code === "approval_not_found") {
    throw new RuntimeError(404, "request_not_found", "request was not found", {
      request_id: requestId,
    });
  }

  if (runtimeError.code === "approval_not_pending") {
    throw new RuntimeError(409, "request_not_pending", "request is not pending", {
      request_id: requestId,
      status: runtimeError.details?.status ?? null,
    });
  }

  throw error;
}

function mapThreadInterruptError(error: unknown, threadId: string): never {
  const runtimeError = asRuntimeError(error);
  if (runtimeError === null) {
    throw error;
  }

  if (runtimeError.code === "session_not_found") {
    throw new RuntimeError(404, "thread_not_found", "thread was not found", {
      thread_id: threadId,
    });
  }

  if (runtimeError.code === "session_invalid_state") {
    throw new RuntimeError(409, "thread_not_interruptible", "thread is not interruptible", {
      thread_id: threadId,
      status: runtimeError.details?.current_status ?? runtimeError.details?.status ?? null,
    });
  }

  throw error;
}

export class ThreadService {
  constructor(
    private readonly database: RuntimeDatabase,
    private readonly workspaceRegistry: WorkspaceRegistry,
    private readonly workspaceFilesystem: WorkspaceFilesystem,
    private readonly sessionEventPublisher: SessionEventPublisher,
    private readonly nativeSessionGateway: NativeSessionGateway,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async listThreads(workspaceId: string) {
    await this.workspaceRegistry.getWorkspace(workspaceId);

    const items = this.database.db
      .select()
      .from(sessions)
      .where(eq(sessions.workspaceId, workspaceId))
      .orderBy(desc(sessions.updatedAt), desc(sessions.sessionId))
      .all();

    return {
      items: items.map((item) => toThreadSummary(item)),
      next_cursor: null,
      has_more: false,
    };
  }

  async getThread(threadId: string) {
    const thread = firstRow(
      this.database.db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionId, threadId))
        .limit(1)
        .all(),
    );

    if (!thread) {
      throw new RuntimeError(404, "thread_not_found", "thread was not found", {
        thread_id: threadId,
      });
    }

    return toThreadSummary(thread);
  }

  async startThreadFromInput(
    workspaceId: string,
    input: { client_request_id: string; content: string },
  ) {
    const workspace = await this.workspaceRegistry.getWorkspace(workspaceId);

    const existing =
      this.database.db
        .select()
        .from(threadInputRequests)
        .where(
          and(
            eq(threadInputRequests.workspaceId, workspaceId),
            eq(threadInputRequests.clientRequestId, input.client_request_id),
          ),
        )
        .limit(1)
        .all()[0] ?? null;

    if (existing) {
      if (existing.content !== input.content) {
        throw new RuntimeError(
          409,
          "idempotency_conflict",
          "client_request_id conflicts with a different input payload",
          {
            workspace_id: workspaceId,
            client_request_id: input.client_request_id,
          },
        );
      }

      return {
        thread: await this.getThread(existing.threadId),
      };
    }

    const threadId = await this.createThreadSession(
      workspaceId,
      workspace.directory_name,
      deriveThreadTitle(input.content),
    );
    await this.startThreadSession(threadId);
    await this.acceptThreadMessage(threadId, {
      client_message_id: input.client_request_id,
      content: input.content,
    });

    this.database.db
      .insert(threadInputRequests)
      .values({
        workspaceId,
        clientRequestId: input.client_request_id,
        threadId,
        content: input.content,
        createdAt: this.now().toISOString(),
      })
      .run();

    return {
      thread: await this.getThread(threadId),
    };
  }

  async acceptThreadInput(
    threadId: string,
    input: { client_request_id: string; content: string },
  ): Promise<{ thread: ThreadSummary; accepted_input: MessageProjection }> {
    let acceptedInput: MessageProjection;
    try {
      acceptedInput = await this.acceptThreadMessage(threadId, {
        client_message_id: input.client_request_id,
        content: input.content,
      });
    } catch (error) {
      mapThreadInputError(error, threadId);
    }

    return {
      thread: await this.getThread(threadId),
      accepted_input: acceptedInput,
    };
  }

  async openThread(threadId: string) {
    const thread = await this.getThread(threadId);
    return {
      thread_id: thread.thread_id,
      open_result: "opened" as const,
      native_status: thread.native_status,
      updated_at: thread.updated_at,
    };
  }

  async getThreadView(threadId: string): Promise<ThreadViewHelper> {
    const thread = await this.getThread(threadId);
    const pendingRequest = await this.getThreadPendingRequest(threadId);

    return {
      thread,
      pending_request: pendingRequest.pending_request,
      latest_resolved_request: pendingRequest.latest_resolved_request,
      checked_at: pendingRequest.checked_at,
    };
  }

  async listThreadFeed(threadId: string) {
    await this.getThread(threadId);
    const events = this.database.db
      .select()
      .from(sessionEvents)
      .where(eq(sessionEvents.sessionId, threadId))
      .orderBy(sessionEvents.sequence, sessionEvents.occurredAt)
      .all();

    return {
      items: events.map((event) => ({
        feed_entry_id: event.eventId,
        thread_id: event.sessionId,
        sequence: event.sequence,
        event_type: event.eventType,
        occurred_at: event.occurredAt,
        payload: JSON.parse(event.payload) as Record<string, unknown>,
      })),
      next_cursor: null,
      has_more: false,
    };
  }

  async listTimeline(threadId: string) {
    await this.getThread(threadId);
    const events = this.database.db
      .select()
      .from(sessionEvents)
      .where(eq(sessionEvents.sessionId, threadId))
      .orderBy(sessionEvents.sequence, sessionEvents.occurredAt)
      .all();

    return {
      items: events.map((event) =>
        toTimelineItem({
          event_id: event.eventId,
          session_id: event.sessionId,
          event_type: event.eventType as SessionEventProjection["event_type"],
          sequence: event.sequence,
          occurred_at: event.occurredAt,
          payload: JSON.parse(event.payload) as Record<string, unknown>,
          native_event_name: event.nativeEventName,
        }),
      ),
      next_cursor: null,
      has_more: false,
    };
  }

  async getThreadPendingRequest(threadId: string) {
    await this.getThread(threadId);

    const threadApprovals = this.database.db
      .select()
      .from(approvals)
      .where(eq(approvals.sessionId, threadId))
      .orderBy(desc(approvals.createdAt), desc(approvals.approvalId))
      .all()
      .map((approval) => this.mapApprovalRow(approval));
    const pending = threadApprovals.find((approval) => approval.status === "pending") ?? null;
    const latestResolved =
      threadApprovals
        .filter((approval) => approval.status !== "pending" && approval.resolved_at !== null)
        .sort((left, right) =>
          (right.resolved_at ?? "").localeCompare(left.resolved_at ?? ""),
        )[0] ?? null;

    return {
      thread_id: threadId,
      pending_request: pending ? toPendingRequestSummary(pending) : null,
      latest_resolved_request:
        pending || latestResolved === null ? null : toLatestResolvedRequestSummary(latestResolved),
      checked_at: this.now().toISOString(),
    };
  }

  async getRequestDetail(requestId: string) {
    const approval = firstRow(
      this.database.db
        .select()
        .from(approvals)
        .where(eq(approvals.approvalId, requestId))
        .limit(1)
        .all(),
    );

    if (!approval) {
      throw new RuntimeError(404, "request_not_found", "request was not found", {
        request_id: requestId,
      });
    }

    return toRequestDetailView(this.mapApprovalRow(approval));
  }

  async respondToRequest(requestId: string, input: { decision: "approved" | "denied" }) {
    let result: {
      approval: ApprovalProjection;
      session: ThreadSummary;
    };
    try {
      result = await this.resolveThreadRequest(requestId, input.decision);
    } catch (error) {
      mapRequestError(error, requestId);
    }

    return {
      request: toRequestDetailView(result.approval),
      thread: result.session,
    };
  }

  async interruptThread(threadId: string) {
    let thread: SessionRow | null;
    try {
      thread = firstRow(
        this.database.db
          .select()
          .from(sessions)
          .where(eq(sessions.sessionId, threadId))
          .limit(1)
          .all(),
      );

      if (!thread) {
        throw new RuntimeError(404, "session_not_found", "session was not found", {
          session_id: threadId,
        });
      }

      const existingThread = thread;

      if (existingThread.currentTurnId === null || existingThread.status !== "running") {
        throw new RuntimeError(
          409,
          "session_invalid_state",
          "session is not ready to complete the current turn",
          {
            session_id: threadId,
            current_status: existingThread.status,
            current_turn_id: existingThread.currentTurnId,
            requested_turn_id: existingThread.currentTurnId,
          },
        );
      }

      await this.nativeSessionGateway.interruptSessionTurn({
        sessionId: threadId,
        turnId: existingThread.currentTurnId,
      });

      const interruptedAt = this.now().toISOString();

      this.database.sqlite.transaction(() => {
        this.database.db
          .update(sessions)
          .set({
            status: "waiting_input",
            updatedAt: interruptedAt,
            currentTurnId: null,
            pendingAssistantMessageId: null,
            appSessionOverlayState: "open",
          })
          .where(eq(sessions.sessionId, threadId))
          .run();

        this.database.db
          .update(workspaces)
          .set({
            updatedAt: interruptedAt,
          })
          .where(eq(workspaces.workspaceId, existingThread.workspaceId))
          .run();

        this.sessionEventPublisher.appendSessionStatusChangedEvent({
          sessionId: threadId,
          occurredAt: interruptedAt,
          fromStatus: existingThread.status as SessionStatus,
          toStatus: "waiting_input",
        });
      })();
    } catch (error) {
      mapThreadInterruptError(error, threadId);
    }

    return {
      thread: await this.getThread(threadId),
    };
  }

  subscribeThreadStream(threadId: string, listener: (event: SessionEventProjection) => void) {
    return this.sessionEventPublisher.subscribeSessionEvents(threadId, listener);
  }

  subscribeNotifications(listener: (event: NotificationEvent) => void) {
    return this.sessionEventPublisher.subscribeApprovalEvents((event) => {
      listener({
        thread_id: event.session_id,
        event_type: event.event_type,
        occurred_at: event.occurred_at,
        high_priority: true,
      });
    });
  }

  private async resolveThreadRequest(
    requestId: string,
    resolution: "approved" | "denied",
  ): Promise<{ approval: ApprovalProjection; session: ThreadSummary }> {
    const approval = firstRow(
      this.database.db
        .select()
        .from(approvals)
        .where(eq(approvals.approvalId, requestId))
        .limit(1)
        .all(),
    );

    if (!approval) {
      throw new RuntimeError(404, "approval_not_found", "approval was not found", {
        approval_id: requestId,
      });
    }

    if (approval.status !== "pending") {
      if (approval.resolution === resolution) {
        return {
          approval: this.mapApprovalRow(approval),
          session: await this.getThread(approval.sessionId),
        };
      }

      throw new RuntimeError(409, "approval_not_pending", "approval is not pending", {
        approval_id: requestId,
        status: approval.status,
      });
    }

    const session = firstRow(
      this.database.db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionId, approval.sessionId))
        .limit(1)
        .all(),
    );

    if (!session) {
      throw new RuntimeError(404, "session_not_found", "session was not found", {
        session_id: approval.sessionId,
      });
    }

    const resolvedAt = this.now().toISOString();
    const nextStatus = resolution === "approved" ? "running" : "waiting_input";
    const nextTurnId = resolution === "approved" ? session.currentTurnId : null;

    await this.nativeSessionGateway.resolveApproval({
      sessionId: approval.sessionId,
      approvalId: requestId,
      resolution,
    });

    this.database.sqlite.transaction(() => {
      this.database.db
        .update(approvals)
        .set({
          status: resolution,
          resolution,
          resolvedAt,
        })
        .where(eq(approvals.approvalId, requestId))
        .run();

      this.database.db
        .update(sessions)
        .set({
          status: nextStatus,
          updatedAt: resolvedAt,
          activeApprovalId: null,
          currentTurnId: nextTurnId,
          pendingAssistantMessageId:
            resolution === "approved" ? session.pendingAssistantMessageId : null,
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

      this.sessionEventPublisher.appendSessionEvent({
        sessionId: approval.sessionId,
        eventType: "approval.resolved",
        occurredAt: resolvedAt,
        payload: {
          approval_id: requestId,
          workspace_id: approval.workspaceId,
          approval_category: approval.approvalCategory,
          summary: approval.summary,
          resolution,
        },
      });

      this.sessionEventPublisher.appendSessionStatusChangedEvent({
        sessionId: approval.sessionId,
        occurredAt: resolvedAt,
        fromStatus: session.status as SessionStatus,
        toStatus: nextStatus,
      });
    })();

    return {
      approval: this.mapApprovalRow({
        ...approval,
        status: resolution,
        resolution,
        resolvedAt,
      }),
      session: await this.getThread(approval.sessionId),
    };
  }

  private mapApprovalRow(approval: ApprovalRow): ApprovalProjection {
    return {
      approval_id: approval.approvalId,
      session_id: approval.sessionId,
      workspace_id: approval.workspaceId,
      status: approval.status as ApprovalProjection["status"],
      resolution: approval.resolution as ApprovalProjection["resolution"],
      approval_category: approval.approvalCategory as ApprovalProjection["approval_category"],
      summary: approval.summary,
      reason: approval.reason,
      operation_summary: approval.operationSummary,
      context:
        approval.context === null
          ? null
          : (JSON.parse(approval.context) as Record<string, unknown>),
      created_at: approval.createdAt,
      resolved_at: approval.resolvedAt,
      native_request_kind: approval.nativeRequestKind,
    };
  }

  private async createThreadSession(workspaceId: string, directoryName: string, title: string) {
    const now = this.now().toISOString();
    const { sessionId } = await this.nativeSessionGateway.createSession({
      cwd: resolveWorkspaceSessionCwd(this.workspaceFilesystem.getWorkspaceRoot(), directoryName),
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
        pendingAssistantMessageId: null,
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

    return sessionId;
  }

  private async startThreadSession(threadId: string) {
    const thread = firstRow(
      this.database.db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionId, threadId))
        .limit(1)
        .all(),
    );

    if (!thread) {
      throw new RuntimeError(404, "session_not_found", "session was not found", {
        session_id: threadId,
      });
    }

    if (thread.status === "running" || thread.status === "waiting_input") {
      return this.getThread(threadId);
    }

    if (thread.status !== "created") {
      throw new RuntimeError(409, "session_invalid_state", "session is not startable", {
        session_id: threadId,
        status: thread.status,
      });
    }

    const now = this.now().toISOString();
    const readyAt = this.now().toISOString();

    this.database.sqlite.transaction(() => {
      this.database.db
        .update(sessions)
        .set({
          status: "running",
          updatedAt: now,
          startedAt: thread.startedAt ?? now,
          appSessionOverlayState: "open",
        })
        .where(eq(sessions.sessionId, threadId))
        .run();

      this.database.db
        .update(workspaces)
        .set({
          updatedAt: now,
        })
        .where(eq(workspaces.workspaceId, thread.workspaceId))
        .run();

      this.sessionEventPublisher.appendSessionStatusChangedEvent({
        sessionId: threadId,
        occurredAt: now,
        fromStatus: "created",
        toStatus: "running",
      });

      this.database.db
        .update(sessions)
        .set({
          status: "waiting_input",
          updatedAt: readyAt,
          appSessionOverlayState: "open",
        })
        .where(eq(sessions.sessionId, threadId))
        .run();

      this.database.db
        .update(workspaces)
        .set({
          updatedAt: readyAt,
        })
        .where(eq(workspaces.workspaceId, thread.workspaceId))
        .run();

      this.sessionEventPublisher.appendSessionStatusChangedEvent({
        sessionId: threadId,
        occurredAt: readyAt,
        fromStatus: "running",
        toStatus: "waiting_input",
      });
    })();

    return this.getThread(threadId);
  }

  private async acceptThreadMessage(
    threadId: string,
    input: {
      client_message_id: string;
      content: string;
    },
  ) {
    const existingMessage = firstRow(
      this.database.db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.sessionId, threadId),
            eq(messages.clientMessageId, input.client_message_id),
          ),
        )
        .limit(1)
        .all(),
    );

    if (existingMessage) {
      if (existingMessage.content !== input.content) {
        throw new RuntimeError(
          409,
          "message_idempotency_conflict",
          "client message id conflicts with a different message payload",
          {
            session_id: threadId,
            client_message_id: input.client_message_id,
          },
        );
      }

      return {
        message_id: existingMessage.messageId,
        session_id: existingMessage.sessionId,
        role: existingMessage.role as MessageProjection["role"],
        content: existingMessage.content,
        created_at: existingMessage.createdAt,
        source_item_type: existingMessage.sourceItemType as MessageProjection["source_item_type"],
      } satisfies MessageProjection;
    }

    const session = firstRow(
      this.database.db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionId, threadId))
        .limit(1)
        .all(),
    );

    if (!session) {
      throw new RuntimeError(404, "session_not_found", "session was not found", {
        session_id: threadId,
      });
    }

    if (session.status !== "waiting_input") {
      throw new RuntimeError(
        409,
        "session_invalid_state",
        "session is not ready to accept messages",
        {
          session_id: threadId,
          current_status: session.status,
        },
      );
    }

    const nativeTurn = await this.nativeSessionGateway.sendUserMessage({
      sessionId: threadId,
      content: input.content,
    });
    const userMessageId = generateMessageId();
    const userCreatedAt = this.now().toISOString();

    try {
      this.database.sqlite.transaction(() => {
        this.database.db
          .insert(messages)
          .values({
            messageId: userMessageId,
            sessionId: threadId,
            role: "user",
            content: input.content,
            createdAt: userCreatedAt,
            sourceItemType: "user_message",
            clientMessageId: input.client_message_id,
          })
          .run();

        this.sessionEventPublisher.appendSessionEvent({
          sessionId: threadId,
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
          .where(eq(sessions.sessionId, threadId))
          .run();

        this.database.db
          .update(workspaces)
          .set({
            updatedAt: userCreatedAt,
          })
          .where(eq(workspaces.workspaceId, session.workspaceId))
          .run();

        this.sessionEventPublisher.appendSessionStatusChangedEvent({
          sessionId: threadId,
          occurredAt: userCreatedAt,
          fromStatus: "waiting_input",
          toStatus: "running",
        });
      })();
    } catch (error) {
      try {
        this.markThreadRecoveryPending(
          threadId,
          session.workspaceId,
          userCreatedAt,
          nativeTurn.turnId,
        );
      } catch {
        // Keep the original post-native persistence failure as the primary error.
      }
      throw error;
    }

    return {
      message_id: userMessageId,
      session_id: threadId,
      role: "user",
      content: input.content,
      created_at: userCreatedAt,
      source_item_type: "user_message",
    } satisfies MessageProjection;
  }

  private markThreadRecoveryPending(
    threadId: string,
    workspaceId: string,
    updatedAt: string,
    currentTurnId: string,
  ) {
    this.database.sqlite.transaction(() => {
      this.database.db
        .update(sessions)
        .set({
          status: "running",
          updatedAt,
          lastMessageAt: updatedAt,
          currentTurnId,
          pendingAssistantMessageId: null,
          appSessionOverlayState: "recovery_pending",
        })
        .where(eq(sessions.sessionId, threadId))
        .run();

      this.database.db
        .update(workspaces)
        .set({
          updatedAt,
        })
        .where(eq(workspaces.workspaceId, workspaceId))
        .run();
    })();
  }
}
