import Fastify from "fastify";

import { resolveConfig, type RuntimeConfig } from "./config.js";
import { openRuntimeDatabase, type RuntimeDatabase } from "./db/database.js";
import { toErrorEnvelope } from "./errors.js";
import {
  AppServerSupervisor,
  type AppServerController,
} from "./domain/app-server/app-server-supervisor.js";
import {
  SyntheticNativeSessionGateway,
  type NativeSessionGateway,
} from "./domain/sessions/native-session-gateway.js";
import { SessionService } from "./domain/sessions/session-service.js";
import { WorkspaceFilesystem } from "./domain/workspaces/workspace-filesystem.js";
import { WorkspaceRegistry } from "./domain/workspaces/workspace-registry.js";
import { registerApprovalRoutes } from "./routes/approvals.js";
import { registerSessionRoutes } from "./routes/sessions.js";
import { registerWorkspaceRoutes } from "./routes/workspaces.js";

export interface RuntimeServices {
  workspaceRegistry: WorkspaceRegistry;
  sessionService: SessionService;
  appServerSupervisor: AppServerController;
  nativeSessionGateway: NativeSessionGateway;
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
  const nativeSessionGateway =
    options.services?.nativeSessionGateway ?? new SyntheticNativeSessionGateway();
  const sessionService =
    options.services?.sessionService ??
    new SessionService(
      ownedDatabase,
      workspaceRegistry,
      workspaceFilesystem,
      nativeSessionGateway,
    );
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
    sessionService,
    appServerSupervisor,
    nativeSessionGateway,
  });

  app.addHook("onReady", async () => {
    await appServerSupervisor.ensureStarted();
  });

  app.setErrorHandler((error, _request, reply) => {
    const { statusCode, body } = toErrorEnvelope(error);
    reply.status(statusCode).send(body);
  });

  await registerApprovalRoutes(app, sessionService);
  await registerWorkspaceRoutes(app, workspaceRegistry);
  await registerSessionRoutes(app, sessionService);

  app.addHook("onClose", async () => {
    await appServerSupervisor.stop();

    if (!options.database) {
      ownedDatabase.sqlite.close();
    }
  });

  return app;
}
