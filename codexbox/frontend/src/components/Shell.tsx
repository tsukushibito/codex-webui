import { useEffect, useState } from 'preact/hooks';
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

const THEME_STORAGE_KEY = 'codex-webui-theme';

type UiTheme = 'light' | 'dark';
type UiThemeMode = UiTheme | 'system';

function getInitialThemeMode(): UiThemeMode {
  if (typeof window === 'undefined') {
    return 'system';
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }

  return 'system';
}

function readSystemTheme(): UiTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: UiThemeMode, systemTheme: UiTheme): UiTheme {
  if (mode === 'system') {
    return systemTheme;
  }
  return mode;
}

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
  const [themeMode, setThemeMode] = useState<UiThemeMode>(() => getInitialThemeMode());
  const [systemTheme, setSystemTheme] = useState<UiTheme>(() => readSystemTheme());
  const theme = resolveTheme(themeMode, systemTheme);

  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mediaQuery) {
      return;
    }

    const updateTheme = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };

    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', updateTheme);
    return () => {
      mediaQuery.removeEventListener('change', updateTheme);
    };
  }, []);

  return (
    <div className="shell" data-active-pane={activePane}>
      <header className="topbar">
        <div>
          <h1>Codex WebUI</h1>
          <p className="status">{statusText}</p>
        </div>
        <div className="meta">
          <label className="theme-label" htmlFor="theme-mode">
            Theme
          </label>
          <select
            className="theme-select"
            id="theme-mode"
            onChange={(event) => setThemeMode((event.currentTarget as HTMLSelectElement).value as UiThemeMode)}
            value={themeMode}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
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
