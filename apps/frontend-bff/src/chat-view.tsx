import Link from "next/link";
import { useEffect, useState } from "react";

import type {
  PublicRequestDetail,
  PublicThreadListItem,
  PublicThreadStreamEvent,
  PublicThreadView,
  PublicTimelineItem,
} from "./thread-types";

export interface ChatViewProps {
  workspaceId: string | null;
  threads: PublicThreadListItem[];
  selectedThreadId: string | null;
  selectedThreadView: PublicThreadView | null;
  selectedRequestDetail: PublicRequestDetail | null;
  streamEvents: PublicThreadStreamEvent[];
  draftAssistantMessages: Record<string, string>;
  isLoadingThreads: boolean;
  isLoadingThread: boolean;
  isCreatingThread: boolean;
  isSendingMessage: boolean;
  isInterruptingThread: boolean;
  isRespondingToRequest: boolean;
  connectionState: "idle" | "live" | "reconnecting";
  errorMessage: string | null;
  statusMessage: string | null;
  newThreadInput: string;
  messageDraft: string;
  onNewThreadInputChange: (value: string) => void;
  onMessageDraftChange: (value: string) => void;
  onCreateThread: () => void;
  onSelectThread: (threadId: string) => void;
  onSendMessage: () => void;
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

type ThreadDetailSelection =
  | { kind: "request_detail" }
  | { kind: "timeline_item_detail"; timelineItemId: string };

function timelineItemLabel(item: PublicTimelineItem) {
  return String(item.payload.content ?? item.payload.summary ?? item.kind);
}

export function ChatView({
  workspaceId,
  threads,
  selectedThreadId,
  selectedThreadView,
  selectedRequestDetail,
  streamEvents,
  draftAssistantMessages,
  isLoadingThreads,
  isLoadingThread,
  isCreatingThread,
  isSendingMessage,
  isInterruptingThread,
  isRespondingToRequest,
  connectionState,
  errorMessage,
  statusMessage,
  newThreadInput,
  messageDraft,
  onNewThreadInputChange,
  onMessageDraftChange,
  onCreateThread,
  onSelectThread,
  onSendMessage,
  onInterruptThread,
  onApproveRequest,
  onDenyRequest,
}: ChatViewProps) {
  const draftEntries = Object.entries(draftAssistantMessages);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [detailSelection, setDetailSelection] = useState<ThreadDetailSelection | null>(null);
  const selectedTimelineItem =
    detailSelection?.kind === "timeline_item_detail"
      ? (selectedThreadView?.timeline.items.find(
          (item) => item.timeline_item_id === detailSelection.timelineItemId,
        ) ?? null)
      : null;

  useEffect(() => {
    setIsNavigationOpen(false);
    setDetailSelection(null);
  }, [selectedThreadId]);

  function selectThread(threadId: string) {
    onSelectThread(threadId);
    setIsNavigationOpen(false);
  }

  return (
    <main className="chat-shell">
      <header className="chat-topbar">
        <div>
          <p className="eyebrow">thread_view</p>
          <h1>Chat</h1>
        </div>
        <div className="chat-topbar-actions">
          <button
            className="secondary-link action-button navigation-toggle"
            onClick={() => setIsNavigationOpen((currentValue) => !currentValue)}
            type="button"
          >
            {isNavigationOpen ? "Close threads" : "Threads"}
          </button>
          <Link className="secondary-link" href="/">
            Home
          </Link>
        </div>
      </header>
      <div className="chat-layout">
        {!workspaceId ? (
          <section className="placeholder-card">
            <p className="eyebrow">Missing workspace</p>
            <h1>Start from Home</h1>
            <p>Open Chat from the Home workspace cards so the workspace context is already set.</p>
          </section>
        ) : null}

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

        {workspaceId ? (
          <>
            <section
              className={
                isNavigationOpen
                  ? "chat-panel create-card thread-navigation open"
                  : "chat-panel create-card thread-navigation"
              }
            >
              <header>
                <p className="eyebrow">Threads</p>
                <h2>Start or resume a thread</h2>
                <p className="field-hint">
                  New threads start from first input. Existing threads reload from `thread_view` and
                  `timeline`.
                </p>
              </header>

              <div className="create-form">
                <label className="form-label" htmlFor="thread-input">
                  First input
                  <textarea
                    className="chat-textarea"
                    id="thread-input"
                    name="thread-input"
                    onChange={(event) => onNewThreadInputChange(event.target.value)}
                    placeholder="Describe the task to start a new thread."
                    rows={4}
                    value={newThreadInput}
                  />
                </label>
                <button
                  className="submit-button"
                  disabled={isCreatingThread || newThreadInput.trim().length === 0}
                  onClick={onCreateThread}
                  type="button"
                >
                  {isCreatingThread ? "Starting thread..." : "Start new thread"}
                </button>
              </div>

              <div className="thread-list">
                {isLoadingThreads ? <p className="workspace-status">Loading threads...</p> : null}

                {!isLoadingThreads && threads.length === 0 ? (
                  <p className="empty-state">
                    No threads yet. Send first input above to start the thread flow.
                  </p>
                ) : null}

                {threads.map((thread) => (
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
                    <strong>{thread.thread_id}</strong>
                    <span className="workspace-meta">
                      Updated {formatTimestamp(thread.updated_at)}
                    </span>
                    {thread.resume_cue ? (
                      <span className="workspace-meta">
                        {formatMachineLabel(thread.resume_cue.label)}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </section>

            <section className="chat-panel workspace-card thread-view-card">
              <header>
                <div className="workspace-meta-row">
                  <p className="eyebrow">Current thread</p>
                  {selectedThreadView ? (
                    <span className="status-badge success">
                      {selectedThreadView.current_activity.label}
                    </span>
                  ) : null}
                </div>
                <h2>{selectedThreadView?.thread.thread_id ?? "Select a thread"}</h2>
                <p className="workspace-meta">
                  {selectedThreadView
                    ? `Updated ${formatTimestamp(selectedThreadView.thread.updated_at)}`
                    : "Pick a thread from the list to load current activity and requests."}
                </p>
                <div className="hero-metrics thread-context-metrics">
                  <span className="metric-chip">Workspace: {workspaceId}</span>
                  <span className="metric-chip">
                    Stream:{" "}
                    {connectionState === "live"
                      ? "live"
                      : connectionState === "reconnecting"
                        ? "reacquiring"
                        : "idle"}
                  </span>
                  <span className="metric-chip">Threads: {threads.length}</span>
                  <Link
                    className="secondary-link compact-link"
                    href={threadChatHref(workspaceId, selectedThreadId ?? undefined)}
                  >
                    Refresh
                  </Link>
                </div>
              </header>

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

              <div className="workspace-actions">
                <button
                  className="secondary-link action-button"
                  disabled={
                    !selectedThreadView?.composer.interrupt_available || isInterruptingThread
                  }
                  onClick={onInterruptThread}
                  type="button"
                >
                  {isInterruptingThread ? "Interrupting..." : "Interrupt thread"}
                </button>
              </div>

              <section className="timeline-section" aria-label="Timeline">
                <header>
                  <p className="eyebrow">Timeline</p>
                  <h2>Thread context</h2>
                </header>

                {isLoadingThread ? (
                  <p className="workspace-status">Refreshing thread detail...</p>
                ) : null}

                <div className="chat-message-list">
                  {!isLoadingThread &&
                  selectedThreadView &&
                  selectedThreadView.timeline.items.length === 0 &&
                  draftEntries.length === 0 ? (
                    <p className="empty-state">
                      No timeline items yet. Start the thread or send follow-up input to continue.
                    </p>
                  ) : null}

                  {selectedThreadView?.timeline.items.map((item) => (
                    <article className="chat-message assistant" key={item.timeline_item_id}>
                      <div className="workspace-meta-row">
                        <strong>{item.kind}</strong>
                        <span className="workspace-meta">{formatTimestamp(item.occurred_at)}</span>
                      </div>
                      <p>{timelineItemLabel(item)}</p>
                      <button
                        className="secondary-link action-button inline-detail-button"
                        onClick={() =>
                          setDetailSelection({
                            kind: "timeline_item_detail",
                            timelineItemId: item.timeline_item_id,
                          })
                        }
                        type="button"
                      >
                        Timeline item detail
                      </button>
                    </article>
                  ))}

                  {draftEntries.map(([messageId, content]) => (
                    <article className="chat-message assistant" key={messageId}>
                      <div className="workspace-meta-row">
                        <strong>assistant streaming</strong>
                        <span className="workspace-meta">Live</span>
                      </div>
                      <p>{content}…</p>
                    </article>
                  ))}

                  {streamEvents.map((event) => (
                    <article className="chat-message user" key={event.event_id}>
                      <div className="workspace-meta-row">
                        <strong>{event.event_type}</strong>
                        <span className="workspace-meta">{formatTimestamp(event.occurred_at)}</span>
                      </div>
                      <p>
                        {String(
                          event.payload.content ??
                            event.payload.summary ??
                            event.payload.message ??
                            event.event_type,
                        )}
                      </p>
                    </article>
                  ))}
                </div>
              </section>

              <div className="chat-composer">
                <label className="form-label" htmlFor="message-input">
                  Send follow-up input
                  <textarea
                    className="chat-textarea"
                    id="message-input"
                    name="message-input"
                    onChange={(event) => onMessageDraftChange(event.target.value)}
                    placeholder="Continue the current thread."
                    rows={4}
                    value={messageDraft}
                  />
                </label>
                <button
                  className="submit-button"
                  disabled={
                    !selectedThreadView?.composer.accepting_user_input ||
                    isSendingMessage ||
                    messageDraft.trim().length === 0
                  }
                  onClick={onSendMessage}
                  type="button"
                >
                  {isSendingMessage ? "Sending..." : "Send reply"}
                </button>
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
                      <div>
                        <dt>Thread</dt>
                        <dd>{selectedRequestDetail.thread_id}</dd>
                      </div>
                      <div>
                        <dt>Turn</dt>
                        <dd>{selectedRequestDetail.turn_id ?? "Not available"}</dd>
                      </div>
                      <div>
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
                      {selectedTimelineItem.kind} at{" "}
                      {formatTimestamp(selectedTimelineItem.occurred_at)}
                    </p>
                    <p>{timelineItemLabel(selectedTimelineItem)}</p>
                    <pre className="detail-json">
                      {JSON.stringify(selectedTimelineItem.payload, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </aside>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
