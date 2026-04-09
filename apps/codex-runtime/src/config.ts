import path from "node:path";

export interface RuntimeConfig {
  host: string;
  port: number;
  workspaceRoot: string;
  databasePath: string;
  appServerCommand: string;
  appServerArgs: string[];
  appServerCwd?: string;
  appServerBridgeEnabled: boolean;
  appServerApprovalPolicy: string;
  appServerSandbox: string;
  appServerPersonality: string;
}

function parseBooleanFlag(rawValue: string | undefined, defaultValue: boolean) {
  if (rawValue === undefined) {
    return defaultValue;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }

  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }

  return defaultValue;
}

function parseAppServerArgs(rawValue: string | undefined): string[] {
  if (!rawValue) {
    return ["app-server"];
  }

  return rawValue
    .split(" ")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export function resolveConfig(overrides: Partial<RuntimeConfig> = {}): RuntimeConfig {
  const cwd = process.cwd();

  return {
    host: overrides.host ?? process.env.HOST ?? "127.0.0.1",
    port: overrides.port ?? Number.parseInt(process.env.PORT ?? "8787", 10),
    workspaceRoot:
      overrides.workspaceRoot ??
      process.env.CODEX_WEBUI_WORKSPACE_ROOT ??
      path.resolve(cwd, "var/workspaces"),
    databasePath:
      overrides.databasePath ??
      process.env.CODEX_WEBUI_DATABASE_PATH ??
      path.resolve(cwd, "var/data/codex-runtime.sqlite"),
    appServerCommand: overrides.appServerCommand ?? process.env.CODEX_APP_SERVER_COMMAND ?? "codex",
    appServerArgs: overrides.appServerArgs ?? parseAppServerArgs(process.env.CODEX_APP_SERVER_ARGS),
    appServerCwd: overrides.appServerCwd ?? process.env.CODEX_APP_SERVER_CWD,
    appServerBridgeEnabled:
      overrides.appServerBridgeEnabled ??
      parseBooleanFlag(process.env.CODEX_WEBUI_APP_SERVER_BRIDGE_ENABLED, false),
    appServerApprovalPolicy:
      overrides.appServerApprovalPolicy ??
      process.env.CODEX_WEBUI_APP_SERVER_APPROVAL_POLICY ??
      "untrusted",
    appServerSandbox:
      overrides.appServerSandbox ??
      process.env.CODEX_WEBUI_APP_SERVER_SANDBOX ??
      "danger-full-access",
    appServerPersonality:
      overrides.appServerPersonality ??
      process.env.CODEX_WEBUI_APP_SERVER_PERSONALITY ??
      "pragmatic",
  };
}
