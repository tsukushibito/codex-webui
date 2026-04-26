import type { ListResponse, RuntimeWorkspaceSummary } from "../runtime-types";

export function mapWorkspace(workspace: RuntimeWorkspaceSummary) {
  return {
    workspace_id: workspace.workspace_id,
    workspace_name: workspace.workspace_name,
    created_at: workspace.created_at,
    updated_at: workspace.updated_at,
    active_session_summary: workspace.active_session_summary,
    pending_approval_count: workspace.pending_approval_count,
  };
}

export function mapWorkspaceList(response: ListResponse<RuntimeWorkspaceSummary>) {
  return {
    items: response.items.map(mapWorkspace),
    next_cursor: response.next_cursor,
    has_more: response.has_more,
  };
}
