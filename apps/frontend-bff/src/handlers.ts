import { NextResponse } from "next/server";

import { logLiveChatDebug } from "./debug";
import { isErrorEnvelope, toErrorResponse } from "./errors";
import {
  mapApprovalDetail,
  mapApprovalList,
  mapApprovalResolveResult,
  mapApprovalStreamEvent,
  mapEvent,
  mapEventList,
  mapMessage,
  mapMessageList,
  mapNotificationEvent,
  mapPendingRequestView,
  mapRequestDetail,
  mapRequestResponseResult,
  mapSession,
  mapSessionList,
  mapStopResult,
  mapThread,
  mapThreadInputAcceptedResponse,
  mapThreadList,
  mapThreadListItem,
  mapThreadStreamEvent,
  mapThreadView,
  mapTimeline,
  mapWorkspace,
  mapWorkspaceList,
} from "./mappings";
import { RuntimeClient } from "./runtime-client";
import type {
  HomeResponse,
  ListResponse,
  RuntimeApprovalProjection,
  RuntimeApprovalResolveResult,
  RuntimeApprovalStreamEventProjection,
  RuntimeMessageProjection,
  RuntimeNotificationEvent,
  RuntimeRequestDetailView,
  RuntimeRequestResponseResult,
  RuntimeSessionEventProjection,
  RuntimeSessionSummary,
  RuntimeStopResult,
  RuntimeThreadInputAcceptedResponse,
  RuntimeThreadInterruptResponse,
  RuntimeThreadPendingRequestView,
  RuntimeThreadSummary,
  RuntimeThreadViewHelper,
  RuntimeTimelineItem,
  RuntimeWorkspaceSummary,
} from "./runtime-types";
import type { PublicThreadListItem } from "./thread-types";

const runtimeClient = new RuntimeClient();

function latestTimestamp(values: string[]) {
  return values.reduce((latest, value) => (value > latest ? value : latest), "");
}

function homeResumePriority(item: PublicThreadListItem) {
  switch (item.current_activity.kind) {
    case "waiting_on_approval":
      return 0;
    case "system_error":
      return 1;
    case "latest_turn_failed":
      return 2;
    default:
      return item.resume_cue?.reason_kind === "active_thread" ? 3 : 4;
  }
}

function compareHomeResumeCandidates(left: PublicThreadListItem, right: PublicThreadListItem) {
  const priorityDifference = homeResumePriority(left) - homeResumePriority(right);
  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  if (left.updated_at !== right.updated_at) {
    return right.updated_at.localeCompare(left.updated_at);
  }

  if (left.workspace_id !== right.workspace_id) {
    return left.workspace_id.localeCompare(right.workspace_id);
  }

  return left.thread_id.localeCompare(right.thread_id);
}

function forwardSearch(request: Request) {
  return new URL(request.url).search;
}

async function readJsonBody(request: Request) {
  const text = await request.text();
  if (text.length === 0) {
    return {};
  }

  return JSON.parse(text) as unknown;
}

async function fetchWorkspaceActiveSessionId(workspaceId: string) {
  const result = await runtimeClient.requestJson<RuntimeWorkspaceSummary>(
    `/api/v1/workspaces/${workspaceId}`,
  );

  if (isErrorEnvelope(result.body)) {
    throw result.body;
  }

  return result.body.active_session_id;
}

function jsonResponse(status: number, body: unknown) {
  return NextResponse.json(body, { status });
}

async function parseRuntimeErrorResponse(response: Response) {
  try {
    const payload = await response.json();
    if (isErrorEnvelope(payload)) {
      return jsonResponse(response.status, payload);
    }
  } catch {
    // fall through
  }

  return toErrorResponse(new Error("codex-runtime returned an invalid stream error response"));
}

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

async function relaySse<TInput, TOutput>(
  request: Request,
  path: string,
  mapper: (value: TInput) => TOutput,
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
    return parseRuntimeErrorResponse(response);
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

function passthroughRuntimeError(status: number, body: unknown) {
  if (isErrorEnvelope(body)) {
    return jsonResponse(status, body);
  }

  throw new Error("expected runtime error envelope");
}

export async function listWorkspaces(request: Request) {
  try {
    const result = await runtimeClient.requestJson<ListResponse<RuntimeWorkspaceSummary>>(
      `/api/v1/workspaces${forwardSearch(request)}`,
    );

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body);
    }

    return jsonResponse(result.status, mapWorkspaceList(result.body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function getHome(_request: Request) {
  try {
    const workspaceResult =
      await runtimeClient.requestJson<ListResponse<RuntimeWorkspaceSummary>>("/api/v1/workspaces");

    if (isErrorEnvelope(workspaceResult.body)) {
      return passthroughRuntimeError(workspaceResult.status, workspaceResult.body);
    }

    const workspaces = workspaceResult.body.items.map(mapWorkspace);
    const threadResults = await Promise.all(
      workspaceResult.body.items.map((workspace) =>
        runtimeClient.requestJson<ListResponse<RuntimeThreadSummary>>(
          `/api/v1/workspaces/${workspace.workspace_id}/threads?sort=recommended`,
        ),
      ),
    );

    const runtimeThreadError = threadResults.find((result) => isErrorEnvelope(result.body));
    if (runtimeThreadError && isErrorEnvelope(runtimeThreadError.body)) {
      return passthroughRuntimeError(runtimeThreadError.status, runtimeThreadError.body);
    }

    const resumeCandidates = threadResults
      .flatMap((result) => result.body.items)
      .map(mapThreadListItem)
      .filter((thread) => thread.resume_cue !== null)
      .sort(compareHomeResumeCandidates);

    const updatedAt = latestTimestamp([
      ...workspaces.map((workspace) => workspace.updated_at),
      ...resumeCandidates.map((thread) => thread.updated_at),
    ]);

    const response: HomeResponse = {
      workspaces,
      resume_candidates: resumeCandidates,
      updated_at: updatedAt,
    };

    return jsonResponse(200, response);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function createWorkspace(request: Request) {
  try {
    const result = await runtimeClient.requestJson<RuntimeWorkspaceSummary>("/api/v1/workspaces", {
      method: "POST",
      body: await readJsonBody(request),
    });

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body);
    }

    return jsonResponse(result.status, mapWorkspace(result.body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function getWorkspace(_request: Request, workspaceId: string) {
  try {
    const result = await runtimeClient.requestJson<RuntimeWorkspaceSummary>(
      `/api/v1/workspaces/${workspaceId}`,
    );

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body);
    }

    return jsonResponse(result.status, mapWorkspace(result.body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function listThreads(request: Request, workspaceId: string) {
  try {
    const result = await runtimeClient.requestJson<ListResponse<RuntimeThreadSummary>>(
      `/api/v1/workspaces/${workspaceId}/threads${forwardSearch(request)}`,
    );

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body);
    }

    return jsonResponse(result.status, mapThreadList(result.body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function getThread(_request: Request, threadId: string) {
  try {
    const result = await runtimeClient.requestJson<RuntimeThreadSummary>(
      `/api/v1/threads/${threadId}`,
    );

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body);
    }

    return jsonResponse(result.status, mapThread(result.body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function getPendingRequest(_request: Request, threadId: string) {
  try {
    const result = await runtimeClient.requestJson<RuntimeThreadPendingRequestView>(
      `/api/v1/threads/${threadId}/pending_request`,
    );

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body);
    }

    return jsonResponse(result.status, mapPendingRequestView(result.body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function getRequestDetail(_request: Request, requestId: string) {
  try {
    const result = await runtimeClient.requestJson<RuntimeRequestDetailView>(
      `/api/v1/requests/${requestId}`,
    );

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body);
    }

    return jsonResponse(result.status, mapRequestDetail(result.body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function getThreadView(_request: Request, threadId: string) {
  try {
    const [viewResult, timelineResult] = await Promise.all([
      runtimeClient.requestJson<RuntimeThreadViewHelper>(`/api/v1/threads/${threadId}/view`),
      runtimeClient.requestJson<ListResponse<RuntimeTimelineItem>>(
        `/api/v1/threads/${threadId}/timeline`,
      ),
    ]);

    if (isErrorEnvelope(viewResult.body)) {
      return passthroughRuntimeError(viewResult.status, viewResult.body);
    }

    if (isErrorEnvelope(timelineResult.body)) {
      return passthroughRuntimeError(timelineResult.status, timelineResult.body);
    }

    return jsonResponse(viewResult.status, mapThreadView(viewResult.body, timelineResult.body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function getTimeline(request: Request, threadId: string) {
  try {
    const result = await runtimeClient.requestJson<ListResponse<RuntimeTimelineItem>>(
      `/api/v1/threads/${threadId}/timeline${forwardSearch(request)}`,
    );

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body);
    }

    return jsonResponse(result.status, mapTimeline(result.body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function postWorkspaceInput(request: Request, workspaceId: string) {
  try {
    const result = await runtimeClient.requestJson<RuntimeThreadInputAcceptedResponse>(
      `/api/v1/workspaces/${workspaceId}/inputs`,
      {
        method: "POST",
        body: await readJsonBody(request),
      },
    );

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body);
    }

    return jsonResponse(result.status, mapThreadInputAcceptedResponse(result.body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function postThreadInput(request: Request, threadId: string) {
  try {
    const result = await runtimeClient.requestJson<RuntimeThreadInputAcceptedResponse>(
      `/api/v1/threads/${threadId}/inputs`,
      {
        method: "POST",
        body: await readJsonBody(request),
      },
    );

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body);
    }

    return jsonResponse(result.status, mapThreadInputAcceptedResponse(result.body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function postThreadInterrupt(_request: Request, threadId: string) {
  try {
    const result = await runtimeClient.requestJson<RuntimeThreadInterruptResponse>(
      `/api/v1/threads/${threadId}/interrupt`,
      {
        method: "POST",
        body: {},
      },
    );

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body);
    }

    return jsonResponse(result.status, mapThread(result.body.thread));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function postRequestResponse(request: Request, requestId: string) {
  try {
    const result = await runtimeClient.requestJson<RuntimeRequestResponseResult>(
      `/api/v1/requests/${requestId}/response`,
      {
        method: "POST",
        body: await readJsonBody(request),
      },
    );

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body);
    }

    return jsonResponse(result.status, mapRequestResponseResult(result.body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function listSessions(request: Request, workspaceId: string) {
  try {
    const [sessionResult, activeSessionId] = await Promise.all([
      runtimeClient.requestJson<ListResponse<RuntimeSessionSummary>>(
        `/api/v1/workspaces/${workspaceId}/sessions${forwardSearch(request)}`,
      ),
      fetchWorkspaceActiveSessionId(workspaceId),
    ]);

    if (isErrorEnvelope(sessionResult.body)) {
      return passthroughRuntimeError(sessionResult.status, sessionResult.body);
    }

    return jsonResponse(sessionResult.status, mapSessionList(sessionResult.body, activeSessionId));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function createSession(request: Request, workspaceId: string) {
  try {
    const sessionResult = await runtimeClient.requestJson<RuntimeSessionSummary>(
      `/api/v1/workspaces/${workspaceId}/sessions`,
      {
        method: "POST",
        body: await readJsonBody(request),
      },
    );

    if (isErrorEnvelope(sessionResult.body)) {
      return passthroughRuntimeError(sessionResult.status, sessionResult.body);
    }

    const activeSessionId = await fetchWorkspaceActiveSessionId(workspaceId);

    return jsonResponse(sessionResult.status, mapSession(sessionResult.body, activeSessionId));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function getSession(_request: Request, sessionId: string) {
  try {
    const sessionResult = await runtimeClient.requestJson<RuntimeSessionSummary>(
      `/api/v1/sessions/${sessionId}`,
    );

    if (isErrorEnvelope(sessionResult.body)) {
      return passthroughRuntimeError(sessionResult.status, sessionResult.body);
    }

    const activeSessionId = await fetchWorkspaceActiveSessionId(sessionResult.body.workspace_id);

    return jsonResponse(sessionResult.status, mapSession(sessionResult.body, activeSessionId));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function startSession(_request: Request, sessionId: string) {
  try {
    const sessionResult = await runtimeClient.requestJson<RuntimeSessionSummary>(
      `/api/v1/sessions/${sessionId}/start`,
      {
        method: "POST",
        body: {},
      },
    );

    if (isErrorEnvelope(sessionResult.body)) {
      return passthroughRuntimeError(sessionResult.status, sessionResult.body);
    }

    const activeSessionId = await fetchWorkspaceActiveSessionId(sessionResult.body.workspace_id);

    return jsonResponse(sessionResult.status, mapSession(sessionResult.body, activeSessionId));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function listMessages(request: Request, sessionId: string) {
  try {
    const result = await runtimeClient.requestJson<ListResponse<RuntimeMessageProjection>>(
      `/api/v1/sessions/${sessionId}/messages${forwardSearch(request)}`,
    );

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body);
    }

    return jsonResponse(result.status, mapMessageList(result.body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function postMessage(request: Request, sessionId: string) {
  try {
    const result = await runtimeClient.requestJson<RuntimeMessageProjection>(
      `/api/v1/sessions/${sessionId}/messages`,
      {
        method: "POST",
        body: await readJsonBody(request),
      },
    );

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body);
    }

    return jsonResponse(result.status, mapMessage(result.body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function listEvents(request: Request, sessionId: string) {
  try {
    const result = await runtimeClient.requestJson<ListResponse<RuntimeSessionEventProjection>>(
      `/api/v1/sessions/${sessionId}/events${forwardSearch(request)}`,
    );

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body);
    }

    return jsonResponse(result.status, mapEventList(result.body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function stopSession(_request: Request, sessionId: string) {
  try {
    const stopResult = await runtimeClient.requestJson<RuntimeStopResult>(
      `/api/v1/sessions/${sessionId}/stop`,
      {
        method: "POST",
        body: {},
      },
    );

    if (isErrorEnvelope(stopResult.body)) {
      return passthroughRuntimeError(stopResult.status, stopResult.body);
    }

    const activeSessionId = await fetchWorkspaceActiveSessionId(
      stopResult.body.session.workspace_id,
    );

    return jsonResponse(stopResult.status, mapStopResult(stopResult.body, activeSessionId));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function listApprovals(request: Request) {
  try {
    const result = await runtimeClient.requestJson<ListResponse<RuntimeApprovalProjection>>(
      `/api/v1/approvals${forwardSearch(request)}`,
    );

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body);
    }

    return jsonResponse(result.status, mapApprovalList(result.body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function getApproval(_request: Request, approvalId: string) {
  try {
    const result = await runtimeClient.requestJson<RuntimeApprovalProjection>(
      `/api/v1/approvals/${approvalId}`,
    );

    if (isErrorEnvelope(result.body)) {
      return passthroughRuntimeError(result.status, result.body);
    }

    return jsonResponse(result.status, mapApprovalDetail(result.body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

async function resolveApproval(approvalId: string, resolution: "approved" | "denied") {
  const result = await runtimeClient.requestJson<RuntimeApprovalResolveResult>(
    `/api/v1/approvals/${approvalId}/resolve`,
    {
      method: "POST",
      body: { resolution },
    },
  );

  if (isErrorEnvelope(result.body)) {
    return passthroughRuntimeError(result.status, result.body);
  }

  const activeSessionId = await fetchWorkspaceActiveSessionId(result.body.session.workspace_id);

  return jsonResponse(result.status, mapApprovalResolveResult(result.body, activeSessionId));
}

export async function approveApproval(_request: Request, approvalId: string) {
  try {
    return await resolveApproval(approvalId, "approved");
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function denyApproval(_request: Request, approvalId: string) {
  try {
    return await resolveApproval(approvalId, "denied");
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function getSessionStream(request: Request, sessionId: string) {
  try {
    return await relaySse<RuntimeSessionEventProjection, ReturnType<typeof mapEvent>>(
      request,
      `/api/v1/sessions/${sessionId}/stream`,
      mapEvent,
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function getApprovalStream(request: Request) {
  try {
    return await relaySse<
      RuntimeApprovalStreamEventProjection,
      ReturnType<typeof mapApprovalStreamEvent>
    >(request, "/api/v1/approvals/stream", mapApprovalStreamEvent);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function getThreadStream(request: Request, threadId: string) {
  try {
    return await relaySse<RuntimeSessionEventProjection, ReturnType<typeof mapThreadStreamEvent>>(
      request,
      `/api/v1/threads/${threadId}/stream`,
      mapThreadStreamEvent,
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
