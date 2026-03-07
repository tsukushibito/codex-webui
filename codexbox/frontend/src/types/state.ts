import type {
  ApprovalRequest,
  GitDiffRecord,
  PaneId,
  UserInputRequest,
  WorkspaceEntry,
  WorkspaceFile,
} from './contracts';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface TranscriptMessage {
  id?: string;
  role: MessageRole;
  text: string;
}

export type PendingRequestMap<T> = Map<string, T>;

export interface SessionRuntimeState {
  sessionId: string | null;
  threadId: string | null;
  sending: boolean;
  activePane: PaneId;
  statusText: string;
}

export interface WorkspaceInspectorState {
  tree: WorkspaceEntry[];
  selectedPath: string | null;
  selectedEntry: WorkspaceEntry | null;
  selectedFile: WorkspaceFile | null;
  selectedDiff: GitDiffRecord | null;
  filePreviewError: string;
  diffError: string;
  loadingWorkspaceTree: boolean;
  loadingSelection: boolean;
}

export interface PendingInteractionState {
  approvals: PendingRequestMap<ApprovalRequest>;
  userInputs: PendingRequestMap<UserInputRequest>;
}

export interface AppState {
  session: SessionRuntimeState;
  transcript: TranscriptMessage[];
  pending: PendingInteractionState;
  workspace: WorkspaceInspectorState;
}

export interface BridgeIssueStep {
  issue: string;
  title: string;
}
