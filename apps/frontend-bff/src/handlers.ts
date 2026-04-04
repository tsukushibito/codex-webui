import { NextResponse } from "next/server";

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
  mapSession,
  mapSessionList,
  mapStopResult,
  mapWorkspace,
  mapWorkspaceList,
} from "./mappings";
import { RuntimeClient } from "./runtime-client";
import type {
  HomeResponse,
  ListResponse,
  RuntimeApprovalProjection,
  RuntimeApprovalSummary,
  RuntimeApprovalStreamEventProjection,
  RuntimeApprovalResolveResult,
  RuntimeMessageProjection,
  RuntimeSessionEventProjection,
  RuntimeSessionSummary,
  RuntimeStopResult,
  RuntimeWorkspaceSummary,
} from "./runtime-types";

const runtimeClient = new RuntimeClient();

function latestTimestamp(values: string[]) {
  return values.reduce((latest, value) => (value > latest ? value : latest));
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

  return toErrorResponse(
    new Error("codex-runtime returned an invalid stream error response"),
  );
}

function encodeSseData(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function mapSseChunk<TInput, TOutput>(
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

  return encodeSseData(mapper(JSON.parse(dataLines.join("\n")) as TInput));
}

function createSseRelayStream<TInput, TOutput>(
  source: ReadableStream<Uint8Array>,
  mapper: (value: TInput) => TOutput,
) {
  const reader = source.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.length > 0) {
          const mappedChunk = mapSseChunk(buffer, mapper);
          if (mappedChunk.length > 0) {
            controller.enqueue(encoder.encode(mappedChunk));
          }
        }
        controller.close();
        return;
      }

      buffer += decoder.decode(value, { stream: true });

      let boundaryIndex = buffer.indexOf("\n\n");
      while (boundaryIndex >= 0) {
        const chunk = buffer.slice(0, boundaryIndex);
        buffer = buffer.slice(boundaryIndex + 2);
        const mappedChunk = mapSseChunk(chunk, mapper);
        if (mappedChunk.length > 0) {
          controller.enqueue(encoder.encode(mappedChunk));
        }
        boundaryIndex = buffer.indexOf("\n\n");
      }
    },
    async cancel() {
      await reader.cancel();
    },
  });
}

async function relaySse<TInput, TOutput>(
  path: string,
  mapper: (value: TInput) => TOutput,
) {
  const response = await runtimeClient.requestStream(path);
  if (!response.ok) {
    return parseRuntimeErrorResponse(response);
  }

  if (!response.body) {
    return toErrorResponse(new Error("codex-runtime stream response had no body"));
  }

  return new Response(createSseRelayStream(response.body, mapper), {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}

function passthroughRuntimeError(
  status: number,
  body: unknown,
) {
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
    const [workspaceResult, approvalSummaryResult] = await Promise.all([
      runtimeClient.requestJson<ListResponse<RuntimeWorkspaceSummary>>("/api/v1/workspaces"),
      runtimeClient.requestJson<RuntimeApprovalSummary>("/api/v1/approvals/summary"),
    ]);

    if (isErrorEnvelope(workspaceResult.body)) {
      return passthroughRuntimeError(workspaceResult.status, workspaceResult.body);
    }

    if (isErrorEnvelope(approvalSummaryResult.body)) {
      return passthroughRuntimeError(
        approvalSummaryResult.status,
        approvalSummaryResult.body,
      );
    }

    const workspaces = workspaceResult.body.items.map(mapWorkspace);
    const updatedAt = latestTimestamp([
      approvalSummaryResult.body.updated_at,
      ...workspaces.map((workspace) => workspace.updated_at),
    ]);

    const response: HomeResponse = {
      workspaces,
      pending_approval_count: approvalSummaryResult.body.pending_approval_count,
      updated_at: updatedAt,
    };

    return jsonResponse(200, response);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function createWorkspace(request: Request) {
  try {
    const result = await runtimeClient.requestJson<RuntimeWorkspaceSummary>(
      "/api/v1/workspaces",
      {
        method: "POST",
        body: await readJsonBody(request),
      },
    );

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

    return jsonResponse(
      sessionResult.status,
      mapSessionList(sessionResult.body, activeSessionId),
    );
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

    return jsonResponse(
      sessionResult.status,
      mapSession(sessionResult.body, activeSessionId),
    );
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

    const activeSessionId = await fetchWorkspaceActiveSessionId(
      sessionResult.body.workspace_id,
    );

    return jsonResponse(
      sessionResult.status,
      mapSession(sessionResult.body, activeSessionId),
    );
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

    const activeSessionId = await fetchWorkspaceActiveSessionId(
      sessionResult.body.workspace_id,
    );

    return jsonResponse(
      sessionResult.status,
      mapSession(sessionResult.body, activeSessionId),
    );
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

    return jsonResponse(
      stopResult.status,
      mapStopResult(stopResult.body, activeSessionId),
    );
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

  const activeSessionId = await fetchWorkspaceActiveSessionId(
    result.body.session.workspace_id,
  );

  return jsonResponse(
    result.status,
    mapApprovalResolveResult(result.body, activeSessionId),
  );
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

export async function getSessionStream(_request: Request, sessionId: string) {
  try {
    return await relaySse<RuntimeSessionEventProjection, ReturnType<typeof mapEvent>>(
      `/api/v1/sessions/${sessionId}/stream`,
      mapEvent,
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function getApprovalStream(_request: Request) {
  try {
    return await relaySse<
      RuntimeApprovalStreamEventProjection,
      ReturnType<typeof mapApprovalStreamEvent>
    >("/api/v1/approvals/stream", mapApprovalStreamEvent);
  } catch (error) {
    return toErrorResponse(error);
  }
}
