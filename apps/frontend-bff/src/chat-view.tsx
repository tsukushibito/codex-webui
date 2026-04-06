import React from "react";
import Link from "next/link";

import type {
  PublicMessage,
  PublicSessionEvent,
  PublicSessionSummary,
} from "./chat-types";

export interface DraftAssistantMessage {
  message_id: string;
  content: string;
}

export interface ChatViewProps {
  workspaceId: string | null;
  sessions: PublicSessionSummary[];
  selectedSessionId: string | null;
  selectedSession: PublicSessionSummary | null;
  messages: PublicMessage[];
  events: PublicSessionEvent[];
  draftAssistantMessages: DraftAssistantMessage[];
  isLoadingSessions: boolean;
  isLoadingSession: boolean;
  isCreatingSession: boolean;
  isStartingSession: boolean;
  isSendingMessage: boolean;
  isStoppingSession: boolean;
  connectionState: "idle" | "live" | "reconnecting";
  errorMessage: string | null;
  statusMessage: string | null;
  createSessionTitle: string;
  messageDraft: string;
  onCreateSessionTitleChange: (value: string) => void;
  onMessageDraftChange: (value: string) => void;
  onCreateSession: () => void;
  onSelectSession: (sessionId: string) => void;
  onStartSession: () => void;
  onSendMessage: () => void;
  onStopSession: () => void;
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

function formatSessionStatus(status: string) {
  return status.replaceAll("_", " ");
}

function eventSummary(event: PublicSessionEvent) {
  switch (event.event_type) {
    case "session.status_changed":
      return `${String(event.payload.from_status ?? "unknown")} -> ${String(
        event.payload.to_status ?? "unknown",
      )}`;
    case "message.assistant.delta":
      return String(event.payload.delta ?? "assistant typing");
    case "message.assistant.completed":
      return String(event.payload.content ?? "assistant response completed");
    case "approval.requested":
      return String(event.payload.title ?? "approval requested");
    case "approval.resolved":
      return "approval resolved";
    case "error.raised":
      return String(event.payload.message ?? "session error");
    default:
      return event.event_type;
  }
}

function sessionBadgeClass(session: PublicSessionSummary) {
  if (session.status === "waiting_approval") {
    return "status-badge warning";
  }

  if (
    session.status === "running" ||
    session.status === "waiting_input" ||
    session.status === "completed"
  ) {
    return "status-badge success";
  }

  return "status-badge";
}

export function ChatView({
  workspaceId,
  sessions,
  selectedSessionId,
  selectedSession,
  messages,
  events,
  draftAssistantMessages,
  isLoadingSessions,
  isLoadingSession,
  isCreatingSession,
  isStartingSession,
  isSendingMessage,
  isStoppingSession,
  connectionState,
  errorMessage,
  statusMessage,
  createSessionTitle,
  messageDraft,
  onCreateSessionTitleChange,
  onMessageDraftChange,
  onCreateSession,
  onSelectSession,
  onStartSession,
  onSendMessage,
  onStopSession,
}: ChatViewProps) {
  const allMessages = [
    ...messages,
    ...draftAssistantMessages.map((message) => ({
      message_id: message.message_id,
      session_id: selectedSessionId ?? "",
      role: "assistant" as const,
      content: `${message.content}…`,
      created_at: selectedSession?.updated_at ?? new Date().toISOString(),
    })),
  ];

  return (
    <main className="chat-shell">
      <div className="chat-layout">
        <section className="hero-card">
          <div className="hero-body">
            <p className="eyebrow">codex-webui</p>
            <h1>Chat</h1>
            <p className="hero-copy">
              Run a workspace session, watch stream updates, and re-acquire state
              after disconnects from one smartphone-first screen.
            </p>
            <div className="hero-metrics">
              <span className="metric-chip">
                Workspace: {workspaceId ?? "Choose from Home"}
              </span>
              <span className="metric-chip">
                Stream: {connectionState === "live"
                  ? "live"
                  : connectionState === "reconnecting"
                    ? "reacquiring"
                    : "idle"}
              </span>
              <span className="metric-chip">
                Sessions: {sessions.length}
              </span>
            </div>
            <div className="hero-actions">
              <Link className="secondary-link" href="/">
                Back to Home
              </Link>
              <Link className="primary-link" href="/approvals">
                Approval queue
              </Link>
            </div>
          </div>
        </section>

        {!workspaceId ? (
          <section className="placeholder-card">
            <p className="eyebrow">Missing workspace</p>
            <h1>Start from Home</h1>
            <p>
              Open Chat from the Home workspace cards so the workspace context is
              already selected.
            </p>
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
                <p className="eyebrow">Sessions</p>
                <h2>Create or select a session</h2>
                <p className="field-hint">
                  Pick an existing session or create a new one before starting the
                  chat flow.
                </p>
              </header>

              <div className="create-form">
                <label className="form-label" htmlFor="session-title">
                  New session title
                  <input
                    className="text-input"
                    id="session-title"
                    name="session-title"
                    onChange={(event) => onCreateSessionTitleChange(event.target.value)}
                    placeholder="Fix build error"
                    value={createSessionTitle}
                  />
                </label>
                <button
                  className="submit-button"
                  disabled={isCreatingSession || createSessionTitle.trim().length === 0}
                  onClick={onCreateSession}
                  type="button"
                >
                  {isCreatingSession ? "Creating session..." : "Create session"}
                </button>
              </div>

              <div className="session-list">
                {isLoadingSessions ? (
                  <p className="workspace-status">Loading sessions...</p>
                ) : null}

                {!isLoadingSessions && sessions.length === 0 ? (
                  <p className="empty-state">
                    No sessions yet. Create one above to start the Chat flow.
                  </p>
                ) : null}

                {sessions.map((session) => (
                  <button
                    className={
                      selectedSessionId === session.session_id
                        ? "session-summary-card active"
                        : "session-summary-card"
                    }
                    key={session.session_id}
                    onClick={() => onSelectSession(session.session_id)}
                    type="button"
                  >
                    <div className="workspace-meta-row">
                      <p className="eyebrow">Session</p>
                      <span className={sessionBadgeClass(session)}>
                        {formatSessionStatus(session.status)}
                      </span>
                    </div>
                    <strong>{session.title}</strong>
                    <span className="workspace-meta">
                      Updated {formatTimestamp(session.updated_at)}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="chat-panel workspace-card">
              <header>
                <div className="workspace-meta-row">
                  <p className="eyebrow">Current session</p>
                  {selectedSession ? (
                    <span className={sessionBadgeClass(selectedSession)}>
                      {formatSessionStatus(selectedSession.status)}
                    </span>
                  ) : null}
                </div>
                <h2>{selectedSession?.title ?? "Select a session"}</h2>
                <p className="workspace-meta">
                  {selectedSession
                    ? `Last message ${formatTimestamp(selectedSession.last_message_at)}`
                    : "Pick a session from the list to load messages and activity."}
                </p>
              </header>

              {selectedSession?.active_approval_id ? (
                <p className="approval-signal">
                  Approval waiting: {selectedSession.active_approval_id}
                </p>
              ) : null}

              <div className="workspace-actions">
                <button
                  className="primary-link action-button"
                  disabled={
                    !selectedSession || !selectedSession.can_start || isStartingSession
                  }
                  onClick={onStartSession}
                  type="button"
                >
                  {isStartingSession ? "Starting..." : "Start session"}
                </button>
                <button
                  className="secondary-link action-button"
                  disabled={!selectedSession || !selectedSession.can_stop || isStoppingSession}
                  onClick={onStopSession}
                  type="button"
                >
                  {isStoppingSession ? "Stopping..." : "Stop session"}
                </button>
              </div>

              <div className="chat-composer">
                <label className="form-label" htmlFor="message-input">
                  Send message
                  <textarea
                    className="chat-textarea"
                    id="message-input"
                    name="message-input"
                    onChange={(event) => onMessageDraftChange(event.target.value)}
                    placeholder="Ask Codex to review a diff or explain a build issue."
                    rows={4}
                    value={messageDraft}
                  />
                </label>
                <button
                  className="submit-button"
                  disabled={
                    !selectedSession ||
                    !selectedSession.can_send_message ||
                    isSendingMessage ||
                    messageDraft.trim().length === 0
                  }
                  onClick={onSendMessage}
                  type="button"
                >
                  {isSendingMessage ? "Sending..." : "Send message"}
                </button>
              </div>
            </section>

            <section className="chat-panel workspace-card">
              <header>
                <p className="eyebrow">Transcript</p>
                <h2>Messages</h2>
                <p className="field-hint">
                  User and assistant messages are restored from the public message
                  history, with assistant delta streamed into the latest bubble.
                </p>
              </header>

              {isLoadingSession ? (
                <p className="workspace-status">Refreshing session detail...</p>
              ) : null}

              <div className="chat-message-list">
                {!isLoadingSession && allMessages.length === 0 ? (
                  <p className="empty-state">
                    No chat messages yet. Start the session and send a message to
                    begin.
                  </p>
                ) : null}

                {allMessages.map((message) => (
                  <article
                    className={
                      message.role === "assistant"
                        ? "chat-message assistant"
                        : "chat-message user"
                    }
                    key={message.message_id}
                  >
                    <div className="workspace-meta-row">
                      <strong>{message.role === "assistant" ? "Assistant" : "You"}</strong>
                      <span className="workspace-meta">
                        {formatTimestamp(message.created_at)}
                      </span>
                    </div>
                    <p>{message.content}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="chat-panel workspace-card">
              <header>
                <p className="eyebrow">Activity</p>
                <h2>Event log</h2>
                <p className="field-hint">
                  Session events stay ordered by sequence and are re-acquired after
                  stream disconnects.
                </p>
              </header>

              <div className="chat-event-list">
                {!isLoadingSession && events.length === 0 ? (
                  <p className="empty-state">No activity yet for this session.</p>
                ) : null}

                {events.map((event) => (
                  <article className="chat-event" key={event.event_id}>
                    <div className="workspace-meta-row">
                      <strong>{event.event_type}</strong>
                      <span className="workspace-meta">#{event.sequence}</span>
                    </div>
                    <p>{eventSummary(event)}</p>
                    <span className="workspace-meta">
                      {formatTimestamp(event.occurred_at)}
                    </span>
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
