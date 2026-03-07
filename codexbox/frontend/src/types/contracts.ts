export type ApprovalDecision = 'allow' | 'deny' | 'cancel';
export type PaneId = 'chat' | 'files' | 'diff';

export interface ApiErrorResponse {
  ok: false;
  error: string;
}

export interface ApiOkResponse {
  ok: true;
}

export interface ApiEnvelope<T> {
  ok: true;
  result: T;
}

export interface SessionStartResponse extends ApiOkResponse {
  sessionId: string;
  initResult?: unknown;
  idleTimeoutMs: number;
  approvalTimeoutMs: number;
  userInputTimeoutMs: number;
}

export interface SessionReconnectResponse extends ApiOkResponse {
  sessionId: string;
  threadId: string | null;
  pendingApprovals: ApprovalRequest[];
  pendingUserInputs: UserInputRequest[];
}

export interface ThreadSummary {
  id?: string;
}

export interface ThreadStartResult {
  thread?: ThreadSummary;
}

export interface ThreadStartResponse extends ApiEnvelope<ThreadStartResult> {}

export interface ThreadReadResponse extends ApiEnvelope<{
  thread?: ThreadRecord | null;
}> {}

export interface TurnStartResponse extends ApiOkResponse {}

export interface QuestionOption {
  label: string;
  description?: string;
}

export interface UserInputQuestion {
  id?: string;
  header?: string;
  question?: string;
  options?: QuestionOption[];
}

export interface ApprovalRequest {
  requestId: string;
  method: string;
  params?: Record<string, unknown>;
}

export interface UserInputRequest {
  requestId: string;
  method: string;
  params?: {
    questions?: UserInputQuestion[];
  };
}

export interface SessionSnapshotPayload {
  threadId?: string | null;
  pendingApprovals?: ApprovalRequest[];
  pendingUserInputs?: UserInputRequest[];
}

export interface SessionSnapshotResponse extends ApiOkResponse, SessionSnapshotPayload {}

export interface WorkspaceEntry {
  type: 'file' | 'directory';
  name: string;
  path: string;
  tracked?: boolean;
  gitStatus?: string;
  indexStatus?: string;
  worktreeStatus?: string;
  children?: WorkspaceEntry[];
}

export interface WorkspaceTreeResponse extends ApiOkResponse {
  tree: WorkspaceEntry[];
}

export interface WorkspaceFile {
  path: string;
  content: string;
  size: number;
}

export interface WorkspaceFileResponse extends ApiOkResponse {
  file: WorkspaceFile;
}

export interface GitDiffSide {
  exists: boolean;
  ref: string;
  content: string;
}

export interface GitDiffRecord {
  path: string;
  gitStatus: string;
  left: GitDiffSide;
  right: GitDiffSide;
}

export interface GitDiffResponse extends ApiOkResponse {
  diff: GitDiffRecord;
}

export interface TextContentPart {
  type: 'text';
  text: string;
}

export interface UserMessageItem {
  id?: string;
  type: 'userMessage';
  content?: TextContentPart[];
}

export interface AgentMessageItem {
  id?: string;
  type: 'agentMessage';
  text?: string;
}

export interface UnknownThreadItem {
  id?: string;
  type: string;
  [key: string]: unknown;
}

export type ThreadItem = UserMessageItem | AgentMessageItem | UnknownThreadItem;

export interface ThreadTurn {
  id?: string;
  items?: ThreadItem[];
}

export interface ThreadRecord {
  id?: string;
  turns?: ThreadTurn[];
}

export interface ThreadStartedNotification {
  method: 'thread/started';
  params?: {
    thread?: {
      id?: string;
    };
  };
}

export interface AgentMessageStartedNotification {
  method: 'item/started';
  params?: {
    item?: {
      id?: string;
      type?: string;
    };
  };
}

export interface AgentMessageCompletedNotification {
  method: 'item/completed';
  params?: {
    item?: {
      id?: string;
      type?: string;
      text?: string;
    };
  };
}

export interface TurnCompletedNotification {
  method: 'turn/completed';
  params?: Record<string, never>;
}

export interface UnknownRpcNotification {
  method: string;
  params?: Record<string, unknown>;
}

export type RpcNotification =
  | ThreadStartedNotification
  | AgentMessageStartedNotification
  | AgentMessageCompletedNotification
  | TurnCompletedNotification
  | UnknownRpcNotification;

export interface RpcNotificationEvent {
  message: RpcNotification | null;
}

export interface ChatDeltaPayload {
  itemId?: string;
  delta?: string;
}

export interface ChatDeltaEvent {
  params?: ChatDeltaPayload;
}

export interface ApprovalEvent {
  approval?: ApprovalRequest;
}

export interface UserInputEvent {
  request?: UserInputRequest;
}

export interface SessionClosedEvent {
  reason?: string;
}
