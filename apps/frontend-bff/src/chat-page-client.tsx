"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  interruptThreadFromChat,
  listWorkspaceThreads,
  loadChatThreadBundle,
  respondToPendingRequest,
  sendThreadInput,
  startThreadFromChat,
} from "./chat-data";
import { ChatView } from "./chat-view";
import { logLiveChatDebug } from "./debug";
import type {
  PublicRequestDetail,
  PublicThreadListItem,
  PublicThreadStreamEvent,
  PublicThreadView,
} from "./thread-types";

function createClientId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}`;
}

function upsertStreamEvent(
  events: PublicThreadStreamEvent[],
  nextEvent: PublicThreadStreamEvent,
): PublicThreadStreamEvent[] {
  const existingIndex = events.findIndex((event) => event.event_id === nextEvent.event_id);

  if (existingIndex < 0) {
    return [...events, nextEvent].sort((left, right) => left.sequence - right.sequence);
  }

  return events.map((event, index) => (index === existingIndex ? nextEvent : event));
}

export function ChatPageClient() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");
  const initialThreadId = searchParams.get("threadId");
  const [threads, setThreads] = useState<PublicThreadListItem[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(initialThreadId);
  const [selectedThreadView, setSelectedThreadView] = useState<PublicThreadView | null>(null);
  const [selectedRequestDetail, setSelectedRequestDetail] = useState<PublicRequestDetail | null>(
    null,
  );
  const [streamEvents, setStreamEvents] = useState<PublicThreadStreamEvent[]>([]);
  const [draftAssistantMessages, setDraftAssistantMessages] = useState<Record<string, string>>({});
  const [newThreadInput, setNewThreadInput] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isInterruptingThread, setIsInterruptingThread] = useState(false);
  const [isRespondingToRequest, setIsRespondingToRequest] = useState(false);
  const [connectionState, setConnectionState] = useState<"idle" | "live" | "reconnecting">("idle");
  const [streamVersion, setStreamVersion] = useState(0);
  const reconnectTimerRef = useRef<number | null>(null);

  async function refreshThreads(preferredThreadId?: string | null) {
    if (!workspaceId) {
      setThreads([]);
      setSelectedThreadId(null);
      return;
    }

    setIsLoadingThreads(true);
    setErrorMessage(null);

    try {
      const response = await listWorkspaceThreads(workspaceId);
      setThreads(response.items);

      const nextSelectedThreadId =
        preferredThreadId && response.items.some((thread) => thread.thread_id === preferredThreadId)
          ? preferredThreadId
          : selectedThreadId &&
              response.items.some((thread) => thread.thread_id === selectedThreadId)
            ? selectedThreadId
            : initialThreadId &&
                response.items.some((thread) => thread.thread_id === initialThreadId)
              ? initialThreadId
              : (response.items[0]?.thread_id ?? null);

      setSelectedThreadId(nextSelectedThreadId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load threads.");
    } finally {
      setIsLoadingThreads(false);
    }
  }

  async function refreshSelectedThread(threadId: string) {
    setIsLoadingThread(true);
    setErrorMessage(null);
    logLiveChatDebug("chat-refresh", "refreshing selected thread bundle", {
      thread_id: threadId,
    });

    try {
      const bundle = await loadChatThreadBundle(threadId);
      setSelectedThreadView(bundle.view);
      setSelectedRequestDetail(bundle.pendingRequestDetail);
      setDraftAssistantMessages({});
      return bundle;
    } catch (error) {
      logLiveChatDebug("chat-refresh", "failed to load selected thread bundle", {
        thread_id: threadId,
        error: error instanceof Error ? error.message : String(error),
      });
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load the selected thread.",
      );
      return null;
    } finally {
      setIsLoadingThread(false);
    }
  }

  async function refreshSelectedThreadAndList(threadId: string) {
    await Promise.all([refreshSelectedThread(threadId), refreshThreads(threadId)]);
  }

  useEffect(() => {
    void refreshThreads(initialThreadId);
  }, [workspaceId, initialThreadId]);

  useEffect(() => {
    if (!selectedThreadId) {
      setSelectedThreadView(null);
      setSelectedRequestDetail(null);
      setStreamEvents([]);
      setDraftAssistantMessages({});
      setConnectionState("idle");
      return;
    }

    setStreamEvents([]);
    setDraftAssistantMessages({});
    void refreshSelectedThread(selectedThreadId);
  }, [selectedThreadId]);

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedThreadId) {
      return;
    }

    const stream = new EventSource(`/api/v1/threads/${selectedThreadId}/stream`);
    setConnectionState("live");
    stream.onopen = () => {
      logLiveChatDebug("chat-stream", "thread stream opened", {
        thread_id: selectedThreadId,
      });
    };

    stream.onmessage = (messageEvent) => {
      const event = JSON.parse(messageEvent.data) as PublicThreadStreamEvent;
      logLiveChatDebug("chat-stream", "thread stream event received", {
        thread_id: selectedThreadId,
        event_type: event.event_type,
        sequence: event.sequence,
      });
      setStreamEvents((currentEvents) => upsertStreamEvent(currentEvents, event));

      if (event.event_type === "message.assistant.delta") {
        const messageId = event.payload.message_id;
        const delta = event.payload.delta;

        if (typeof messageId === "string" && typeof delta === "string") {
          setDraftAssistantMessages((currentDrafts) => ({
            ...currentDrafts,
            [messageId]: `${currentDrafts[messageId] ?? ""}${delta}`,
          }));
        }

        return;
      }

      if (event.event_type === "message.assistant.completed") {
        const messageId = event.payload.message_id;
        if (typeof messageId === "string") {
          setDraftAssistantMessages((currentDrafts) => {
            const nextDrafts = { ...currentDrafts };
            delete nextDrafts[messageId];
            return nextDrafts;
          });
        }
      }

      if (event.event_type === "approval.requested") {
        setStatusMessage("Request pending. Respond from the current thread.");
      }

      if (event.event_type === "approval.resolved") {
        setStatusMessage("Request resolved. Thread state refreshed.");
      }

      void refreshSelectedThreadAndList(selectedThreadId);
    };

    stream.onerror = () => {
      logLiveChatDebug("chat-stream", "thread stream errored", {
        thread_id: selectedThreadId,
      });
      stream.close();
      setConnectionState("reconnecting");
      void refreshSelectedThreadAndList(selectedThreadId).finally(() => {
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
  }, [selectedThreadId, streamVersion]);

  async function handleCreateThread() {
    if (!workspaceId) {
      setErrorMessage("Choose a workspace from Home before starting a thread.");
      return;
    }

    const trimmedInput = newThreadInput.trim();
    if (trimmedInput.length === 0) {
      return;
    }

    setIsCreatingThread(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const result = await startThreadFromChat(
        workspaceId,
        trimmedInput,
        createClientId("input_start"),
      );
      setNewThreadInput("");
      setStatusMessage(`Started thread ${result.thread.thread_id}.`);
      await refreshThreads(result.thread.thread_id);
      setSelectedThreadId(result.thread.thread_id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to start a new thread.");
    } finally {
      setIsCreatingThread(false);
    }
  }

  async function handleSendMessage() {
    if (!selectedThreadId) {
      return;
    }

    const trimmedDraft = messageDraft.trim();
    if (trimmedDraft.length === 0) {
      return;
    }

    setIsSendingMessage(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      await sendThreadInput(selectedThreadId, trimmedDraft, createClientId("input_followup"));
      setMessageDraft("");
      setStatusMessage("Input accepted. Waiting for thread updates.");
      await refreshSelectedThreadAndList(selectedThreadId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to send input.");
    } finally {
      setIsSendingMessage(false);
    }
  }

  async function handleInterruptThread() {
    if (!selectedThreadId) {
      return;
    }

    setIsInterruptingThread(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      await interruptThreadFromChat(selectedThreadId);
      setStatusMessage("Interrupt requested.");
      await refreshSelectedThreadAndList(selectedThreadId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to interrupt the thread.");
    } finally {
      setIsInterruptingThread(false);
    }
  }

  async function handleRequestDecision(decision: "approved" | "denied") {
    if (!selectedRequestDetail || selectedRequestDetail.status !== "pending") {
      return;
    }

    setIsRespondingToRequest(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const result = await respondToPendingRequest(
        selectedRequestDetail.request_id,
        decision,
        createClientId("response"),
      );
      setStatusMessage(
        decision === "approved"
          ? `Approved ${result.request.request_id}.`
          : `Denied ${result.request.request_id}.`,
      );
      await refreshSelectedThreadAndList(result.thread.thread_id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to respond to the request.");
    } finally {
      setIsRespondingToRequest(false);
    }
  }

  return (
    <ChatView
      connectionState={connectionState}
      draftAssistantMessages={draftAssistantMessages}
      errorMessage={errorMessage}
      isCreatingThread={isCreatingThread}
      isInterruptingThread={isInterruptingThread}
      isLoadingThread={isLoadingThread}
      isLoadingThreads={isLoadingThreads}
      isRespondingToRequest={isRespondingToRequest}
      isSendingMessage={isSendingMessage}
      messageDraft={messageDraft}
      newThreadInput={newThreadInput}
      onApproveRequest={() => void handleRequestDecision("approved")}
      onCreateThread={() => void handleCreateThread()}
      onMessageDraftChange={setMessageDraft}
      onNewThreadInputChange={setNewThreadInput}
      onDenyRequest={() => void handleRequestDecision("denied")}
      onInterruptThread={() => void handleInterruptThread()}
      onSelectThread={setSelectedThreadId}
      onSendMessage={() => void handleSendMessage()}
      selectedRequestDetail={selectedRequestDetail}
      selectedThreadId={selectedThreadId}
      selectedThreadView={selectedThreadView}
      statusMessage={statusMessage}
      streamEvents={streamEvents}
      threads={threads}
      workspaceId={workspaceId}
    />
  );
}
