import type { PaneId, TranscriptMessage } from '../types';
import { PaneTabs } from './PaneTabs';
import { PlaceholderPanel } from './PlaceholderPanel';
import { TranscriptPane } from './TranscriptPane';

interface ShellProps {
  activePane: PaneId;
  messages: TranscriptMessage[];
  onSelectPane: (pane: PaneId) => void;
  onSend: (text: string) => Promise<void>;
  sending: boolean;
  sessionId: string | null;
  sessionReady: boolean;
  statusText: string;
}

export function Shell(props: ShellProps) {
  const {
    activePane,
    messages,
    onSelectPane,
    onSend,
    sending,
    sessionId,
    sessionReady,
    statusText,
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
            <div className="workspace-tree empty">
              <PlaceholderPanel body="File tree migration continues in #45." title="Deferred" />
            </div>
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
              <p className="selected-path">Select a file to inspect.</p>
            </div>
            <div className="file-preview empty">
              <PlaceholderPanel body="File preview migration continues in #45." title="Deferred" />
            </div>
          </section>

          <section className="panel-section">
            <div className="panel-heading">
              <h2>Diff</h2>
              <p>HEAD vs worktree</p>
            </div>
            <div className="diff-view empty">
              <PlaceholderPanel body="Diff preview migration continues in #45." title="Deferred" />
            </div>
          </section>

          <section className="panel-section">
            <div className="panel-heading">
              <h2>Approvals</h2>
              <p>Pending tool or file-change requests</p>
            </div>
            <div className="approvals empty">
              <PlaceholderPanel body="Approval actions migrate in #45." title="Deferred" />
            </div>
          </section>

          <section className="panel-section">
            <div className="panel-heading">
              <h2>User Input</h2>
              <p>Questions waiting on browser input</p>
            </div>
            <div className="user-inputs empty">
              <PlaceholderPanel body="User-input forms migrate in #45." title="Deferred" />
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
