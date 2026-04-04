export type SessionStatus =
  | "created"
  | "running"
  | "waiting_input"
  | "waiting_approval"
  | "completed"
  | "failed"
  | "stopped";

export type AppSessionOverlayState = "open" | "stopping" | "closed" | "recovery_pending";

export interface SessionSummary {
  session_id: string;
  workspace_id: string;
  title: string;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  last_message_at: string | null;
  active_approval_id: string | null;
  current_turn_id: string | null;
  app_session_overlay_state: AppSessionOverlayState;
}

export interface SessionStopResult {
  session: SessionSummary;
  canceled_approval: null;
}

export type MessageRole = "user" | "assistant";

export type MessageSourceItemType = "user_message" | "agent_message";

export interface MessageProjection {
  message_id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
  source_item_type: MessageSourceItemType;
}
