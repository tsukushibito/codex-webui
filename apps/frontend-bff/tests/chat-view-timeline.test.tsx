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

  it("renders grouped timeline rows with preserved labels, classes, timestamps, and detail action", () => {
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
    expect(markup).toContain('class="timeline-row timeline-row-primary timeline-row-assistant"');
    expect(markup).toContain("Live");
    expect(markup).toContain("formatted:2026-03-27T05:21:00Z");
    expect(markup).toContain("Inspect approval context");
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
                showRequestDetailButton: true,
                showResponseActions: true,
              },
            },
          })}
        />,
      );
    });

    expect(container.textContent).toContain("Pending request");

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
});
