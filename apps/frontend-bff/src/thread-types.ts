export interface PublicThread {
  thread_id: string;
  workspace_id: string;
  native_status: {
    thread_status: string;
    active_flags: string[];
    latest_turn_status: string | null;
  };
  updated_at: string;
}

export interface PublicCurrentActivity {
  kind: string;
  label: string;
}

export interface PublicThreadCue {
  kind: string;
  label: string;
}

export interface PublicResumeCue {
  reason_kind: string;
  priority_band: "highest" | "high" | "medium" | "low";
  label: string;
}

export interface PublicThreadListItem extends PublicThread {
  current_activity: PublicCurrentActivity;
  badge: PublicThreadCue | null;
  blocked_cue: PublicThreadCue | null;
  resume_cue: PublicResumeCue | null;
}

export interface PublicPendingRequest {
  request_id: string;
  thread_id: string;
  turn_id: string | null;
  item_id: string;
  request_kind: string;
  status: "pending";
  risk_category:
    | "destructive_change"
    | "external_side_effect"
    | "network_access"
    | "privileged_execution";
  summary: string;
  requested_at: string;
}

export interface PublicLatestResolvedRequest {
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

export interface PublicPendingRequestView {
  thread_id: string;
  pending_request: PublicPendingRequest | null;
  latest_resolved_request: PublicLatestResolvedRequest | null;
  checked_at: string;
}

export interface PublicRequestDetail {
  request_id: string;
  thread_id: string;
  turn_id: string | null;
  item_id: string;
  request_kind: string;
  status: "pending" | "resolved";
  risk_category:
    | "destructive_change"
    | "external_side_effect"
    | "network_access"
    | "privileged_execution";
  summary: string;
  reason: string;
  operation_summary: string | null;
  requested_at: string;
  responded_at: string | null;
  decision: "approved" | "denied" | "canceled" | null;
  decision_options: {
    policy_scope_supported: false;
    default_policy_scope: "once";
  };
  context: Record<string, unknown> | null;
}

export interface PublicTimelineItem {
  timeline_item_id: string;
  thread_id: string;
  turn_id: string | null;
  item_id: string | null;
  sequence: number;
  occurred_at: string;
  kind: string;
  payload: Record<string, unknown>;
}

export interface PublicTimeline {
  items: PublicTimelineItem[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface PublicComposer {
  accepting_user_input: boolean;
  interrupt_available: boolean;
  blocked_by_request: boolean;
  input_unavailable_reason: string | null;
}

export interface PublicThreadView {
  thread: PublicThread;
  current_activity: PublicCurrentActivity;
  pending_request: PublicPendingRequest | null;
  latest_resolved_request: PublicLatestResolvedRequest | null;
  composer: PublicComposer;
  timeline: PublicTimeline;
}

export interface PublicAcceptedInput {
  thread_id: string;
  turn_id: string | null;
  input_item_id: string | null;
}

export interface PublicThreadInputAcceptedResponse {
  accepted: PublicAcceptedInput;
  thread: PublicThread;
}

export interface PublicRequestActionSummary {
  request_id: string;
  status: "pending" | "resolved";
  decision: "approved" | "denied" | "canceled" | null;
  responded_at: string | null;
}

export interface PublicRequestResponseResult {
  request: PublicRequestActionSummary;
  thread: PublicThread;
}

export interface PublicThreadStreamEvent {
  event_id: string;
  thread_id: string;
  event_type:
    | "session.status_changed"
    | "message.user"
    | "message.assistant.delta"
    | "message.assistant.completed"
    | "approval.requested"
    | "approval.resolved"
    | "error.raised";
  sequence: number;
  occurred_at: string;
  payload: Record<string, unknown>;
}

export interface PublicNotificationEvent {
  thread_id: string;
  event_type: string;
  occurred_at: string;
  high_priority: boolean;
}
