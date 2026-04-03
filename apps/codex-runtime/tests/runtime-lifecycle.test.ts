import fs from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import type {
  AppServerController,
  AppServerSnapshot,
} from "../src/domain/app-server/app-server-supervisor.js";
import { createTempDatabase, createTempWorkspaceRoot } from "./helpers.js";

const cleanupPaths: string[] = [];

function createSnapshot(
  overrides: Partial<AppServerSnapshot> = {},
): AppServerSnapshot {
  return {
    status: "stopped",
    command: "codex",
    args: ["app-server"],
    pid: null,
    started_at: null,
    exited_at: null,
    exit_code: null,
    signal: null,
    ...overrides,
  };
}

afterEach(async () => {
  await Promise.all(
    cleanupPaths.splice(0).map((entryPath) =>
      fs.rm(entryPath, { recursive: true, force: true }),
    ),
  );
});

describe("runtime app-server lifecycle", () => {
  it("starts the managed app-server during runtime readiness", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    let ensureStartedCalls = 0;
    let stopCalls = 0;

    const appServerSupervisor: AppServerController = {
      getSnapshot() {
        return createSnapshot();
      },
      async ensureStarted() {
        ensureStartedCalls += 1;
        return createSnapshot({
          status: "running",
          pid: 1234,
          started_at: "2026-04-04T12:00:00.000Z",
        });
      },
      async stop() {
        stopCalls += 1;
        return createSnapshot();
      },
    };

    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
      },
      database,
      services: {
        appServerSupervisor,
      },
    });

    await app.ready();
    expect(ensureStartedCalls).toBe(1);

    await app.close();
    expect(stopCalls).toBe(1);
  });

  it("fails runtime readiness when the managed app-server cannot start", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    let ensureStartedCalls = 0;
    let stopCalls = 0;

    const appServerSupervisor: AppServerController = {
      getSnapshot() {
        return createSnapshot({
          status: "failed",
          exited_at: "2026-04-04T12:00:00.000Z",
        });
      },
      async ensureStarted() {
        ensureStartedCalls += 1;
        throw new Error("spawn failed");
      },
      async stop() {
        stopCalls += 1;
        return createSnapshot();
      },
    };

    const app = await buildApp({
      config: {
        workspaceRoot,
        databasePath: database.sqlite.name,
      },
      database,
      services: {
        appServerSupervisor,
      },
    });

    await expect(app.ready()).rejects.toThrow("spawn failed");
    expect(ensureStartedCalls).toBe(1);

    await app.close();
    expect(stopCalls).toBe(1);
  });
});
