import Link from "next/link";
import { useEffect, useState } from "react";

import type { PublicWorkspaceSummary } from "./chat-data";
import type {
  PublicRequestDetail,
  PublicThreadListItem,
  PublicThreadStreamEvent,
  PublicThreadView,
  PublicTimelineItem,
} from "./thread-types";
import { buildTimelineDisplayModel, type TimelineDisplayRow } from "./timeline-display-model";

export interface ChatViewProps {
  workspaceId: string | null;
  workspaces: PublicWorkspaceSummary[];
  threads: PublicThreadListItem[];
  backgroundPriorityNotice: {
    threadId: string;
    reason: string;
  } | null;
  selectedThreadId: string | null;
  selectedThreadView: PublicThreadView | null;
  selectedRequestDetail: PublicRequestDetail | null;
  streamEvents: PublicThreadStreamEvent[];
  draftAssistantMessages: Record<string, string>;
  isLoadingThreads: boolean;
  isLoadingWorkspaces: boolean;
  isCreatingWorkspace: boolean;
  isLoadingThread: boolean;
  isCreatingThread: boolean;
  isSendingMessage: boolean;
  isInterruptingThread: boolean;
  isRespondingToRequest: boolean;
  connectionState: "idle" | "live" | "reconnecting";
  errorMessage: string | null;
  statusMessage: string | null;
  workspaceName: string;
  composerDraft: string;
  onWorkspaceNameChange: (value: string) => void;
  onComposerDraftChange: (value: string) => void;
  onSubmitComposer: () => void;
  onCreateWorkspace: () => void;
  onSelectWorkspace: (workspaceId: string) => void;
  onSelectThread: (threadId: string) => void;
  onAskCodex: () => void;
  onOpenBackgroundPriorityThread: (threadId: string) => void;
  onInterruptThread: () => void;
  onApproveRequest: () => void;
  onDenyRequest: () => void;
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function threadChatHref(workspaceId: string, threadId?: string) {
  const params = new URLSearchParams({
    workspaceId,
  });

  if (threadId) {
    params.set("threadId", threadId);
  }

  return `/chat?${params.toString()}`;
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

function requestBadgeClass(request: PublicRequestDetail | null) {
  if (!request) {
    return "status-badge";
  }

  return request.status === "pending" ? "status-badge warning" : "status-badge success";
}

function formatMachineLabel(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Not available";
}

function hasAttentionCue(thread: PublicThreadListItem) {
  return (
    thread.blocked_cue !== null ||
    thread.resume_cue?.priority_band === "highest" ||
    thread.current_activity.kind === "waiting_on_approval" ||
    thread.current_activity.kind === "system_error" ||
    thread.current_activity.kind === "latest_turn_failed"
  );
}

function isActiveThread(thread: PublicThreadListItem) {
  return thread.current_activity.kind === "running";
}

function groupThreads(threads: PublicThreadListItem[]) {
  const attentionNeeded = threads.filter(hasAttentionCue);
  const active = threads.filter(
    (thread) =>
      isActiveThread(thread) &&
      !attentionNeeded.some((item) => item.thread_id === thread.thread_id),
  );
  const recent = threads.filter(
    (thread) =>
      !attentionNeeded.some((item) => item.thread_id === thread.thread_id) &&
      !active.some((item) => item.thread_id === thread.thread_id),
  );

  return [
    { label: "Attention needed", threads: attentionNeeded },
    { label: "Active", threads: active },
    { label: "Recent", threads: recent },
  ].filter((group) => group.threads.length > 0);
}

function workspaceSummary(workspace: PublicWorkspaceSummary) {
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

type ThreadDetailSelection =
  | { kind: "request_detail" }
  | { kind: "timeline_item_detail"; timelineItemId: string };

function timelineItemLabel(item: PublicTimelineItem) {
  return String(item.payload.content ?? item.payload.summary ?? item.kind);
}

function timelineRowClass(row: TimelineDisplayRow) {
  return `timeline-row timeline-row-${row.density} timeline-row-${row.role}`;
}

function composerUnavailableReason(threadView: PublicThreadView | null) {
  if (!threadView) {
    return null;
  }

  if (threadView.composer.blocked_by_request || threadView.pending_request) {
    return "Input is paused while this thread waits for your approval response.";
  }

  if (threadView.current_activity.kind === "running") {
    return threadView.composer.interrupt_available
      ? "Codex is running. Interrupt is available if you need to regain control."
      : "Codex is running. New input will be available when the turn finishes.";
  }

  if (threadView.composer.input_unavailable_reason) {
    return `Input unavailable: ${formatMachineLabel(threadView.composer.input_unavailable_reason)}.`;
  }

  if (!threadView.composer.accepting_user_input) {
    return "Input is not available for the current thread state.";
  }

  return null;
}

function currentActivitySummary(
  threadView: PublicThreadView | null,
  isOpeningSelectedThread: boolean,
) {
  if (!threadView) {
    return isOpeningSelectedThread
      ? "Opening this thread and restoring its latest context."
      : "First input will create a new thread in this workspace.";
  }

  switch (threadView.current_activity.kind) {
    case "waiting_on_approval":
      return "Codex is paused until you approve or deny the request below.";
    case "running":
      return "Codex is working in this thread; watch the timeline for progress.";
    case "waiting_on_user_input":
      return "This thread is ready for your next input.";
    case "system_error":
      return "A system error needs review before this thread can continue.";
    case "latest_turn_failed":
      return "The latest turn failed; review the timeline or detail before retrying.";
    default:
      return formatMachineLabel(threadView.current_activity.kind);
  }
}

export function ChatView({
  workspaceId,
  workspaces,
  threads,
  backgroundPriorityNotice,
  selectedThreadId,
  selectedThreadView,
  selectedRequestDetail,
  streamEvents,
  draftAssistantMessages,
  isLoadingThreads,
  isLoadingWorkspaces,
  isCreatingWorkspace,
  isLoadingThread,
  isCreatingThread,
  isSendingMessage,
  isInterruptingThread,
  isRespondingToRequest,
  connectionState,
  errorMessage,
  statusMessage,
  workspaceName,
  composerDraft,
  onWorkspaceNameChange,
  onComposerDraftChange,
  onSubmitComposer,
  onCreateWorkspace,
  onSelectWorkspace,
  onSelectThread,
  onAskCodex,
  onOpenBackgroundPriorityThread,
  onInterruptThread,
  onApproveRequest,
  onDenyRequest,
}: ChatViewProps) {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [detailSelection, setDetailSelection] = useState<ThreadDetailSelection | null>(null);
  const selectedWorkspace =
    workspaces.find((workspace) => workspace.workspace_id === workspaceId) ?? null;
  const threadGroups = groupThreads(threads);
  const hasSelectedThread = selectedThreadId !== null;
  const isOpeningSelectedThread = hasSelectedThread && !selectedThreadView;
  const isStartingThread = !hasSelectedThread;
  const isSubmittingComposer = isCreatingThread || isSendingMessage;
  const unavailableReason = composerUnavailableReason(selectedThreadView);
  const isThreadAcceptingInput = selectedThreadView?.composer.accepting_user_input ?? false;
  const isComposerDisabled =
    !workspaceId ||
    isOpeningSelectedThread ||
    isSubmittingComposer ||
    (selectedThreadView ? !isThreadAcceptingInput : false) ||
    composerDraft.trim().length === 0;
  const composerLabel = isStartingThread ? "Ask Codex" : "Send input";
  const composerPlaceholder = !workspaceId
    ? "Select a workspace before asking Codex."
    : isStartingThread
      ? "Describe the task to start a new thread."
      : "Continue the current thread.";
  const composerSubmitLabel = isSubmittingComposer
    ? isStartingThread
      ? "Starting thread..."
      : "Sending..."
    : isStartingThread
      ? "Start thread"
      : "Send input";
  const composerGuidance = !workspaceId
    ? "Select or create a workspace from Navigation before starting work."
    : isOpeningSelectedThread
      ? "Opening this thread and restoring its latest context."
      : unavailableReason;
  const selectedTimelineItem =
    detailSelection?.kind === "timeline_item_detail"
      ? (selectedThreadView?.timeline.items.find(
          (item) => item.timeline_item_id === detailSelection.timelineItemId,
        ) ?? null)
      : null;
  const timelineModel = buildTimelineDisplayModel({
    timelineItems: selectedThreadView?.timeline.items ?? [],
    streamEvents,
    draftAssistantMessages,
  });

  useEffect(() => {
    setIsNavigationOpen(false);
    setDetailSelection(null);
  }, [selectedThreadId]);

  function selectThread(threadId: string) {
    onSelectThread(threadId);
    setIsNavigationOpen(false);
  }

  function askCodex() {
    onAskCodex();
    setIsNavigationOpen(false);
  }

  return (
    <main className="chat-shell">
      <header className="chat-topbar">
        <div>
          <p className="eyebrow">thread_view</p>
          <h1>{selectedWorkspace?.workspace_name ?? "Thread workspace"}</h1>
        </div>
        <div className="chat-topbar-actions">
          <button
            className="secondary-link action-button navigation-toggle"
            onClick={() => setIsNavigationOpen((currentValue) => !currentValue)}
            type="button"
          >
            {isNavigationOpen ? "Close threads" : "Threads"}
          </button>
        </div>
      </header>
      <div className="chat-layout">
        {errorMessage || statusMessage ? (
          <div aria-live="polite" className="chat-feedback-stack">
            {errorMessage ? (
              <p className="error-banner" role="alert">
                {errorMessage}
              </p>
            ) : null}
            {statusMessage ? (
              <p className="status-message" role="status">
                {statusMessage}
              </p>
            ) : null}
          </div>
        ) : null}
        {backgroundPriorityNotice ? (
          <section aria-live="polite" className="background-priority-notice" role="status">
            <div className="workspace-meta-row">
              <strong>Background thread needs attention</strong>
              <span className="status-badge warning">High priority</span>
            </div>
            <p>
              <strong>{backgroundPriorityNotice.threadId}</strong>
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
          className={
            isNavigationOpen
              ? "chat-panel create-card thread-navigation open"
              : "chat-panel create-card thread-navigation"
          }
        >
          <header>
            <p className="eyebrow">Navigation</p>
            <h2>{selectedWorkspace?.workspace_name ?? "Select workspace"}</h2>
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
              onClick={askCodex}
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
                      <span className="workspace-meta">{workspaceSummary(workspace)}</span>
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

            {threadGroups.map((group) => (
              <section className="thread-list-group" key={group.label}>
                <h3>{group.label}</h3>
                {group.threads.map((thread) => (
                  <button
                    className={
                      selectedThreadId === thread.thread_id
                        ? "thread-summary-card active"
                        : "thread-summary-card"
                    }
                    key={thread.thread_id}
                    onClick={() => selectThread(thread.thread_id)}
                    type="button"
                  >
                    <div className="workspace-meta-row">
                      <p className="eyebrow">Thread</p>
                      <span className={threadBadgeClass(thread)}>
                        {thread.current_activity.label}
                      </span>
                    </div>
                    <strong>{thread.title}</strong>
                    {thread.badge ? (
                      <span className="workspace-meta">
                        {formatMachineLabel(thread.badge.label)}
                      </span>
                    ) : null}
                    {thread.blocked_cue ? (
                      <span className="workspace-meta">
                        Blocked: {formatMachineLabel(thread.blocked_cue.label)}
                      </span>
                    ) : null}
                    <span className="workspace-meta">
                      Updated {formatTimestamp(thread.updated_at)}
                    </span>
                    <span className="workspace-meta">Thread ref: {thread.thread_id}</span>
                    {thread.resume_cue ? (
                      <span className="workspace-meta">
                        {formatMachineLabel(thread.resume_cue.label)}
                      </span>
                    ) : null}
                  </button>
                ))}
              </section>
            ))}
          </div>
        </section>

        <section className="chat-panel workspace-card thread-view-card">
          <div className="thread-view-header-stack">
            <header>
              <div className="workspace-meta-row">
                <p className="eyebrow">{isStartingThread ? "Workspace input" : "Current thread"}</p>
                {selectedThreadView ? (
                  <span className="status-badge success">
                    {selectedThreadView.current_activity.label}
                  </span>
                ) : isOpeningSelectedThread ? (
                  <span className="status-badge">Opening</span>
                ) : workspaceId ? (
                  <span className="status-badge">Ready for workspace input</span>
                ) : null}
              </div>
              <h2>
                {selectedThreadView?.thread.title ??
                  (isOpeningSelectedThread
                    ? "Opening thread"
                    : workspaceId
                      ? `Ask Codex in ${selectedWorkspace?.workspace_name ?? workspaceId}`
                      : "Select workspace")}
              </h2>
              <p className="workspace-meta">
                {selectedThreadView
                  ? `Workspace ${selectedWorkspace?.workspace_name ?? selectedThreadView.thread.workspace_id} - Updated ${formatTimestamp(
                      selectedThreadView.thread.updated_at,
                    )}`
                  : isOpeningSelectedThread
                    ? `Loading ${selectedThreadId}.`
                    : workspaceId
                      ? "Ask Codex to start a new thread, or pick a thread from Navigation."
                      : "Select or create a workspace from Navigation before starting work."}
              </p>
              <div className="hero-metrics thread-context-metrics">
                <span className="metric-chip">
                  Workspace: {selectedWorkspace?.workspace_name ?? workspaceId}
                </span>
                <span className="metric-chip">
                  Stream:{" "}
                  {connectionState === "live"
                    ? "live"
                    : connectionState === "reconnecting"
                      ? "reacquiring"
                      : "idle"}
                </span>
                <span className="metric-chip">Threads: {threads.length}</span>
                {workspaceId ? (
                  <Link
                    className="secondary-link compact-link"
                    href={threadChatHref(workspaceId, selectedThreadId ?? undefined)}
                  >
                    Refresh
                  </Link>
                ) : null}
              </div>
            </header>

            <div className="current-activity-card">
              <div className="workspace-meta-row">
                <strong>Current activity</strong>
                <span className="status-badge">
                  {selectedThreadView?.current_activity.label ??
                    (isOpeningSelectedThread
                      ? "Opening"
                      : workspaceId
                        ? "Ready for first input"
                        : "Workspace required")}
                </span>
              </div>
              <p className="workspace-meta">
                {workspaceId
                  ? currentActivitySummary(selectedThreadView, isOpeningSelectedThread)
                  : "Choose a workspace to enable the composer."}
              </p>
            </div>
          </div>

          <div className="thread-view-body">
            <div className="thread-view-scroll-region">
              {selectedThreadView?.pending_request ? (
                <div className="request-detail-card pending-request-card">
                  <div className="workspace-meta-row">
                    <strong>Pending request</strong>
                    <span className={requestBadgeClass(selectedRequestDetail)}>
                      {formatMachineLabel(selectedThreadView.pending_request.risk_category)}
                    </span>
                  </div>
                  <p>{selectedThreadView.pending_request.summary}</p>
                  {selectedRequestDetail ? (
                    <p className="workspace-meta">{selectedRequestDetail.reason}</p>
                  ) : null}
                  {selectedRequestDetail?.operation_summary ? (
                    <p className="workspace-meta">
                      Operation: {selectedRequestDetail.operation_summary}
                    </p>
                  ) : null}
                  <p className="workspace-meta">
                    Requested {formatTimestamp(selectedThreadView.pending_request.requested_at)}
                  </p>
                  <div className="workspace-actions">
                    <button
                      className="primary-link action-button"
                      disabled={
                        isRespondingToRequest || selectedRequestDetail?.status !== "pending"
                      }
                      onClick={onApproveRequest}
                      type="button"
                    >
                      {isRespondingToRequest ? "Submitting..." : "Approve request"}
                    </button>
                    <button
                      className="secondary-link action-button"
                      disabled={
                        isRespondingToRequest || selectedRequestDetail?.status !== "pending"
                      }
                      onClick={onDenyRequest}
                      type="button"
                    >
                      Deny request
                    </button>
                    {selectedRequestDetail ? (
                      <button
                        className="secondary-link action-button"
                        onClick={() => setDetailSelection({ kind: "request_detail" })}
                        type="button"
                      >
                        Request detail
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : selectedThreadView?.latest_resolved_request ? (
                <div className="request-detail-card resolved-request-card">
                  <div className="workspace-meta-row">
                    <strong>Latest resolved request</strong>
                    <span className={requestBadgeClass(selectedRequestDetail)}>
                      {selectedThreadView.latest_resolved_request.decision}
                    </span>
                  </div>
                  <p>Decision: {selectedThreadView.latest_resolved_request.decision}</p>
                  <p className="workspace-meta">
                    Responded{" "}
                    {formatTimestamp(selectedThreadView.latest_resolved_request.responded_at)}
                  </p>
                  {selectedRequestDetail ? (
                    <button
                      className="secondary-link action-button inline-detail-button"
                      onClick={() => setDetailSelection({ kind: "request_detail" })}
                      type="button"
                    >
                      Reopen request detail
                    </button>
                  ) : null}
                </div>
              ) : null}

              {selectedThreadView?.composer.interrupt_available ? (
                <div className="workspace-actions thread-interrupt-actions">
                  <button
                    className="secondary-link action-button"
                    disabled={isInterruptingThread}
                    onClick={onInterruptThread}
                    type="button"
                  >
                    {isInterruptingThread ? "Interrupting..." : "Interrupt thread"}
                  </button>
                </div>
              ) : null}

              <section className="timeline-section" aria-label="Timeline">
                <header>
                  <p className="eyebrow">Timeline</p>
                  <h2>Thread context</h2>
                </header>

                {isLoadingThread ? (
                  <p className="workspace-status">
                    {selectedThreadId
                      ? "Opening this thread and restoring its latest timeline..."
                      : "Preparing thread view..."}
                  </p>
                ) : null}

                <div className="chat-message-list">
                  {!isLoadingThread && selectedThreadView && timelineModel.groups.length === 0 ? (
                    <p className="empty-state">
                      No timeline items yet. Start the thread or send follow-up input to continue.
                    </p>
                  ) : null}

                  {timelineModel.groups.map((group) => (
                    <section
                      className={group.turnId ? "timeline-turn-group" : "timeline-ungrouped-item"}
                      data-turn-id={group.turnId ?? undefined}
                      key={group.id}
                    >
                      {group.turnId ? (
                        <div className="timeline-turn-label">
                          <span>Turn</span>
                          <strong>{group.turnId}</strong>
                        </div>
                      ) : null}
                      {group.rows.map((row) => (
                        <article className={timelineRowClass(row)} key={row.id}>
                          <div className="workspace-meta-row">
                            <strong>{row.label}</strong>
                            <span className="workspace-meta">
                              {row.isLive ? "Live" : formatTimestamp(row.occurredAt)}
                            </span>
                          </div>
                          <p>{row.content}</p>
                          {row.showDetailButton && row.timelineItemId ? (
                            <button
                              className="secondary-link action-button inline-detail-button"
                              onClick={() =>
                                setDetailSelection({
                                  kind: "timeline_item_detail",
                                  timelineItemId: row.timelineItemId ?? "",
                                })
                              }
                              type="button"
                            >
                              Timeline item detail
                            </button>
                          ) : null}
                        </article>
                      ))}
                    </section>
                  ))}
                </div>
              </section>
            </div>

            <div className="chat-composer" data-composer-mode={isStartingThread ? "start" : "send"}>
              <label className="form-label" htmlFor="thread-composer-input">
                {composerLabel}
                <textarea
                  className="chat-textarea"
                  disabled={
                    !workspaceId ||
                    isOpeningSelectedThread ||
                    isSubmittingComposer ||
                    Boolean(unavailableReason)
                  }
                  id="thread-composer-input"
                  name="thread-composer-input"
                  onChange={(event) => onComposerDraftChange(event.target.value)}
                  placeholder={composerPlaceholder}
                  rows={4}
                  value={composerDraft}
                />
              </label>
              {composerGuidance ? (
                <p className="composer-guidance" role="status">
                  {composerGuidance}
                </p>
              ) : (
                <p className="composer-guidance" role="status">
                  {isStartingThread
                    ? "First input starts a new thread in this workspace."
                    : "Input will continue the selected thread."}
                </p>
              )}
              <button
                className="submit-button"
                disabled={isComposerDisabled}
                onClick={onSubmitComposer}
                type="button"
              >
                {composerSubmitLabel}
              </button>
            </div>
          </div>
        </section>

        {detailSelection ? (
          <aside className="chat-panel workspace-card thread-detail-surface">
            <header>
              <div className="workspace-meta-row">
                <p className="eyebrow">Detail</p>
                <button
                  className="secondary-link action-button compact-button"
                  onClick={() => setDetailSelection(null)}
                  type="button"
                >
                  Close
                </button>
              </div>
              <h2>
                {detailSelection.kind === "request_detail"
                  ? "Request detail"
                  : "Timeline item detail"}
              </h2>
            </header>

            {detailSelection.kind === "request_detail" && selectedRequestDetail ? (
              <div className="detail-stack">
                <div className="workspace-meta-row">
                  <span className={requestBadgeClass(selectedRequestDetail)}>
                    {selectedRequestDetail.status}
                  </span>
                  <span className="status-badge">
                    {formatMachineLabel(selectedRequestDetail.risk_category)}
                  </span>
                </div>
                <p>{selectedRequestDetail.summary}</p>
                <dl className="request-detail-list">
                  <div>
                    <dt>Reason</dt>
                    <dd>{selectedRequestDetail.reason}</dd>
                  </div>
                  {selectedRequestDetail.operation_summary ? (
                    <div>
                      <dt>Operation</dt>
                      <dd>{selectedRequestDetail.operation_summary}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Requested</dt>
                    <dd>{formatTimestamp(selectedRequestDetail.requested_at)}</dd>
                  </div>
                  <div className="request-context-field">
                    <dt>Thread</dt>
                    <dd>{selectedRequestDetail.thread_id}</dd>
                  </div>
                  <div className="request-context-field">
                    <dt>Turn</dt>
                    <dd>{selectedRequestDetail.turn_id ?? "Not available"}</dd>
                  </div>
                  <div className="request-context-field">
                    <dt>Item</dt>
                    <dd>{selectedRequestDetail.item_id}</dd>
                  </div>
                  {selectedRequestDetail.decision ? (
                    <div>
                      <dt>Decision</dt>
                      <dd>{selectedRequestDetail.decision}</dd>
                    </div>
                  ) : null}
                  {selectedRequestDetail.responded_at ? (
                    <div>
                      <dt>Responded</dt>
                      <dd>{formatTimestamp(selectedRequestDetail.responded_at)}</dd>
                    </div>
                  ) : null}
                </dl>
                {selectedRequestDetail.operation_summary ? (
                  <p className="request-operation-summary">
                    Operation: {selectedRequestDetail.operation_summary}
                  </p>
                ) : null}
                {selectedRequestDetail.status === "pending" ? (
                  <div className="workspace-actions request-detail-actions">
                    <button
                      className="primary-link action-button"
                      disabled={isRespondingToRequest}
                      onClick={onApproveRequest}
                      type="button"
                    >
                      {isRespondingToRequest ? "Submitting..." : "Approve request"}
                    </button>
                    <button
                      className="secondary-link action-button"
                      disabled={isRespondingToRequest}
                      onClick={onDenyRequest}
                      type="button"
                    >
                      Deny request
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {detailSelection.kind === "timeline_item_detail" && selectedTimelineItem ? (
              <div className="detail-stack">
                <p className="workspace-meta">
                  {selectedTimelineItem.kind} at {formatTimestamp(selectedTimelineItem.occurred_at)}
                </p>
                <p>{timelineItemLabel(selectedTimelineItem)}</p>
                <pre className="detail-json">
                  {JSON.stringify(selectedTimelineItem.payload, null, 2)}
                </pre>
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
    </main>
  );
}
