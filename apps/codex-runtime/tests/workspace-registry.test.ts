import fs from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { AppServerSupervisor } from "../src/domain/app-server/app-server-supervisor.js";
import { WorkspaceFilesystem } from "../src/domain/workspaces/workspace-filesystem.js";
import { WorkspaceRegistry } from "../src/domain/workspaces/workspace-registry.js";
import type { RuntimeError } from "../src/errors.js";
import { createTempDatabase, createTempWorkspaceRoot } from "./helpers.js";

const cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    cleanupPaths.splice(0).map((entryPath) => fs.rm(entryPath, { recursive: true, force: true })),
  );
});

describe("WorkspaceRegistry", () => {
  it("creates and lists workspaces with stable persisted data", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const registry = new WorkspaceRegistry(
      database,
      new WorkspaceFilesystem(workspaceRoot),
      () => new Date("2026-04-04T12:00:00.000Z"),
    );

    const created = await registry.createWorkspace("alpha");
    const listed = await registry.listWorkspaces();

    expect(created.workspace_name).toBe("alpha");
    expect(created.directory_name).toBe("alpha");
    expect(listed).toHaveLength(1);
    expect(await fs.stat(path.join(workspaceRoot, "alpha"))).toBeTruthy();
  });

  it("stores workspace-session mappings for follow-up session lifecycle work", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const registry = new WorkspaceRegistry(
      database,
      new WorkspaceFilesystem(workspaceRoot),
      () => new Date("2026-04-04T12:00:00.000Z"),
    );

    const workspace = await registry.createWorkspace("alpha");
    await registry.attachSession(workspace.workspace_id, "thread_001");

    expect(await registry.listSessionIdsForWorkspace(workspace.workspace_id)).toEqual([
      "thread_001",
    ]);
    expect(await registry.getWorkspaceIdForSession("thread_001")).toBe(workspace.workspace_id);
  });

  it("rejects invalid workspace names", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const registry = new WorkspaceRegistry(database, new WorkspaceFilesystem(workspaceRoot));

    await expect(registry.createWorkspace("Alpha")).rejects.toMatchObject({
      code: "workspace_name_invalid",
      statusCode: 422,
    } satisfies Partial<RuntimeError>);
  });

  it("rejects reserved workspace names", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const registry = new WorkspaceRegistry(database, new WorkspaceFilesystem(workspaceRoot));

    await expect(registry.createWorkspace("node_modules")).rejects.toMatchObject({
      code: "workspace_name_reserved",
      statusCode: 422,
    } satisfies Partial<RuntimeError>);
  });

  it("rejects duplicate workspace names already persisted in the registry", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const registry = new WorkspaceRegistry(database, new WorkspaceFilesystem(workspaceRoot));

    await registry.createWorkspace("alpha");

    await expect(registry.createWorkspace("alpha")).rejects.toMatchObject({
      code: "workspace_name_conflict",
      statusCode: 409,
    } satisfies Partial<RuntimeError>);
  });

  it("rejects normalized conflicts with existing workspace directories", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    await fs.mkdir(path.join(workspaceRoot, "alpha"));

    const registry = new WorkspaceRegistry(database, new WorkspaceFilesystem(workspaceRoot));

    await expect(registry.createWorkspace("alpha")).rejects.toMatchObject({
      code: "workspace_name_normalized_conflict",
      statusCode: 409,
    } satisfies Partial<RuntimeError>);
  });

  it("does not introduce active-session enforcement during workspace creation", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    const database = await createTempDatabase("workspace-db");
    cleanupPaths.push(workspaceRoot, path.dirname(database.sqlite.name));

    const registry = new WorkspaceRegistry(database, new WorkspaceFilesystem(workspaceRoot));

    const alpha = await registry.createWorkspace("alpha");
    await registry.attachSession(alpha.workspace_id, "thread_001");
    const beta = await registry.createWorkspace("beta");

    expect(beta.workspace_name).toBe("beta");
    expect(await registry.listSessionIdsForWorkspace(alpha.workspace_id)).toEqual(["thread_001"]);
  });
});

describe("WorkspaceFilesystem", () => {
  it("filters hidden directories, files, and symlinks from eligible directory enumeration", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    cleanupPaths.push(workspaceRoot);

    await fs.mkdir(path.join(workspaceRoot, "visible"));
    await fs.mkdir(path.join(workspaceRoot, ".hidden"));
    await fs.writeFile(path.join(workspaceRoot, "plain-file"), "x", "utf8");
    await fs.symlink(path.join(workspaceRoot, "visible"), path.join(workspaceRoot, "visible-link"));

    const filesystem = new WorkspaceFilesystem(workspaceRoot);
    const directories = await filesystem.listEligibleDirectories();

    expect(directories.map((directory) => directory.directoryName)).toEqual(["visible"]);
  });

  it("skips unreadable directories instead of failing enumeration", async () => {
    const workspaceRoot = await createTempWorkspaceRoot("workspace-root");
    cleanupPaths.push(workspaceRoot);

    await fs.mkdir(path.join(workspaceRoot, "readable"));
    const unreadablePath = path.join(workspaceRoot, "unreadable");
    await fs.mkdir(unreadablePath);
    await fs.chmod(unreadablePath, 0o000);

    const filesystem = new WorkspaceFilesystem(workspaceRoot);

    try {
      const directories = await filesystem.listEligibleDirectories();
      expect(directories.map((directory) => directory.directoryName)).toEqual(["readable"]);
    } finally {
      await fs.chmod(unreadablePath, 0o755);
    }
  });
});

describe("AppServerSupervisor", () => {
  it("starts and stops a configured child process", async () => {
    const supervisor = new AppServerSupervisor({
      command: process.execPath,
      args: ["-e", "setInterval(() => {}, 1000)"],
      stopTimeoutMs: 1_000,
    });

    const started = await supervisor.ensureStarted();
    expect(started.status).toBe("running");
    expect(started.pid).toBeTypeOf("number");

    const stopped = await supervisor.stop();
    expect(stopped.status).toBe("stopped");
    expect(stopped.pid).toBeNull();
  });
});
