import { useEffect, useMemo, useState } from 'preact/hooks';
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
import { ActionQueue } from './ActionQueue';
import { InspectPanel, type InspectTabId } from './InspectPanel';
import { PaneTabs } from './PaneTabs';
import { TranscriptPane } from './TranscriptPane';
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

function getStatusPresentation(props: {
  approvalCount: number;
  sending: boolean;
  sessionReady: boolean;
  statusText: string;
  userInputCount: number;
}) {
  const { approvalCount, sending, sessionReady, statusText, userInputCount } = props;

  if (approvalCount > 0) {
    return {
      label: 'Waiting for approval',
      tone: 'warning',
      summary: `${approvalCount} request${approvalCount === 1 ? '' : 's'} need a decision.`,
    } as const;
  }

  if (userInputCount > 0) {
    return {
      label: 'Waiting for input',
      tone: 'attention',
      summary: `${userInputCount} browser prompt${userInputCount === 1 ? '' : 's'} need an answer.`,
    } as const;
  }

  if (sending) {
    return {
      label: 'Running',
      tone: 'running',
      summary: 'Codex is processing the current turn.',
    } as const;
  }

  if (sessionReady) {
    return {
      label: 'Ready',
      tone: 'ready',
      summary: 'Session is ready for the next turn.',
    } as const;
  }

  return {
    label: 'Starting',
    tone: 'idle',
    summary: statusText,
  } as const;
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
  const [inspectTab, setInspectTab] = useState<InspectTabId>('file');
  const [themeMode, setThemeMode] = useState<UiThemeMode>(() => getInitialThemeMode());
  const [systemTheme, setSystemTheme] = useState<UiTheme>(() => readSystemTheme());
  const theme = resolveTheme(themeMode, systemTheme);
  const actionCount = approvals.length + userInputs.length;
  const statusPresentation = useMemo(() => getStatusPresentation({
    approvalCount: approvals.length,
    sending,
    sessionReady,
    statusText,
    userInputCount: userInputs.length,
  }), [approvals.length, sending, sessionReady, statusText, userInputs.length]);
  const showDesktopActionQueue = actionCount > 0;

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
        <div className="topbar-title">
          <h1>Codex WebUI</h1>
          <p className="status">{statusPresentation.summary}</p>
        </div>

        <section className={`status-card tone-${statusPresentation.tone}`} aria-label="Current status">
          <p className="eyebrow">Current Status</p>
          <div className="status-card-main">
            <h2>{statusPresentation.label}</h2>
            <p>{statusText}</p>
          </div>
          <div className="status-card-badges">
            <span className="status-badge">{approvals.length} approval{approvals.length === 1 ? '' : 's'}</span>
            <span className="status-badge">{userInputs.length} input{userInputs.length === 1 ? '' : 's'}</span>
          </div>
        </section>

        <div className="meta">
          <div className="theme-picker">
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
          </div>
          <div className="session-meta">
            <span>Session</span>
            <code>{sessionId || '-'}</code>
          </div>
        </div>
      </header>

      <PaneTabs actionCount={actionCount} activePane={activePane} onSelectPane={onSelectPane} />

      {showDesktopActionQueue ? (
        <div className="action-queue-strip">
          <ActionQueue
            approvals={approvals}
            onResolveApproval={onResolveApproval}
            onSkipUserInput={onSkipUserInput}
            onSubmitUserInput={onSubmitUserInput}
            requests={userInputs}
          />
        </div>
      ) : null}

      <main className="layout">
        <aside className="workspace-column">
          <section className="panel-section">
            <div className="section-heading">
              <p className="eyebrow">Workspace</p>
              <h2>Files</h2>
              <p>Read-only workspace tree</p>
            </div>
            <WorkspaceTree
              entries={workspaceTree}
              loading={loadingWorkspaceTree}
              onSelectPath={async (path) => {
                await onSelectPath(path);
                setInspectTab('file');
                onSelectPane('inspect');
              }}
              selectedPath={selectedPath}
            />
          </section>
        </aside>

        <section className="conversation-column">
          <TranscriptPane
            canSend={sessionReady}
            messages={messages}
            onSend={onSend}
            sending={sending}
          />
        </section>

        <aside className="inspect-column">
          <section className="panel-section">
            <InspectPanel
              diff={selectedDiff}
              diffError={diffError}
              file={selectedFile}
              filePreviewError={filePreviewError}
              loading={loadingSelection}
              onSelectTab={setInspectTab}
              selectedPath={selectedPath}
              tab={inspectTab}
            />
          </section>
        </aside>

        {activePane === 'actions' ? (
          <section className="actions-panel">
            <ActionQueue
              approvals={approvals}
              onResolveApproval={onResolveApproval}
              onSkipUserInput={onSkipUserInput}
              onSubmitUserInput={onSubmitUserInput}
              requests={userInputs}
              showEmpty
            />
          </section>
        ) : null}
      </main>
    </div>
  );
}
