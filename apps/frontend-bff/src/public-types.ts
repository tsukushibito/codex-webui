import type { PublicThreadListItem } from "./thread-types";

export interface PublicWorkspaceSummary {
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
}

export interface HomeResponse {
  workspaces: PublicWorkspaceSummary[];
  resume_candidates: PublicThreadListItem[];
  updated_at: string;
}

export interface PublicListResponse<T> {
  items: T[];
  next_cursor: string | null;
  has_more: boolean;
}
