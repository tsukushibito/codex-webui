export interface WorkspaceActiveSessionSummary {
  session_id: string;
  status: string;
  last_message_at: string | null;
}

export interface WorkspaceSummary {
  workspace_id: string;
  workspace_name: string;
  directory_name: string;
  created_at: string;
  updated_at: string;
  active_session_id: string | null;
  active_session_summary: WorkspaceActiveSessionSummary | null;
  pending_approval_count: number;
}

export interface EligibleWorkspaceDirectory {
  directoryName: string;
  fullPath: string;
}
