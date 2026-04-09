import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { createTempDatabase, createTempWorkspaceRoot } from "./helpers.js";

const cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    cleanupPaths.splice(0).map((entryPath) => fs.rm(entryPath, { recursive: true, force: true })),
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
    const missingWorkspaceRoot = path.join(os.tmpdir(), `missing-workspace-root-${Date.now()}`);
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
    await fs.symlink(path.join(workspaceRoot, "alpha"), path.join(workspaceRoot, "gamma"));

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
});
