// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatViewTimeline } from "../src/chat-view-timeline";
import type { TimelineDisplayGroup } from "../src/timeline-display-model";

function formatTimestamp(value: string | null) {
  return value ? `formatted:${value}` : "Not available";
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
            sequence: 1,
            occurredAt: "2026-03-27T05:20:00Z",
            label: "Codex",
            content: "Streaming answer",
            density: "primary",
            role: "assistant",
            timelineItemId: null,
            isLive: true,
            showDetailButton: false,
            detailActionLabel: null,
          },
          {
            id: "row-detail",
            turnId: "turn_001",
            sequence: 2,
            occurredAt: "2026-03-27T05:21:00Z",
            label: "Request needs attention",
            content: "Approval required",
            density: "prominent",
            role: "event",
            timelineItemId: "timeline_002",
            isLive: false,
            showDetailButton: true,
            detailActionLabel: "Inspect approval context",
          },
        ],
      },
    ];

    const markup = renderToStaticMarkup(
      <ChatViewTimeline
        expandedRowIds={new Set()}
        formatTimestamp={formatTimestamp}
        groups={groups}
        hasLoadedThreadView
        isLoadingThread={false}
        onOpenDetail={() => {}}
        onToggleRowExpansion={() => {}}
        selectedThreadId="thread_001"
      />,
    );

    expect(markup).toContain('aria-label="Timeline"');
    expect(markup).toContain('class="timeline-turn-group"');
    expect(markup).toContain('data-turn-id="turn_001"');
    expect(markup).toContain('class="timeline-row timeline-row-primary timeline-row-assistant"');
    expect(markup).toContain("Live");
    expect(markup).toContain("formatted:2026-03-27T05:21:00Z");
    expect(markup).toContain("Inspect approval context");
  });

  it("preserves folded row affordance and aria-expanded state from props", async () => {
    const longContent = Array.from({ length: 10 }, (_, index) => `Line ${index + 1}`).join("\n");
    const groups: TimelineDisplayGroup[] = [
      {
        id: "group-turn-001",
        turnId: "turn_001",
        rows: [
          {
            id: "row-folded",
            turnId: "turn_001",
            sequence: 1,
            occurredAt: "2026-03-27T05:20:00Z",
            label: "You",
            content: longContent,
            density: "primary",
            role: "user",
            timelineItemId: null,
            isLive: false,
            showDetailButton: false,
            detailActionLabel: null,
          },
        ],
      },
    ];
    const onToggleRowExpansion = vi.fn();

    await act(async () => {
      root.render(
        <ChatViewTimeline
          expandedRowIds={new Set()}
          formatTimestamp={formatTimestamp}
          groups={groups}
          hasLoadedThreadView
          isLoadingThread={false}
          onOpenDetail={() => {}}
          onToggleRowExpansion={onToggleRowExpansion}
          selectedThreadId="thread_001"
        />,
      );
    });

    const foldedToggle = container.querySelector(
      'button[aria-expanded="false"]',
    ) as HTMLButtonElement | null;
    expect(foldedToggle?.textContent).toBe("Show more");
    expect(container.querySelector(".timeline-row-folded")).not.toBeNull();

    await act(async () => {
      foldedToggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onToggleRowExpansion).toHaveBeenCalledWith("row-folded");

    await act(async () => {
      root.render(
        <ChatViewTimeline
          expandedRowIds={new Set(["row-folded"])}
          formatTimestamp={formatTimestamp}
          groups={groups}
          hasLoadedThreadView
          isLoadingThread={false}
          onOpenDetail={() => {}}
          onToggleRowExpansion={onToggleRowExpansion}
          selectedThreadId="thread_001"
        />,
      );
    });

    const expandedToggle = container.querySelector(
      'button[aria-expanded="true"]',
    ) as HTMLButtonElement | null;
    expect(expandedToggle?.textContent).toBe("Show less");
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
            sequence: 1,
            occurredAt: "2026-03-27T05:21:00Z",
            label: "Tool activity",
            content: "Ran a command",
            density: "compact",
            role: "event",
            timelineItemId: "timeline_detail_001",
            isLive: false,
            showDetailButton: true,
            detailActionLabel: "Inspect details",
          },
        ],
      },
    ];

    await act(async () => {
      root.render(
        <ChatViewTimeline
          expandedRowIds={new Set()}
          formatTimestamp={formatTimestamp}
          groups={groups}
          hasLoadedThreadView
          isLoadingThread={false}
          onOpenDetail={onOpenDetail}
          onToggleRowExpansion={() => {}}
          selectedThreadId="thread_001"
        />,
      );
    });

    const detailButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Inspect details",
    );

    await act(async () => {
      detailButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onOpenDetail).toHaveBeenCalledWith("timeline_detail_001");
  });
});
