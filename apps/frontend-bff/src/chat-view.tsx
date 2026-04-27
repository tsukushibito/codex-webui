import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";

import type { PublicWorkspaceSummary } from "./chat-data";
import { ChatViewComposer } from "./chat-view-composer";
import {
  ChatViewDetails,
  type ThreadDetailSelection,
  type ThreadFeedbackAction,
  type ThreadFeedbackDescriptor,
} from "./chat-view-details";
import {
  ChatViewNavigation,
  readStoredSidebarMode,
  type SidebarMode,
  writeStoredSidebarMode,
} from "./chat-view-navigation";
import { ChatViewTimeline } from "./chat-view-timeline";
import type {
  PublicRequestDetail,
  PublicThreadListItem,
  PublicThreadStreamEvent,
  PublicThreadView,
} from "./thread-types";
import type { TimelineDisplayGroup, TimelineDisplayRow } from "./timeline-display-model";
import { buildTimelineDisplayModel } from "./timeline-display-model";
import { getTimelineItemDetail } from "./timeline-item-detail";

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

function formatConnectionStateLabel(connectionState: "idle" | "live" | "reconnecting") {
  switch (connectionState) {
    case "live":
      return "Live";
    case "reconnecting":
      return "Reconnecting";
    default:
      return "Idle";
  }
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

function requestBadgeClass(request: PublicRequestDetail | null) {
  if (!request) {
    return "status-badge";
  }

  return request.status === "pending" ? "status-badge warning" : "status-badge success";
}

function requestSummaryBadgeClass(state: "pending" | "resolved", decision?: string | null) {
  if (state === "pending") {
    return "status-badge warning";
  }

  return decision === "denied" || decision === "canceled"
    ? "status-badge warning"
    : "status-badge success";
}

function formatMachineLabel(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Not available";
}

function SecondaryIcon({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="icon-button-glyph">
      {children}
    </span>
  );
}

function composerUnavailableReason(threadView: PublicThreadView | null) {
  if (!threadView) {
    return null;
  }

  if (threadView.composer.blocked_by_request || threadView.pending_request) {
    return "Input paused for approval.";
  }

  if (threadView.current_activity.kind === "running") {
    return threadView.composer.interrupt_available
      ? "Running. Interrupt is available."
      : "Running. Input will reopen when the turn finishes.";
  }

  if (threadView.composer.input_unavailable_reason) {
    return `Input unavailable: ${formatMachineLabel(threadView.composer.input_unavailable_reason)}.`;
  }

  if (!threadView.composer.accepting_user_input) {
    return "Input unavailable for this thread state.";
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

function threadFeedbackBadgeClass(descriptor: ThreadFeedbackDescriptor) {
  if (descriptor.badgeTone === "success") {
    return "status-badge success";
  }

  if (descriptor.badgeTone === "warning") {
    return "status-badge warning";
  }

  return "status-badge";
}

function buildThreadFeedbackDescriptor({
  composerAcceptingInput,
  connectionState,
  hasSelectedThread,
  isOpeningSelectedThread,
  isRequestDetailAvailable,
  isRespondingToRequest,
  isSendingMessage,
  isStartingThread,
  isInterruptingThread,
  selectedThreadView,
  workspaceId,
}: {
  composerAcceptingInput: boolean;
  connectionState: "idle" | "live" | "reconnecting";
  hasSelectedThread: boolean;
  isOpeningSelectedThread: boolean;
  isRequestDetailAvailable: boolean;
  isRespondingToRequest: boolean;
  isSendingMessage: boolean;
  isStartingThread: boolean;
  isInterruptingThread: boolean;
  selectedThreadView: PublicThreadView | null;
  workspaceId: string | null;
}): ThreadFeedbackDescriptor {
  if (!workspaceId) {
    return {
      badgeTone: "default",
      isVisible: false,
      title: "Workspace required",
      summary: "Select or create a workspace before Thread View can start or resume work.",
      actions: [],
    };
  }

  if (isSendingMessage) {
    return {
      badgeTone: "success",
      isVisible: true,
      title: isStartingThread ? "Submitting first input" : "Submitting follow-up input",
      summary: isStartingThread
        ? "Input is accepted locally while Thread View waits for the new thread to open."
        : "Input is accepted locally while Thread View waits for the next thread update.",
      actions: [],
    };
  }

  if (isOpeningSelectedThread) {
    return {
      badgeTone: "default",
      isVisible: true,
      title: "Opening thread",
      summary:
        "Restoring timeline context, request state, and the live connection for this thread.",
      actions: hasSelectedThread ? [{ kind: "refresh", label: "Reopen thread" }] : [],
    };
  }

  if (!selectedThreadView) {
    return {
      badgeTone: "success",
      isVisible: false,
      title: "Ready for first input",
      summary: "The next composer submission will start a new thread in this workspace.",
      actions: [{ kind: "focus_composer", label: "Focus composer" }],
    };
  }

  if (
    selectedThreadView.pending_request ||
    selectedThreadView.composer.blocked_by_request ||
    selectedThreadView.current_activity.kind === "waiting_on_approval"
  ) {
    return {
      badgeTone: "warning",
      isVisible: true,
      title: "Approval required",
      summary: "Codex is blocked until you approve or deny the pending request in this thread.",
      actions: [
        { kind: "approve", label: isRespondingToRequest ? "Submitting..." : "Approve request" },
        { kind: "deny", label: "Deny request" },
        ...(isRequestDetailAvailable
          ? [{ kind: "request_detail", label: "Request detail" } as const]
          : []),
      ],
    };
  }

  if (connectionState === "reconnecting") {
    return {
      badgeTone: "warning",
      isVisible: true,
      title: "Reconnecting live updates",
      summary:
        "Live delivery dropped. Thread View is reacquiring the latest activity for this thread.",
      actions: [
        { kind: "refresh", label: "Refresh thread" },
        ...(selectedThreadView.composer.interrupt_available
          ? [
              {
                kind: "interrupt",
                label: isInterruptingThread ? "Interrupting..." : "Interrupt thread",
              } as const,
            ]
          : []),
      ],
    };
  }

  if (connectionState === "idle" && selectedThreadView.current_activity.kind === "running") {
    return {
      badgeTone: "default",
      isVisible: true,
      title: "Connecting live updates",
      summary: "The thread is active while Thread View waits for the live stream to open.",
      actions: [
        { kind: "refresh", label: "Refresh thread" },
        ...(selectedThreadView.composer.interrupt_available
          ? [
              {
                kind: "interrupt",
                label: isInterruptingThread ? "Interrupting..." : "Interrupt thread",
              } as const,
            ]
          : []),
      ],
    };
  }

  if (selectedThreadView.current_activity.kind === "running") {
    return {
      badgeTone: "success",
      isVisible: selectedThreadView.composer.interrupt_available,
      title: "Codex is running",
      summary: "Thread View is waiting for more live activity, a request, or the turn to finish.",
      actions: selectedThreadView.composer.interrupt_available
        ? [
            {
              kind: "interrupt",
              label: isInterruptingThread ? "Interrupting..." : "Interrupt thread",
            },
          ]
        : [],
    };
  }

  if (
    selectedThreadView.current_activity.kind === "system_error" ||
    selectedThreadView.current_activity.kind === "latest_turn_failed" ||
    selectedThreadView.composer.input_unavailable_reason
  ) {
    return {
      badgeTone: "warning",
      isVisible: true,
      title:
        selectedThreadView.current_activity.kind === "system_error"
          ? "System error"
          : selectedThreadView.current_activity.kind === "latest_turn_failed"
            ? "Latest turn failed"
            : "Recovery required",
      summary:
        selectedThreadView.current_activity.kind === "system_error"
          ? "This thread needs recovery before Codex can continue."
          : selectedThreadView.current_activity.kind === "latest_turn_failed"
            ? "The latest turn failed. Refresh the thread or reopen detail before continuing."
            : `Input is unavailable while ${formatMachineLabel(
                selectedThreadView.composer.input_unavailable_reason,
              )}.`,
      actions: [
        { kind: "refresh", label: "Refresh thread" },
        ...(composerAcceptingInput
          ? [{ kind: "focus_composer", label: "Focus composer" } as const]
          : []),
        ...(selectedThreadView.composer.interrupt_available
          ? [
              {
                kind: "interrupt",
                label: isInterruptingThread ? "Interrupting..." : "Interrupt thread",
              } as const,
            ]
          : []),
        ...(isRequestDetailAvailable
          ? [{ kind: "request_detail", label: "Request detail" } as const]
          : []),
      ],
    };
  }

  if (selectedThreadView.current_activity.kind === "waiting_on_user_input") {
    return {
      badgeTone: "success",
      isVisible: false,
      title: "Ready for your next input",
      summary: "Codex is idle and the composer below is available for the next instruction.",
      actions: [{ kind: "focus_composer", label: "Focus composer" }],
    };
  }

  return {
    badgeTone: "default",
    isVisible: false,
    title: selectedThreadView.current_activity.label,
    summary: currentActivitySummary(selectedThreadView, false),
    actions: hasSelectedThread ? [{ kind: "refresh", label: "Refresh thread" }] : [],
  };
}

type MatchableRequest = {
  state: "pending" | "resolved";
  request_id: string;
  turn_id: string | null;
  item_id: string;
};

function requestRowMatchScore(row: TimelineDisplayRow, request: MatchableRequest) {
  let score = -1;

  if (row.requestId === request.request_id) {
    score = 400;
  } else if (row.itemId === request.item_id) {
    score = 300;
  } else if (
    request.turn_id &&
    row.turnId === request.turn_id &&
    row.requestState === request.state
  ) {
    score = 200;
  } else if (request.turn_id && row.turnId === request.turn_id && row.requestState !== null) {
    score = 150;
  }

  if (score < 0) {
    return null;
  }

  if (row.requestState === request.state) {
    score += 50;
  }

  if (row.requestState !== null) {
    score += 25;
  }

  return score;
}

function findMatchingRequestRow(
  groups: TimelineDisplayGroup[],
  request: MatchableRequest | null,
): TimelineDisplayRow | null {
  if (!request) {
    return null;
  }

  let bestMatch: { row: TimelineDisplayRow; score: number } | null = null;

  for (const group of groups) {
    for (const row of group.rows) {
      const score = requestRowMatchScore(row, request);
      if (
        score !== null &&
        (bestMatch === null ||
          score > bestMatch.score ||
          (score === bestMatch.score && row.sequence > bestMatch.row.sequence))
      ) {
        bestMatch = { row, score };
      }
    }
  }

  return bestMatch?.row ?? null;
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
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("full");
  const [expandedTimelineRows, setExpandedTimelineRows] = useState<Set<string>>(() => new Set());
  const [followLatestActivity, setFollowLatestActivity] = useState(true);
  const [hasSuppressedActivity, setHasSuppressedActivity] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRegionRef = useRef<HTMLDivElement | null>(null);
  const latestActivitySignatureRef = useRef<string | null>(null);
  const selectedWorkspace =
    workspaces.find((workspace) => workspace.workspace_id === workspaceId) ?? null;
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
  const composerInputLabel = isStartingThread ? "Ask Codex" : "Continue thread";
  const composerPlaceholder = !workspaceId
    ? "Select a workspace before asking Codex."
    : isStartingThread
      ? "Describe the task to start a new thread."
      : "Ask a follow-up question or continue the work.";
  const composerSubmitLabel = isStartingThread ? "Start thread" : "Send message";
  const composerGuidance = !workspaceId
    ? "Select a workspace to enable input."
    : isOpeningSelectedThread
      ? "Opening selected thread."
      : unavailableReason;
  const isComposerTextareaDisabled =
    !workspaceId || isOpeningSelectedThread || isSubmittingComposer || Boolean(unavailableReason);
  const selectedTimelineItem =
    detailSelection?.kind === "timeline_item_detail"
      ? (selectedThreadView?.timeline.items.find(
          (item) => item.timeline_item_id === detailSelection.timelineItemId,
        ) ?? null)
      : null;
  const selectedTimelineItemDetail = selectedTimelineItem
    ? getTimelineItemDetail(selectedTimelineItem)
    : null;
  const timelineModel = buildTimelineDisplayModel({
    timelineItems: selectedThreadView?.timeline.items ?? [],
    streamEvents,
    draftAssistantMessages,
  });
  const hasRequestDetailAffordance = selectedRequestDetail !== null;
  const latestTimelineGroup = timelineModel.groups[timelineModel.groups.length - 1] ?? null;
  const latestTimelineRow = latestTimelineGroup?.rows[latestTimelineGroup.rows.length - 1] ?? null;
  const matchedPendingRequestRow = findMatchingRequestRow(
    timelineModel.groups,
    selectedThreadView?.pending_request
      ? {
          state: "pending",
          request_id: selectedThreadView.pending_request.request_id,
          turn_id: selectedThreadView.pending_request.turn_id,
          item_id: selectedThreadView.pending_request.item_id,
        }
      : null,
  );
  const matchedResolvedRequestRow = findMatchingRequestRow(
    timelineModel.groups,
    selectedThreadView?.latest_resolved_request
      ? {
          state: "resolved",
          request_id: selectedThreadView.latest_resolved_request.request_id,
          turn_id: selectedThreadView.latest_resolved_request.turn_id,
          item_id: selectedThreadView.latest_resolved_request.item_id,
        }
      : null,
  );
  const latestActivitySignature = selectedThreadId
    ? JSON.stringify({
        connectionState,
        currentActivity: selectedThreadView?.current_activity.kind ?? null,
        latestResolvedRequest: selectedThreadView?.latest_resolved_request?.request_id ?? null,
        latestRowContent: latestTimelineRow?.content ?? null,
        latestRowId: latestTimelineRow?.id ?? null,
        latestRowIsLive: latestTimelineRow?.isLive ?? null,
        latestRowSequence: latestTimelineRow?.sequence ?? null,
        pendingRequest: selectedThreadView?.pending_request?.request_id ?? null,
        selectedThreadId,
        statusMessage,
      })
    : null;
  const threadFeedback = buildThreadFeedbackDescriptor({
    composerAcceptingInput: isThreadAcceptingInput,
    connectionState,
    hasSelectedThread,
    isOpeningSelectedThread,
    isRequestDetailAvailable: selectedRequestDetail !== null,
    isRespondingToRequest,
    isSendingMessage: isSubmittingComposer,
    isStartingThread,
    isInterruptingThread,
    selectedThreadView,
    workspaceId,
  });
  const threadActivitySummary = workspaceId
    ? currentActivitySummary(selectedThreadView, isOpeningSelectedThread)
    : "Choose a workspace to enable the composer.";
  const connectionStateLabel = formatConnectionStateLabel(connectionState);
  const isSidebarMinibar = sidebarMode === "mini" && !isNavigationOpen;
  const showInlineThreadFeedback =
    threadFeedback.isVisible &&
    !selectedThreadView?.pending_request &&
    !selectedThreadView?.latest_resolved_request;
  const headerStatusDescriptor = threadFeedback.isVisible
    ? threadFeedback
    : selectedThreadView &&
        (selectedThreadView.current_activity.kind === "system_error" ||
          selectedThreadView.current_activity.kind === "latest_turn_failed")
      ? {
          badgeTone: "warning" as const,
          title: selectedThreadView.current_activity.label,
        }
      : null;
  const threadHeading = selectedThreadView?.thread.title
    ? selectedThreadView.thread.title
    : isOpeningSelectedThread
      ? "Opening thread"
      : workspaceId
        ? `Ask Codex in ${selectedWorkspace?.workspace_name ?? workspaceId}`
        : "Select workspace";
  const threadContextLabel = selectedThreadView
    ? `Started in ${selectedWorkspace?.workspace_name ?? selectedThreadView.thread.workspace_id}`
    : isOpeningSelectedThread
      ? "Restoring thread context"
      : workspaceId
        ? "Start a new thread from the composer"
        : "Choose a workspace to begin";
  const refreshHref = workspaceId
    ? threadChatHref(workspaceId, selectedThreadId ?? undefined)
    : null;
  const requestRowContexts: Record<
    string,
    {
      state: "pending" | "resolved";
      badgeClassName: string;
      badgeLabel: string;
      showRequestDetailButton: boolean;
      showResponseActions: boolean;
    }
  > = {};

  if (matchedPendingRequestRow && selectedThreadView?.pending_request) {
    requestRowContexts[matchedPendingRequestRow.id] = {
      state: "pending",
      badgeClassName: requestSummaryBadgeClass("pending"),
      badgeLabel: "Pending request",
      showRequestDetailButton: selectedRequestDetail !== null,
      showResponseActions: true,
    };
  }

  if (matchedResolvedRequestRow && selectedThreadView?.latest_resolved_request) {
    requestRowContexts[matchedResolvedRequestRow.id] = {
      state: "resolved",
      badgeClassName: requestSummaryBadgeClass(
        "resolved",
        selectedThreadView.latest_resolved_request.decision,
      ),
      badgeLabel: `Resolved: ${formatMachineLabel(
        selectedThreadView.latest_resolved_request.decision,
      )}`,
      showRequestDetailButton: selectedRequestDetail !== null,
      showResponseActions: false,
    };
  }
  const fallbackPendingRequest = selectedThreadView?.pending_request && !matchedPendingRequestRow;
  const fallbackResolvedRequest =
    !selectedThreadView?.pending_request &&
    selectedThreadView?.latest_resolved_request &&
    !matchedResolvedRequestRow;
  const fallbackPendingRequestSummary =
    fallbackPendingRequest && selectedThreadView ? selectedThreadView.pending_request : null;
  const fallbackResolvedRequestSummary =
    fallbackResolvedRequest && selectedThreadView
      ? selectedThreadView.latest_resolved_request
      : null;

  useEffect(() => {
    const storedMode = readStoredSidebarMode();
    if (storedMode) {
      setSidebarMode(storedMode);
    }
  }, []);

  useEffect(() => {
    setIsNavigationOpen(false);
    setDetailSelection(null);
    setExpandedTimelineRows(new Set());
  }, [selectedThreadId]);

  useEffect(() => {
    latestActivitySignatureRef.current = null;
    setFollowLatestActivity(true);
    setHasSuppressedActivity(false);
  }, [selectedThreadId]);

  useEffect(() => {
    if (!selectedThreadId || latestActivitySignature === null) {
      latestActivitySignatureRef.current = latestActivitySignature;
      return;
    }

    const previousSignature = latestActivitySignatureRef.current;
    latestActivitySignatureRef.current = latestActivitySignature;

    if (followLatestActivity) {
      const scrollRegion = scrollRegionRef.current;
      if (scrollRegion) {
        scrollRegion.scrollTop = scrollRegion.scrollHeight;
      }
      setHasSuppressedActivity(false);
      return;
    }

    if (previousSignature !== null && previousSignature !== latestActivitySignature) {
      setHasSuppressedActivity(true);
    }
  }, [followLatestActivity, latestActivitySignature, selectedThreadId]);

  function selectThread(threadId: string) {
    onSelectThread(threadId);
    setIsNavigationOpen(false);
  }

  function askCodex() {
    onAskCodex();
    setIsNavigationOpen(false);
  }

  function updateSidebarMode(nextMode: SidebarMode) {
    setSidebarMode(nextMode);
    writeStoredSidebarMode(nextMode);
    if (nextMode === "full") {
      setIsNavigationOpen(false);
    }
  }

  function handleScrollRegionScroll() {
    const scrollRegion = scrollRegionRef.current;
    if (!scrollRegion) {
      return;
    }

    const distanceFromBottom =
      scrollRegion.scrollHeight - scrollRegion.scrollTop - scrollRegion.clientHeight;
    const isNearBottom = distanceFromBottom <= 48;

    setFollowLatestActivity(isNearBottom);
    if (isNearBottom) {
      setHasSuppressedActivity(false);
    }
  }

  function focusComposer() {
    composerRef.current?.focus();
  }

  function jumpToLatestActivity() {
    const scrollRegion = scrollRegionRef.current;
    if (scrollRegion) {
      scrollRegion.scrollTop = scrollRegion.scrollHeight;
    }
    setFollowLatestActivity(true);
    setHasSuppressedActivity(false);
  }

  function toggleTimelineRowExpansion(rowId: string) {
    setExpandedTimelineRows((current) => {
      const next = new Set(current);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }

  function renderThreadFeedbackAction(action: ThreadFeedbackAction) {
    switch (action.kind) {
      case "refresh":
        return workspaceId ? (
          <Link
            className="secondary-link action-button compact-button"
            href={threadChatHref(workspaceId, selectedThreadId ?? undefined)}
            key={action.label}
          >
            {action.label}
          </Link>
        ) : null;
      case "focus_composer":
        return (
          <button
            className="secondary-link action-button compact-button"
            key={action.label}
            onClick={focusComposer}
            type="button"
          >
            {action.label}
          </button>
        );
      case "interrupt":
        return (
          <button
            className="secondary-link action-button compact-button"
            disabled={isInterruptingThread}
            key={action.label}
            onClick={onInterruptThread}
            type="button"
          >
            {action.label}
          </button>
        );
      case "approve":
        return (
          <button
            className="approve-button action-button compact-button"
            disabled={isRespondingToRequest || selectedRequestDetail?.status !== "pending"}
            key={action.label}
            onClick={onApproveRequest}
            type="button"
          >
            {action.label}
          </button>
        );
      case "deny":
        return (
          <button
            className="danger-button action-button compact-button"
            disabled={isRespondingToRequest || selectedRequestDetail?.status !== "pending"}
            key={action.label}
            onClick={onDenyRequest}
            type="button"
          >
            {action.label}
          </button>
        );
      case "request_detail":
        return (
          <button
            className="secondary-link action-button compact-button"
            key={action.label}
            onClick={() => setDetailSelection({ kind: "request_detail" })}
            type="button"
          >
            {action.label}
          </button>
        );
      default:
        return null;
    }
  }

  return (
    <main className="chat-shell">
      <header className="chat-topbar">
        <div>
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
      <div className={isSidebarMinibar ? "chat-layout sidebar-minibar" : "chat-layout"}>
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
        <ChatViewNavigation
          backgroundPriorityNotice={backgroundPriorityNotice}
          formatMachineLabel={formatMachineLabel}
          formatTimestamp={formatTimestamp}
          isCreatingWorkspace={isCreatingWorkspace}
          isLoadingThreads={isLoadingThreads}
          isLoadingWorkspaces={isLoadingWorkspaces}
          isNavigationOpen={isNavigationOpen}
          onAskCodex={askCodex}
          onCreateWorkspace={onCreateWorkspace}
          onOpenBackgroundPriorityThread={onOpenBackgroundPriorityThread}
          onSelectThread={selectThread}
          onSelectWorkspace={onSelectWorkspace}
          onSidebarModeChange={updateSidebarMode}
          onWorkspaceNameChange={onWorkspaceNameChange}
          selectedThreadId={selectedThreadId}
          sidebarMode={sidebarMode}
          threads={threads}
          workspaceId={workspaceId}
          workspaceName={workspaceName}
          workspaces={workspaces}
        />

        <section aria-label="Thread View" className="chat-panel workspace-card thread-view-card">
          <div className="thread-view-header-stack">
            <header>
              <div className="thread-context-row">
                <div className="thread-context-copy">
                  <p className="thread-context-label">{threadContextLabel}</p>
                  <h2 title={threadHeading}>{threadHeading}</h2>
                </div>
                <div className="thread-context-actions">
                  {headerStatusDescriptor ? (
                    <span
                      className={
                        headerStatusDescriptor.badgeTone === "warning"
                          ? "status-badge warning"
                          : headerStatusDescriptor.badgeTone === "success"
                            ? "status-badge success"
                            : "status-badge"
                      }
                    >
                      {headerStatusDescriptor.title}
                    </span>
                  ) : null}
                  <button
                    aria-label="Thread details"
                    className="secondary-link compact-link icon-button"
                    disabled={!workspaceId}
                    onClick={() => setDetailSelection({ kind: "thread_details" })}
                    title="Thread details"
                    type="button"
                  >
                    <SecondaryIcon>
                      <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
                        <title>Thread details</title>
                        <path
                          d="M12 17h.01"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                        <path
                          d="M12 13.5a2.5 2.5 0 1 0-2-4"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                        />
                      </svg>
                    </SecondaryIcon>
                  </button>
                </div>
              </div>
            </header>
          </div>

          <div className="thread-view-body">
            <div
              className="thread-view-scroll-region"
              onScroll={handleScrollRegionScroll}
              ref={scrollRegionRef}
            >
              {hasSuppressedActivity && latestTimelineRow ? (
                <div className="latest-activity-cta">
                  <span className="workspace-meta">New activity is available below.</span>
                  <button
                    className="secondary-link action-button compact-button"
                    onClick={jumpToLatestActivity}
                    type="button"
                  >
                    Jump to latest activity
                  </button>
                </div>
              ) : null}
              {fallbackPendingRequestSummary ? (
                <div className="request-detail-card pending-request-card pending-request-card-fallback">
                  <div className="workspace-meta-row">
                    <strong>Request summary</strong>
                    <span
                      className={requestSummaryBadgeClass(
                        "pending",
                        selectedRequestDetail?.decision ?? null,
                      )}
                    >
                      Pending request
                    </span>
                  </div>
                  <p>{fallbackPendingRequestSummary.summary}</p>
                  {selectedRequestDetail ? (
                    <p className="workspace-meta">{selectedRequestDetail.reason}</p>
                  ) : null}
                  {selectedRequestDetail?.operation_summary ? (
                    <p className="workspace-meta">
                      Operation:{" "}
                      <code className="artifact-inline">
                        {selectedRequestDetail.operation_summary}
                      </code>
                    </p>
                  ) : null}
                  <p className="workspace-meta">
                    Requested {formatTimestamp(fallbackPendingRequestSummary.requested_at)}
                  </p>
                  <div className="workspace-actions">
                    <button
                      className="approve-button action-button compact-button"
                      disabled={
                        isRespondingToRequest || selectedRequestDetail?.status !== "pending"
                      }
                      onClick={onApproveRequest}
                      type="button"
                    >
                      {isRespondingToRequest ? "Submitting..." : "Approve request"}
                    </button>
                    <button
                      className="danger-button action-button compact-button"
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
                        className="secondary-link action-button compact-button"
                        onClick={() => setDetailSelection({ kind: "request_detail" })}
                        type="button"
                      >
                        Request detail
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : fallbackResolvedRequestSummary ? (
                <div className="request-detail-card pending-request-card pending-request-card-fallback">
                  <div className="workspace-meta-row">
                    <strong>Request summary</strong>
                    <span
                      className={requestSummaryBadgeClass(
                        "resolved",
                        fallbackResolvedRequestSummary.decision,
                      )}
                    >
                      {`Resolved: ${formatMachineLabel(fallbackResolvedRequestSummary.decision)}`}
                    </span>
                  </div>
                  <p>
                    Latest resolved request in this thread was{" "}
                    {formatMachineLabel(fallbackResolvedRequestSummary.decision)}.
                  </p>
                  <p className="workspace-meta">
                    Responded {formatTimestamp(fallbackResolvedRequestSummary.responded_at)}
                  </p>
                  {selectedRequestDetail ? (
                    <div className="workspace-actions">
                      <button
                        className="secondary-link action-button compact-button"
                        onClick={() => setDetailSelection({ kind: "request_detail" })}
                        type="button"
                      >
                        Request detail
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {showInlineThreadFeedback ? (
                <div className="thread-feedback-card thread-feedback-card-inline">
                  <div className="workspace-meta-row">
                    <span className={threadFeedbackBadgeClass(threadFeedback)}>
                      {threadFeedback.title}
                    </span>
                  </div>
                  <p className="workspace-status">{threadFeedback.summary}</p>
                  {threadFeedback.actions.length > 0 ? (
                    <div className="workspace-actions thread-feedback-actions">
                      {threadFeedback.actions.map((action) => renderThreadFeedbackAction(action))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <ChatViewTimeline
                expandedRowIds={expandedTimelineRows}
                formatTimestamp={formatTimestamp}
                groups={timelineModel.groups}
                hasLoadedThreadView={selectedThreadView !== null}
                isRespondingToRequest={isRespondingToRequest}
                isLoadingThread={isLoadingThread}
                onApproveRequest={onApproveRequest}
                onDenyRequest={onDenyRequest}
                onOpenDetail={(timelineItemId) =>
                  setDetailSelection({
                    kind: "timeline_item_detail",
                    timelineItemId,
                  })
                }
                onOpenRequestDetail={() => setDetailSelection({ kind: "request_detail" })}
                onToggleRowExpansion={toggleTimelineRowExpansion}
                requestRowContexts={requestRowContexts}
                selectedThreadId={selectedThreadId}
              />
            </div>

            <div className="thread-mobile-footer-actions">
              <button
                className="secondary-link action-button compact-button"
                onClick={() => setIsNavigationOpen(true)}
                type="button"
              >
                Threads
              </button>
              <button
                className="secondary-link action-button compact-button"
                disabled={!workspaceId}
                onClick={() =>
                  setDetailSelection(
                    hasRequestDetailAffordance
                      ? { kind: "request_detail" }
                      : { kind: "thread_details" },
                  )
                }
                type="button"
              >
                Details
              </button>
            </div>

            <ChatViewComposer
              composerDraft={composerDraft}
              composerGuidance={composerGuidance}
              composerInputLabel={composerInputLabel}
              composerPlaceholder={composerPlaceholder}
              composerSubmitLabel={composerSubmitLabel}
              isComposerDisabled={isComposerDisabled}
              isStartingThread={isStartingThread}
              isTextareaDisabled={isComposerTextareaDisabled}
              onComposerDraftChange={onComposerDraftChange}
              onSubmitComposer={onSubmitComposer}
              textareaRef={composerRef}
            />
          </div>
        </section>

        {detailSelection ? (
          <ChatViewDetails
            composerGuidance={composerGuidance}
            formatMachineLabel={formatMachineLabel}
            formatTimestamp={formatTimestamp}
            isOpeningSelectedThread={isOpeningSelectedThread}
            isRespondingToRequest={isRespondingToRequest}
            onApproveRequest={onApproveRequest}
            onClose={() => setDetailSelection(null)}
            onDenyRequest={onDenyRequest}
            onSelectRequestDetail={() => setDetailSelection({ kind: "request_detail" })}
            onSelectTimelineItemDetail={(timelineItemId) =>
              setDetailSelection({
                kind: "timeline_item_detail",
                timelineItemId,
              })
            }
            renderThreadFeedbackAction={renderThreadFeedbackAction}
            requestBadgeClass={requestBadgeClass}
            selectedRequestDetail={selectedRequestDetail}
            selectedThreadId={selectedThreadId}
            selectedThreadView={selectedThreadView}
            selectedTimelineItem={selectedTimelineItem}
            selectedTimelineItemDetail={selectedTimelineItemDetail}
            selectedWorkspaceName={selectedWorkspace?.workspace_name ?? null}
            selection={detailSelection}
            threadActivitySummary={threadActivitySummary}
            threadFeedback={threadFeedback}
            threadCount={threads.length}
            timelineGroups={timelineModel.groups}
            refreshHref={refreshHref}
            streamStateLabel={connectionStateLabel}
            workspaceId={workspaceId}
          />
        ) : null}
      </div>
    </main>
  );
}
