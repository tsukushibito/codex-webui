import Link from "next/link";

import type {
  PublicRequestDetail,
  PublicThreadListItem,
  PublicThreadStreamEvent,
  PublicThreadView,
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

  if (thread.current_activity.kind === "in_progress") {
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

  return (
    <main className="chat-shell">
      <div className="chat-layout">
        <section className="hero-card">
          <div className="hero-body">
            <p className="eyebrow">codex-webui</p>
            <h1>Chat</h1>
            <p className="hero-copy">
              Use the v0.9 thread surface directly: start from first input, respond to pending
              requests in thread context, and recover state from thread helpers.
            </p>
            <div className="hero-metrics">
              <span className="metric-chip">Workspace: {workspaceId ?? "Choose from Home"}</span>
              <span className="metric-chip">
                Stream:{" "}
                {connectionState === "live"
                  ? "live"
                  : connectionState === "reconnecting"
                    ? "reacquiring"
                    : "idle"}
              </span>
              <span className="metric-chip">Threads: {threads.length}</span>
            </div>
            <div className="hero-actions">
              <Link className="secondary-link" href="/">
                Back to Home
              </Link>
              {workspaceId ? (
                <Link
                  className="primary-link"
                  href={threadChatHref(workspaceId, selectedThreadId ?? undefined)}
                >
                  Refresh thread shell
                </Link>
              ) : null}
            </div>
          </div>
        </section>

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
            <section className="chat-panel create-card">
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

              <div className="session-list">
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
                        ? "session-summary-card active"
                        : "session-summary-card"
                    }
                    key={thread.thread_id}
                    onClick={() => onSelectThread(thread.thread_id)}
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
                  </button>
                ))}
              </div>
            </section>

            <section className="chat-panel workspace-card">
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
              </header>

              {selectedThreadView?.pending_request ? (
                <div className="approval-detail-card">
                  <div className="workspace-meta-row">
                    <strong>Pending request</strong>
                    <span className={requestBadgeClass(selectedRequestDetail)}>
                      {selectedThreadView.pending_request.risk_category.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p>{selectedThreadView.pending_request.summary}</p>
                  {selectedRequestDetail ? (
                    <>
                      <p className="workspace-meta">{selectedRequestDetail.reason}</p>
                      {selectedRequestDetail.operation_summary ? (
                        <p className="workspace-meta">
                          Operation: {selectedRequestDetail.operation_summary}
                        </p>
                      ) : null}
                    </>
                  ) : null}
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
                  </div>
                </div>
              ) : selectedThreadView?.latest_resolved_request ? (
                <p className="approval-signal">
                  Latest request: {selectedThreadView.latest_resolved_request.decision}
                </p>
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

            <section className="chat-panel workspace-card">
              <header>
                <p className="eyebrow">Activity</p>
                <h2>Timeline</h2>
                <p className="field-hint">
                  Browser refresh and reconnect rely on `thread_view`, `timeline`, and the thread
                  stream rather than legacy message/event endpoints.
                </p>
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
                    <p>{String(item.payload.summary ?? item.kind)}</p>
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
                      {String(event.payload.summary ?? event.payload.message ?? event.event_type)}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
