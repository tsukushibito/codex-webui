export interface PublicSessionSummary {
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
  can_send_message: boolean;
  can_start: boolean;
  can_stop: boolean;
}

export interface PublicMessage {
  message_id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface PublicSessionEvent {
  event_id: string;
  session_id: string;
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

export interface PublicStopResult {
  session: PublicSessionSummary;
  canceled_approval: PublicApprovalSummary | null;
}
