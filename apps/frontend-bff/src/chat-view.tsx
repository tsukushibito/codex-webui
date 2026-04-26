import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { PublicWorkspaceSummary } from "./chat-data";
import type {
  PublicRequestDetail,
  PublicThreadListItem,
  PublicThreadStreamEvent,
  PublicThreadView,
} from "./thread-types";
import { buildTimelineDisplayModel, type TimelineDisplayRow } from "./timeline-display-model";
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

function activityBadgeClass(activityKind: PublicThreadListItem["current_activity"]["kind"] | null) {
  if (activityKind === "waiting_on_approval") {
    return "status-badge warning";
  }

  if (activityKind === "running") {
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

type ThreadFilterId = "all" | "active" | "waiting_approval" | "errors_failed" | "recent";

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

function summarizeThreadActivity(thread: PublicThreadListItem) {
  if (thread.blocked_cue) {
    return thread.blocked_cue.label;
  }

  if (thread.badge) {
    return thread.badge.label;
  }

  if (thread.resume_cue) {
    return thread.resume_cue.label;
  }

  return thread.current_activity.label;
}

function threadCueLabel(thread: PublicThreadListItem) {
  return thread.blocked_cue?.label ?? thread.resume_cue?.label ?? thread.badge?.label ?? null;
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

type ThreadFeedbackAction =
  | { kind: "refresh"; label: string }
  | { kind: "focus_composer"; label: string }
  | { kind: "interrupt"; label: string }
  | { kind: "approve"; label: string }
  | { kind: "deny"; label: string }
  | { kind: "request_detail"; label: string };

type ThreadFeedbackDescriptor = {
  badgeTone: "default" | "success" | "warning";
  isVisible: boolean;
  title: string;
  summary: string;
  actions: ThreadFeedbackAction[];
};

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

function threadFeedbackBadgeClass(descriptor: ThreadFeedbackDescriptor) {
  if (descriptor.badgeTone === "success") {
    return "status-badge success";
  }

  if (descriptor.badgeTone === "warning") {
    return "status-badge warning";
  }

  return "status-badge";
}

function isCodeLikeFieldLabel(label: string) {
  return (
    label === "Request ID" ||
    label === "Operation" ||
    label === "Thread" ||
    label === "Turn" ||
    label === "Item"
  );
}

function detailFieldClass(label: string) {
  return isCodeLikeFieldLabel(label)
    ? "request-detail-field request-detail-field-code"
    : "request-detail-field";
}

function renderDetailFieldValue(
  field: { label: string; value: string; href?: string } | { label: string; value: string | null },
) {
  const isCodeLike = isCodeLikeFieldLabel(field.label);
  const content = isCodeLike ? <code className="artifact-inline">{field.value}</code> : field.value;

  if ("href" in field && field.href) {
    return (
      <a className="detail-link" href={field.href} rel="noreferrer" target="_blank">
        {content}
      </a>
    );
  }

  return content;
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
      summary: "The next composer submission will create a new thread in this workspace.",
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
      isVisible: true,
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
  const [selectedFilterId, setSelectedFilterId] = useState<ThreadFilterId>("all");
  const [followLatestActivity, setFollowLatestActivity] = useState(true);
  const [hasSuppressedActivity, setHasSuppressedActivity] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRegionRef = useRef<HTMLDivElement | null>(null);
  const latestActivitySignatureRef = useRef<string | null>(null);
  const selectedWorkspace =
    workspaces.find((workspace) => workspace.workspace_id === workspaceId) ?? null;
  const visibleThreads = filterThreads(threads, selectedFilterId);
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

  useEffect(() => {
    setIsNavigationOpen(false);
    setDetailSelection(null);
  }, [selectedThreadId]);

  useEffect(() => {
    setSelectedFilterId("all");
  }, [workspaceId]);

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
          className={
            isNavigationOpen
              ? "chat-panel create-card thread-navigation open"
              : "chat-panel create-card thread-navigation"
          }
        >
          <header>
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

            {workspaceId && threads.length > 0 ? (
              <div className="thread-filter-bar" role="tablist" aria-label="Thread filters">
                {threadFilters.map((filter) => (
                  <button
                    className={
                      selectedFilterId === filter.id
                        ? "thread-filter-chip active"
                        : "thread-filter-chip"
                    }
                    key={filter.id}
                    onClick={() => setSelectedFilterId(filter.id)}
                    role="tab"
                    aria-selected={selectedFilterId === filter.id}
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

              return (
                <button
                  className={isSelected ? "thread-summary-card active" : "thread-summary-card"}
                  key={thread.thread_id}
                  onClick={() => selectThread(thread.thread_id)}
                  type="button"
                >
                  <div className="workspace-meta-row thread-summary-header">
                    <div className="thread-summary-title-block">
                      <strong>{thread.title}</strong>
                      <span className="workspace-meta">
                        Updated {formatTimestamp(thread.updated_at)}
                      </span>
                    </div>
                    <div className="thread-summary-statuses">
                      {isSelected ? <span className="status-badge">Selected</span> : null}
                      <span className={threadBadgeClass(thread)}>
                        {thread.current_activity.label}
                      </span>
                    </div>
                  </div>
                  <p className="thread-summary-activity">{summarizeThreadActivity(thread)}</p>
                  <div className="thread-summary-cues">
                    {rowCueLabel ? (
                      <span className="status-badge">{formatMachineLabel(rowCueLabel)}</span>
                    ) : null}
                    {hasBackgroundNotice ? (
                      <span className="status-badge warning">Needs attention now</span>
                    ) : null}
                    {thread.badge && rowCueLabel !== thread.badge.label ? (
                      <span className="status-badge">{formatMachineLabel(thread.badge.label)}</span>
                    ) : null}
                  </div>
                  {hasBackgroundNotice ? (
                    <p className="thread-summary-notice">
                      Background notice: {backgroundPriorityNotice?.reason}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <section aria-label="Thread View" className="chat-panel workspace-card thread-view-card">
          <div className="thread-view-header-stack">
            <header>
              <div className="workspace-meta-row">
                {selectedThreadView ? (
                  <span className={activityBadgeClass(selectedThreadView.current_activity.kind)}>
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
                      Operation:{" "}
                      <code className="artifact-inline">
                        {selectedRequestDetail.operation_summary}
                      </code>
                    </p>
                  ) : null}
                  <p className="workspace-meta">
                    Requested {formatTimestamp(selectedThreadView.pending_request.requested_at)}
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

              {threadFeedback.isVisible ? (
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

              <section className="timeline-section" aria-label="Timeline">
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
                              {row.detailActionLabel ?? "Inspect details"}
                            </button>
                          ) : null}
                        </article>
                      ))}
                    </section>
                  ))}
                </div>
              </section>
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
                disabled={!hasRequestDetailAffordance}
                onClick={() => setDetailSelection({ kind: "request_detail" })}
                type="button"
              >
                Details
              </button>
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
                  ref={composerRef}
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
                  : (selectedTimelineItemDetail?.title ?? "Timeline detail")}
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
                    <div className={detailFieldClass("Operation")}>
                      <dt>Operation</dt>
                      <dd>
                        <code className="artifact-inline">
                          {selectedRequestDetail.operation_summary}
                        </code>
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Requested</dt>
                    <dd>{formatTimestamp(selectedRequestDetail.requested_at)}</dd>
                  </div>
                  <div className={`request-context-field ${detailFieldClass("Thread")}`}>
                    <dt>Thread</dt>
                    <dd>
                      <code className="artifact-inline">{selectedRequestDetail.thread_id}</code>
                    </dd>
                  </div>
                  <div className={`request-context-field ${detailFieldClass("Turn")}`}>
                    <dt>Turn</dt>
                    <dd>
                      {selectedRequestDetail.turn_id ? (
                        <code className="artifact-inline">{selectedRequestDetail.turn_id}</code>
                      ) : (
                        "Not available"
                      )}
                    </dd>
                  </div>
                  <div className={`request-context-field ${detailFieldClass("Item")}`}>
                    <dt>Item</dt>
                    <dd>
                      <code className="artifact-inline">{selectedRequestDetail.item_id}</code>
                    </dd>
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
                    Operation:{" "}
                    <code className="artifact-inline">
                      {selectedRequestDetail.operation_summary}
                    </code>
                  </p>
                ) : null}
                {selectedRequestDetail.status === "pending" ? (
                  <div className="workspace-actions request-detail-actions">
                    <button
                      className="approve-button action-button compact-button"
                      disabled={isRespondingToRequest}
                      onClick={onApproveRequest}
                      type="button"
                    >
                      {isRespondingToRequest ? "Submitting..." : "Approve request"}
                    </button>
                    <button
                      className="danger-button action-button compact-button"
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

            {detailSelection.kind === "timeline_item_detail" &&
            selectedTimelineItem &&
            selectedTimelineItemDetail ? (
              <div className="detail-stack">
                <p className="workspace-meta">
                  {selectedTimelineItem.kind} at {formatTimestamp(selectedTimelineItem.occurred_at)}
                </p>
                <p>{selectedTimelineItemDetail.summary}</p>
                {selectedTimelineItemDetail.sections.map((section) => (
                  <div
                    className={
                      section.code
                        ? "request-operation-summary detail-artifact-section"
                        : "request-operation-summary detail-text-section"
                    }
                    key={section.title}
                  >
                    <strong>{section.title}</strong>
                    <ul
                      className={section.code ? "detail-list detail-artifact-list" : "detail-list"}
                    >
                      {section.items.map((entry) => (
                        <li key={entry}>
                          {section.code ? <code className="artifact-inline">{entry}</code> : entry}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {selectedTimelineItemDetail.fields.length > 0 ? (
                  <dl className="request-detail-list">
                    {selectedTimelineItemDetail.fields.map((field) => (
                      <div
                        className={detailFieldClass(field.label)}
                        key={`${field.label}:${field.value}`}
                      >
                        <dt>{field.label}</dt>
                        <dd>{renderDetailFieldValue(field)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                <details className="detail-debug">
                  <summary>Debug: raw timeline payload JSON</summary>
                  <pre className="detail-json">
                    {JSON.stringify(selectedTimelineItem.payload, null, 2)}
                  </pre>
                </details>
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
    </main>
  );
}
