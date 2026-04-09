import type {
  PublicListResponse,
  PublicMessage,
  PublicSessionEvent,
  PublicSessionSummary,
  PublicStopResult,
} from "./chat-types";
import { isErrorEnvelope } from "./errors";

type FetchLike = typeof fetch;

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

export async function listWorkspaceSessions(workspaceId: string, fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl(`/api/v1/workspaces/${workspaceId}/sessions?sort=-updated_at`, {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  return readJson<PublicListResponse<PublicSessionSummary>>(response);
}

export async function createSessionFromChat(
  workspaceId: string,
  title: string,
  fetchImpl: FetchLike = fetch,
) {
  const response = await fetchImpl(`/api/v1/workspaces/${workspaceId}/sessions`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ title }),
  });

  return readJson<PublicSessionSummary>(response);
}

export async function startSessionFromChat(sessionId: string, fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl(`/api/v1/sessions/${sessionId}/start`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({}),
  });

  return readJson<PublicSessionSummary>(response);
}

export async function getSessionDetails(sessionId: string, fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl(`/api/v1/sessions/${sessionId}`, {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  return readJson<PublicSessionSummary>(response);
}

export async function listSessionMessages(sessionId: string, fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl(`/api/v1/sessions/${sessionId}/messages?sort=created_at`, {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  return readJson<PublicListResponse<PublicMessage>>(response);
}

export async function listSessionEvents(sessionId: string, fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl(`/api/v1/sessions/${sessionId}/events?sort=occurred_at`, {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  return readJson<PublicListResponse<PublicSessionEvent>>(response);
}

export async function loadChatSessionBundle(sessionId: string, fetchImpl: FetchLike = fetch) {
  const [session, messages, events] = await Promise.all([
    getSessionDetails(sessionId, fetchImpl),
    listSessionMessages(sessionId, fetchImpl),
    listSessionEvents(sessionId, fetchImpl),
  ]);

  return {
    session,
    messages: messages.items,
    events: events.items,
  };
}

export async function sendSessionMessage(
  sessionId: string,
  content: string,
  clientMessageId: string,
  fetchImpl: FetchLike = fetch,
) {
  const response = await fetchImpl(`/api/v1/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      client_message_id: clientMessageId,
      content,
    }),
  });

  return readJson<PublicMessage>(response);
}

export async function stopSessionFromChat(sessionId: string, fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl(`/api/v1/sessions/${sessionId}/stop`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({}),
  });

  return readJson<PublicStopResult>(response);
}
