import Fastify from "fastify";

import { type RuntimeConfig, resolveConfig } from "./config.js";
import { openRuntimeDatabase, type RuntimeDatabase } from "./db/database.js";
import {
  type AppServerController,
  AppServerSupervisor,
} from "./domain/app-server/app-server-supervisor.js";
import { CodexAppServerGateway } from "./domain/app-server/codex-app-server-gateway.js";
import {
  type NativeSessionGateway,
  SyntheticNativeSessionGateway,
} from "./domain/sessions/native-session-gateway.js";
import { SessionEventPublisher } from "./domain/sessions/session-event-publisher.js";
import { SessionService } from "./domain/sessions/session-service.js";
import { ThreadService } from "./domain/threads/thread-service.js";
import { WorkspaceFilesystem } from "./domain/workspaces/workspace-filesystem.js";
import { WorkspaceRegistry } from "./domain/workspaces/workspace-registry.js";
import { toErrorEnvelope } from "./errors.js";
import { registerThreadRoutes } from "./routes/threads.js";
import { registerWorkspaceRoutes } from "./routes/workspaces.js";

export interface RuntimeServices {
  workspaceRegistry: WorkspaceRegistry;
  sessionService: SessionService;
  threadService: ThreadService;
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
  let liveAppServerGateway: CodexAppServerGateway | null = null;
  const nativeSessionGateway =
    options.services?.nativeSessionGateway ??
    (runtimeConfig.appServerBridgeEnabled
      ? (() => {
          liveAppServerGateway = new CodexAppServerGateway({
            command: runtimeConfig.appServerCommand,
            args: runtimeConfig.appServerArgs,
            cwd: runtimeConfig.appServerCwd,
            env: process.env,
            approvalPolicy: runtimeConfig.appServerApprovalPolicy,
            sandbox: runtimeConfig.appServerSandbox,
            personality: runtimeConfig.appServerPersonality,
          });

          return liveAppServerGateway;
        })()
      : new SyntheticNativeSessionGateway());
  const sessionEventPublisher = new SessionEventPublisher(ownedDatabase);
  const sessionService =
    options.services?.sessionService ??
    new SessionService(
      ownedDatabase,
      workspaceRegistry,
      workspaceFilesystem,
      nativeSessionGateway,
      sessionEventPublisher,
    );
  const threadService =
    options.services?.threadService ??
    new ThreadService(
      ownedDatabase,
      workspaceRegistry,
      workspaceFilesystem,
      sessionEventPublisher,
      nativeSessionGateway,
    );
  liveAppServerGateway?.bindEventSink(sessionService);
  const appServerSupervisor =
    options.services?.appServerSupervisor ??
    liveAppServerGateway ??
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
    threadService,
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

  await registerWorkspaceRoutes(app, workspaceRegistry);
  await registerThreadRoutes(app, threadService);

  app.addHook("onClose", async () => {
    await appServerSupervisor.stop();

    if (!options.database) {
      ownedDatabase.sqlite.close();
    }
  });

  return app;
}
