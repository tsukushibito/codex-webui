import type { PublicListResponse, PublicSessionSummary } from "./chat-types";

export type { PublicListResponse } from "./chat-types";

export interface PublicApprovalSummary {
  approval_id: string;
  session_id: string;
  workspace_id: string;
  status: "pending" | "approved" | "denied" | "canceled";
  resolution: "approved" | "denied" | "canceled" | null;
  approval_category:
    | "destructive_change"
    | "external_side_effect"
    | "network_access"
    | "privileged_execution";
  title: string;
  description: string;
  requested_at: string;
  resolved_at: string | null;
}

export interface PublicApprovalDetail extends PublicApprovalSummary {
  operation_summary: string | null;
  context: Record<string, unknown> | null;
}

export interface PublicApprovalResolveResult {
  approval: PublicApprovalSummary;
  session: PublicSessionSummary;
}

export interface PublicApprovalStreamEvent {
  event_id: string;
  session_id: string;
  event_type: "approval.requested" | "approval.resolved";
  occurred_at: string;
  payload: Record<string, unknown>;
}
