import { logLiveChatDebug } from "../debug";
import { toErrorResponse } from "../errors";
import { mapNotificationEvent, mapThreadStreamEvent } from "../mappings";
import type { RuntimeNotificationEvent, RuntimeSessionEventProjection } from "../runtime-types";
import { type ActiveRuntimeErrorMapping, parseRuntimeErrorResponse, runtimeClient } from "./shared";

function encodeSseData(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function mapSseChunk<TInput, TOutput>(
  path: string,
  chunk: string,
  mapper: (value: TInput) => TOutput,
) {
  const trimmed = chunk.trimEnd();
  if (trimmed.length === 0) {
    return "";
  }

  if (trimmed.startsWith(":")) {
    return `${trimmed}\n\n`;
  }

  const dataLines = trimmed
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trimStart());

  if (dataLines.length === 0) {
    return `${trimmed}\n\n`;
  }

  const mappedValue = mapper(JSON.parse(dataLines.join("\n")) as TInput);
  if (typeof mappedValue === "object" && mappedValue !== null) {
    const event = mappedValue as Record<string, unknown>;
    logLiveChatDebug("sse-relay", "relaying sse event", {
      path,
      event_type: typeof event.event_type === "string" ? event.event_type : null,
      session_id: typeof event.session_id === "string" ? event.session_id : null,
      sequence: typeof event.sequence === "number" ? event.sequence : null,
    });
  }

  return encodeSseData(mappedValue);
}

function createSseRelayStream<TInput, TOutput>(
  path: string,
  source: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  mapper: (value: TInput) => TOutput,
) {
  const reader = source.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let closed = false;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  function flushBufferedChunk(controller: ReadableStreamDefaultController<Uint8Array>) {
    if (buffer.length === 0) {
      return;
    }

    const mappedChunk = mapSseChunk(path, buffer, mapper);
    if (mappedChunk.length > 0) {
      controller.enqueue(encoder.encode(mappedChunk));
    }
    buffer = "";
  }

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const cleanup = () => {
        if (closed) {
          return;
        }

        closed = true;
        if (heartbeatTimer !== null) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        signal.removeEventListener("abort", handleAbort);
      };

      const handleAbort = () => {
        logLiveChatDebug("sse-relay", "aborting runtime stream from browser signal", {
          path,
        });
        cleanup();
        void reader.cancel(signal.reason).catch(() => {});
        controller.close();
      };

      signal.addEventListener("abort", handleAbort, { once: true });
      controller.enqueue(encoder.encode(": stream-open\n\n"));
      heartbeatTimer = setInterval(() => {
        if (closed) {
          return;
        }

        controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 5000);

      void (async () => {
        try {
          while (!closed) {
            const { done, value } = await reader.read();
            if (done) {
              flushBufferedChunk(controller);
              logLiveChatDebug("sse-relay", "runtime stream closed", {
                path,
              });
              cleanup();
              controller.close();
              return;
            }

            buffer += decoder.decode(value, { stream: true });

            let boundaryIndex = buffer.indexOf("\n\n");
            while (boundaryIndex >= 0) {
              const chunk = buffer.slice(0, boundaryIndex);
              buffer = buffer.slice(boundaryIndex + 2);
              const mappedChunk = mapSseChunk(path, chunk, mapper);
              if (mappedChunk.length > 0) {
                controller.enqueue(encoder.encode(mappedChunk));
              }
              boundaryIndex = buffer.indexOf("\n\n");
            }
          }
        } catch (error) {
          cleanup();
          if (signal.aborted) {
            return;
          }

          controller.error(error);
        }
      })();
    },
    async cancel() {
      closed = true;
      if (heartbeatTimer !== null) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      logLiveChatDebug("sse-relay", "browser stream canceled", {
        path,
      });
      await reader.cancel();
    },
  });
}

export async function relaySse<TInput, TOutput>(
  request: Request,
  path: string,
  mapper: (value: TInput) => TOutput,
  errorMapping?: ActiveRuntimeErrorMapping,
) {
  logLiveChatDebug("sse-relay", "opening runtime stream", {
    path,
  });
  const response = await runtimeClient.requestStream(path, request.signal);
  if (!response.ok) {
    logLiveChatDebug("sse-relay", "runtime stream returned non-ok status", {
      path,
      status: response.status,
    });
    return parseRuntimeErrorResponse(response, errorMapping);
  }

  if (!response.body) {
    logLiveChatDebug("sse-relay", "runtime stream had no body", {
      path,
    });
    return toErrorResponse(new Error("codex-runtime stream response had no body"));
  }

  return new Response(createSseRelayStream(path, response.body, request.signal, mapper), {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
      connection: "keep-alive",
    },
  });
}

export async function getThreadStream(request: Request, threadId: string) {
  try {
    return await relaySse<RuntimeSessionEventProjection, ReturnType<typeof mapThreadStreamEvent>>(
      request,
      `/api/v1/threads/${threadId}/stream`,
      mapThreadStreamEvent,
      {
        sessionNotFoundCode: "thread_not_found",
        threadId,
      },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function getNotificationsStream(request: Request) {
  try {
    return await relaySse<RuntimeNotificationEvent, ReturnType<typeof mapNotificationEvent>>(
      request,
      "/api/v1/notifications/stream",
      mapNotificationEvent,
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
