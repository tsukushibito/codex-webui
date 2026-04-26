import type { ThreadRequestRecord } from "./thread-request-persistence.js";
import type { LatestResolvedRequestSummary, PendingRequestSummary } from "./types.js";

export function buildThreadRequestHelperLifecycleState(threadRequests: ThreadRequestRecord[]): {
  pending_request: PendingRequestSummary | null;
  latest_resolved_request: LatestResolvedRequestSummary | null;
} {
  const pendingRequest = threadRequests.find((request) => request.status === "pending") ?? null;
  const latestResolvedRequest =
    pendingRequest === null ? selectLatestResolvedRequest(threadRequests) : null;

  return {
    pending_request: pendingRequest ? toPendingRequestSummary(pendingRequest) : null,
    latest_resolved_request: latestResolvedRequest
      ? toLatestResolvedRequestSummary(latestResolvedRequest)
      : null,
  };
}

function selectLatestResolvedRequest(
  threadRequests: ThreadRequestRecord[],
): ThreadRequestRecord | null {
  return (
    threadRequests
      .filter(hasRespondedRequest)
      .sort((left, right) => right.responded_at.localeCompare(left.responded_at))[0] ?? null
  );
}

function hasRespondedRequest(
  request: ThreadRequestRecord,
): request is ThreadRequestRecord & { responded_at: string } {
  return request.status !== "pending" && request.responded_at !== null;
}

function toPendingRequestSummary(request: ThreadRequestRecord): PendingRequestSummary {
  return {
    request_id: request.request_id,
    thread_id: request.thread_id,
    turn_id: null,
    item_id: request.request_id,
    request_kind: request.request_kind,
    status: request.status,
    risk_classification: request.risk_classification,
    summary: request.summary,
    requested_at: request.requested_at,
  };
}

function toLatestResolvedRequestSummary(
  request: ThreadRequestRecord,
): LatestResolvedRequestSummary {
  return {
    request_id: request.request_id,
    thread_id: request.thread_id,
    turn_id: null,
    item_id: request.request_id,
    request_kind: request.request_kind,
    status: "resolved",
    decision: request.resolution!,
    requested_at: request.requested_at,
    responded_at: request.responded_at!,
  };
}
