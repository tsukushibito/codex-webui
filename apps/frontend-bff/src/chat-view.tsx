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
import {
  buildTimelineDisplayModel,
  filterTimelineDisplayGroupsForChat,
} from "./timeline-display-model";
import { getTimelineItemDetail } from "./timeline-item-detail";

type ScopedFeedback = {
  message: string;
  tone: "info" | "success" | "warning" | "error";
};

const SCROLL_FOLLOW_BOTTOM_THRESHOLD_PX = 48;
const SCROLL_FOLLOW_SUSPEND_DELTA_PX = 24;
export const THEME_STORAGE_KEY = "codex-webui.theme";
const COMPOSER_KEYBINDING_MODE_STORAGE_KEY = "codex-webui.composer-keybinding-mode";
const FOCUSABLE_SETTINGS_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type ComposerKeybindingMode = "chat" | "editor";
export type ThemeName = "dark" | "light";

export interface ChatViewProps {
  workspaceId: string | null;
  workspaces: PublicWorkspaceSummary[];
  threads: PublicThreadListItem[];
  workspaceFeedback?: ScopedFeedback | null;
  threadListFeedback?: ScopedFeedback | null;
  notificationFeedback?: ScopedFeedback | null;
  composerFeedback?: ScopedFeedback | null;
  threadViewFeedback?: ScopedFeedback | null;
  requestFeedback?: ScopedFeedback | null;
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
  errorMessage?: string | null;
  statusMessage?: string | null;
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

function latestTimelineActivitySignature(groups: TimelineDisplayGroup[]) {
  const latestGroup = groups.at(-1) ?? null;
  const latestRow = latestGroup?.rows.at(-1) ?? null;

  if (!latestRow) {
    return "empty";
  }

  return [
    groups.length,
    latestRow.id,
    latestRow.sequence,
    latestRow.isLive ? "live" : "settled",
    latestRow.content,
  ].join(":");
}

function scrollDistanceFromBottom(element: HTMLElement) {
  return element.scrollHeight - element.clientHeight - element.scrollTop;
}

function isScrollRegionNearBottom(element: HTMLElement) {
  return scrollDistanceFromBottom(element) <= SCROLL_FOLLOW_BOTTOM_THRESHOLD_PX;
}

function scrollRegionToLatest(element: HTMLElement) {
  if (typeof element.scrollTo === "function") {
    element.scrollTo({
      top: element.scrollHeight,
    });
    return;
  }

  element.scrollTop = element.scrollHeight;
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

function SettingsGlyph() {
  return (
    <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
      <title>Settings</title>
      <path
        d="M12 8.75a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="m19.2 15.1 1.15 1.99-1.85 3.2-2.34-.46a7.94 7.94 0 0 1-1.73 1l-.61 2.3H10.2l-.61-2.3a7.93 7.93 0 0 1-1.73-1l-2.34.46-1.85-3.2 1.15-1.99a8.74 8.74 0 0 1 0-2.2L3.67 10.9l1.85-3.2 2.34.46c.53-.4 1.11-.74 1.73-1l.61-2.3h3.62l.61 2.3c.62.26 1.2.6 1.73 1l2.34-.46 1.85 3.2-1.15 1.99c.13.72.13 1.48 0 2.2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function isComposerKeybindingMode(value: string | null): value is ComposerKeybindingMode {
  return value === "chat" || value === "editor";
}

function isThemeName(value: string | null): value is ThemeName {
  return value === "dark" || value === "light";
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SETTINGS_SELECTOR)).filter(
    (element) =>
      !element.hasAttribute("disabled") &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.tabIndex !== -1,
  );
}

export function applyThemeToDocumentRoot(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function readStoredTheme() {
  try {
    const storage = window.localStorage;
    if (typeof storage.getItem !== "function") {
      return "dark" satisfies ThemeName;
    }

    const storedTheme = storage.getItem(THEME_STORAGE_KEY);
    return isThemeName(storedTheme) ? storedTheme : ("dark" satisfies ThemeName);
  } catch {
    return "dark" satisfies ThemeName;
  }
}

export function writeStoredTheme(nextTheme: ThemeName) {
  try {
    const storage = window.localStorage;
    if (typeof storage.setItem === "function") {
      storage.setItem(THEME_STORAGE_KEY, nextTheme);
    }
  } catch {
    // Theme preference should never block Thread View interactions.
  }
}

export function readStoredComposerKeybindingMode() {
  try {
    const storage = window.localStorage;
    if (typeof storage.getItem !== "function") {
      return null;
    }

    const storedMode = storage.getItem(COMPOSER_KEYBINDING_MODE_STORAGE_KEY);
    return isComposerKeybindingMode(storedMode) ? storedMode : null;
  } catch {
    return null;
  }
}

export function writeStoredComposerKeybindingMode(nextMode: ComposerKeybindingMode) {
  try {
    const storage = window.localStorage;
    if (typeof storage.setItem === "function") {
      storage.setItem(COMPOSER_KEYBINDING_MODE_STORAGE_KEY, nextMode);
    }
  } catch {
    // Composer preference should never block chat input.
  }
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

  if (isSendingMessage && isStartingThread) {
    return {
      badgeTone: "success",
      isVisible: true,
      title: "Submitting first input",
      summary: "Input is accepted locally while Thread View waits for the new thread to open.",
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

function hasLiveAssistantTimelineRow(groups: TimelineDisplayGroup[]) {
  return groups.some((group) => group.rows.some((row) => row.role === "assistant" && row.isLive));
}

function latestTurnIdFromThreadView(threadView: PublicThreadView | null) {
  if (!threadView) {
    return null;
  }

  for (let index = threadView.timeline.items.length - 1; index >= 0; index -= 1) {
    const turnId = threadView.timeline.items[index]?.turn_id;
    if (turnId) {
      return turnId;
    }
  }

  return null;
}

function buildRunningAssistantPlaceholderRow({
  latestSequence,
  selectedThreadView,
}: {
  latestSequence: number;
  selectedThreadView: PublicThreadView;
}): TimelineDisplayRow | null {
  if (selectedThreadView.current_activity.kind !== "running") {
    return null;
  }

  return {
    id: `timeline:running-placeholder:${selectedThreadView.thread.thread_id}`,
    turnId: latestTurnIdFromThreadView(selectedThreadView),
    itemId: null,
    requestId: null,
    requestState: null,
    sequence: latestSequence + 1,
    occurredAt: null,
    label: "Codex is responding",
    content: "",
    density: "primary",
    role: "assistant",
    tone: "codex",
    timelineItemId: null,
    isLive: true,
    defaultFoldEligible: false,
    showDetailButton: false,
    detailActionLabel: null,
  };
}

function appendTimelineRowToGroups(groups: TimelineDisplayGroup[], row: TimelineDisplayRow | null) {
  if (!row) {
    return groups;
  }

  const nextGroups = groups.map((group) => ({
    ...group,
    rows: [...group.rows],
  }));

  const lastGroup = nextGroups.at(-1) ?? null;
  if (lastGroup && lastGroup.turnId === row.turnId) {
    lastGroup.rows.push(row);
    return nextGroups;
  }

  nextGroups.push({
    id: row.turnId ? `turn:${row.turnId}:${row.id}` : `item:${row.id}`,
    turnId: lastGroup?.turnId === row.turnId ? row.turnId : null,
    rows: [row],
  });

  return nextGroups;
}

export function ChatView({
  workspaceId,
  workspaces,
  threads,
  workspaceFeedback = null,
  threadListFeedback = null,
  notificationFeedback = null,
  composerFeedback = null,
  threadViewFeedback = null,
  requestFeedback = null,
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
  errorMessage = null,
  statusMessage = null,
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
  const [theme, setTheme] = useState<ThemeName>("dark");
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [detailSelection, setDetailSelection] = useState<ThreadDetailSelection | null>(null);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("full");
  const [composerKeybindingMode, setComposerKeybindingMode] =
    useState<ComposerKeybindingMode>("chat");
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [expandedTimelineRows, setExpandedTimelineRows] = useState<Set<string>>(() => new Set());
  const [isScrollFollowingLatest, setIsScrollFollowingLatest] = useState(true);
  const [hasNewerActivityBelow, setHasNewerActivityBelow] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsDialogRef = useRef<HTMLDivElement | null>(null);
  const scrollRegionRef = useRef<HTMLDivElement | null>(null);
  const suppressScrollTrackingRef = useRef(false);
  const lastKnownScrollTopRef = useRef(0);
  const lastSeenTimelineActivityRef = useRef("empty");
  const previousSettingsDialogOpenRef = useRef(false);
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
  const detailTimelineModel = buildTimelineDisplayModel({
    timelineItems: selectedThreadView?.timeline.items ?? [],
    streamEvents,
    draftAssistantMessages,
  });
  const chatTimelineGroupsBase = filterTimelineDisplayGroupsForChat(detailTimelineModel.groups);
  const placeholderRunningRow =
    selectedThreadView && !hasLiveAssistantTimelineRow(chatTimelineGroupsBase)
      ? buildRunningAssistantPlaceholderRow({
          latestSequence: chatTimelineGroupsBase.at(-1)?.rows.at(-1)?.sequence ?? 0,
          selectedThreadView,
        })
      : null;
  const timelineGroups = appendTimelineRowToGroups(chatTimelineGroupsBase, placeholderRunningRow);
  const hasRequestDetailAffordance = selectedRequestDetail !== null;
  const matchedPendingRequestRow = findMatchingRequestRow(
    timelineGroups,
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
    timelineGroups,
    selectedThreadView?.latest_resolved_request
      ? {
          state: "resolved",
          request_id: selectedThreadView.latest_resolved_request.request_id,
          turn_id: selectedThreadView.latest_resolved_request.turn_id,
          item_id: selectedThreadView.latest_resolved_request.item_id,
        }
      : null,
  );
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
  const legacyStatusFeedback =
    statusMessage === null
      ? null
      : statusMessage.includes("background thread")
        ? ({ message: statusMessage, tone: "warning" } satisfies ScopedFeedback)
        : statusMessage.includes("Request")
          ? ({
              message: statusMessage,
              tone: statusMessage.includes("resolved") ? "success" : "warning",
            } satisfies ScopedFeedback)
          : ({ message: statusMessage, tone: "success" } satisfies ScopedFeedback);
  const effectiveNotificationFeedback =
    notificationFeedback ??
    (statusMessage?.includes("background thread") ||
    statusMessage?.includes("Thread notification received")
      ? legacyStatusFeedback
      : null);
  const effectiveRequestFeedback =
    requestFeedback ?? (statusMessage?.includes("Request") ? legacyStatusFeedback : null);
  const effectiveComposerFeedback =
    composerFeedback ??
    (statusMessage !== null &&
    !statusMessage.includes("Request") &&
    !statusMessage.includes("background thread")
      ? legacyStatusFeedback
      : null);
  const effectiveThreadViewFeedback =
    threadViewFeedback ??
    (errorMessage !== null
      ? ({ message: errorMessage, tone: "error" } satisfies ScopedFeedback)
      : null);
  const threadActivitySummary = workspaceId
    ? currentActivitySummary(selectedThreadView, isOpeningSelectedThread)
    : "Choose a workspace to enable the composer.";
  const isSidebarMinibar = sidebarMode === "mini" && !isNavigationOpen;
  const showThreadContextLabel = !selectedThreadView || isOpeningSelectedThread;
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
      requestSummary: string;
      requestReason: string | null;
      requestOperationSummary: string | null;
      showRequestDetailButton: boolean;
      showResponseActions: boolean;
    }
  > = {};

  if (matchedPendingRequestRow && selectedThreadView?.pending_request) {
    requestRowContexts[matchedPendingRequestRow.id] = {
      state: "pending",
      badgeClassName: requestSummaryBadgeClass("pending"),
      badgeLabel: "Pending request",
      requestSummary: selectedThreadView.pending_request.summary,
      requestReason: selectedRequestDetail?.reason ?? null,
      requestOperationSummary: selectedRequestDetail?.operation_summary ?? null,
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
      requestSummary: selectedRequestDetail?.summary ?? "",
      requestReason: selectedRequestDetail?.reason ?? null,
      requestOperationSummary: selectedRequestDetail?.operation_summary ?? null,
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
  const latestActivitySignature = latestTimelineActivitySignature(timelineGroups);
  const showJumpToLatestActivity = !isScrollFollowingLatest && hasNewerActivityBelow;

  useEffect(() => {
    const storedTheme = readStoredTheme();
    setTheme(storedTheme);
  }, []);

  useEffect(() => {
    applyThemeToDocumentRoot(theme);
    writeStoredTheme(theme);
  }, [theme]);

  useEffect(() => {
    const storedMode = readStoredSidebarMode();
    if (storedMode) {
      setSidebarMode(storedMode);
    }
  }, []);

  useEffect(() => {
    const storedMode = readStoredComposerKeybindingMode();
    if (storedMode) {
      setComposerKeybindingMode(storedMode);
    }
  }, []);

  useEffect(() => {
    if (!isSettingsDialogOpen) {
      return;
    }

    const focusableElements = getFocusableElements(settingsDialogRef.current);
    focusableElements[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsSettingsDialogOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const nextFocusableElements = getFocusableElements(settingsDialogRef.current);
      const firstFocusableElement = nextFocusableElements[0] ?? null;
      const lastFocusableElement = nextFocusableElements.at(-1) ?? null;

      if (!firstFocusableElement || !lastFocusableElement) {
        event.preventDefault();
        return;
      }

      const activeElement = document.activeElement;
      const isFocusInsideDialog =
        activeElement instanceof HTMLElement &&
        settingsDialogRef.current?.contains(activeElement) === true;

      if (!isFocusInsideDialog) {
        event.preventDefault();
        (event.shiftKey ? lastFocusableElement : firstFocusableElement).focus();
        return;
      }

      if (event.shiftKey && activeElement === firstFocusableElement) {
        event.preventDefault();
        lastFocusableElement.focus();
        return;
      }

      if (!event.shiftKey && activeElement === lastFocusableElement) {
        event.preventDefault();
        firstFocusableElement.focus();
      }
    }

    function handleFocusIn(event: FocusEvent) {
      const dialog = settingsDialogRef.current;
      const focusTarget = event.target;

      if (!(dialog && focusTarget instanceof HTMLElement) || dialog.contains(focusTarget)) {
        return;
      }

      const nextFocusableElements = getFocusableElements(dialog);
      nextFocusableElements[0]?.focus();
    }

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [isSettingsDialogOpen]);

  useEffect(() => {
    const wasOpen = previousSettingsDialogOpenRef.current;
    previousSettingsDialogOpenRef.current = isSettingsDialogOpen;

    if (!wasOpen || isSettingsDialogOpen) {
      return;
    }

    settingsButtonRef.current?.focus();
  }, [isSettingsDialogOpen]);

  useEffect(() => {
    setIsNavigationOpen(false);
    setDetailSelection(null);
    setExpandedTimelineRows(new Set());
    setIsScrollFollowingLatest(true);
    setHasNewerActivityBelow(false);
    lastKnownScrollTopRef.current = 0;
    lastSeenTimelineActivityRef.current = "empty";
  }, [selectedThreadId]);

  useEffect(() => {
    const scrollRegion = scrollRegionRef.current;

    if (!scrollRegion) {
      lastSeenTimelineActivityRef.current = latestActivitySignature;
      return;
    }

    if (isScrollFollowingLatest) {
      suppressScrollTrackingRef.current = true;
      const finalizeFollowScroll = () => {
        scrollRegionToLatest(scrollRegion);
        lastKnownScrollTopRef.current = scrollRegion.scrollTop;
        lastSeenTimelineActivityRef.current = latestActivitySignature;
        setHasNewerActivityBelow(false);
        suppressScrollTrackingRef.current = false;
      };

      scrollRegionToLatest(scrollRegion);

      if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
        const frameId = window.requestAnimationFrame(() => {
          finalizeFollowScroll();
        });

        return () => {
          window.cancelAnimationFrame(frameId);
          suppressScrollTrackingRef.current = false;
        };
      }

      queueMicrotask(() => {
        finalizeFollowScroll();
      });
      return;
    }

    setHasNewerActivityBelow(
      !isScrollRegionNearBottom(scrollRegion) &&
        lastSeenTimelineActivityRef.current !== latestActivitySignature,
    );
  }, [isScrollFollowingLatest, latestActivitySignature]);

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

  function updateComposerKeybindingMode(nextMode: ComposerKeybindingMode) {
    setComposerKeybindingMode(nextMode);
    writeStoredComposerKeybindingMode(nextMode);
  }

  function openSettingsDialog() {
    setIsSettingsDialogOpen(true);
  }

  function closeSettingsDialog() {
    setIsSettingsDialogOpen(false);
  }

  function focusComposer() {
    composerRef.current?.focus();
  }

  function handleScrollRegionScroll() {
    const scrollRegion = scrollRegionRef.current;

    if (!scrollRegion) {
      return;
    }

    if (suppressScrollTrackingRef.current) {
      lastKnownScrollTopRef.current = scrollRegion.scrollTop;
      return;
    }

    const nextScrollTop = scrollRegion.scrollTop;
    const previousScrollTop = lastKnownScrollTopRef.current;
    lastKnownScrollTopRef.current = nextScrollTop;

    if (isScrollRegionNearBottom(scrollRegion)) {
      if (!isScrollFollowingLatest) {
        setIsScrollFollowingLatest(true);
      }
      lastSeenTimelineActivityRef.current = latestActivitySignature;
      setHasNewerActivityBelow(false);
      return;
    }

    if (
      isScrollFollowingLatest &&
      nextScrollTop < previousScrollTop - SCROLL_FOLLOW_SUSPEND_DELTA_PX
    ) {
      setIsScrollFollowingLatest(false);
      setHasNewerActivityBelow(lastSeenTimelineActivityRef.current !== latestActivitySignature);
      return;
    }

    if (!isScrollFollowingLatest) {
      setHasNewerActivityBelow(lastSeenTimelineActivityRef.current !== latestActivitySignature);
    }
  }

  function jumpToLatestActivity() {
    setIsScrollFollowingLatest(true);
    setHasNewerActivityBelow(false);
  }

  function submitComposer() {
    setIsScrollFollowingLatest(true);
    setHasNewerActivityBelow(false);
    onSubmitComposer();
  }

  function feedbackToneClass(tone: ScopedFeedback["tone"] | ThreadFeedbackDescriptor["badgeTone"]) {
    switch (tone) {
      case "success":
        return "success";
      case "warning":
        return "warning";
      case "error":
        return "error";
      default:
        return "info";
    }
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
      <div className={isSidebarMinibar ? "chat-layout sidebar-minibar" : "chat-layout"}>
        <ChatViewNavigation
          backgroundPriorityNotice={backgroundPriorityNotice}
          formatMachineLabel={formatMachineLabel}
          formatTimestamp={formatTimestamp}
          isCreatingWorkspace={isCreatingWorkspace}
          isLoadingThreads={isLoadingThreads}
          isLoadingWorkspaces={isLoadingWorkspaces}
          isNavigationOpen={isNavigationOpen}
          notificationFeedback={effectiveNotificationFeedback}
          onAskCodex={askCodex}
          onCreateWorkspace={onCreateWorkspace}
          onOpenBackgroundPriorityThread={onOpenBackgroundPriorityThread}
          onSelectThread={selectThread}
          onSelectWorkspace={onSelectWorkspace}
          onSidebarModeChange={updateSidebarMode}
          onWorkspaceNameChange={onWorkspaceNameChange}
          selectedThreadId={selectedThreadId}
          sidebarMode={sidebarMode}
          threadListFeedback={threadListFeedback}
          threads={threads}
          workspaceId={workspaceId}
          workspaceFeedback={workspaceFeedback}
          workspaceName={workspaceName}
          workspaces={workspaces}
        />

        <section aria-label="Thread View" className="chat-panel workspace-card thread-view-card">
          <div className="thread-view-header-stack">
            <header>
              <div className="thread-context-row">
                <div className="thread-context-copy">
                  {showThreadContextLabel ? (
                    <p className="thread-context-label">{threadContextLabel}</p>
                  ) : null}
                  <h2 title={threadHeading}>{threadHeading}</h2>
                </div>
                <div className="thread-context-actions">
                  <button
                    aria-expanded={isSettingsDialogOpen}
                    aria-haspopup="dialog"
                    aria-label="Settings"
                    className="secondary-link compact-link icon-button settings-button"
                    onClick={openSettingsDialog}
                    ref={settingsButtonRef}
                    title="Settings"
                    type="button"
                  >
                    <SecondaryIcon>
                      <SettingsGlyph />
                    </SecondaryIcon>
                  </button>
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
            {isSettingsDialogOpen ? (
              <div className="settings-dialog-overlay">
                <div
                  aria-labelledby="thread-view-settings-title"
                  aria-modal="true"
                  className="settings-dialog"
                  ref={settingsDialogRef}
                  role="dialog"
                >
                  <div className="settings-dialog-header">
                    <div className="settings-dialog-copy">
                      <p className="thread-context-label">Thread View preferences</p>
                      <h3 id="thread-view-settings-title">Settings</h3>
                    </div>
                    <button
                      aria-label="Close settings"
                      className="secondary-link compact-link icon-button settings-close-button"
                      onClick={closeSettingsDialog}
                      ref={settingsCloseButtonRef}
                      title="Close settings"
                      type="button"
                    >
                      <SecondaryIcon>
                        <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
                          <title>Close settings</title>
                          <path
                            d="m6 6 12 12"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                          />
                          <path
                            d="M18 6 6 18"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                          />
                        </svg>
                      </SecondaryIcon>
                    </button>
                  </div>
                  <div className="settings-dialog-sections">
                    <fieldset className="settings-fieldset">
                      <legend className="settings-legend">Theme</legend>
                      <p className="settings-description">
                        Change the Thread View color theme immediately.
                      </p>
                      <div className="settings-option-grid">
                        <label
                          className="composer-mode-option settings-option"
                          data-active={theme === "dark" ? "true" : "false"}
                        >
                          <input
                            checked={theme === "dark"}
                            className="composer-mode-input"
                            name="thread-view-theme"
                            onChange={() => setTheme("dark")}
                            type="radio"
                            value="dark"
                          />
                          <span className="composer-mode-option-label">Dark</span>
                          <span className="composer-mode-option-value">Default fallback theme</span>
                        </label>
                        <label
                          className="composer-mode-option settings-option"
                          data-active={theme === "light" ? "true" : "false"}
                        >
                          <input
                            checked={theme === "light"}
                            className="composer-mode-input"
                            name="thread-view-theme"
                            onChange={() => setTheme("light")}
                            type="radio"
                            value="light"
                          />
                          <span className="composer-mode-option-label">Light</span>
                          <span className="composer-mode-option-value">
                            Brighter surface contrast
                          </span>
                        </label>
                      </div>
                    </fieldset>
                    <fieldset className="settings-fieldset">
                      <legend className="settings-legend">Enter to send</legend>
                      <p className="settings-description">
                        Choose how Enter behaves in the composer.
                      </p>
                      <div className="settings-option-grid">
                        <label
                          className="composer-mode-option settings-option"
                          data-active={composerKeybindingMode === "chat" ? "true" : "false"}
                          title="Chat mode: Enter sends and Shift+Enter adds a new line."
                        >
                          <input
                            checked={composerKeybindingMode === "chat"}
                            className="composer-mode-input"
                            name="composer-keybinding-mode"
                            onChange={() => updateComposerKeybindingMode("chat")}
                            type="radio"
                            value="chat"
                          />
                          <span className="composer-mode-option-label">Chat</span>
                          <span className="composer-mode-option-value">Enter sends</span>
                        </label>
                        <label
                          className="composer-mode-option settings-option"
                          data-active={composerKeybindingMode === "editor" ? "true" : "false"}
                          title="Editor mode: Enter adds a new line and Ctrl+Enter or Meta+Enter sends."
                        >
                          <input
                            checked={composerKeybindingMode === "editor"}
                            className="composer-mode-input"
                            name="composer-keybinding-mode"
                            onChange={() => updateComposerKeybindingMode("editor")}
                            type="radio"
                            value="editor"
                          />
                          <span className="composer-mode-option-label">Editor</span>
                          <span className="composer-mode-option-value">Cmd/Ctrl+Enter sends</span>
                        </label>
                      </div>
                    </fieldset>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="thread-feedback-stack">
              {threadFeedback.isVisible ? (
                <section
                  aria-live="polite"
                  className={`thread-feedback-card ${feedbackToneClass(threadFeedback.badgeTone)}`}
                  role="status"
                >
                  <div className="thread-feedback-copy">
                    <strong>{threadFeedback.title}</strong>
                    <p>{threadFeedback.summary}</p>
                  </div>
                  {threadFeedback.actions.length > 0 ? (
                    <div className="workspace-actions thread-feedback-actions">
                      {threadFeedback.actions.map((action) => renderThreadFeedbackAction(action))}
                    </div>
                  ) : null}
                </section>
              ) : null}
              {effectiveThreadViewFeedback ? (
                <p
                  aria-live={effectiveThreadViewFeedback.tone === "error" ? "assertive" : "polite"}
                  className={`feedback-note thread-surface-feedback ${feedbackToneClass(effectiveThreadViewFeedback.tone)}`}
                  role={effectiveThreadViewFeedback.tone === "error" ? "alert" : "status"}
                >
                  {effectiveThreadViewFeedback.message}
                </p>
              ) : null}
              {effectiveRequestFeedback ? (
                <p
                  aria-live={effectiveRequestFeedback.tone === "error" ? "assertive" : "polite"}
                  className={`feedback-note request-surface-feedback ${feedbackToneClass(effectiveRequestFeedback.tone)}`}
                  role={effectiveRequestFeedback.tone === "error" ? "alert" : "status"}
                >
                  {effectiveRequestFeedback.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="thread-view-body">
            <div className="thread-view-scroll-stack">
              <div
                className="thread-view-scroll-region"
                onScroll={handleScrollRegionScroll}
                ref={scrollRegionRef}
              >
                <div className="thread-view-readable-column">
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

                  <ChatViewTimeline
                    expandedRowIds={expandedTimelineRows}
                    formatTimestamp={formatTimestamp}
                    groups={timelineGroups}
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
              </div>
              {showJumpToLatestActivity ? (
                <div className="thread-view-jump-pill" role="status">
                  <button
                    className="secondary-link action-button compact-button"
                    onClick={jumpToLatestActivity}
                    type="button"
                  >
                    Jump to latest activity
                  </button>
                </div>
              ) : null}
            </div>

            <div className="thread-mobile-footer-actions thread-view-readable-column">
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

            <div className="thread-view-readable-column">
              <ChatViewComposer
                composerDraft={composerDraft}
                composerFeedback={effectiveComposerFeedback}
                composerInputLabel={composerInputLabel}
                composerKeybindingMode={composerKeybindingMode}
                composerPlaceholder={composerPlaceholder}
                composerStatusSegments={
                  selectedWorkspace?.workspace_name ? [selectedWorkspace.workspace_name] : []
                }
                composerSubmitLabel={composerSubmitLabel}
                isComposerDisabled={isComposerDisabled}
                isStartingThread={isStartingThread}
                isTextareaDisabled={isComposerTextareaDisabled}
                onComposerDraftChange={onComposerDraftChange}
                onSubmitComposer={submitComposer}
                textareaRef={composerRef}
              />
            </div>
          </div>
        </section>

        {detailSelection ? (
          <ChatViewDetails
            composerGuidance={unavailableReason}
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
            timelineGroups={detailTimelineModel.groups}
            refreshHref={refreshHref}
            streamStateLabel={
              connectionState === "live"
                ? "Live"
                : connectionState === "reconnecting"
                  ? "Reconnecting"
                  : "Idle"
            }
            workspaceId={workspaceId}
          />
        ) : null}
      </div>
    </main>
  );
}
