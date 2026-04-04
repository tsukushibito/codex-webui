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
  pending_approval_count: number;
  updated_at: string;
}

export interface ListResponse<T> {
  items: T[];
  next_cursor: string | null;
  has_more: boolean;
}
