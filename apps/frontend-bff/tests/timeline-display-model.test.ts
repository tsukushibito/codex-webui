import { describe, expect, it } from "vitest";
import type { PublicThreadStreamEvent, PublicTimelineItem } from "../src/thread-types";
import {
  buildTimelineDisplayModel,
  classifyTimelineDensity,
  classifyTimelineTone,
} from "../src/timeline-display-model";
import { getTimelineItemDetail } from "../src/timeline-item-detail";

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
  it("suppresses assistant deltas until completion", () => {
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

    expect(rows(model)).toEqual([]);
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
      id: "timeline-assistant:message_001",
      content: "Final answer.",
    });
  });

  it("prefers stream completion while REST has only stored assistant deltas", () => {
    const model = buildTimelineDisplayModel({
      timelineItems: [
        timelineItem({
          timeline_item_id: "assistant_delta_001",
          item_id: "item_assistant_001",
          sequence: 1,
          kind: "message.assistant.delta",
          payload: {
            message_id: "message_001",
            delta: "Partial",
          },
        }),
      ],
      streamEvents: [
        streamEvent({
          event_id: "completed_001",
          event_type: "message.assistant.completed",
          sequence: 2,
          payload: {
            message_id: "message_001",
            item_id: "item_assistant_001",
            content: "Final answer.",
          },
        }),
      ],
      draftAssistantMessages: {},
    });

    expect(rows(model)).toEqual([
      expect.objectContaining({
        id: "timeline-assistant:message_001",
        content: "Final answer.",
        isLive: false,
      }),
    ]);
  });

  it("suppresses stored and streamed assistant deltas until completion", () => {
    const model = buildTimelineDisplayModel({
      timelineItems: [
        timelineItem({
          timeline_item_id: "assistant_delta_001",
          item_id: "item_assistant_001",
          sequence: 1,
          kind: "message.assistant.delta",
          payload: {
            message_id: "message_001",
            delta: "Partial",
          },
        }),
      ],
      streamEvents: [
        streamEvent({
          event_id: "delta_002",
          event_type: "message.assistant.delta",
          sequence: 2,
          payload: {
            message_id: "message_001",
            item_id: "item_assistant_001",
            delta: "Partial",
          },
        }),
      ],
      draftAssistantMessages: {},
    });

    expect(rows(model)).toEqual([]);
  });

  it("collapses stored assistant deltas and completion into one logical assistant row", () => {
    const model = buildTimelineDisplayModel({
      timelineItems: [
        timelineItem({
          timeline_item_id: "assistant_delta_001",
          item_id: "item_assistant_001",
          turn_id: "turn_001",
          sequence: 2,
          kind: "message.assistant.delta",
          payload: {
            message_id: "message_001",
            delta: "Hi ",
          },
        }),
        timelineItem({
          timeline_item_id: "assistant_delta_002",
          item_id: "item_assistant_001",
          turn_id: "turn_001",
          sequence: 3,
          kind: "message.assistant.delta",
          payload: {
            message_id: "message_001",
            delta: "there",
          },
        }),
        timelineItem({
          timeline_item_id: "assistant_completed_001",
          item_id: "item_assistant_001",
          turn_id: "turn_001",
          sequence: 4,
          kind: "message.assistant.completed",
          payload: {
            message_id: "message_001",
            content: "Hi there",
          },
        }),
      ],
      streamEvents: [],
      draftAssistantMessages: {},
    });

    expect(rows(model)).toEqual([
      expect.objectContaining({
        id: "timeline-assistant:message_001",
        label: "Codex",
        content: "Hi there",
        role: "assistant",
        isLive: false,
        showDetailButton: false,
      }),
    ]);
  });

  it("collapses mapped public REST assistant rows without message_id or item_id into one final row", () => {
    const model = buildTimelineDisplayModel({
      timelineItems: [
        timelineItem({
          timeline_item_id: "assistant_delta_001",
          item_id: null,
          turn_id: null,
          sequence: 2,
          kind: "message.assistant.delta",
          payload: {
            summary: "assistant streaming",
            content: "Hi ",
          },
        }),
        timelineItem({
          timeline_item_id: "assistant_delta_002",
          item_id: null,
          turn_id: null,
          sequence: 3,
          kind: "message.assistant.delta",
          payload: {
            summary: "assistant streaming",
            content: "there",
          },
        }),
        timelineItem({
          timeline_item_id: "assistant_completed_001",
          item_id: null,
          turn_id: null,
          sequence: 4,
          kind: "message.assistant.completed",
          payload: {
            summary: "assistant completed",
            content: "Hi there",
          },
        }),
      ],
      streamEvents: [],
      draftAssistantMessages: {},
    });

    expect(rows(model)).toEqual([
      expect.objectContaining({
        id: "timeline-assistant:assistant_delta_001",
        label: "Codex",
        content: "Hi there",
        role: "assistant",
        isLive: false,
        showDetailButton: false,
      }),
    ]);
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

    expect(model.groups).toHaveLength(1);
    expect(model.groups[0]?.turnId).toBe("turn_001");
    expect(model.groups[0]?.rows.map((row) => row.id)).toEqual([
      "timeline:user_001",
      "timeline-assistant:assistant_001",
    ]);
  });

  it("classifies primary messages, prominent approval/error/file rows, compact operational rows, and semantic tones", () => {
    expect(classifyTimelineDensity("message.user")).toBe("primary");
    expect(classifyTimelineDensity("message.assistant.completed")).toBe("primary");
    expect(classifyTimelineDensity("approval.requested")).toBe("prominent");
    expect(classifyTimelineDensity("error.raised")).toBe("prominent");
    expect(classifyTimelineDensity("file.changed")).toBe("prominent");
    expect(classifyTimelineDensity("session.status_changed")).toBe("compact");
    expect(classifyTimelineDensity("tool.started")).toBe("compact");
    expect(classifyTimelineDensity("command.output")).toBe("compact");

    expect(classifyTimelineTone("message.user", "user", "Start")).toBe("user");
    expect(classifyTimelineTone("message.assistant.completed", "assistant", "Answer")).toBe(
      "codex",
    );
    expect(classifyTimelineTone("approval.requested", "event", "Approval required")).toBe(
      "request",
    );
    expect(classifyTimelineTone("approval.request_failed", "event", "request failed")).toBe(
      "error",
    );
    expect(classifyTimelineTone("tool.output", "event", "stdout")).toBe("tool");
    expect(classifyTimelineTone("turn.failed", "event", "failed")).toBe("error");
    expect(classifyTimelineTone("session.status_changed", "event", "running")).toBe("muted");
  });

  it("hides generic status transitions from the rendered timeline", () => {
    const model = buildTimelineDisplayModel({
      timelineItems: [],
      streamEvents: [
        streamEvent({
          event_id: "status_001",
          event_type: "session.status_changed",
          sequence: 4,
          payload: {
            summary: "thread status changed",
          },
        }),
      ],
      draftAssistantMessages: {},
    });

    expect(rows(model)).toEqual([]);
  });

  it("keeps failed status evidence visible as a compact row without detail action", () => {
    const model = buildTimelineDisplayModel({
      timelineItems: [],
      streamEvents: [
        streamEvent({
          event_id: "status_failed_001",
          event_type: "session.status_changed",
          sequence: 4,
          payload: {
            summary: "failed",
            status: "failed",
          },
        }),
      ],
      draftAssistantMessages: {},
    });

    expect(rows(model)).toEqual([
      expect.objectContaining({
        id: "stream:status_failed_001",
        label: "Status update",
        content: "failed",
        density: "compact",
        role: "event",
        tone: "error",
        showDetailButton: false,
      }),
    ]);
  });

  it("keeps recovery pending status evidence visible as a compact row without detail action", () => {
    const model = buildTimelineDisplayModel({
      timelineItems: [],
      streamEvents: [
        streamEvent({
          event_id: "status_recovery_001",
          event_type: "session.status_changed",
          sequence: 5,
          payload: {
            summary: "recovery pending",
            status: "recovery_pending",
          },
        }),
      ],
      draftAssistantMessages: {},
    });

    expect(rows(model)).toEqual([
      expect.objectContaining({
        id: "stream:status_recovery_001",
        label: "Status update",
        content: "recovery pending",
        density: "compact",
        role: "event",
        tone: "muted",
        showDetailButton: false,
      }),
    ]);
  });

  it("keeps canonical to_status failed evidence visible without summary or status", () => {
    const model = buildTimelineDisplayModel({
      timelineItems: [],
      streamEvents: [
        streamEvent({
          event_id: "status_to_failed_001",
          event_type: "session.status_changed",
          sequence: 6,
          payload: {
            from_status: "running",
            to_status: "failed",
          },
        }),
      ],
      draftAssistantMessages: {},
    });

    expect(rows(model)).toEqual([
      expect.objectContaining({
        id: "stream:status_to_failed_001",
        label: "Status update",
        content: "failed",
        density: "compact",
        role: "event",
        tone: "error",
        showDetailButton: false,
      }),
    ]);
  });

  it("keeps canonical to_status recovery pending evidence visible without summary or status", () => {
    const model = buildTimelineDisplayModel({
      timelineItems: [],
      streamEvents: [
        streamEvent({
          event_id: "status_to_recovery_001",
          event_type: "session.status_changed",
          sequence: 7,
          payload: {
            from_status: "failed",
            to_status: "recovery_pending",
          },
        }),
      ],
      draftAssistantMessages: {},
    });

    expect(rows(model)).toEqual([
      expect.objectContaining({
        id: "stream:status_to_recovery_001",
        label: "Status update",
        content: "recovery pending",
        density: "compact",
        role: "event",
        tone: "muted",
        showDetailButton: false,
      }),
    ]);
  });

  it("hides routine canonical to_status transitions without summary or status", () => {
    const model = buildTimelineDisplayModel({
      timelineItems: [],
      streamEvents: [
        streamEvent({
          event_id: "status_to_waiting_001",
          event_type: "session.status_changed",
          sequence: 8,
          payload: {
            from_status: "running",
            to_status: "waiting_input",
          },
        }),
      ],
      draftAssistantMessages: {},
    });

    expect(rows(model)).toEqual([]);
  });

  it("keeps meaningful operational rows visible while hiding low-value detail actions", () => {
    const model = buildTimelineDisplayModel({
      timelineItems: [
        timelineItem({
          timeline_item_id: "user_001",
          sequence: 1,
          kind: "message.user",
          payload: {
            content: "Run the checks.",
          },
        }),
        timelineItem({
          timeline_item_id: "file_001",
          sequence: 2,
          kind: "file.changed",
          payload: {
            summary: "Updated src/app.ts",
          },
        }),
        timelineItem({
          timeline_item_id: "note_001",
          sequence: 3,
          kind: "thread.note",
          payload: {
            summary: "Saved progress",
          },
        }),
      ],
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
        id: "timeline:user_001",
        label: "You",
        tone: "user",
        showDetailButton: false,
      }),
      expect.objectContaining({
        id: "timeline:file_001",
        label: "File update",
        tone: "tool",
        showDetailButton: true,
        detailActionLabel: "Inspect artifacts",
      }),
      expect.objectContaining({
        id: "timeline:note_001",
        label: "Thread update",
        tone: "muted",
        showDetailButton: false,
        detailActionLabel: null,
      }),
      expect.objectContaining({
        id: "stream:status_001",
        label: "Status update",
        content: "Running tool",
        density: "compact",
        tone: "muted",
        showDetailButton: false,
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

  it("extracts contextual artifacts and operational fields from timeline payloads", () => {
    const detail = getTimelineItemDetail(
      timelineItem({
        kind: "approval.requested",
        payload: {
          summary: "Run release flow",
          request_id: "req_219",
          command: "npm run build",
          file_paths: ["apps/frontend-bff/src/chat-view.tsx"],
          tests: ["node ./node_modules/vitest/vitest.mjs run tests/chat-view.test.tsx"],
          diff: "diff --git a/src/chat-view.tsx b/src/chat-view.tsx",
          issue_url: "https://github.com/example/repo/issues/219",
          generated_outputs: ["artifacts/visual-inspection/issue-219.png"],
          operation_summary: "Create release candidate",
          target: "Issue #219 detail surface",
          consequence: "Approval required before publish",
        },
      }),
    );

    expect(detail.actionLabel).toBe("Inspect request");
    expect(detail.hasContext).toBe(true);
    expect(detail.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Commands",
          items: ["npm run build"],
        }),
        expect.objectContaining({
          title: "Files",
          items: ["apps/frontend-bff/src/chat-view.tsx"],
        }),
        expect.objectContaining({
          title: "Tests",
          items: ["node ./node_modules/vitest/vitest.mjs run tests/chat-view.test.tsx"],
        }),
        expect.objectContaining({
          title: "Diffs",
          items: ["diff --git a/src/chat-view.tsx b/src/chat-view.tsx"],
        }),
        expect.objectContaining({
          title: "Generated outputs",
          items: ["artifacts/visual-inspection/issue-219.png"],
        }),
      ]),
    );
    expect(detail.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Request ID",
          value: "req_219",
        }),
        expect.objectContaining({
          label: "Issue",
          value: "https://github.com/example/repo/issues/219",
          href: "https://github.com/example/repo/issues/219",
        }),
        expect.objectContaining({
          label: "Operation",
          value: "Create release candidate",
        }),
        expect.objectContaining({
          label: "Target",
          value: "Issue #219 detail surface",
        }),
        expect.objectContaining({
          label: "Consequence",
          value: "Approval required before publish",
        }),
      ]),
    );
  });

  it("carries request identity fields on request timeline and stream rows for contextual placement", () => {
    const model = buildTimelineDisplayModel({
      timelineItems: [
        timelineItem({
          timeline_item_id: "timeline_request_001",
          turn_id: "turn_001",
          item_id: "item_approval_001",
          sequence: 1,
          kind: "approval.requested",
          payload: {
            request_id: "req_001",
            summary: "Push requires approval",
          },
        }),
      ],
      streamEvents: [
        streamEvent({
          event_id: "stream_resolved_001",
          sequence: 2,
          event_type: "approval.resolved",
          payload: {
            request_id: "req_001",
            turn_id: "turn_001",
            item_id: "item_approval_001",
            status: "resolved",
            summary: "Push approved",
          },
        }),
      ],
      draftAssistantMessages: {},
    });

    expect(rows(model)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "timeline:timeline_request_001",
          itemId: "item_approval_001",
          requestId: "req_001",
          requestState: "pending",
          tone: "request",
        }),
        expect.objectContaining({
          id: "stream:stream_resolved_001",
          itemId: "item_approval_001",
          requestId: "req_001",
          requestState: "resolved",
          tone: "request",
        }),
      ]),
    );
  });

  it("keeps normal user and assistant rows expanded by default even when long", () => {
    const longContent = Array.from({ length: 12 }, (_, index) => `paragraph ${index + 1}`).join(
      "\n\n",
    );
    const model = buildTimelineDisplayModel({
      timelineItems: [
        timelineItem({
          timeline_item_id: "timeline_user_long",
          sequence: 1,
          kind: "message.user",
          payload: {
            content: longContent,
          },
        }),
        timelineItem({
          timeline_item_id: "timeline_assistant_long",
          item_id: "item_assistant_001",
          sequence: 2,
          kind: "message.assistant.completed",
          payload: {
            message_id: "message_001",
            content: longContent,
          },
        }),
      ],
      streamEvents: [],
      draftAssistantMessages: {},
    });

    expect(rows(model)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "You",
          defaultFoldEligible: false,
          content: longContent,
        }),
        expect.objectContaining({
          label: "Codex",
          defaultFoldEligible: false,
          content: longContent,
        }),
      ]),
    );
  });

  it("allows verbose operational rows to remain fold-eligible without folding request rows", () => {
    const longJson = JSON.stringify(
      {
        command: "npm run build",
        stdout: Array.from({ length: 40 }, (_, index) => `line-${index + 1}`),
      },
      null,
      2,
    );
    const model = buildTimelineDisplayModel({
      timelineItems: [
        timelineItem({
          timeline_item_id: "timeline_request",
          sequence: 1,
          kind: "approval.requested",
          payload: {
            content: longJson,
            summary: "Approve publish step",
          },
        }),
        timelineItem({
          timeline_item_id: "timeline_tool_output",
          sequence: 2,
          kind: "tool.output",
          payload: {
            content: longJson,
          },
        }),
      ],
      streamEvents: [],
      draftAssistantMessages: {},
    });

    expect(rows(model)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Request needs attention",
          defaultFoldEligible: false,
        }),
        expect.objectContaining({
          label: "Tool activity",
          defaultFoldEligible: true,
        }),
      ]),
    );
  });
});
