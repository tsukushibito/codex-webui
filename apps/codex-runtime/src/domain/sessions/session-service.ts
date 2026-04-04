import { and, desc, eq, inArray } from "drizzle-orm";

import { RuntimeError } from "../../errors.js";
import type { RuntimeDatabase } from "../../db/database.js";
import { sessions, workspaces } from "../../db/schema.js";
import { WorkspaceRegistry } from "../workspaces/workspace-registry.js";
import { WorkspaceFilesystem } from "../workspaces/workspace-filesystem.js";
import {
  type NativeSessionGateway,
  resolveWorkspaceSessionCwd,
} from "./native-session-gateway.js";
import type {
  AppSessionOverlayState,
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
}
