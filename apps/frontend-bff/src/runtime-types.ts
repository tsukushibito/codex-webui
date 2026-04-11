import type { PublicThreadListItem } from "./thread-types";

export interface RuntimeWorkspaceSummary {
  workspace_id: string;
  workspace_name: string;
  directory_name: string;
  created_at: string;
  updated_at: string;
  active_session_id: string | null;
  active_session_summary: {
    session_id: string;
    status: string;
    last_message_at: string | null;
  } | null;
  pending_approval_count: number;
}

export interface RuntimeThreadSummary {
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

export interface RuntimePendingRequestSummary {
  request_id: string;
  thread_id: string;
  turn_id: string | null;
  item_id: string;
  request_kind: string;
  status: "pending";
  risk_classification:
    | "destructive_change"
    | "external_side_effect"
    | "network_access"
    | "privileged_execution";
  summary: string;
  requested_at: string;
}

export interface RuntimeLatestResolvedRequestSummary {
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

export interface RuntimeThreadPendingRequestView {
  thread_id: string;
  pending_request: RuntimePendingRequestSummary | null;
  latest_resolved_request: RuntimeLatestResolvedRequestSummary | null;
  checked_at: string;
}

export interface RuntimeRequestDetailView {
  request_id: string;
  thread_id: string;
  turn_id: string | null;
  item_id: string;
  request_kind: string;
  status: "pending" | "resolved";
  decision: "approved" | "denied" | "canceled" | null;
  risk_classification:
    | "destructive_change"
    | "external_side_effect"
    | "network_access"
    | "privileged_execution";
  operation_summary: string | null;
  reason: string;
  summary: string;
  requested_at: string;
  responded_at: string | null;
  context?: Record<string, unknown> | null;
}

export interface RuntimeTimelineItem {
  timeline_item_id: string;
  thread_id: string;
  sequence: number;
  item_kind: string;
  occurred_at: string;
  summary: string;
  request_id: string | null;
}

export interface RuntimeThreadViewHelper {
  thread: RuntimeThreadSummary;
  pending_request: RuntimePendingRequestSummary | null;
  latest_resolved_request: RuntimeLatestResolvedRequestSummary | null;
  checked_at: string;
}

export interface RuntimeAcceptedInputProjection {
  message_id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  source_item_type: "user_message" | "agent_message";
}

export interface RuntimeThreadInputAcceptedResponse {
  thread: RuntimeThreadSummary;
  accepted_input?: RuntimeAcceptedInputProjection;
}

export interface RuntimeThreadInterruptResponse {
  thread: RuntimeThreadSummary;
}

export interface RuntimeRequestActionSummary {
  request_id: string;
  status: "pending" | "resolved";
  decision: "approved" | "denied" | "canceled" | null;
  responded_at: string | null;
}

export interface RuntimeRequestResponseResult {
  request: RuntimeRequestActionSummary;
  thread: RuntimeThreadSummary;
}

export interface RuntimeSessionSummary {
  session_id: string;
  workspace_id: string;
  title: string;
  status:
    | "created"
    | "running"
    | "waiting_input"
    | "waiting_approval"
    | "completed"
    | "failed"
    | "stopped";
  created_at: string;
  updated_at: string;
  started_at: string | null;
  last_message_at: string | null;
  active_approval_id: string | null;
  current_turn_id: string | null;
  app_session_overlay_state: "open" | "stopping" | "closed" | "recovery_pending";
}

export interface RuntimeMessageProjection {
  message_id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  source_item_type: "user_message" | "agent_message";
}

export interface RuntimeSessionEventProjection {
  event_id: string;
  session_id: string;
  event_type:
    | "session.status_changed"
    | "message.user"
    | "message.assistant.delta"
    | "message.assistant.completed"
    | "approval.requested"
    | "approval.resolved";
  sequence: number;
  occurred_at: string;
  payload: Record<string, unknown>;
  native_event_name: string | null;
}

export interface RuntimeApprovalProjection {
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
  summary: string;
  reason: string;
  operation_summary: string | null;
  context: Record<string, unknown> | null;
  created_at: string;
  resolved_at: string | null;
  native_request_kind: string;
}

export interface RuntimeStopResult {
  session: RuntimeSessionSummary;
  canceled_approval: RuntimeApprovalProjection | null;
}

export interface RuntimeApprovalResolveResult {
  approval: RuntimeApprovalProjection;
  session: RuntimeSessionSummary;
}

export interface RuntimeApprovalSummary {
  pending_approval_count: number;
  updated_at: string;
}

export interface RuntimeApprovalStreamEventProjection {
  event_id: string;
  session_id: string;
  event_type: "approval.requested" | "approval.resolved";
  occurred_at: string;
  payload: Record<string, unknown>;
  native_event_name: string | null;
}

export interface HomeResponse {
  workspaces: Array<{
    workspace_id: string;
    workspace_name: string;
    created_at: string;
    updated_at: string;
    active_session_summary: {
      session_id: string;
      status: string;
      last_message_at: string | null;
    } | null;
    pending_approval_count: number;
  }>;
  resume_candidates: PublicThreadListItem[];
  updated_at: string;
}

export interface ListResponse<T> {
  items: T[];
  next_cursor: string | null;
  has_more: boolean;
}
