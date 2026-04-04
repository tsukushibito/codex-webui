const DEFAULT_RUNTIME_BASE_URL = "http://127.0.0.1:3001";

export interface FrontendBffConfig {
  runtimeBaseUrl: string;
}

export function resolveConfig(): FrontendBffConfig {
  return {
    runtimeBaseUrl:
      process.env.CODEX_WEBUI_RUNTIME_BASE_URL?.trim() || DEFAULT_RUNTIME_BASE_URL,
  };
}
