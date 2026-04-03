import Fastify from "fastify";

import { resolveConfig, type RuntimeConfig } from "./config.js";
import { openRuntimeDatabase, type RuntimeDatabase } from "./db/database.js";
import { toErrorEnvelope } from "./errors.js";
import {
  AppServerSupervisor,
  type AppServerController,
} from "./domain/app-server/app-server-supervisor.js";
import { WorkspaceFilesystem } from "./domain/workspaces/workspace-filesystem.js";
import { WorkspaceRegistry } from "./domain/workspaces/workspace-registry.js";
import { registerWorkspaceRoutes } from "./routes/workspaces.js";

export interface RuntimeServices {
  workspaceRegistry: WorkspaceRegistry;
  appServerSupervisor: AppServerController;
}

export interface BuildAppOptions {
  config?: Partial<RuntimeConfig>;
  database?: RuntimeDatabase;
  services?: Partial<RuntimeServices>;
}

declare module "fastify" {
  interface FastifyInstance {
    runtimeConfig: RuntimeConfig;
    runtimeServices: RuntimeServices;
  }
}

export async function buildApp(options: BuildAppOptions = {}) {
  const runtimeConfig = resolveConfig(options.config);
  const ownedDatabase = options.database ?? openRuntimeDatabase(runtimeConfig.databasePath);
  const workspaceFilesystem = new WorkspaceFilesystem(runtimeConfig.workspaceRoot);
  const workspaceRegistry =
    options.services?.workspaceRegistry ??
    new WorkspaceRegistry(ownedDatabase, workspaceFilesystem);
  const appServerSupervisor =
    options.services?.appServerSupervisor ??
    new AppServerSupervisor({
      command: runtimeConfig.appServerCommand,
      args: runtimeConfig.appServerArgs,
      cwd: runtimeConfig.appServerCwd,
      env: process.env,
    });

  const app = Fastify({
    logger: false,
  });

  app.decorate("runtimeConfig", runtimeConfig);
  app.decorate("runtimeServices", {
    workspaceRegistry,
    appServerSupervisor,
  });

  app.addHook("onReady", async () => {
    await appServerSupervisor.ensureStarted();
  });

  app.setErrorHandler((error, _request, reply) => {
    const { statusCode, body } = toErrorEnvelope(error);
    reply.status(statusCode).send(body);
  });

  await registerWorkspaceRoutes(app, workspaceRegistry);

  app.addHook("onClose", async () => {
    await appServerSupervisor.stop();

    if (!options.database) {
      ownedDatabase.sqlite.close();
    }
  });

  return app;
}
