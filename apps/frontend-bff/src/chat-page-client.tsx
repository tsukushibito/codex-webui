"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  createWorkspaceFromChat,
  interruptThreadFromChat,
  listChatWorkspaces,
  listWorkspaceThreads,
  loadChatThreadBundle,
  type PublicWorkspaceSummary,
  respondToPendingRequest,
  sendThreadInput,
  startThreadFromChat,
} from "./chat-data";
import { ChatView } from "./chat-view";
import { logLiveChatDebug } from "./debug";
import type {
  PublicNotificationEvent,
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

const ACTIVE_THREAD_REFRESH_INTERVAL_MS = 1500;
const POST_START_READY_REFRESH_INTERVAL_MS = 400;
const POST_START_READY_REFRESH_ATTEMPTS = 8;

function selectRequestDetail(bundle: {
  latestResolvedRequestDetail?: PublicRequestDetail | null;
  pendingRequestDetail: PublicRequestDetail | null;
}) {
  return bundle.pendingRequestDetail ?? bundle.latestResolvedRequestDetail ?? null;
}

function hasStreamSequenceInconsistency(
  events: PublicThreadStreamEvent[],
  nextEvent: PublicThreadStreamEvent,
) {
  const duplicateSequenceEvent = events.find(
    (event) => event.sequence === nextEvent.sequence && event.event_id !== nextEvent.event_id,
  );

  if (duplicateSequenceEvent) {
    return true;
  }

  const knownSequences = new Set(events.map((event) => event.sequence));
  if (knownSequences.has(nextEvent.sequence)) {
    return false;
  }

  const maxSequence = events.reduce((currentMax, event) => Math.max(currentMax, event.sequence), 0);

  return maxSequence > 0 && nextEvent.sequence > maxSequence + 1;
}

function chooseDefaultWorkspaceId(workspaces: PublicWorkspaceSummary[]) {
  return (
    workspaces.toSorted((left, right) => right.updated_at.localeCompare(left.updated_at))[0]
      ?.workspace_id ?? null
  );
}

function replaceChatUrl(workspaceId: string | null, threadId: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  const params = new URLSearchParams();
  if (workspaceId) {
    params.set("workspaceId", workspaceId);
  }
  if (threadId) {
    params.set("threadId", threadId);
  }

  const nextUrl = params.size > 0 ? `/chat?${params.toString()}` : "/chat";
  window.history.replaceState(null, "", nextUrl);
}

export function ChatPageClient() {
  const searchParams = useSearchParams();
  const initialWorkspaceId = searchParams.get("workspaceId");
  const initialThreadId = searchParams.get("threadId");
  const [workspaces, setWorkspaces] = useState<PublicWorkspaceSummary[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(initialWorkspaceId);
  const [threads, setThreads] = useState<PublicThreadListItem[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(initialThreadId);
  const [selectedThreadView, setSelectedThreadView] = useState<PublicThreadView | null>(null);
  const [selectedRequestDetail, setSelectedRequestDetail] = useState<PublicRequestDetail | null>(
    null,
  );
  const [streamEvents, setStreamEvents] = useState<PublicThreadStreamEvent[]>([]);
  const [draftAssistantMessages, setDraftAssistantMessages] = useState<Record<string, string>>({});
  const [composerDraft, setComposerDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isInterruptingThread, setIsInterruptingThread] = useState(false);
  const [isRespondingToRequest, setIsRespondingToRequest] = useState(false);
  const [connectionState, setConnectionState] = useState<"idle" | "live" | "reconnecting">("idle");
  const [streamVersion, setStreamVersion] = useState(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const activeThreadRefreshTimerRef = useRef<number | null>(null);
  const threadListRefreshIdRef = useRef(0);
  const selectedThreadRefreshIdRef = useRef(0);
  const selectedThreadIdRef = useRef<string | null>(initialThreadId);
  const streamEventsRef = useRef<PublicThreadStreamEvent[]>([]);

  function updateSelectedThreadId(
    nextThreadId: string | null,
    reason: string,
    details?: Record<string, unknown>,
  ) {
    logLiveChatDebug("chat-selection", "updating selected thread", {
      reason,
      previous_thread_id: selectedThreadId,
      next_thread_id: nextThreadId,
      ...details,
    });
    selectedThreadIdRef.current = nextThreadId;
    setSelectedThreadId(nextThreadId);
    replaceChatUrl(workspaceId, nextThreadId);
  }

  async function refreshWorkspaces(preferredWorkspaceId?: string | null) {
    const nextPreferredWorkspaceId = preferredWorkspaceId ?? workspaceId;
    setIsLoadingWorkspaces(true);
    setErrorMessage(null);

    try {
      const response = await listChatWorkspaces();
      setWorkspaces(response.items);

      const nextWorkspaceId =
        nextPreferredWorkspaceId &&
        response.items.some((workspace) => workspace.workspace_id === nextPreferredWorkspaceId)
          ? nextPreferredWorkspaceId
          : chooseDefaultWorkspaceId(response.items);

      setWorkspaceId(nextWorkspaceId);
      replaceChatUrl(nextWorkspaceId, selectedThreadIdRef.current);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load workspaces.");
    } finally {
      setIsLoadingWorkspaces(false);
    }
  }

  async function convergeStartedThreadSendability(threadId: string) {
    for (let attempt = 0; attempt < POST_START_READY_REFRESH_ATTEMPTS; attempt += 1) {
      if (selectedThreadIdRef.current !== threadId) {
        return;
      }

      const bundle = await refreshSelectedThread(threadId);
      if (!bundle) {
        return;
      }

      if (bundle.view.composer.accepting_user_input) {
        await refreshThreads(threadId);
        return;
      }

      if (
        bundle.view.current_activity.kind !== "running" ||
        bundle.view.pending_request !== null ||
        bundle.view.composer.blocked_by_request
      ) {
        await refreshThreads(threadId);
        return;
      }

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, POST_START_READY_REFRESH_INTERVAL_MS);
      });
    }

    await refreshThreads(threadId);
  }

  async function refreshThreads(preferredThreadId?: string | null) {
    if (!workspaceId) {
      setThreads([]);
      setSelectedThreadId(null);
      return;
    }

    const refreshId = threadListRefreshIdRef.current + 1;
    threadListRefreshIdRef.current = refreshId;
    setIsLoadingThreads(true);
    setErrorMessage(null);

    try {
      const response = await listWorkspaceThreads(workspaceId);
      if (threadListRefreshIdRef.current !== refreshId) {
        return;
      }

      setThreads(response.items);

      const nextSelectedThreadId =
        preferredThreadId && response.items.some((thread) => thread.thread_id === preferredThreadId)
          ? preferredThreadId
          : selectedThreadIdRef.current &&
              response.items.some((thread) => thread.thread_id === selectedThreadIdRef.current)
            ? selectedThreadIdRef.current
            : null;

      updateSelectedThreadId(nextSelectedThreadId, "refresh_threads", {
        refresh_id: refreshId,
      });
    } catch (error) {
      if (threadListRefreshIdRef.current === refreshId) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load threads.");
      }
    } finally {
      if (threadListRefreshIdRef.current === refreshId) {
        setIsLoadingThreads(false);
      }
    }
  }

  async function refreshSelectedThread(threadId: string) {
    const refreshId = selectedThreadRefreshIdRef.current + 1;
    selectedThreadRefreshIdRef.current = refreshId;
    setIsLoadingThread(true);
    setErrorMessage(null);
    logLiveChatDebug("chat-refresh", "refreshing selected thread bundle", {
      thread_id: threadId,
      refresh_id: refreshId,
    });

    try {
      const bundle = await loadChatThreadBundle(threadId);
      if (selectedThreadRefreshIdRef.current !== refreshId) {
        logLiveChatDebug("chat-refresh", "discarding stale selected thread bundle", {
          thread_id: threadId,
          refresh_id: refreshId,
        });
        return null;
      }

      setSelectedThreadView(bundle.view);
      setSelectedRequestDetail(selectRequestDetail(bundle));
      return bundle;
    } catch (error) {
      if (selectedThreadRefreshIdRef.current === refreshId) {
        logLiveChatDebug("chat-refresh", "failed to load selected thread bundle", {
          thread_id: threadId,
          refresh_id: refreshId,
          error: error instanceof Error ? error.message : String(error),
        });
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load the selected thread.",
        );
      }
      return null;
    } finally {
      if (selectedThreadRefreshIdRef.current === refreshId) {
        setIsLoadingThread(false);
      }
    }
  }

  async function refreshSelectedThreadAndList(threadId: string) {
    await Promise.all([refreshSelectedThread(threadId), refreshThreads(threadId)]);
  }

  useEffect(() => {
    void refreshWorkspaces(initialWorkspaceId);
  }, []);

  useEffect(() => {
    void refreshThreads(initialThreadId);
  }, [workspaceId]);

  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);

  useEffect(() => {
    logLiveChatDebug("chat-stream", "selectedThreadId effect fired", {
      thread_id: selectedThreadId,
    });
    if (!selectedThreadId) {
      logLiveChatDebug("chat-stream", "selected thread cleared", {
        previous_thread_id: selectedThreadView?.thread.thread_id ?? null,
      });
      setSelectedThreadView(null);
      setSelectedRequestDetail(null);
      setStreamEvents([]);
      streamEventsRef.current = [];
      setDraftAssistantMessages({});
      setConnectionState("idle");
      return;
    }

    logLiveChatDebug("chat-stream", "selected thread changed", {
      thread_id: selectedThreadId,
      previous_thread_id: selectedThreadView?.thread.thread_id ?? null,
    });
    setStreamEvents([]);
    streamEventsRef.current = [];
    setDraftAssistantMessages({});
    void refreshSelectedThread(selectedThreadId);
  }, [selectedThreadId]);

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      if (activeThreadRefreshTimerRef.current !== null) {
        window.clearInterval(activeThreadRefreshTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (activeThreadRefreshTimerRef.current !== null) {
      window.clearInterval(activeThreadRefreshTimerRef.current);
      activeThreadRefreshTimerRef.current = null;
    }

    if (!selectedThreadId || selectedThreadView?.current_activity.kind !== "running") {
      return;
    }

    logLiveChatDebug("chat-refresh", "starting active thread polling", {
      thread_id: selectedThreadId,
      interval_ms: ACTIVE_THREAD_REFRESH_INTERVAL_MS,
    });
    activeThreadRefreshTimerRef.current = window.setInterval(() => {
      logLiveChatDebug("chat-refresh", "polling active thread bundle", {
        thread_id: selectedThreadId,
      });
      void refreshSelectedThreadAndList(selectedThreadId);
    }, ACTIVE_THREAD_REFRESH_INTERVAL_MS);

    return () => {
      if (activeThreadRefreshTimerRef.current !== null) {
        window.clearInterval(activeThreadRefreshTimerRef.current);
        activeThreadRefreshTimerRef.current = null;
      }
    };
  }, [selectedThreadId, selectedThreadView?.current_activity.kind]);

  useEffect(() => {
    logLiveChatDebug("chat-stream", "stream effect fired", {
      thread_id: selectedThreadId,
      stream_version: streamVersion,
    });
    if (!selectedThreadId) {
      return;
    }

    logLiveChatDebug("chat-stream", "creating thread event source", {
      thread_id: selectedThreadId,
      stream_version: streamVersion,
    });
    const stream = new EventSource(`/api/v1/threads/${selectedThreadId}/stream`);
    setConnectionState("idle");
    stream.onopen = () => {
      setConnectionState("live");
      logLiveChatDebug("chat-stream", "thread stream opened", {
        thread_id: selectedThreadId,
      });
      void refreshSelectedThreadAndList(selectedThreadId);
    };

    stream.onmessage = (messageEvent) => {
      const event = JSON.parse(messageEvent.data) as PublicThreadStreamEvent;
      logLiveChatDebug("chat-stream", "thread stream event received", {
        thread_id: selectedThreadId,
        event_type: event.event_type,
        sequence: event.sequence,
      });
      const sequenceInconsistent = hasStreamSequenceInconsistency(streamEventsRef.current, event);
      const nextStreamEvents = upsertStreamEvent(streamEventsRef.current, event);
      streamEventsRef.current = nextStreamEvents;
      setStreamEvents(nextStreamEvents);

      if (sequenceInconsistent) {
        setStatusMessage("Thread stream changed unexpectedly. Reacquiring thread state.");
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

      if (!sequenceInconsistent && event.event_type === "approval.requested") {
        setStatusMessage("Request pending. Respond from the current thread.");
      }

      if (!sequenceInconsistent && event.event_type === "approval.resolved") {
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
      logLiveChatDebug("chat-stream", "cleaning up thread stream", {
        thread_id: selectedThreadId,
        stream_version: streamVersion,
      });
      stream.close();
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [selectedThreadId, streamVersion]);

  useEffect(() => {
    const notifications = new EventSource("/api/v1/notifications/stream");

    notifications.onmessage = (messageEvent) => {
      const event = JSON.parse(messageEvent.data) as PublicNotificationEvent;
      logLiveChatDebug("chat-notifications", "notification stream event received", {
        event_type: event.event_type,
        high_priority: event.high_priority,
        selected_thread_id: selectedThreadIdRef.current,
        thread_id: event.thread_id,
      });

      if (event.high_priority) {
        setStatusMessage("High-priority background thread needs attention.");
      } else {
        setStatusMessage("Thread notification received. Refreshing current state.");
      }

      const currentThreadId = selectedThreadIdRef.current;
      if (currentThreadId && event.thread_id === currentThreadId) {
        void refreshSelectedThreadAndList(currentThreadId);
        return;
      }

      void refreshThreads(currentThreadId);
    };

    notifications.onerror = () => {
      logLiveChatDebug("chat-notifications", "notification stream errored");
      notifications.close();
    };

    return () => {
      notifications.close();
    };
  }, [workspaceId]);

  async function handleSubmitComposer() {
    const trimmedDraft = composerDraft.trim();
    if (trimmedDraft.length === 0) {
      return;
    }

    if (selectedThreadId) {
      setIsSendingMessage(true);
      setErrorMessage(null);
      setStatusMessage(null);

      try {
        await sendThreadInput(selectedThreadId, trimmedDraft, createClientId("input_followup"));
        setComposerDraft("");
        setStatusMessage("Input accepted. Waiting for thread updates.");
        await refreshSelectedThreadAndList(selectedThreadId);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to send input.");
      } finally {
        setIsSendingMessage(false);
      }

      return;
    }

    if (!workspaceId) {
      setErrorMessage("Choose or create a workspace before starting a thread.");
      return;
    }

    setIsCreatingThread(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const result = await startThreadFromChat(
        workspaceId,
        trimmedDraft,
        createClientId("input_start"),
      );
      logLiveChatDebug("chat-stream", "created thread from chat", {
        thread_id: result.thread.thread_id,
      });
      setComposerDraft("");
      setStatusMessage(`Started thread ${result.thread.thread_id}.`);
      updateSelectedThreadId(result.thread.thread_id, "create_thread_success");
      await refreshThreads(result.thread.thread_id);
      void convergeStartedThreadSendability(result.thread.thread_id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to start a new thread.");
    } finally {
      setIsCreatingThread(false);
    }
  }

  async function handleSelectWorkspace(nextWorkspaceId: string) {
    if (nextWorkspaceId === workspaceId) {
      return;
    }

    setWorkspaceId(nextWorkspaceId);
    setThreads([]);
    updateSelectedThreadId(null, "user_select_workspace", {
      workspace_id: nextWorkspaceId,
    });
    setSelectedThreadView(null);
    setSelectedRequestDetail(null);
    setStreamEvents([]);
    streamEventsRef.current = [];
    setDraftAssistantMessages({});
    setStatusMessage(null);
    setErrorMessage(null);
    replaceChatUrl(nextWorkspaceId, null);
  }

  async function handleCreateWorkspace() {
    const trimmedName = workspaceName.trim();
    if (trimmedName.length === 0) {
      return;
    }

    setIsCreatingWorkspace(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const workspace = await createWorkspaceFromChat(trimmedName);
      setWorkspaceName("");
      setStatusMessage(`Created workspace ${workspace.workspace_name}.`);
      setWorkspaces((currentWorkspaces) => [
        workspace,
        ...currentWorkspaces.filter((item) => item.workspace_id !== workspace.workspace_id),
      ]);
      setWorkspaceId(workspace.workspace_id);
      setThreads([]);
      updateSelectedThreadId(null, "create_workspace_success", {
        workspace_id: workspace.workspace_id,
      });
      replaceChatUrl(workspace.workspace_id, null);
      void refreshWorkspaces(workspace.workspace_id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create workspace.");
    } finally {
      setIsCreatingWorkspace(false);
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
      isCreatingWorkspace={isCreatingWorkspace}
      isInterruptingThread={isInterruptingThread}
      isLoadingThread={isLoadingThread}
      isLoadingThreads={isLoadingThreads}
      isLoadingWorkspaces={isLoadingWorkspaces}
      isRespondingToRequest={isRespondingToRequest}
      isSendingMessage={isSendingMessage}
      composerDraft={composerDraft}
      onApproveRequest={() => void handleRequestDecision("approved")}
      onComposerDraftChange={setComposerDraft}
      onCreateWorkspace={() => void handleCreateWorkspace()}
      onDenyRequest={() => void handleRequestDecision("denied")}
      onInterruptThread={() => void handleInterruptThread()}
      onSelectWorkspace={(nextWorkspaceId) => void handleSelectWorkspace(nextWorkspaceId)}
      onSelectThread={(threadId) => updateSelectedThreadId(threadId, "user_select_thread")}
      onSubmitComposer={() => void handleSubmitComposer()}
      onWorkspaceNameChange={setWorkspaceName}
      selectedRequestDetail={selectedRequestDetail}
      selectedThreadId={selectedThreadId}
      selectedThreadView={selectedThreadView}
      statusMessage={statusMessage}
      streamEvents={streamEvents}
      threads={threads}
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      workspaces={workspaces}
    />
  );
}
