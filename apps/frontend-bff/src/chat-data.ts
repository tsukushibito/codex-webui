import type { PublicListResponse } from "./chat-types";
import { isErrorEnvelope } from "./errors";
import type { HomeResponse } from "./runtime-types";
import type {
  PublicRequestDetail,
  PublicRequestResponseResult,
  PublicThread,
  PublicThreadInputAcceptedResponse,
  PublicThreadListItem,
  PublicThreadView,
} from "./thread-types";

type FetchLike = typeof fetch;
export type PublicWorkspaceSummary = HomeResponse["workspaces"][number];

async function readJson<T>(response: Response) {
  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    if (isErrorEnvelope(payload)) {
      throw new Error(payload.error.message);
    }

    throw new Error("Chat request failed.");
  }

  return payload as T;
}

export async function listWorkspaceThreads(workspaceId: string, fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl(`/api/v1/workspaces/${workspaceId}/threads?sort=-updated_at`, {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  return readJson<PublicListResponse<PublicThreadListItem>>(response);
}

export async function listChatWorkspaces(fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl("/api/v1/workspaces", {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  return readJson<PublicListResponse<PublicWorkspaceSummary>>(response);
}

export async function createWorkspaceFromChat(workspaceName: string, fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl("/api/v1/workspaces", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      workspace_name: workspaceName,
    }),
  });

  return readJson<PublicWorkspaceSummary>(response);
}

export async function startThreadFromChat(
  workspaceId: string,
  content: string,
  clientRequestId: string,
  fetchImpl: FetchLike = fetch,
) {
  const response = await fetchImpl(`/api/v1/workspaces/${workspaceId}/inputs`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      client_request_id: clientRequestId,
      content,
    }),
  });

  return readJson<PublicThreadInputAcceptedResponse>(response);
}

export async function getThreadView(threadId: string, fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl(`/api/v1/threads/${threadId}/view`, {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  return readJson<PublicThreadView>(response);
}

export async function sendThreadInput(
  threadId: string,
  content: string,
  clientRequestId: string,
  fetchImpl: FetchLike = fetch,
) {
  const response = await fetchImpl(`/api/v1/threads/${threadId}/inputs`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      client_request_id: clientRequestId,
      content,
    }),
  });

  return readJson<PublicThreadInputAcceptedResponse>(response);
}

export async function interruptThreadFromChat(threadId: string, fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl(`/api/v1/threads/${threadId}/interrupt`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({}),
  });

  return readJson<PublicThread>(response);
}

export async function getRequestDetail(requestId: string, fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl(`/api/v1/requests/${requestId}`, {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  return readJson<PublicRequestDetail>(response);
}

export async function respondToPendingRequest(
  requestId: string,
  decision: "approved" | "denied",
  clientResponseId: string,
  fetchImpl: FetchLike = fetch,
) {
  const response = await fetchImpl(`/api/v1/requests/${requestId}/response`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      client_response_id: clientResponseId,
      decision,
    }),
  });

  return readJson<PublicRequestResponseResult>(response);
}

export async function loadChatThreadBundle(threadId: string, fetchImpl: FetchLike = fetch) {
  const view = await getThreadView(threadId, fetchImpl);
  const [pendingRequestDetail, latestResolvedRequestDetail] = await Promise.all([
    view.pending_request ? getRequestDetail(view.pending_request.request_id, fetchImpl) : null,
    view.latest_resolved_request
      ? getRequestDetail(view.latest_resolved_request.request_id, fetchImpl)
      : null,
  ]);

  return {
    view,
    latestResolvedRequestDetail,
    pendingRequestDetail,
  };
}
