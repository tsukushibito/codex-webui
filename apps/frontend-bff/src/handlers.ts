import { NextResponse } from "next/server";

import { isErrorEnvelope, toErrorResponse } from "./errors";
import {
  mapApprovalDetail,
  mapApprovalList,
  mapApprovalResolveResult,
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
  ListResponse,
  RuntimeApprovalProjection,
  RuntimeApprovalResolveResult,
  RuntimeMessageProjection,
  RuntimeSessionEventProjection,
  RuntimeSessionSummary,
  RuntimeStopResult,
  RuntimeWorkspaceSummary,
} from "./runtime-types";

const runtimeClient = new RuntimeClient();

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
