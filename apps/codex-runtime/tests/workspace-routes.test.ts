import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { approvals, sessions, workspaces } from "../src/db/schema.js";
import { createTempDatabase, createTempWorkspaceRoot } from "./helpers.js";

const cleanupPaths: string[] = [];

function seedWorkspaceRecoveryState(
  database: Awaited<ReturnType<typeof createTempDatabase>>,
  options: {
    workspaceId?: string;
    activeSessionId?: string | null;
    activeSessionStatus?: "running" | "waiting_approval";
    staleSessionId?: string | null;
    pendingApprovalCount?: number;
    pendingApprovalForActiveSession?: boolean;
  } = {},
) {
  const workspaceId = options.workspaceId ?? "ws_alpha";
  const activeSessionId = options.activeSessionId ?? "thread_active";
  const staleSessionId =
    Object.prototype.hasOwnProperty.call(options, "staleSessionId")
      ? (options.staleSessionId ?? null)
      : "thread_stale";
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
      pendingApprovalCount: options.pendingApprovalCount ?? 0,
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
      activeApprovalId:
        options.pendingApprovalForActiveSession ?? false ? "apr_pending_001" : null,
      currentTurnId: options.activeSessionStatus === "running" ? "turn_001" : "turn_approval",
      pendingAssistantMessageId: null,
      appSessionOverlayState: "open",
    })
    .run();

  if (options.pendingApprovalForActiveSession ?? false) {
    database.db
      .insert(approvals)
      .values({
        approvalId: "apr_pending_001",
        sessionId: activeSessionId,
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

  return { workspaceId, activeSessionId, staleSessionId };
}

afterEach(async () => {
  await Promise.all(
    cleanupPaths.splice(0).map((entryPath) =>
      fs.rm(entryPath, { recursive: true, force: true }),
    ),
  );
});

describe("workspace routes", () => {
  it("creates and lists workspaces through the internal API", async () => {
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
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/workspaces",
      payload: {
        workspace_name: "alpha",
      },
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      workspace_name: "alpha",
      directory_name: "alpha",
      active_session_id: null,
      pending_approval_count: 0,
    });

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/v1/workspaces",
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({
      has_more: false,
      next_cursor: null,
      items: [
        {
          workspace_name: "alpha",
          directory_name: "alpha",
        },
      ],
    });

    await app.close();
  });

  it("returns the common error envelope for invalid workspace names", async () => {
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
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/workspaces",
      payload: {
        workspace_name: "Alpha",
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      error: {
        code: "workspace_name_invalid",
        message:
          "workspace name must be 1-64 characters of lowercase letters, digits, hyphen, or underscore",
        details: {},
      },
    });

    await app.close();
  });

  it("returns workspace_root_not_found when the workspace root is missing", async () => {
    const missingWorkspaceRoot = path.join(
      os.tmpdir(),
      `missing-workspace-root-${Date.now()}`,
    );
    const database = await createTempDatabase("workspace-db");
    cleanupPaths.push(path.dirname(database.sqlite.name));

    const app = await buildApp({
      config: {
        workspaceRoot: missingWorkspaceRoot,
        databasePath: database.sqlite.name,
        appServerCommand: process.execPath,
        appServerArgs: ["-e", "process.exit(0)"],
      },
      database,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/workspaces",
      payload: {
        workspace_name: "alpha",
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: "workspace_root_not_found",
        message: "workspace root directory does not exist",
        details: {
          workspace_root: missingWorkspaceRoot,
        },
      },
    });

    await app.close();
  });

  it("filters persisted workspaces whose directories are hidden, unreadable, or symlinked", async () => {
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
    });

    for (const workspaceName of ["alpha", "beta", "gamma"]) {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/workspaces",
        payload: {
          workspace_name: workspaceName,
        },
      });

      expect(response.statusCode).toBe(201);
    }

    await fs.rename(path.join(workspaceRoot, "beta"), path.join(workspaceRoot, ".beta"));
    await fs.rm(path.join(workspaceRoot, "gamma"), { recursive: true });
    await fs.symlink(
      path.join(workspaceRoot, "alpha"),
      path.join(workspaceRoot, "gamma"),
    );

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/v1/workspaces",
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({
      has_more: false,
      next_cursor: null,
      items: [
        {
          workspace_name: "alpha",
          directory_name: "alpha",
          active_session_id: null,
          active_session_summary: null,
          pending_approval_count: 0,
        },
      ],
    });

    await app.close();
  });

  it("reconciles a stale active session pointer to the persisted active session", async () => {
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
    });

    const { workspaceId, activeSessionId, staleSessionId } = seedWorkspaceRecoveryState(
      database,
    );

    const beforeResponse = await app.inject({
      method: "GET",
      url: `/api/v1/workspaces/${workspaceId}`,
    });

    expect(beforeResponse.statusCode).toBe(200);
    expect(beforeResponse.json()).toMatchObject({
      active_session_id: staleSessionId,
      active_session_summary: {
        session_id: staleSessionId,
        status: "waiting_input",
      },
      pending_approval_count: 0,
    });

    const reconcileResponse = await app.inject({
      method: "POST",
      url: `/api/v1/workspaces/${workspaceId}/reconcile`,
      payload: {},
    });

    expect(reconcileResponse.statusCode).toBe(200);
    expect(reconcileResponse.json()).toMatchObject({
      active_session_id: activeSessionId,
      active_session_summary: {
        session_id: activeSessionId,
        status: "running",
      },
      pending_approval_count: 0,
    });

    await app.close();
  });

  it("relinks a missing active session and recomputes pending approval count", async () => {
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
    });

    const { workspaceId, activeSessionId } = seedWorkspaceRecoveryState(database, {
      staleSessionId: null,
      activeSessionStatus: "waiting_approval",
      pendingApprovalCount: 0,
      pendingApprovalForActiveSession: true,
    });

    const beforeResponse = await app.inject({
      method: "GET",
      url: `/api/v1/workspaces/${workspaceId}`,
    });

    expect(beforeResponse.statusCode).toBe(200);
    expect(beforeResponse.json()).toMatchObject({
      active_session_id: null,
      active_session_summary: null,
      pending_approval_count: 0,
    });

    const reconcileResponse = await app.inject({
      method: "POST",
      url: `/api/v1/workspaces/${workspaceId}/reconcile`,
      payload: {},
    });

    expect(reconcileResponse.statusCode).toBe(200);
    expect(reconcileResponse.json()).toMatchObject({
      active_session_id: activeSessionId,
      active_session_summary: {
        session_id: activeSessionId,
        status: "waiting_approval",
      },
      pending_approval_count: 1,
    });

    await app.close();
  });
});
