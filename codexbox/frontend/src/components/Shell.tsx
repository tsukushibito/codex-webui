import type {
  ApprovalDecision,
  ApprovalRequest,
  GitDiffRecord,
  PaneId,
  TranscriptMessage,
  UserInputRequest,
  WorkspaceEntry,
  WorkspaceFile,
} from '../types';
import { ApprovalsSection } from './ApprovalsSection';
import { DiffPreviewSection } from './DiffPreviewSection';
import { FilePreviewSection } from './FilePreviewSection';
import { PaneTabs } from './PaneTabs';
import { TranscriptPane } from './TranscriptPane';
import { UserInputsSection } from './UserInputsSection';
import { WorkspaceTree } from './WorkspaceTree';

interface ShellProps {
  activePane: PaneId;
  approvals: ApprovalRequest[];
  diffError: string;
  filePreviewError: string;
  loadingSelection: boolean;
  loadingWorkspaceTree: boolean;
  messages: TranscriptMessage[];
  onResolveApproval: (approval: ApprovalRequest, decision: ApprovalDecision) => Promise<void>;
  onSelectPane: (pane: PaneId) => void;
  onSelectPath: (path: string) => Promise<void>;
  onSend: (text: string) => Promise<void>;
  onSkipUserInput: (request: UserInputRequest) => Promise<void>;
  onSubmitUserInput: (request: UserInputRequest, answers: Record<string, string[]>) => Promise<void>;
  selectedDiff: GitDiffRecord | null;
  selectedFile: WorkspaceFile | null;
  selectedPath: string | null;
  sending: boolean;
  sessionId: string | null;
  sessionReady: boolean;
  statusText: string;
  userInputs: UserInputRequest[];
  workspaceTree: WorkspaceEntry[];
}

export function Shell(props: ShellProps) {
  const {
    activePane,
    approvals,
    diffError,
    filePreviewError,
    loadingSelection,
    loadingWorkspaceTree,
    messages,
    onResolveApproval,
    onSelectPane,
    onSelectPath,
    onSend,
    onSkipUserInput,
    onSubmitUserInput,
    selectedDiff,
    selectedFile,
    selectedPath,
    sending,
    sessionId,
    sessionReady,
    statusText,
    userInputs,
    workspaceTree,
  } = props;

  return (
    <div className="shell" data-active-pane={activePane}>
      <header className="topbar">
        <div>
          <h1>Codex WebUI</h1>
          <p className="status">{statusText}</p>
        </div>
        <div className="meta">
          <span>Session</span>
          <code>{sessionId || '-'}</code>
        </div>
      </header>

      <PaneTabs activePane={activePane} onSelectPane={onSelectPane} />

      <main className="layout">
        <aside className="explorer-panel" data-pane="files">
          <section className="panel-section">
            <div className="panel-heading">
              <h2>Files</h2>
              <p>Read-only workspace tree</p>
            </div>
            <WorkspaceTree
              entries={workspaceTree}
              loading={loadingWorkspaceTree}
              onSelectPath={async (path) => {
                await onSelectPath(path);
                onSelectPane('diff');
              }}
              selectedPath={selectedPath}
            />
          </section>
        </aside>

        <TranscriptPane
          canSend={sessionReady}
          messages={messages}
          onSend={onSend}
          sending={sending}
        />

        <aside className="side-panel" data-pane="diff">
          <section className="panel-section">
            <div className="panel-heading">
              <h2>File</h2>
              <p className="selected-path">{selectedPath || 'Select a file to inspect.'}</p>
            </div>
            <FilePreviewSection
              error={filePreviewError}
              file={selectedFile}
              loading={loadingSelection}
              selectedPath={selectedPath}
            />
          </section>

          <section className="panel-section">
            <div className="panel-heading">
              <h2>Diff</h2>
              <p>HEAD vs worktree</p>
            </div>
            <DiffPreviewSection
              diff={selectedDiff}
              error={diffError}
              loading={loadingSelection}
              selectedPath={selectedPath}
            />
          </section>

          <section className="panel-section">
            <div className="panel-heading">
              <h2>Approvals</h2>
              <p>Pending tool or file-change requests</p>
            </div>
            <ApprovalsSection approvals={approvals} onResolveApproval={onResolveApproval} />
          </section>

          <section className="panel-section">
            <div className="panel-heading">
              <h2>User Input</h2>
              <p>Questions waiting on browser input</p>
            </div>
            <UserInputsSection
              onSkipUserInput={onSkipUserInput}
              onSubmitUserInput={onSubmitUserInput}
              requests={userInputs}
            />
          </section>
        </aside>
      </main>
    </div>
  );
}
