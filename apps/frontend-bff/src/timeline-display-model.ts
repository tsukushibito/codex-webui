import type { PublicThreadStreamEvent, PublicTimelineItem } from "./thread-types";

export type TimelineRowDensity = "primary" | "prominent" | "compact";

export type TimelineRowRole = "user" | "assistant" | "event";

export interface TimelineDisplayRow {
  id: string;
  turnId: string | null;
  sequence: number;
  occurredAt: string | null;
  label: string;
  content: string;
  density: TimelineRowDensity;
  role: TimelineRowRole;
  timelineItemId: string | null;
  isLive: boolean;
}

export interface TimelineDisplayGroup {
  id: string;
  turnId: string | null;
  rows: TimelineDisplayRow[];
}

export interface TimelineDisplayModel {
  groups: TimelineDisplayGroup[];
}

const ASSISTANT_EVENT_TYPES = new Set(["message.assistant.delta", "message.assistant.completed"]);

function asNonEmptyString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function timelineDisplayLabel(kind: string, isLive = false) {
  if (kind.startsWith("message.user")) {
    return "You";
  }

  if (kind.startsWith("message.assistant")) {
    return isLive ? "Codex is responding" : "Codex";
  }

  if (kind.includes("approval") || kind.includes("request")) {
    if (kind.includes("resolved") || kind.includes("responded")) {
      return "Request resolved";
    }

    return "Request needs attention";
  }

  if (kind.includes("error")) {
    return "System error";
  }

  if (kind.includes("failed")) {
    return "Turn failed";
  }

  if (kind.includes("file")) {
    return "File update";
  }

  if (kind.includes("status")) {
    return "Status update";
  }

  if (kind.includes("tool") || kind.includes("command")) {
    return "Tool activity";
  }

  return "Thread update";
}

function payloadText(payload: Record<string, unknown>) {
  return (
    asNonEmptyString(payload.content) ??
    asNonEmptyString(payload.delta) ??
    asNonEmptyString(payload.summary) ??
    asNonEmptyString(payload.message)
  );
}

function timelineItemContent(item: PublicTimelineItem) {
  return payloadText(item.payload) ?? item.kind;
}

function streamEventContent(event: PublicThreadStreamEvent) {
  return payloadText(event.payload) ?? event.event_type;
}

function payloadTurnId(payload: Record<string, unknown>) {
  return asNonEmptyString(payload.turn_id);
}

function streamAssistantKey(event: PublicThreadStreamEvent) {
  return (
    asNonEmptyString(event.payload.message_id) ??
    asNonEmptyString(event.payload.item_id) ??
    `sequence:${event.sequence}`
  );
}

function timelineAssistantKeys(item: PublicTimelineItem) {
  return [
    asNonEmptyString(item.payload.message_id),
    item.item_id,
    asNonEmptyString(item.payload.item_id),
  ].filter((value): value is string => value !== null);
}

function isAssistantTimelineItem(item: PublicTimelineItem) {
  return item.kind.startsWith("message.assistant");
}

function isUserTimelineItem(item: PublicTimelineItem) {
  return item.kind.startsWith("message.user");
}

export function classifyTimelineDensity(kind: string): TimelineRowDensity {
  if (kind.startsWith("message.user") || kind.startsWith("message.assistant")) {
    return "primary";
  }

  if (
    kind.includes("approval") ||
    kind.includes("request") ||
    kind.includes("error") ||
    kind.includes("failed") ||
    kind.includes("file")
  ) {
    return "prominent";
  }

  return "compact";
}

function timelineRole(item: PublicTimelineItem): TimelineRowRole {
  if (isUserTimelineItem(item)) {
    return "user";
  }

  if (isAssistantTimelineItem(item)) {
    return "assistant";
  }

  return "event";
}

function eventRole(event: PublicThreadStreamEvent): TimelineRowRole {
  return event.event_type.startsWith("message.assistant") ? "assistant" : "event";
}

function buildGroups(rows: TimelineDisplayRow[]) {
  const groups: TimelineDisplayGroup[] = [];

  for (const row of rows) {
    const previousGroup = groups.at(-1);

    if (row.turnId && previousGroup?.turnId === row.turnId) {
      previousGroup.rows.push(row);
      continue;
    }

    groups.push({
      id: row.turnId ? `turn:${row.turnId}:${row.id}` : `item:${row.id}`,
      turnId: row.turnId,
      rows: [row],
    });
  }

  return groups;
}

function sortRows(rows: TimelineDisplayRow[]) {
  return rows.toSorted((left, right) => {
    if (left.sequence !== right.sequence) {
      return left.sequence - right.sequence;
    }

    return left.id.localeCompare(right.id);
  });
}

export function buildTimelineDisplayModel({
  timelineItems,
  streamEvents,
  draftAssistantMessages,
}: {
  timelineItems: PublicTimelineItem[];
  streamEvents: PublicThreadStreamEvent[];
  draftAssistantMessages: Record<string, string>;
}): TimelineDisplayModel {
  const sortedTimelineItems = timelineItems.toSorted(
    (left, right) => left.sequence - right.sequence,
  );
  const rows: TimelineDisplayRow[] = [];
  const restAssistantKeys = new Set<string>();
  const restAssistantContents = new Set<string>();
  const restDedupKeys = new Set<string>();

  for (const item of sortedTimelineItems) {
    restDedupKeys.add(`${item.kind}:${item.sequence}`);
    restDedupKeys.add(`id:${item.timeline_item_id}`);

    const content = timelineItemContent(item);
    if (isAssistantTimelineItem(item)) {
      for (const key of timelineAssistantKeys(item)) {
        restAssistantKeys.add(key);
      }
      restAssistantContents.add(content);
    }

    rows.push({
      id: `timeline:${item.timeline_item_id}`,
      turnId: item.turn_id,
      sequence: item.sequence,
      occurredAt: item.occurred_at,
      label: timelineDisplayLabel(item.kind),
      content,
      density: classifyTimelineDensity(item.kind),
      role: timelineRole(item),
      timelineItemId: item.timeline_item_id,
      isLive: false,
    });
  }

  const sortedStreamEvents = streamEvents.toSorted((left, right) => left.sequence - right.sequence);
  const assistantDeltaGroups = new Map<
    string,
    {
      key: string;
      turnId: string | null;
      itemId: string | null;
      firstSequence: number;
      occurredAt: string | null;
      content: string;
      completedContent: string | null;
      completedSequence: number | null;
      completedAt: string | null;
    }
  >();

  for (const event of sortedStreamEvents) {
    if (!ASSISTANT_EVENT_TYPES.has(event.event_type)) {
      continue;
    }

    const key = streamAssistantKey(event);
    const existing = assistantDeltaGroups.get(key);
    const group = existing ?? {
      key,
      turnId: payloadTurnId(event.payload),
      itemId: asNonEmptyString(event.payload.item_id),
      firstSequence: event.sequence,
      occurredAt: event.occurred_at,
      content: "",
      completedContent: null,
      completedSequence: null,
      completedAt: null,
    };

    group.turnId = group.turnId ?? payloadTurnId(event.payload);
    group.itemId = group.itemId ?? asNonEmptyString(event.payload.item_id);

    if (event.event_type === "message.assistant.delta") {
      const delta = asNonEmptyString(event.payload.delta);
      if (delta) {
        group.content = `${group.content}${delta}`;
      }
    }

    if (event.event_type === "message.assistant.completed") {
      group.completedContent = streamEventContent(event);
      group.completedSequence = event.sequence;
      group.completedAt = event.occurred_at;
    }

    assistantDeltaGroups.set(key, group);
  }

  for (const group of assistantDeltaGroups.values()) {
    const content = group.completedContent ?? group.content;
    if (!content) {
      continue;
    }

    const keyConverged =
      restAssistantKeys.has(group.key) ||
      (group.itemId !== null && restAssistantKeys.has(group.itemId));
    const contentConverged = group.completedContent !== null && restAssistantContents.has(content);
    if (keyConverged || contentConverged) {
      continue;
    }

    const isCompleted = group.completedContent !== null;
    rows.push({
      id: `assistant:${group.key}`,
      turnId: group.turnId,
      sequence: group.completedSequence ?? group.firstSequence,
      occurredAt: group.completedAt ?? group.occurredAt,
      label: timelineDisplayLabel("message.assistant.completed", !isCompleted),
      content: isCompleted ? content : `${content}...`,
      density: "primary",
      role: "assistant",
      timelineItemId: null,
      isLive: !isCompleted,
    });
  }

  for (const [messageId, content] of Object.entries(draftAssistantMessages)) {
    if (assistantDeltaGroups.has(messageId) || restAssistantKeys.has(messageId) || !content) {
      continue;
    }

    rows.push({
      id: `draft:${messageId}`,
      turnId: null,
      sequence: Number.MAX_SAFE_INTEGER,
      occurredAt: null,
      label: timelineDisplayLabel("message.assistant.delta", true),
      content: `${content}...`,
      density: "primary",
      role: "assistant",
      timelineItemId: null,
      isLive: true,
    });
  }

  for (const event of sortedStreamEvents) {
    if (ASSISTANT_EVENT_TYPES.has(event.event_type)) {
      continue;
    }

    if (
      restDedupKeys.has(`id:${event.event_id}`) ||
      restDedupKeys.has(`${event.event_type}:${event.sequence}`)
    ) {
      continue;
    }

    rows.push({
      id: `stream:${event.event_id}`,
      turnId: payloadTurnId(event.payload),
      sequence: event.sequence,
      occurredAt: event.occurred_at,
      label: timelineDisplayLabel(event.event_type),
      content: streamEventContent(event),
      density: classifyTimelineDensity(event.event_type),
      role: eventRole(event),
      timelineItemId: null,
      isLive: false,
    });
  }

  return {
    groups: buildGroups(sortRows(rows)),
  };
}
