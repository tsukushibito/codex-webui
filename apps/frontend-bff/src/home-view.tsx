import Link from "next/link";

import type { HomeResponse } from "./runtime-types";

export interface HomeViewProps {
  home: HomeResponse | null;
  errorMessage: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  statusMessage: string | null;
  workspaceName: string;
  onWorkspaceNameChange: (value: string) => void;
  onCreateWorkspace: () => void;
}

function formatThreadStatus(status: string) {
  return status.replaceAll("_", " ");
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "No messages yet";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function workspaceChatHref(workspaceId: string, threadId?: string) {
  const params = new URLSearchParams({
    workspaceId,
  });

  if (threadId) {
    params.set("threadId", threadId);
  }

  return `/chat?${params.toString()}`;
}

function formatResumeLabel(label: string) {
  return label.replaceAll("_", " ");
}

export function HomeView({
  home,
  errorMessage,
  isLoading,
  isSubmitting,
  statusMessage,
  workspaceName,
  onWorkspaceNameChange,
  onCreateWorkspace,
}: HomeViewProps) {
  return (
    <main className="home-shell">
      <div className="home-layout">
        <section className="hero-card">
          <div className="hero-body">
            <p className="eyebrow">codex-webui</p>
            <h1>Home</h1>
            <p className="hero-copy">
              Manage workspaces, see active threads, and resume the threads that need attention from
              a smartphone-first shell.
            </p>
            <div className="hero-metrics">
              <span className="metric-chip">
                Resume candidates: {home?.resume_candidates.length ?? 0}
              </span>
              <span className="metric-chip">Workspaces: {home?.workspaces.length ?? 0}</span>
              <span className="metric-chip">
                Updated: {home ? formatTimestamp(home.updated_at) : "Waiting"}
              </span>
            </div>
            <div className="hero-actions">
              <Link className="primary-link" href="/chat">
                Open thread shell
              </Link>
              <Link className="secondary-link" href="/">
                Refresh Home
              </Link>
            </div>
          </div>
        </section>

        <section className="create-card">
          <header>
            <p className="eyebrow">Create workspace</p>
            <h2>Start from Home</h2>
            <p className="field-hint">
              Create a workspace, then move into Chat when the first thread is ready.
            </p>
          </header>
          <div className="create-form">
            <label className="form-label" htmlFor="workspace-name">
              Workspace name
              <input
                className="text-input"
                id="workspace-name"
                name="workspace-name"
                onChange={(event) => onWorkspaceNameChange(event.target.value)}
                placeholder="alpha-workspace"
                value={workspaceName}
              />
            </label>
            <button
              className="submit-button"
              disabled={isSubmitting || workspaceName.trim().length === 0}
              onClick={onCreateWorkspace}
              type="button"
            >
              {isSubmitting ? "Creating workspace..." : "Create workspace"}
            </button>
            {statusMessage ? <p className="status-message">{statusMessage}</p> : null}
          </div>
        </section>

        {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

        <section className="workspace-grid">
          {home?.resume_candidates.map((thread) => (
            <article className="workspace-card" key={thread.thread_id}>
              <header>
                <div className="workspace-meta-row">
                  <p className="eyebrow">Resume candidate</p>
                  <span className="status-badge warning">
                    {formatResumeLabel(thread.current_activity.label)}
                  </span>
                </div>
                <h2>{thread.thread_id}</h2>
                <p className="workspace-meta">Updated {formatTimestamp(thread.updated_at)}</p>
              </header>

              <p className="workspace-status">
                {thread.blocked_cue?.label ?? thread.current_activity.label}
                {thread.resume_cue ? ` ${thread.resume_cue.label}.` : null}
              </p>

              <div className="hero-metrics">
                <span className="metric-chip">Workspace: {thread.workspace_id}</span>
                <span className="metric-chip">
                  Priority: {thread.resume_cue?.priority_band ?? "none"}
                </span>
              </div>

              <div className="workspace-actions">
                <Link
                  className="primary-link"
                  href={workspaceChatHref(thread.workspace_id, thread.thread_id)}
                >
                  Resume thread
                </Link>
                <Link className="secondary-link" href="/">
                  Refresh Home
                </Link>
              </div>
            </article>
          ))}

          {!isLoading && home && home.resume_candidates.length === 0 ? (
            <article className="workspace-card">
              <p className="empty-state">
                No resume candidates right now. Pick a workspace below to start or continue work.
              </p>
            </article>
          ) : null}
        </section>

        <section className="workspace-grid">
          {isLoading && !home ? (
            <article className="workspace-card">
              <p className="workspace-status">Loading Home data...</p>
            </article>
          ) : null}

          {!isLoading && home && home.workspaces.length === 0 ? (
            <article className="workspace-card">
              <p className="empty-state">
                No workspaces yet. Create one above to start the UI flow.
              </p>
            </article>
          ) : null}

          {home?.workspaces.map((workspace) => {
            const activeThread = workspace.active_session_summary;
            const statusClassName = activeThread ? "status-badge success" : "status-badge warning";

            return (
              <article className="workspace-card" key={workspace.workspace_id}>
                <header>
                  <div className="workspace-meta-row">
                    <p className="eyebrow">Workspace</p>
                    <span className={statusClassName}>
                      {activeThread ? formatThreadStatus(activeThread.status) : "No active thread"}
                    </span>
                  </div>
                  <h2>{workspace.workspace_name}</h2>
                  <p className="workspace-meta">Updated {formatTimestamp(workspace.updated_at)}</p>
                </header>

                <p className="workspace-status">
                  {activeThread
                    ? `Active thread ${activeThread.session_id} last moved at ${formatTimestamp(
                        activeThread.last_message_at,
                      )}.`
                    : "This workspace is ready for its first thread."}
                </p>

                <div className="hero-metrics">
                  <span className="metric-chip">
                    Request queue: {workspace.pending_approval_count}
                  </span>
                  <span className="metric-chip">ID: {workspace.workspace_id}</span>
                </div>

                <div className="workspace-actions">
                  <Link
                    className="primary-link"
                    href={workspaceChatHref(workspace.workspace_id, activeThread?.session_id)}
                  >
                    Open thread
                  </Link>
                  <Link className="secondary-link" href="/">
                    Stay on Home
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
