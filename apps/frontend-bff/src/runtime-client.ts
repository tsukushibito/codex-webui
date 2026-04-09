import { resolveConfig } from "./config";
import { BffError, isErrorEnvelope } from "./errors";

interface RuntimeJsonResult<T> {
  status: number;
  body: T;
}

export class RuntimeClient {
  private readonly runtimeBaseUrl: string;

  constructor(runtimeBaseUrl = resolveConfig().runtimeBaseUrl) {
    this.runtimeBaseUrl = runtimeBaseUrl.endsWith("/")
      ? runtimeBaseUrl.slice(0, -1)
      : runtimeBaseUrl;
  }

  async requestJson<T>(
    path: string,
    init: {
      method?: string;
      body?: unknown;
    } = {},
  ): Promise<RuntimeJsonResult<T>> {
    const headers = new Headers({
      accept: "application/json",
    });

    let body: string | undefined;
    if (init.body !== undefined) {
      headers.set("content-type", "application/json");
      body = JSON.stringify(init.body);
    }

    let response: Response;
    try {
      response = await fetch(`${this.runtimeBaseUrl}${path}`, {
        method: init.method,
        headers,
        body,
        cache: "no-store",
      });
    } catch (error) {
      throw new BffError(
        503,
        "session_runtime_error",
        "backend dependency temporarily unavailable",
        {
          cause: error instanceof Error ? error.message : "failed to connect to codex-runtime",
        },
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new BffError(
        500,
        "internal_server_error",
        "codex-runtime returned a non-JSON response",
      );
    }

    if (!response.ok && !isErrorEnvelope(payload)) {
      throw new BffError(
        500,
        "internal_server_error",
        "codex-runtime returned an invalid error payload",
      );
    }

    return {
      status: response.status,
      body: payload as T,
    };
  }

  async requestStream(path: string) {
    let response: Response;
    try {
      response = await fetch(`${this.runtimeBaseUrl}${path}`, {
        headers: {
          accept: "text/event-stream",
        },
        cache: "no-store",
      });
    } catch (error) {
      throw new BffError(
        503,
        "session_runtime_error",
        "backend dependency temporarily unavailable",
        {
          cause: error instanceof Error ? error.message : "failed to connect to codex-runtime",
        },
      );
    }

    return response;
  }
}
