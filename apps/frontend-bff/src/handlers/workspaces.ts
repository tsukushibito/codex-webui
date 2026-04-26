import { isErrorEnvelope, toErrorResponse } from "../errors";
import { mapThreadListItem, mapWorkspace, mapWorkspaceList } from "../mappings";
import type { HomeResponse } from "../public-types";
import type { ListResponse, RuntimeThreadSummary, RuntimeWorkspaceSummary } from "../runtime-types";
import type { PublicThreadListItem } from "../thread-types";
import {
  forwardSearch,
  jsonResponse,
  passthroughRuntimeError,
  readJsonBody,
  runtimeClient,
} from "./shared";

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
      return passthroughRuntimeError(runtimeThreadError.status, runtimeThreadError.body, {
        sessionNotFoundCode: "thread_not_found",
      });
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
