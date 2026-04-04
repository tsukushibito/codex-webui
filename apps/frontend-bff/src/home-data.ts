import { isErrorEnvelope } from "./errors";
import type { HomeResponse, RuntimeWorkspaceSummary } from "./runtime-types";

type FetchLike = typeof fetch;

export interface HomeApiError {
  code: string;
  message: string;
}

export async function fetchHomeData(fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl("/api/v1/home", {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  const payload = (await response.json()) as unknown;
  if (!response.ok) {
    if (isErrorEnvelope(payload)) {
      throw new Error(payload.error.message);
    }

    throw new Error("Failed to load Home data.");
  }

  return payload as HomeResponse;
}

export async function createWorkspaceFromHome(
  workspaceName: string,
  fetchImpl: FetchLike = fetch,
) {
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

  const payload = (await response.json()) as unknown;
  if (!response.ok) {
    if (isErrorEnvelope(payload)) {
      throw new Error(payload.error.message);
    }

    throw new Error("Failed to create workspace.");
  }

  return payload as RuntimeWorkspaceSummary;
}
