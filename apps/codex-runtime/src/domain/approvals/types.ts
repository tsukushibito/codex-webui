export type ApprovalStatus = "pending" | "approved" | "denied" | "canceled";

export type ApprovalResolution = "approved" | "denied" | "canceled";

export type ApprovalCategory =
  | "destructive_change"
  | "external_side_effect"
  | "network_access"
  | "privileged_execution";

export interface ApprovalProjection {
  approval_id: string;
  session_id: string;
  workspace_id: string;
  status: ApprovalStatus;
  resolution: ApprovalResolution | null;
  approval_category: ApprovalCategory;
  summary: string;
  reason: string;
  operation_summary: string | null;
  context: Record<string, unknown> | null;
  created_at: string;
  resolved_at: string | null;
  native_request_kind: string;
}

export interface ApprovalSummary {
  pending_approval_count: number;
  updated_at: string;
}
