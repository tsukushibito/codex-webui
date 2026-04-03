import path from "node:path";

export interface RuntimeConfig {
  host: string;
  port: number;
  workspaceRoot: string;
  databasePath: string;
  appServerCommand: string;
  appServerArgs: string[];
  appServerCwd?: string;
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

export function resolveConfig(
  overrides: Partial<RuntimeConfig> = {},
): RuntimeConfig {
  const cwd = process.cwd();

  return {
    host: overrides.host ?? process.env.HOST ?? "127.0.0.1",
    port:
      overrides.port ??
      Number.parseInt(process.env.PORT ?? "8787", 10),
    workspaceRoot:
      overrides.workspaceRoot ??
      process.env.CODEX_WEBUI_WORKSPACE_ROOT ??
      path.resolve(cwd, "var/workspaces"),
    databasePath:
      overrides.databasePath ??
      process.env.CODEX_WEBUI_DATABASE_PATH ??
      path.resolve(cwd, "var/data/codex-runtime.sqlite"),
    appServerCommand:
      overrides.appServerCommand ??
      process.env.CODEX_APP_SERVER_COMMAND ??
      "codex",
    appServerArgs:
      overrides.appServerArgs ??
      parseAppServerArgs(process.env.CODEX_APP_SERVER_ARGS),
    appServerCwd:
      overrides.appServerCwd ??
      process.env.CODEX_APP_SERVER_CWD,
  };
}
