// @vitest-environment jsdom

import type React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatViewTimeline } from "../src/chat-view-timeline";
import type { TimelineDisplayGroup } from "../src/timeline-display-model";

function formatTimestamp(value: string | null) {
  return value ? `formatted:${value}` : "Not available";
}

function buildTimelineProps(
  overrides: Partial<React.ComponentProps<typeof ChatViewTimeline>> = {},
) {
  return {
    expandedRowIds: new Set<string>(),
    formatTimestamp,
    groups: [] as TimelineDisplayGroup[],
    hasLoadedThreadView: true,
    isLoadingThread: false,
    isRespondingToRequest: false,
    onApproveRequest: () => {},
    onDenyRequest: () => {},
    onOpenDetail: () => {},
    onOpenRequestDetail: () => {},
    onToggleRowExpansion: () => {},
    requestRowContexts: {},
    selectedThreadId: "thread_001",
    ...overrides,
  };
}

describe("ChatViewTimeline", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders grouped timeline rows without visible turn labels while preserving internal turn metadata", async () => {
    const groups: TimelineDisplayGroup[] = [
      {
        id: "group-turn-001",
        turnId: "turn_001",
        rows: [
          {
            id: "row-live",
            turnId: "turn_001",
            itemId: null,
            requestId: null,
            requestState: null,
            sequence: 1,
            occurredAt: "2026-03-27T05:20:00Z",
            label: "Codex",
            content: "Streaming answer",
            density: "primary",
            role: "assistant",
            tone: "codex",
            timelineItemId: null,
            isLive: true,
            defaultFoldEligible: false,
            showDetailButton: false,
            detailActionLabel: null,
          },
          {
            id: "row-detail",
            turnId: "turn_001",
            itemId: "item_approval_001",
            requestId: "req_001",
            requestState: "pending",
            sequence: 2,
            occurredAt: "2026-03-27T05:21:00Z",
            label: "Request needs attention",
            content: "Approval required",
            density: "prominent",
            role: "event",
            tone: "request",
            timelineItemId: "timeline_002",
            isLive: false,
            defaultFoldEligible: false,
            showDetailButton: true,
            detailActionLabel: "Inspect approval context",
          },
        ],
      },
    ];

    const markup = renderToStaticMarkup(<ChatViewTimeline {...buildTimelineProps({ groups })} />);

    expect(markup).toContain('aria-label="Timeline"');
    expect(markup).toContain('class="timeline-turn-group"');
    expect(markup).toContain('data-turn-id="turn_001"');
    expect(markup).not.toContain("timeline-turn-label");
    expect(markup).toContain(
      'class="timeline-row timeline-row-primary timeline-row-assistant timeline-row-tone-codex"',
    );
    expect(markup).toContain(
      'class="timeline-row timeline-row-prominent timeline-row-event timeline-row-tone-request"',
    );
    expect(markup).toContain("Streaming");
    expect(markup).toContain("Codex is streaming progress in this assistant row.");
    expect(markup).toContain("formatted:2026-03-27T05:21:00Z");
    expect(markup).toContain("Inspect approval context");

    await act(async () => {
      root.render(<ChatViewTimeline {...buildTimelineProps({ groups })} />);
    });

    expect(container.querySelector("[data-turn-id='turn_001']")).not.toBeNull();
    expect(container.querySelector(".timeline-turn-label")).toBeNull();
    expect(container.textContent).not.toContain("turn_001");
    expect(container.textContent).not.toContain("Turn");
  });

  it("renders no loading or empty-state text when the simplified timeline has no visible rows", () => {
    const markup = renderToStaticMarkup(
      <ChatViewTimeline {...buildTimelineProps({ groups: [] })} />,
    );

    expect(markup).not.toContain("Preparing thread view");
    expect(markup).not.toContain("Opening this thread and restoring its latest timeline");
    expect(markup).not.toContain("No timeline items yet");
    expect(markup).not.toContain("empty-state");
  });

  it("renders live assistant rows with inline streaming status and leaves completed assistant rows timestamped", async () => {
    const groups: TimelineDisplayGroup[] = [
      {
        id: "group-turn-001",
        turnId: "turn_001",
        rows: [
          {
            id: "row-live-assistant",
            turnId: "turn_001",
            itemId: null,
            requestId: null,
            requestState: null,
            sequence: 1,
            occurredAt: "2026-03-27T05:20:00Z",
            label: "Codex",
            content: "Streaming answer",
            density: "primary",
            role: "assistant",
            tone: "codex",
            timelineItemId: null,
            isLive: true,
            defaultFoldEligible: false,
            showDetailButton: false,
            detailActionLabel: null,
          },
          {
            id: "row-completed-assistant",
            turnId: "turn_001",
            itemId: null,
            requestId: null,
            requestState: null,
            sequence: 2,
            occurredAt: "2026-03-27T05:21:00Z",
            label: "Codex",
            content: "Final answer",
            density: "primary",
            role: "assistant",
            tone: "codex",
            timelineItemId: null,
            isLive: false,
            defaultFoldEligible: false,
            showDetailButton: false,
            detailActionLabel: null,
          },
        ],
      },
    ];

    await act(async () => {
      root.render(<ChatViewTimeline {...buildTimelineProps({ groups })} />);
    });

    const liveStatus = container.querySelector(".timeline-row-live-status");
    expect(liveStatus?.textContent).toContain("Streaming");
    expect(container.querySelector(".timeline-row-live-status .sr-only")?.textContent).toContain(
      "Codex is streaming progress in this assistant row.",
    );
    expect(container.querySelectorAll(".timeline-row-live-status")).toHaveLength(1);
    expect(container.textContent).toContain("formatted:2026-03-27T05:21:00Z");
  });

  it("renders an empty live assistant placeholder row with the same in-row streaming status", () => {
    const groups: TimelineDisplayGroup[] = [
      {
        id: "group-turn-001",
        turnId: "turn_001",
        rows: [
          {
            id: "row-live-placeholder",
            turnId: "turn_001",
            itemId: null,
            requestId: null,
            requestState: null,
            sequence: 1,
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
          },
        ],
      },
    ];

    const markup = renderToStaticMarkup(<ChatViewTimeline {...buildTimelineProps({ groups })} />);

    expect(markup).toContain("timeline-row-live-placeholder");
    expect(markup).toContain("Codex is responding");
    expect(markup).toContain("Streaming");
    expect(markup).toContain("Codex is streaming progress in this assistant row.");
  });

  it("keeps live and completed assistant groups on the same outer timeline structure", async () => {
    const liveGroups: TimelineDisplayGroup[] = [
      {
        id: "group-turn-live",
        turnId: "turn_001",
        rows: [
          {
            id: "row-live-assistant",
            turnId: "turn_001",
            itemId: null,
            requestId: null,
            requestState: null,
            sequence: 1,
            occurredAt: "2026-03-27T05:20:00Z",
            label: "Codex",
            content: "Streaming answer",
            density: "primary",
            role: "assistant",
            tone: "codex",
            timelineItemId: null,
            isLive: true,
            defaultFoldEligible: false,
            showDetailButton: false,
            detailActionLabel: null,
          },
        ],
      },
    ];
    const completedGroups: TimelineDisplayGroup[] = [
      {
        ...liveGroups[0],
        rows: [
          {
            ...liveGroups[0].rows[0],
            id: "row-completed-assistant",
            content: "Final answer",
            isLive: false,
          },
        ],
      },
    ];

    await act(async () => {
      root.render(<ChatViewTimeline {...buildTimelineProps({ groups: liveGroups })} />);
    });

    const liveGroup = container.querySelector(".timeline-turn-group");
    const liveRow = container.querySelector(".timeline-row");
    expect(liveGroup?.children).toHaveLength(1);
    expect(liveGroup?.firstElementChild).toBe(liveRow);
    expect(container.querySelector(".timeline-turn-label")).toBeNull();

    await act(async () => {
      root.render(<ChatViewTimeline {...buildTimelineProps({ groups: completedGroups })} />);
    });

    const completedGroup = container.querySelector(".timeline-turn-group");
    const completedRow = container.querySelector(".timeline-row");
    expect(completedGroup?.children).toHaveLength(1);
    expect(completedGroup?.firstElementChild).toBe(completedRow);
    expect(container.querySelector(".timeline-turn-label")).toBeNull();
  });

  it("renders muted system rows and error rows with their semantic tone classes", () => {
    const groups: TimelineDisplayGroup[] = [
      {
        id: "group-system",
        turnId: null,
        rows: [
          {
            id: "row-system",
            turnId: null,
            itemId: null,
            requestId: null,
            requestState: null,
            sequence: 1,
            occurredAt: "2026-03-27T05:19:00Z",
            label: "Status update",
            content: "running",
            density: "compact",
            role: "event",
            tone: "muted",
            timelineItemId: null,
            isLive: false,
            defaultFoldEligible: false,
            showDetailButton: false,
            detailActionLabel: null,
          },
          {
            id: "row-error",
            turnId: null,
            itemId: null,
            requestId: null,
            requestState: null,
            sequence: 2,
            occurredAt: "2026-03-27T05:19:30Z",
            label: "System error",
            content: "failed",
            density: "prominent",
            role: "event",
            tone: "error",
            timelineItemId: null,
            isLive: false,
            defaultFoldEligible: false,
            showDetailButton: false,
            detailActionLabel: null,
          },
        ],
      },
    ];

    const markup = renderToStaticMarkup(<ChatViewTimeline {...buildTimelineProps({ groups })} />);

    expect(markup).toContain(
      'class="timeline-row timeline-row-compact timeline-row-event timeline-row-tone-muted"',
    );
    expect(markup).toContain(
      'class="timeline-row timeline-row-prominent timeline-row-event timeline-row-tone-error"',
    );
  });

  it("keeps long primary conversation rows expanded by default", async () => {
    const longContent = Array.from({ length: 10 }, (_, index) => `Line ${index + 1}`).join("\n");
    const groups: TimelineDisplayGroup[] = [
      {
        id: "group-turn-001",
        turnId: "turn_001",
        rows: [
          {
            id: "row-folded",
            turnId: "turn_001",
            itemId: null,
            requestId: null,
            requestState: null,
            sequence: 1,
            occurredAt: "2026-03-27T05:20:00Z",
            label: "You",
            content: longContent,
            density: "primary",
            role: "user",
            tone: "user",
            timelineItemId: null,
            isLive: false,
            defaultFoldEligible: false,
            showDetailButton: false,
            detailActionLabel: null,
          },
        ],
      },
    ];
    const onToggleRowExpansion = vi.fn();

    await act(async () => {
      root.render(<ChatViewTimeline {...buildTimelineProps({ groups, onToggleRowExpansion })} />);
    });

    expect(container.querySelector("button[aria-expanded]")).toBeNull();
    expect(container.querySelector(".timeline-row-folded")).toBeNull();
    expect(container.querySelector(".timeline-row-tone-user")).not.toBeNull();
    expect(container.textContent).toContain("Line 10");
    expect(onToggleRowExpansion).not.toHaveBeenCalled();
  });

  it("preserves folded row affordance and aria-expanded state for secondary payload rows", async () => {
    const longContent = Array.from({ length: 10 }, (_, index) => `Line ${index + 1}`).join("\n");
    const groups: TimelineDisplayGroup[] = [
      {
        id: "group-turn-001",
        turnId: "turn_001",
        rows: [
          {
            id: "row-folded",
            turnId: "turn_001",
            itemId: null,
            requestId: null,
            requestState: null,
            sequence: 1,
            occurredAt: "2026-03-27T05:20:00Z",
            label: "Tool activity",
            content: longContent,
            density: "compact",
            role: "event",
            tone: "tool",
            timelineItemId: null,
            isLive: false,
            defaultFoldEligible: true,
            showDetailButton: false,
            detailActionLabel: null,
          },
        ],
      },
    ];
    const onToggleRowExpansion = vi.fn();

    await act(async () => {
      root.render(<ChatViewTimeline {...buildTimelineProps({ groups, onToggleRowExpansion })} />);
    });

    const foldedToggle = container.querySelector(
      'button[aria-expanded="false"]',
    ) as HTMLButtonElement | null;
    expect(foldedToggle?.textContent).toBe("Show more");
    expect(foldedToggle?.getAttribute("aria-label")).toBe("Expand Tool activity content");
    expect(container.querySelector(".timeline-row-tone-tool")).not.toBeNull();
    expect(container.querySelector(".timeline-row-folded")).not.toBeNull();

    await act(async () => {
      foldedToggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onToggleRowExpansion).toHaveBeenCalledWith("row-folded");

    await act(async () => {
      root.render(
        <ChatViewTimeline
          {...buildTimelineProps({
            expandedRowIds: new Set(["row-folded"]),
            groups,
            onToggleRowExpansion,
          })}
        />,
      );
    });

    const expandedToggle = container.querySelector(
      'button[aria-expanded="true"]',
    ) as HTMLButtonElement | null;
    expect(expandedToggle?.textContent).toBe("Show less");
    expect(expandedToggle?.getAttribute("aria-label")).toBe("Collapse Tool activity content");
    expect(container.querySelector(".timeline-row-folded")).toBeNull();
  });

  it("calls the detail callback with the row timeline item id", async () => {
    const onOpenDetail = vi.fn();
    const groups: TimelineDisplayGroup[] = [
      {
        id: "group-ungrouped",
        turnId: null,
        rows: [
          {
            id: "row-detail",
            turnId: null,
            itemId: null,
            requestId: null,
            requestState: null,
            sequence: 1,
            occurredAt: "2026-03-27T05:21:00Z",
            label: "Tool activity",
            content: "Ran a command",
            density: "compact",
            role: "event",
            tone: "tool",
            timelineItemId: "timeline_detail_001",
            isLive: false,
            defaultFoldEligible: false,
            showDetailButton: true,
            detailActionLabel: "Inspect details",
          },
        ],
      },
    ];

    await act(async () => {
      root.render(<ChatViewTimeline {...buildTimelineProps({ groups, onOpenDetail })} />);
    });

    const detailButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Inspect details",
    );

    await act(async () => {
      detailButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onOpenDetail).toHaveBeenCalledWith("timeline_detail_001");
  });

  it("renders pending request controls directly on the matching timeline row", async () => {
    const onApproveRequest = vi.fn();
    const onDenyRequest = vi.fn();
    const onOpenRequestDetail = vi.fn();
    const groups: TimelineDisplayGroup[] = [
      {
        id: "group-turn-approval",
        turnId: "turn_approval",
        rows: [
          {
            id: "row-request",
            turnId: "turn_approval",
            itemId: "item_approval_001",
            requestId: "req_001",
            requestState: "pending",
            sequence: 4,
            occurredAt: "2026-03-27T05:24:00Z",
            label: "Request needs attention",
            content: "Push requires approval",
            density: "prominent",
            role: "event",
            tone: "request",
            timelineItemId: "timeline_request_001",
            isLive: false,
            defaultFoldEligible: false,
            showDetailButton: true,
            detailActionLabel: "Inspect request",
          },
        ],
      },
    ];

    await act(async () => {
      root.render(
        <ChatViewTimeline
          {...buildTimelineProps({
            groups,
            onApproveRequest,
            onDenyRequest,
            onOpenRequestDetail,
            requestRowContexts: {
              "row-request": {
                state: "pending",
                badgeClassName: "status-badge warning",
                badgeLabel: "Pending request",
                requestSummary: "Run git push",
                requestReason: "Codex requests permission to push changes to remote.",
                requestOperationSummary: "git push origin main",
                showRequestDetailButton: true,
                showResponseActions: true,
              },
            },
          })}
        />,
      );
    });

    expect(container.textContent).toContain("Pending request");
    expect(container.textContent).toContain("Request summary");
    expect(container.textContent).toContain("Run git push");
    expect(container.textContent).toContain("Reason");
    expect(container.textContent).toContain("Codex requests permission to push changes to remote.");
    expect(container.textContent).toContain("Operation");
    expect(container.textContent).toContain("git push origin main");

    const approveButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Approve request",
    );
    const denyButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Deny request",
    );
    const requestDetailButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Request detail",
    );

    await act(async () => {
      approveButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      denyButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      requestDetailButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onApproveRequest).toHaveBeenCalledTimes(1);
    expect(onDenyRequest).toHaveBeenCalledTimes(1);
    expect(onOpenRequestDetail).toHaveBeenCalledTimes(1);
  });

  it("keeps resolved request rows compact and action-free", async () => {
    const groups: TimelineDisplayGroup[] = [
      {
        id: "group-turn-resolved",
        turnId: "turn_resolved",
        rows: [
          {
            id: "row-request",
            turnId: "turn_resolved",
            itemId: "item_approval_001",
            requestId: "req_001",
            requestState: "resolved",
            sequence: 4,
            occurredAt: "2026-03-27T05:24:00Z",
            label: "Request resolved",
            content: "Push request was approved",
            density: "compact",
            role: "event",
            tone: "request",
            timelineItemId: "timeline_request_001",
            isLive: false,
            defaultFoldEligible: false,
            showDetailButton: true,
            detailActionLabel: "Inspect request",
          },
        ],
      },
    ];

    await act(async () => {
      root.render(
        <ChatViewTimeline
          {...buildTimelineProps({
            groups,
            requestRowContexts: {
              "row-request": {
                state: "resolved",
                badgeClassName: "status-badge success",
                badgeLabel: "Resolved: approved",
                requestSummary: "Run git push",
                requestReason: null,
                requestOperationSummary: null,
                showRequestDetailButton: true,
                showResponseActions: false,
              },
            },
          })}
        />,
      );
    });

    expect(container.textContent).toContain("Resolved: approved");
    expect(container.textContent).toContain("Inspect request");
    expect(container.querySelector(".timeline-request-inline-details")).toBeNull();
    expect(container.textContent).not.toContain("Approve request");
    expect(container.textContent).not.toContain("Deny request");
  });
});
