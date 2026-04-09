import type { ApprovalCategory, ApprovalStatus } from "../approvals/types.js";

export interface ThreadSummary {
  thread_id: string;
  workspace_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  native_status: {
    thread_status: string;
    active_flags: string[];
    latest_turn_status: string | null;
  };
  derived_hints: {
    accepting_user_input: boolean;
    has_pending_request: boolean;
    blocked_reason: string | null;
  };
}

export interface TimelineItem {
  timeline_item_id: string;
  thread_id: string;
  sequence: number;
  item_kind: string;
  occurred_at: string;
  summary: string;
  request_id: string | null;
}

export interface PendingRequestSummary {
  request_id: string;
  thread_id: string;
  turn_id: string | null;
  item_id: string;
  request_kind: string;
  status: ApprovalStatus;
  risk_classification: ApprovalCategory;
  summary: string;
  requested_at: string;
}

export interface LatestResolvedRequestSummary {
  request_id: string;
  thread_id: string;
  turn_id: string | null;
  item_id: string;
  request_kind: string;
  status: "resolved";
  decision: "approved" | "denied" | "canceled";
  requested_at: string;
  responded_at: string;
}

export interface RequestDetailView {
  request_id: string;
  thread_id: string;
  turn_id: string | null;
  item_id: string;
  request_kind: string;
  status: ApprovalStatus | "resolved";
  decision: "approved" | "denied" | "canceled" | null;
  risk_classification: ApprovalCategory;
  operation_summary: string | null;
  reason: string;
  summary: string;
  requested_at: string;
  responded_at: string | null;
}

export interface ThreadViewHelper {
  thread: ThreadSummary;
  pending_request: PendingRequestSummary | null;
  latest_resolved_request: LatestResolvedRequestSummary | null;
  checked_at: string;
}

export interface NotificationEvent {
  thread_id: string;
  event_type: string;
  occurred_at: string;
  high_priority: boolean;
}
