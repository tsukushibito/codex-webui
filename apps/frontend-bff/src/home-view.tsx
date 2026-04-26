import Link from "next/link";

import type { HomeResponse } from "./public-types";
import type { PublicThreadListItem } from "./thread-types";

export interface HomeViewProps {
  home: HomeResponse | null;
  errorMessage: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  selectedWorkspaceId: string;
  statusMessage: string | null;
  workspaceName: string;
  onSelectedWorkspaceIdChange: (workspaceId: string) => void;
  onWorkspaceNameChange: (value: string) => void;
  onCreateWorkspace: () => void;
}

type HomeWorkspace = HomeResponse["workspaces"][number];

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

function findWorkspaceResumeCandidate(
  workspaceId: string,
  resumeCandidates: PublicThreadListItem[],
) {
  return resumeCandidates.find((thread) => thread.workspace_id === workspaceId) ?? null;
}

function workspaceOptionCue(
  workspace: HomeWorkspace,
  workspaceResumeCandidate: PublicThreadListItem | null,
) {
  if (workspace.pending_approval_count > 0) {
    return `${workspace.pending_approval_count} approval${
      workspace.pending_approval_count === 1 ? "" : "s"
    }`;
  }

  return (
    workspaceResumeCandidate?.resume_cue?.label ??
    workspaceResumeCandidate?.blocked_cue?.label ??
    null
  );
}

export function HomeView({
  home,
  errorMessage,
  isLoading,
  isSubmitting,
  selectedWorkspaceId,
  statusMessage,
  workspaceName,
  onSelectedWorkspaceIdChange,
  onWorkspaceNameChange,
  onCreateWorkspace,
}: HomeViewProps) {
  const workspaces = home?.workspaces ?? [];
  const resumeCandidates = home?.resume_candidates ?? [];
  const selectedWorkspace =
    workspaces.find((workspace) => workspace.workspace_id === selectedWorkspaceId) ??
    workspaces[0] ??
    null;
  const topResumeCandidate = resumeCandidates[0] ?? null;
  const selectedWorkspaceResumeCandidate = selectedWorkspace
    ? findWorkspaceResumeCandidate(selectedWorkspace.workspace_id, resumeCandidates)
    : null;
  const selectedWorkspaceCue = selectedWorkspace
    ? workspaceOptionCue(selectedWorkspace, selectedWorkspaceResumeCandidate)
    : null;
  const selectedThread = selectedWorkspace?.active_session_summary ?? null;

  return (
    <main className="home-shell">
      <div className="home-layout">
        <section className="home-app-shell hero-card">
          <div className="home-topbar">
            <div>
              <p className="eyebrow">codex-webui</p>
              <h1>Home</h1>
            </div>
            <span className="metric-chip">
              Updated: {home ? formatTimestamp(home.updated_at) : "Waiting"}
            </span>
          </div>

          <div className="workspace-context">
            <div className="workspace-context-main">
              <p className="eyebrow">Current workspace</p>
              <h2>{selectedWorkspace?.workspace_name ?? "No workspace selected"}</h2>
              <p className="workspace-meta">
                {selectedWorkspace
                  ? (selectedWorkspaceCue ??
                    `Updated ${formatTimestamp(selectedWorkspace.updated_at)}`)
                  : isLoading
                    ? "Loading workspace context..."
                    : "Create a workspace to start a chat from Home."}
              </p>
            </div>

            {workspaces.length > 0 ? (
              <details className="workspace-switcher">
                <summary>Switch workspace</summary>
                <label className="workspace-switcher-control" htmlFor="workspace-switcher">
                  Workspace
                  <select
                    id="workspace-switcher"
                    onChange={(event) => onSelectedWorkspaceIdChange(event.target.value)}
                    value={selectedWorkspace?.workspace_id ?? ""}
                  >
                    {workspaces.map((workspace) => {
                      const cue = workspaceOptionCue(
                        workspace,
                        findWorkspaceResumeCandidate(workspace.workspace_id, resumeCandidates),
                      );

                      return (
                        <option key={workspace.workspace_id} value={workspace.workspace_id}>
                          {workspace.workspace_name}
                          {cue ? ` - ${cue}` : ""}
                        </option>
                      );
                    })}
                  </select>
                </label>
              </details>
            ) : null}
          </div>

          <div className="home-primary-actions">
            {selectedWorkspace ? (
              <Link
                className="primary-link"
                href={workspaceChatHref(selectedWorkspace.workspace_id)}
              >
                Ask Codex
              </Link>
            ) : (
              <span className="disabled-link">Ask Codex</span>
            )}
            <Link className="secondary-link" href="/">
              Refresh Home
            </Link>
          </div>

          <div className="hero-metrics">
            <span className="metric-chip">Workspaces: {workspaces.length}</span>
            <span className="metric-chip">Resume candidates: {resumeCandidates.length}</span>
            {selectedThread ? (
              <span className="metric-chip">
                Active: {formatThreadStatus(selectedThread.status)}
              </span>
            ) : null}
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
          {topResumeCandidate ? (
            <article className="workspace-card top-resume-card">
              <header>
                <div className="workspace-meta-row">
                  <p className="eyebrow">Resume next</p>
                  <span className="status-badge warning">
                    {topResumeCandidate.resume_cue?.label ?? "Resume"}
                  </span>
                </div>
                <h2>{topResumeCandidate.thread_id}</h2>
                <p className="workspace-meta">
                  Workspace {topResumeCandidate.workspace_id} - Updated{" "}
                  {formatTimestamp(topResumeCandidate.updated_at)}
                </p>
              </header>

              <p className="workspace-status">
                {topResumeCandidate.blocked_cue?.label ?? topResumeCandidate.current_activity.label}
                {topResumeCandidate.resume_cue ? ` ${topResumeCandidate.resume_cue.label}.` : null}
              </p>

              <div className="hero-metrics">
                <span className="metric-chip">
                  Activity: {formatResumeLabel(topResumeCandidate.current_activity.label)}
                </span>
                <span className="metric-chip">
                  Priority: {topResumeCandidate.resume_cue?.priority_band ?? "none"}
                </span>
              </div>

              <div className="workspace-actions">
                <Link
                  className="primary-link"
                  href={workspaceChatHref(
                    topResumeCandidate.workspace_id,
                    topResumeCandidate.thread_id,
                  )}
                >
                  Resume thread
                </Link>
              </div>
            </article>
          ) : null}

          {!isLoading && home && resumeCandidates.length === 0 ? (
            <article className="workspace-card">
              <p className="empty-state">
                No resume candidates right now. Use the current workspace context to ask Codex.
              </p>
            </article>
          ) : null}
        </section>

        <section className="workspace-grid workspace-context-details">
          {isLoading && !home ? (
            <article className="workspace-card">
              <p className="workspace-status">Loading Home data...</p>
            </article>
          ) : null}

          {!isLoading && home && workspaces.length === 0 ? (
            <article className="workspace-card">
              <p className="empty-state">
                No workspaces yet. Create one above to start the first-input chat flow.
              </p>
            </article>
          ) : null}

          {selectedWorkspace ? (
            <article className="workspace-card">
              <header>
                <div className="workspace-meta-row">
                  <p className="eyebrow">Selected context</p>
                  <span
                    className={selectedThread ? "status-badge success" : "status-badge warning"}
                  >
                    {selectedThread
                      ? formatThreadStatus(selectedThread.status)
                      : "Ready for first thread"}
                  </span>
                </div>
                <h2>{selectedWorkspace.workspace_name}</h2>
                <p className="workspace-meta">
                  Updated {formatTimestamp(selectedWorkspace.updated_at)}
                </p>
              </header>

              <p className="workspace-status">
                {selectedThread
                  ? `Active thread ${selectedThread.session_id} last moved at ${formatTimestamp(
                      selectedThread.last_message_at,
                    )}.`
                  : "This workspace is ready for its first thread."}
              </p>

              <div className="hero-metrics">
                <span className="metric-chip">
                  Request queue: {selectedWorkspace.pending_approval_count}
                </span>
                <span className="metric-chip">ID: {selectedWorkspace.workspace_id}</span>
                {selectedWorkspaceCue ? (
                  <span className="metric-chip">{selectedWorkspaceCue}</span>
                ) : null}
              </div>

              <div className="workspace-actions">
                <Link
                  className="primary-link"
                  href={workspaceChatHref(selectedWorkspace.workspace_id)}
                >
                  Ask Codex
                </Link>
              </div>
            </article>
          ) : null}
        </section>
      </div>
    </main>
  );
}
