import { useEffect, useState } from "react";

import type { PublicWorkspaceSummary } from "./chat-data";
import type { PublicThreadListItem } from "./thread-types";

type ThreadFilterId = "all" | "active" | "waiting_approval" | "errors_failed" | "recent";
export type SidebarMode = "full" | "mini";

const SIDEBAR_MODE_STORAGE_KEY = "codex-webui.sidebar-mode";

function isActiveThread(thread: PublicThreadListItem) {
  return thread.current_activity.kind === "running";
}

function isWaitingApprovalThread(thread: PublicThreadListItem) {
  return (
    thread.current_activity.kind === "waiting_on_approval" ||
    thread.blocked_cue?.kind === "approval_required" ||
    thread.badge?.kind === "approval"
  );
}

function isErrorOrFailedThread(thread: PublicThreadListItem) {
  return (
    thread.current_activity.kind === "system_error" ||
    thread.current_activity.kind === "latest_turn_failed" ||
    thread.native_status.latest_turn_status === "failed"
  );
}

function isRecentThread(thread: PublicThreadListItem) {
  return (
    !isActiveThread(thread) && !isWaitingApprovalThread(thread) && !isErrorOrFailedThread(thread)
  );
}

function filterThreads(threads: PublicThreadListItem[], filterId: ThreadFilterId) {
  switch (filterId) {
    case "active":
      return threads.filter(isActiveThread);
    case "waiting_approval":
      return threads.filter(isWaitingApprovalThread);
    case "errors_failed":
      return threads.filter(isErrorOrFailedThread);
    case "recent":
      return threads.filter(isRecentThread);
    default:
      return threads;
  }
}

function threadCueLabel(thread: PublicThreadListItem) {
  return thread.blocked_cue?.label ?? thread.resume_cue?.label ?? thread.badge?.label ?? null;
}

function threadBadgeClass(thread: PublicThreadListItem) {
  if (thread.resume_cue?.priority_band === "highest" || thread.blocked_cue) {
    return "status-badge warning";
  }

  if (thread.current_activity.kind === "running") {
    return "status-badge success";
  }

  return "status-badge";
}

function threadStatusSymbol(thread: PublicThreadListItem) {
  if (isWaitingApprovalThread(thread)) {
    return "!";
  }

  if (isErrorOrFailedThread(thread)) {
    return "x";
  }

  if (isActiveThread(thread)) {
    return ">";
  }

  return ".";
}

function threadStatusLabel(thread: PublicThreadListItem) {
  if (isWaitingApprovalThread(thread)) {
    return "Waiting approval";
  }

  if (isErrorOrFailedThread(thread)) {
    return "Needs review";
  }

  if (isActiveThread(thread)) {
    return "Running";
  }

  return "Idle";
}

function compactWorkspaceLabel(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) {
    return "--";
  }

  const initials = normalized
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (initials || normalized.slice(0, 2)).toUpperCase();
}

export function readStoredSidebarMode() {
  try {
    const storage = window.localStorage;
    if (typeof storage.getItem !== "function") {
      return null;
    }

    const storedMode = storage.getItem(SIDEBAR_MODE_STORAGE_KEY);
    return storedMode === "full" || storedMode === "mini" ? storedMode : null;
  } catch {
    return null;
  }
}

export function writeStoredSidebarMode(nextMode: SidebarMode) {
  try {
    const storage = window.localStorage;
    if (typeof storage.setItem === "function") {
      storage.setItem(SIDEBAR_MODE_STORAGE_KEY, nextMode);
    }
  } catch {
    // Sidebar preference should never block Navigation controls.
  }
}

function workspaceSummary(
  workspace: PublicWorkspaceSummary,
  {
    formatMachineLabel,
    formatTimestamp,
  }: {
    formatMachineLabel: (value: string | null | undefined) => string;
    formatTimestamp: (value: string | null) => string;
  },
) {
  if (workspace.pending_approval_count > 0) {
    return `${workspace.pending_approval_count} approval${
      workspace.pending_approval_count === 1 ? "" : "s"
    }`;
  }

  if (workspace.active_session_summary) {
    return `${formatMachineLabel(workspace.active_session_summary.status)} activity`;
  }

  return `Updated ${formatTimestamp(workspace.updated_at)}`;
}

export interface ChatViewNavigationProps {
  workspaceId: string | null;
  workspaces: PublicWorkspaceSummary[];
  threads: PublicThreadListItem[];
  backgroundPriorityNotice: {
    threadId: string;
    reason: string;
  } | null;
  selectedThreadId: string | null;
  workspaceName: string;
  isLoadingThreads: boolean;
  isLoadingWorkspaces: boolean;
  isCreatingWorkspace: boolean;
  isNavigationOpen: boolean;
  sidebarMode: SidebarMode;
  formatTimestamp: (value: string | null) => string;
  formatMachineLabel: (value: string | null | undefined) => string;
  onWorkspaceNameChange: (value: string) => void;
  onCreateWorkspace: () => void;
  onSelectWorkspace: (workspaceId: string) => void;
  onSelectThread: (threadId: string) => void;
  onAskCodex: () => void;
  onOpenBackgroundPriorityThread: (threadId: string) => void;
  onSidebarModeChange: (mode: SidebarMode) => void;
}

export function ChatViewNavigation({
  workspaceId,
  workspaces,
  threads,
  backgroundPriorityNotice,
  selectedThreadId,
  workspaceName,
  isLoadingThreads,
  isLoadingWorkspaces,
  isCreatingWorkspace,
  isNavigationOpen,
  sidebarMode,
  formatTimestamp,
  formatMachineLabel,
  onWorkspaceNameChange,
  onCreateWorkspace,
  onSelectWorkspace,
  onSelectThread,
  onAskCodex,
  onOpenBackgroundPriorityThread,
  onSidebarModeChange,
}: ChatViewNavigationProps) {
  const [selectedFilterId, setSelectedFilterId] = useState<ThreadFilterId>("all");
  const selectedWorkspace =
    workspaces.find((workspace) => workspace.workspace_id === workspaceId) ?? null;
  const selectedThreadSummary =
    threads.find((thread) => thread.thread_id === selectedThreadId) ?? null;
  const visibleThreads = filterThreads(threads, selectedFilterId);
  const attentionThreads = threads.filter(
    (thread) =>
      isWaitingApprovalThread(thread) ||
      isErrorOrFailedThread(thread) ||
      backgroundPriorityNotice?.threadId === thread.thread_id,
  );
  const threadFilters: Array<{ id: ThreadFilterId; label: string; count: number }> = [
    { id: "all", label: "All", count: threads.length },
    { id: "active", label: "Active", count: threads.filter(isActiveThread).length },
    {
      id: "waiting_approval",
      label: "Waiting approval",
      count: threads.filter(isWaitingApprovalThread).length,
    },
    {
      id: "errors_failed",
      label: "Errors / Failed",
      count: threads.filter(isErrorOrFailedThread).length,
    },
    { id: "recent", label: "Recent", count: threads.filter(isRecentThread).length },
  ];
  const hasSelectedThread = selectedThreadId !== null;
  const isSidebarMinibar = sidebarMode === "mini" && !isNavigationOpen;

  useEffect(() => {
    setSelectedFilterId("all");
  }, [workspaceId]);

  return (
    <>
      {backgroundPriorityNotice ? (
        <section aria-live="polite" className="background-priority-notice" role="status">
          <div className="workspace-meta-row">
            <strong>Background thread needs attention</strong>
            <span className="status-badge warning">High priority</span>
          </div>
          <p>
            <strong>
              <code className="artifact-inline">{backgroundPriorityNotice.threadId}</code>
            </strong>
            {" needs attention now."}
          </p>
          <p className="workspace-meta">Reason: {backgroundPriorityNotice.reason}</p>
          <div className="workspace-actions">
            <button
              className="primary-link action-button compact-button"
              onClick={() => onOpenBackgroundPriorityThread(backgroundPriorityNotice.threadId)}
              type="button"
            >
              Open thread
            </button>
          </div>
        </section>
      ) : null}

      <section
        aria-label="Navigation"
        className={[
          "chat-panel create-card thread-navigation",
          isNavigationOpen ? "open" : "",
          isSidebarMinibar ? "minibar" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {isSidebarMinibar ? (
          <div className="navigation-minibar-stack">
            <button
              aria-label="Expand Navigation"
              className="secondary-link action-button minibar-button"
              onClick={() => onSidebarModeChange("full")}
              title="Expand Navigation"
              type="button"
            >
              Nav
            </button>
            {workspaceId ? (
              <button
                aria-label={`Start new thread in ${selectedWorkspace?.workspace_name ?? workspaceId}`}
                className="primary-link action-button minibar-button"
                onClick={onAskCodex}
                title="Ask Codex"
                type="button"
              >
                New
              </button>
            ) : null}
            <button
              aria-label={`Current workspace: ${
                selectedWorkspace?.workspace_name ?? workspaceId ?? "none"
              }`}
              className="secondary-link action-button minibar-button"
              onClick={() => onSidebarModeChange("full")}
              title={selectedWorkspace?.workspace_name ?? workspaceId ?? "Select workspace"}
              type="button"
            >
              {compactWorkspaceLabel(selectedWorkspace?.workspace_name ?? workspaceId)}
            </button>
            {selectedThreadSummary ? (
              <button
                aria-current="page"
                aria-label={`Current thread: ${selectedThreadSummary.title}`}
                className="secondary-link action-button minibar-button active"
                onClick={() => onSelectThread(selectedThreadSummary.thread_id)}
                title={selectedThreadSummary.title}
                type="button"
              >
                {threadStatusSymbol(selectedThreadSummary)}
              </button>
            ) : null}
            {attentionThreads
              .filter((thread) => thread.thread_id !== selectedThreadId)
              .slice(0, 4)
              .map((thread) => (
                <button
                  aria-label={`${threadStatusLabel(thread)}: ${thread.title}`}
                  className="secondary-link action-button minibar-button attention"
                  key={thread.thread_id}
                  onClick={() => onSelectThread(thread.thread_id)}
                  title={thread.title}
                  type="button"
                >
                  {threadStatusSymbol(thread)}
                </button>
              ))}
          </div>
        ) : (
          <>
            <header>
              <div className="workspace-meta-row navigation-header-row">
                <h2>{selectedWorkspace?.workspace_name ?? "Select workspace"}</h2>
                <button
                  aria-label="Collapse Navigation to minibar"
                  className="secondary-link action-button compact-button sidebar-mode-toggle"
                  onClick={() => onSidebarModeChange("mini")}
                  type="button"
                >
                  Minimize
                </button>
              </div>
              <p className="workspace-meta">
                {workspaceId ? "Workspace scope active" : "Choose or create a workspace."}
              </p>
            </header>

            {workspaceId ? (
              <button
                className={
                  hasSelectedThread
                    ? "primary-link action-button navigation-ask-codex"
                    : "secondary-link action-button navigation-ask-codex"
                }
                onClick={onAskCodex}
                type="button"
              >
                Ask Codex
              </button>
            ) : null}

            <details className="workspace-switcher">
              <summary>Switch workspace</summary>
              <div className="workspace-switcher-control">
                {isLoadingWorkspaces ? (
                  <p className="workspace-status">Loading workspaces...</p>
                ) : null}
                {workspaces.length > 0 ? (
                  <div className="workspace-option-list">
                    {workspaces.map((workspace) => (
                      <button
                        className={
                          workspace.workspace_id === workspaceId
                            ? "workspace-option-card active"
                            : "workspace-option-card"
                        }
                        key={workspace.workspace_id}
                        onClick={() => onSelectWorkspace(workspace.workspace_id)}
                        type="button"
                      >
                        <strong>{workspace.workspace_name}</strong>
                        <span className="workspace-meta">{workspace.workspace_id}</span>
                        <span className="workspace-meta">
                          {workspaceSummary(workspace, {
                            formatMachineLabel,
                            formatTimestamp,
                          })}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : !isLoadingWorkspaces ? (
                  <p className="empty-state">Create a workspace to start scoped work.</p>
                ) : null}

                <div className="create-form workspace-create-form">
                  <label className="form-label" htmlFor="workspace-name">
                    New workspace
                    <input
                      id="workspace-name"
                      name="workspace-name"
                      onChange={(event) => onWorkspaceNameChange(event.target.value)}
                      placeholder="Workspace name"
                      value={workspaceName}
                    />
                  </label>
                  <button
                    className="submit-button"
                    disabled={isCreatingWorkspace || workspaceName.trim().length === 0}
                    onClick={onCreateWorkspace}
                    type="button"
                  >
                    {isCreatingWorkspace ? "Creating..." : "Create workspace"}
                  </button>
                </div>
              </div>
            </details>

            <div className="thread-list">
              {isLoadingThreads ? <p className="workspace-status">Loading threads...</p> : null}

              {!workspaceId && !isLoadingWorkspaces ? (
                <p className="empty-state">Select a workspace to show its threads.</p>
              ) : null}

              {workspaceId && !isLoadingThreads && threads.length === 0 ? (
                <p className="empty-state">No threads yet. Use Ask Codex in Thread View.</p>
              ) : null}

              {workspaceId && threads.length > 0 ? (
                <div aria-label="Thread filters" className="thread-filter-bar" role="tablist">
                  {threadFilters.map((filter) => (
                    <button
                      aria-selected={selectedFilterId === filter.id}
                      className={
                        selectedFilterId === filter.id
                          ? "thread-filter-chip active"
                          : "thread-filter-chip"
                      }
                      key={filter.id}
                      onClick={() => setSelectedFilterId(filter.id)}
                      role="tab"
                      type="button"
                    >
                      <span>{filter.label}</span>
                      <span className="thread-filter-count">{filter.count}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {workspaceId &&
              !isLoadingThreads &&
              threads.length > 0 &&
              visibleThreads.length === 0 ? (
                <p className="empty-state">No threads match this filter.</p>
              ) : null}

              {visibleThreads.map((thread) => {
                const isSelected = selectedThreadId === thread.thread_id;
                const rowCueLabel = threadCueLabel(thread);
                const hasBackgroundNotice =
                  backgroundPriorityNotice?.threadId === thread.thread_id && !isSelected;
                const isAttention = rowCueLabel !== null || hasBackgroundNotice;

                return (
                  <button
                    aria-current={isSelected ? "page" : undefined}
                    className={isSelected ? "thread-summary-card active" : "thread-summary-card"}
                    key={thread.thread_id}
                    onClick={() => onSelectThread(thread.thread_id)}
                    type="button"
                  >
                    <div className="workspace-meta-row thread-summary-header">
                      <span
                        aria-label={threadStatusLabel(thread)}
                        className={threadBadgeClass(thread).replace(
                          "status-badge",
                          "thread-status-mark",
                        )}
                        role="img"
                        title={threadStatusLabel(thread)}
                      >
                        {threadStatusSymbol(thread)}
                      </span>
                      <div className="thread-summary-title-block">
                        <strong>{thread.title}</strong>
                        <span className="workspace-meta">
                          Updated {formatTimestamp(thread.updated_at)}
                        </span>
                      </div>
                    </div>
                    {isAttention ? (
                      <div className="thread-summary-cues">
                        {rowCueLabel ? (
                          <span className="status-badge">{formatMachineLabel(rowCueLabel)}</span>
                        ) : null}
                        {hasBackgroundNotice ? (
                          <span className="status-badge warning">Needs attention now</span>
                        ) : null}
                        {thread.badge && rowCueLabel !== thread.badge.label ? (
                          <span className="status-badge">
                            {formatMachineLabel(thread.badge.label)}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {hasBackgroundNotice ? (
                      <p className="thread-summary-notice">
                        Background notice: {backgroundPriorityNotice?.reason}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>
    </>
  );
}
