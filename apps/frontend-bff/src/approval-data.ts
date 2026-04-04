import { isErrorEnvelope } from "./errors";
import type {
  PublicApprovalDetail,
  PublicApprovalResolveResult,
  PublicApprovalSummary,
  PublicListResponse,
} from "./approval-types";

type FetchLike = typeof fetch;

async function readJson<T>(response: Response, fallbackMessage: string) {
  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    if (isErrorEnvelope(payload)) {
      throw new Error(payload.error.message);
    }

    throw new Error(fallbackMessage);
  }

  return payload as T;
}

export async function fetchPendingApprovals(fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl("/api/v1/approvals?status=pending&sort=-requested_at", {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  return readJson<PublicListResponse<PublicApprovalSummary>>(
    response,
    "Failed to load the approval queue.",
  );
}

export async function fetchApprovalDetail(
  approvalId: string,
  fetchImpl: FetchLike = fetch,
) {
  const response = await fetchImpl(`/api/v1/approvals/${approvalId}`, {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  return readJson<PublicApprovalDetail>(response, "Failed to load the approval detail.");
}

async function resolveApproval(
  approvalId: string,
  resolution: "approve" | "deny",
  fetchImpl: FetchLike = fetch,
) {
  const response = await fetchImpl(`/api/v1/approvals/${approvalId}/${resolution}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({}),
  });

  return readJson<PublicApprovalResolveResult>(
    response,
    `Failed to ${resolution} the approval.`,
  );
}

export function approveApproval(approvalId: string, fetchImpl: FetchLike = fetch) {
  return resolveApproval(approvalId, "approve", fetchImpl);
}

export function denyApproval(approvalId: string, fetchImpl: FetchLike = fetch) {
  return resolveApproval(approvalId, "deny", fetchImpl);
}
