import { describe, expect, it } from "vitest";
import type { PublicThreadStreamEvent, PublicTimelineItem } from "../src/thread-types";
import { buildTimelineDisplayModel, classifyTimelineDensity } from "../src/timeline-display-model";

function timelineItem(overrides: Partial<PublicTimelineItem>): PublicTimelineItem {
  return {
    timeline_item_id: "timeline_001",
    thread_id: "thread_001",
    turn_id: null,
    item_id: null,
    sequence: 1,
    occurred_at: "2026-03-27T05:20:00Z",
    kind: "message.user",
    payload: {
      content: "Start",
    },
    ...overrides,
  };
}

function streamEvent(overrides: Partial<PublicThreadStreamEvent>): PublicThreadStreamEvent {
  return {
    event_id: "stream_001",
    thread_id: "thread_001",
    event_type: "message.assistant.delta",
    sequence: 1,
    occurred_at: "2026-03-27T05:20:01Z",
    payload: {
      message_id: "message_001",
      delta: "Hello",
    },
    ...overrides,
  };
}

function rows(model: ReturnType<typeof buildTimelineDisplayModel>) {
  return model.groups.flatMap((group) => group.rows);
}

describe("timeline display model", () => {
  it("merges assistant deltas for the same assistant key into one live item in sequence order", () => {
    const model = buildTimelineDisplayModel({
      timelineItems: [],
      streamEvents: [
        streamEvent({
          event_id: "delta_002",
          sequence: 2,
          payload: {
            message_id: "message_001",
            delta: "there",
          },
        }),
        streamEvent({
          event_id: "delta_001",
          sequence: 1,
          payload: {
            message_id: "message_001",
            delta: "Hi ",
          },
        }),
      ],
      draftAssistantMessages: {},
    });

    const modelRows = rows(model);
    expect(modelRows).toHaveLength(1);
    expect(modelRows[0]).toMatchObject({
      label: "Codex is responding",
      content: "Hi there...",
      density: "primary",
      role: "assistant",
      isLive: true,
    });
  });

  it("replaces a live assistant draft on completion and dedupes after REST convergence", () => {
    const streamEvents: PublicThreadStreamEvent[] = [
      streamEvent({
        event_id: "delta_001",
        sequence: 1,
        payload: {
          message_id: "message_001",
          delta: "Partial",
        },
      }),
      streamEvent({
        event_id: "completed_001",
        event_type: "message.assistant.completed",
        sequence: 2,
        payload: {
          message_id: "message_001",
          content: "Final answer.",
        },
      }),
    ];

    const beforeRest = buildTimelineDisplayModel({
      timelineItems: [],
      streamEvents,
      draftAssistantMessages: {
        message_001: "Partial",
      },
    });
    expect(rows(beforeRest)).toHaveLength(1);
    expect(rows(beforeRest)[0]).toMatchObject({
      label: "Codex",
      content: "Final answer.",
      isLive: false,
    });

    const afterRest = buildTimelineDisplayModel({
      timelineItems: [
        timelineItem({
          timeline_item_id: "timeline_completed",
          item_id: "item_assistant_001",
          sequence: 2,
          kind: "message.assistant.completed",
          payload: {
            message_id: "message_001",
            content: "Final answer.",
          },
        }),
      ],
      streamEvents,
      draftAssistantMessages: {
        message_001: "Partial",
      },
    });

    const convergedRows = rows(afterRest);
    expect(convergedRows).toHaveLength(1);
    expect(convergedRows[0]).toMatchObject({
      id: "timeline:timeline_completed",
      content: "Final answer.",
    });
  });

  it("groups adjacent timeline rows by turn_id without grouping rows that lack turn_id", () => {
    const model = buildTimelineDisplayModel({
      timelineItems: [
        timelineItem({
          timeline_item_id: "user_001",
          turn_id: "turn_001",
          sequence: 1,
          kind: "message.user",
          payload: {
            content: "Explain this diff.",
          },
        }),
        timelineItem({
          timeline_item_id: "assistant_001",
          turn_id: "turn_001",
          sequence: 2,
          kind: "message.assistant.completed",
          payload: {
            content: "The diff changes the UI.",
          },
        }),
        timelineItem({
          timeline_item_id: "status_001",
          turn_id: null,
          sequence: 3,
          kind: "session.status_changed",
          payload: {
            summary: "idle",
          },
        }),
      ],
      streamEvents: [],
      draftAssistantMessages: {},
    });

    expect(model.groups).toHaveLength(2);
    expect(model.groups[0]?.turnId).toBe("turn_001");
    expect(model.groups[0]?.rows.map((row) => row.id)).toEqual([
      "timeline:user_001",
      "timeline:assistant_001",
    ]);
    expect(model.groups[1]?.turnId).toBeNull();
    expect(model.groups[1]?.rows).toHaveLength(1);
  });

  it("classifies primary messages, prominent approval/error/file rows, and compact operational rows", () => {
    expect(classifyTimelineDensity("message.user")).toBe("primary");
    expect(classifyTimelineDensity("message.assistant.completed")).toBe("primary");
    expect(classifyTimelineDensity("approval.requested")).toBe("prominent");
    expect(classifyTimelineDensity("error.raised")).toBe("prominent");
    expect(classifyTimelineDensity("file.changed")).toBe("prominent");
    expect(classifyTimelineDensity("session.status_changed")).toBe("compact");
    expect(classifyTimelineDensity("tool.started")).toBe("compact");
    expect(classifyTimelineDensity("command.output")).toBe("compact");
  });

  it("renders low-priority stream events as compact rows instead of separate raw event cards", () => {
    const model = buildTimelineDisplayModel({
      timelineItems: [],
      streamEvents: [
        streamEvent({
          event_id: "status_001",
          event_type: "session.status_changed",
          sequence: 4,
          payload: {
            summary: "Running tool",
          },
        }),
      ],
      draftAssistantMessages: {},
    });

    expect(rows(model)).toEqual([
      expect.objectContaining({
        id: "stream:status_001",
        label: "Status update",
        content: "Running tool",
        density: "compact",
      }),
    ]);
  });

  it("uses user-facing labels instead of raw event or item kinds in primary timeline rows", () => {
    const model = buildTimelineDisplayModel({
      timelineItems: [
        timelineItem({
          timeline_item_id: "user_001",
          kind: "message.user",
          payload: {
            content: "Run the checks.",
          },
        }),
        timelineItem({
          timeline_item_id: "request_001",
          sequence: 2,
          kind: "approval.requested",
          payload: {
            summary: "Approve git push",
          },
        }),
        timelineItem({
          timeline_item_id: "failure_001",
          sequence: 3,
          kind: "turn.failed",
          payload: {
            summary: "Command failed",
          },
        }),
      ],
      streamEvents: [],
      draftAssistantMessages: {},
    });

    expect(rows(model).map((row) => row.label)).toEqual([
      "You",
      "Request needs attention",
      "Turn failed",
    ]);
  });
});
