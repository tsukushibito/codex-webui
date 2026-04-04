"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  createSessionFromChat,
  listWorkspaceSessions,
  loadChatSessionBundle,
  sendSessionMessage,
  startSessionFromChat,
  stopSessionFromChat,
} from "./chat-data";
import type {
  PublicMessage,
  PublicSessionEvent,
  PublicSessionSummary,
} from "./chat-types";
import { ChatView } from "./chat-view";

function createClientMessageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `msgclient_${Date.now()}`;
}

function upsertSession(
  sessions: PublicSessionSummary[],
  nextSession: PublicSessionSummary,
) {
  const remaining = sessions.filter(
    (session) => session.session_id !== nextSession.session_id,
  );

  return [nextSession, ...remaining];
}

function upsertMessage(messages: PublicMessage[], nextMessage: PublicMessage) {
  const existingIndex = messages.findIndex(
    (message) => message.message_id === nextMessage.message_id,
  );

  if (existingIndex < 0) {
    return [...messages, nextMessage];
  }

  return messages.map((message, index) =>
    index === existingIndex ? nextMessage : message,
  );
}

function upsertEvent(events: PublicSessionEvent[], nextEvent: PublicSessionEvent) {
  const existingIndex = events.findIndex(
    (event) => event.event_id === nextEvent.event_id,
  );

  if (existingIndex < 0) {
    return [...events, nextEvent].sort((left, right) => left.sequence - right.sequence);
  }

  return events.map((event, index) => (index === existingIndex ? nextEvent : event));
}

export function ChatPageClient() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");
  const initialSessionId = searchParams.get("sessionId");
  const [sessions, setSessions] = useState<PublicSessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    initialSessionId,
  );
  const [selectedSession, setSelectedSession] = useState<PublicSessionSummary | null>(
    null,
  );
  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [events, setEvents] = useState<PublicSessionEvent[]>([]);
  const [draftAssistantMessages, setDraftAssistantMessages] = useState<
    Record<string, string>
  >({});
  const [createSessionTitle, setCreateSessionTitle] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isStoppingSession, setIsStoppingSession] = useState(false);
  const [connectionState, setConnectionState] = useState<
    "idle" | "live" | "reconnecting"
  >("idle");
  const [streamVersion, setStreamVersion] = useState(0);
  const reconnectTimerRef = useRef<number | null>(null);

  async function refreshSessions(preferredSessionId?: string | null) {
    if (!workspaceId) {
      setSessions([]);
      setSelectedSessionId(null);
      return;
    }

    setIsLoadingSessions(true);
    setErrorMessage(null);

    try {
      const response = await listWorkspaceSessions(workspaceId);
      setSessions(response.items);

      const nextSelectedId =
        preferredSessionId && response.items.some((item) => item.session_id === preferredSessionId)
          ? preferredSessionId
          : selectedSessionId &&
              response.items.some((item) => item.session_id === selectedSessionId)
            ? selectedSessionId
            : initialSessionId &&
                response.items.some((item) => item.session_id === initialSessionId)
              ? initialSessionId
              : response.items[0]?.session_id ?? null;

      setSelectedSessionId(nextSelectedId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load sessions.",
      );
    } finally {
      setIsLoadingSessions(false);
    }
  }

  async function refreshSelectedSession(sessionId: string) {
    setIsLoadingSession(true);
    setErrorMessage(null);

    try {
      const bundle = await loadChatSessionBundle(sessionId);
      setSelectedSession(bundle.session);
      setMessages(bundle.messages);
      setEvents(bundle.events);
      setDraftAssistantMessages({});
      setSessions((currentSessions) => upsertSession(currentSessions, bundle.session));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load the selected session.",
      );
    } finally {
      setIsLoadingSession(false);
    }
  }

  useEffect(() => {
    void refreshSessions(initialSessionId);
  }, [workspaceId, initialSessionId]);

  useEffect(() => {
    if (!selectedSessionId) {
      setSelectedSession(null);
      setMessages([]);
      setEvents([]);
      setDraftAssistantMessages({});
      setConnectionState("idle");
      return;
    }

    void refreshSelectedSession(selectedSessionId);
  }, [selectedSessionId]);

  useEffect(() => {
    if (!selectedSessionId) {
      return;
    }

    const stream = new EventSource(`/api/v1/sessions/${selectedSessionId}/stream`);
    setConnectionState("live");

    stream.onmessage = (messageEvent) => {
      const event = JSON.parse(messageEvent.data) as PublicSessionEvent;
      setEvents((currentEvents) => upsertEvent(currentEvents, event));

      if (event.event_type === "session.status_changed") {
        const toStatus = event.payload.to_status;
        if (typeof toStatus === "string") {
          setSelectedSession((currentSession) =>
            currentSession
              ? {
                  ...currentSession,
                  status: toStatus as PublicSessionSummary["status"],
                  updated_at: event.occurred_at,
                }
              : currentSession,
          );
          setSessions((currentSessions) =>
            currentSessions.map((session) =>
              session.session_id === selectedSessionId
                ? {
                    ...session,
                    status: toStatus as PublicSessionSummary["status"],
                    updated_at: event.occurred_at,
                  }
                : session,
            ),
          );
        }
      }

      if (event.event_type === "message.user") {
        const messageId = event.payload.message_id;
        const content = event.payload.content;
        if (typeof messageId === "string" && typeof content === "string") {
          setMessages((currentMessages) =>
            upsertMessage(currentMessages, {
              message_id: messageId,
              session_id: event.session_id,
              role: "user",
              content,
              created_at: event.occurred_at,
            }),
          );
        }
      }

      if (event.event_type === "message.assistant.delta") {
        const messageId = event.payload.message_id;
        const delta = event.payload.delta;
        if (typeof messageId === "string" && typeof delta === "string") {
          setDraftAssistantMessages((currentDrafts) => ({
            ...currentDrafts,
            [messageId]: `${currentDrafts[messageId] ?? ""}${delta}`,
          }));
        }
      }

      if (event.event_type === "message.assistant.completed") {
        const messageId = event.payload.message_id;
        const content = event.payload.content;
        const createdAt = event.payload.created_at;
        if (
          typeof messageId === "string" &&
          typeof content === "string" &&
          typeof createdAt === "string"
        ) {
          setDraftAssistantMessages((currentDrafts) => {
            const nextDrafts = { ...currentDrafts };
            delete nextDrafts[messageId];
            return nextDrafts;
          });
          setMessages((currentMessages) =>
            upsertMessage(currentMessages, {
              message_id: messageId,
              session_id: event.session_id,
              role: "assistant",
              content,
              created_at: createdAt,
            }),
          );
        }
      }

      if (event.event_type === "approval.requested") {
        const approvalId = event.payload.approval_id;
        setStatusMessage("Approval requested. Review the pending action when needed.");
        if (typeof approvalId === "string") {
          setSelectedSession((currentSession) =>
            currentSession
              ? {
                  ...currentSession,
                  active_approval_id: approvalId,
                  status: "waiting_approval",
                }
              : currentSession,
          );
        }
      }

      if (event.event_type === "approval.resolved") {
        setStatusMessage("Approval resolved.");
        setSelectedSession((currentSession) =>
          currentSession
            ? {
                ...currentSession,
                active_approval_id: null,
              }
            : currentSession,
        );
      }
    };

    stream.onerror = () => {
      stream.close();
      setConnectionState("reconnecting");
      void refreshSelectedSession(selectedSessionId).finally(() => {
        if (reconnectTimerRef.current !== null) {
          window.clearTimeout(reconnectTimerRef.current);
        }
        reconnectTimerRef.current = window.setTimeout(() => {
          setStreamVersion((currentValue) => currentValue + 1);
        }, 1000);
      });
    };

    return () => {
      stream.close();
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [selectedSessionId, streamVersion]);

  async function handleCreateSession() {
    if (!workspaceId) {
      return;
    }

    const trimmedTitle = createSessionTitle.trim();
    if (trimmedTitle.length === 0) {
      return;
    }

    setIsCreatingSession(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const nextSession = await createSessionFromChat(workspaceId, trimmedTitle);
      setCreateSessionTitle("");
      setSessions((currentSessions) => upsertSession(currentSessions, nextSession));
      setSelectedSessionId(nextSession.session_id);
      setStatusMessage(`Session "${trimmedTitle}" created.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create a session.",
      );
    } finally {
      setIsCreatingSession(false);
    }
  }

  async function handleStartSession() {
    if (!selectedSessionId) {
      return;
    }

    setIsStartingSession(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const nextSession = await startSessionFromChat(selectedSessionId);
      setSelectedSession(nextSession);
      setSessions((currentSessions) => upsertSession(currentSessions, nextSession));
      await refreshSelectedSession(selectedSessionId);
      setStatusMessage("Session started.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to start the session.",
      );
    } finally {
      setIsStartingSession(false);
    }
  }

  async function handleSendMessage() {
    if (!selectedSessionId) {
      return;
    }

    const trimmedMessage = messageDraft.trim();
    if (trimmedMessage.length === 0) {
      return;
    }

    setIsSendingMessage(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const message = await sendSessionMessage(
        selectedSessionId,
        trimmedMessage,
        createClientMessageId(),
      );
      setMessages((currentMessages) => upsertMessage(currentMessages, message));
      setMessageDraft("");
      setStatusMessage("Message accepted. Waiting for stream updates.");
      setSelectedSession((currentSession) =>
        currentSession
          ? {
              ...currentSession,
              status: "running",
              updated_at: message.created_at,
              last_message_at: message.created_at,
            }
          : currentSession,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to send the message.",
      );
    } finally {
      setIsSendingMessage(false);
    }
  }

  async function handleStopSession() {
    if (!selectedSessionId) {
      return;
    }

    setIsStoppingSession(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const result = await stopSessionFromChat(selectedSessionId);
      setSelectedSession(result.session);
      setSessions((currentSessions) => upsertSession(currentSessions, result.session));
      setStatusMessage(
        result.canceled_approval
          ? `Session stopped and approval ${result.canceled_approval.approval_id} was canceled.`
          : "Session stopped.",
      );
      await refreshSelectedSession(selectedSessionId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to stop the session.",
      );
    } finally {
      setIsStoppingSession(false);
    }
  }

  return (
    <ChatView
      connectionState={connectionState}
      createSessionTitle={createSessionTitle}
      draftAssistantMessages={Object.entries(draftAssistantMessages).map(
        ([messageId, content]) => ({
          message_id: messageId,
          content,
        }),
      )}
      errorMessage={errorMessage}
      events={events}
      isCreatingSession={isCreatingSession}
      isLoadingSession={isLoadingSession}
      isLoadingSessions={isLoadingSessions}
      isSendingMessage={isSendingMessage}
      isStartingSession={isStartingSession}
      isStoppingSession={isStoppingSession}
      messageDraft={messageDraft}
      messages={messages}
      onCreateSession={handleCreateSession}
      onCreateSessionTitleChange={setCreateSessionTitle}
      onMessageDraftChange={setMessageDraft}
      onSelectSession={setSelectedSessionId}
      onSendMessage={handleSendMessage}
      onStartSession={handleStartSession}
      onStopSession={handleStopSession}
      selectedSession={selectedSession}
      selectedSessionId={selectedSessionId}
      sessions={sessions}
      statusMessage={statusMessage}
      workspaceId={workspaceId}
    />
  );
}
