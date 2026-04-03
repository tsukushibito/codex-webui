import crypto from "node:crypto";

import { and, desc, eq, inArray } from "drizzle-orm";

import { RuntimeError } from "../../errors.js";
import type { RuntimeDatabase } from "../../db/database.js";
import { workspaceSessionMappings, workspaces } from "../../db/schema.js";
import type { EligibleWorkspaceDirectory, WorkspaceSummary } from "./types.js";
import { validateWorkspaceName } from "./workspace-name.js";
import { WorkspaceFilesystem } from "./workspace-filesystem.js";

function toIsoString(date: Date) {
  return date.toISOString();
}

function mapWorkspaceSummary(record: typeof workspaces.$inferSelect): WorkspaceSummary {
  return {
    workspace_id: record.workspaceId,
    workspace_name: record.workspaceName,
    directory_name: record.directoryName,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    active_session_id: record.activeSessionId,
    active_session_summary: null,
    pending_approval_count: record.pendingApprovalCount,
  };
}

function firstRow<T>(rows: T[]) {
  return rows[0];
}

export class WorkspaceRegistry {
  constructor(
    private readonly database: RuntimeDatabase,
    private readonly workspaceFilesystem: WorkspaceFilesystem,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async listWorkspaces() {
    const eligibleDirectories = await this.workspaceFilesystem.listEligibleDirectories();
    const directoryNames = eligibleDirectories.map((directory) => directory.directoryName);

    if (directoryNames.length === 0) {
      return [];
    }

    const rows = this.database.db
      .select()
      .from(workspaces)
      .where(inArray(workspaces.directoryName, directoryNames))
      .orderBy(desc(workspaces.updatedAt), desc(workspaces.workspaceId))
      .all();

    return rows.map(mapWorkspaceSummary);
  }

  async getWorkspace(workspaceId: string) {
    const row = firstRow(
      this.database.db
        .select()
        .from(workspaces)
        .where(eq(workspaces.workspaceId, workspaceId))
        .limit(1)
        .all(),
    );

    if (!row) {
      throw new RuntimeError(404, "workspace_not_found", "workspace was not found", {
        workspace_id: workspaceId,
      });
    }

    return mapWorkspaceSummary(row);
  }

  async createWorkspace(workspaceName: string) {
    const validatedWorkspaceName = validateWorkspaceName(workspaceName);
    await this.workspaceFilesystem.ensureWorkspaceRootExists();

    const existingExactMatch = firstRow(
      this.database.db
        .select()
        .from(workspaces)
        .where(eq(workspaces.workspaceName, validatedWorkspaceName))
        .limit(1)
        .all(),
    );

    if (existingExactMatch) {
      throw new RuntimeError(409, "workspace_name_conflict", "workspace name already exists", {
        workspace_name: validatedWorkspaceName,
      });
    }

    const normalizedDirectoryName = validatedWorkspaceName;
    const existingDirectoryMatch = firstRow(
      this.database.db
        .select()
        .from(workspaces)
        .where(eq(workspaces.directoryName, normalizedDirectoryName))
        .limit(1)
        .all(),
    );

    if (existingDirectoryMatch) {
      throw new RuntimeError(
        409,
        "workspace_name_normalized_conflict",
        "workspace name normalization conflicts with an existing workspace",
        {
          workspace_name: validatedWorkspaceName,
          directory_name: normalizedDirectoryName,
        },
      );
    }

    if (await this.workspaceFilesystem.workspacePathExists(normalizedDirectoryName)) {
      throw new RuntimeError(
        409,
        "workspace_name_normalized_conflict",
        "workspace name normalization conflicts with an existing directory",
        {
          workspace_name: validatedWorkspaceName,
          directory_name: normalizedDirectoryName,
        },
      );
    }

    const now = toIsoString(this.now());
    const workspaceId = `ws_${crypto.randomUUID().replaceAll("-", "")}`;
    await this.workspaceFilesystem.createWorkspaceDirectory(normalizedDirectoryName);

    try {
      this.database.db
        .insert(workspaces)
        .values({
          workspaceId,
          workspaceName: validatedWorkspaceName,
          directoryName: normalizedDirectoryName,
          createdAt: now,
          updatedAt: now,
          activeSessionId: null,
          pendingApprovalCount: 0,
        })
        .run();
    } catch (error) {
      await this.workspaceFilesystem.removeWorkspaceDirectoryIfEmpty(
        normalizedDirectoryName,
      );
      throw error;
    }

    return this.getWorkspace(workspaceId);
  }

  async attachSession(workspaceId: string, sessionId: string) {
    await this.getWorkspace(workspaceId);

    const existingMapping = firstRow(
      this.database.db
        .select()
        .from(workspaceSessionMappings)
        .where(eq(workspaceSessionMappings.sessionId, sessionId))
        .limit(1)
        .all(),
    );

    if (existingMapping && existingMapping.workspaceId !== workspaceId) {
      throw new RuntimeError(
        409,
        "session_mapping_conflict",
        "session is already linked to another workspace",
        {
          session_id: sessionId,
          workspace_id: existingMapping.workspaceId,
        },
      );
    }

    if (existingMapping) {
      return;
    }

    this.database.db
      .insert(workspaceSessionMappings)
      .values({
        workspaceId,
        sessionId,
        linkedAt: toIsoString(this.now()),
      })
      .run();
  }

  async listSessionIdsForWorkspace(workspaceId: string) {
    await this.getWorkspace(workspaceId);

    return this.database.db
      .select({
        sessionId: workspaceSessionMappings.sessionId,
      })
      .from(workspaceSessionMappings)
      .where(eq(workspaceSessionMappings.workspaceId, workspaceId))
      .all()
      .map((row) => row.sessionId)
      .sort();
  }

  async getWorkspaceIdForSession(sessionId: string) {
    const mapping = firstRow(
      this.database.db
        .select()
        .from(workspaceSessionMappings)
        .where(eq(workspaceSessionMappings.sessionId, sessionId))
        .limit(1)
        .all(),
    );

    return mapping?.workspaceId ?? null;
  }

  async hasSessionLink(workspaceId: string, sessionId: string) {
    const mapping = firstRow(
      this.database.db
        .select()
        .from(workspaceSessionMappings)
        .where(
          and(
            eq(workspaceSessionMappings.workspaceId, workspaceId),
            eq(workspaceSessionMappings.sessionId, sessionId),
          ),
        )
        .limit(1)
        .all(),
    );

    return Boolean(mapping);
  }

  async listEligibleWorkspaceDirectories(): Promise<EligibleWorkspaceDirectory[]> {
    return this.workspaceFilesystem.listEligibleDirectories();
  }
}
