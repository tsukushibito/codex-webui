export interface WorkspaceSummary {
  workspace_id: string;
  workspace_name: string;
  directory_name: string;
  created_at: string;
  updated_at: string;
}

export interface EligibleWorkspaceDirectory {
  directoryName: string;
  fullPath: string;
}
