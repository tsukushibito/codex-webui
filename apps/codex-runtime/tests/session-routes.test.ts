import fs from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import type { NativeSessionGateway } from "../src/domain/sessions/native-session-gateway.js";
import { createTempDatabase, createTempWorkspaceRoot } from "./helpers.js";

const cleanupPaths: string[] = [];

class StubNativeSessionGateway implements NativeSessionGateway {
  constructor(
    private readonly sessionIds: string[],
    readonly interrupts: Array<{ sessionId: string; turnId: string }> = [],
  ) {}

  async createSession() {
    const sessionId = this.sessionIds.shift();
    if (!sessionId) {
      throw new Error("no stub session id available");
    }

    return { sessionId };
  }

  async interruptSessionTurn(input: { sessionId: string; turnId: string }) {
    this.interrupts.push(input);
  }
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
});
