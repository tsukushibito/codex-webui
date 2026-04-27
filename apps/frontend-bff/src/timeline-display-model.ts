import type { PublicThreadStreamEvent, PublicTimelineItem } from "./thread-types";
import { getTimelineItemDetail } from "./timeline-item-detail";

export type TimelineRowDensity = "primary" | "prominent" | "compact";

export type TimelineRowRole = "user" | "assistant" | "event";

export interface TimelineDisplayRow {
  id: string;
  turnId: string | null;
  itemId: string | null;
  requestId: string | null;
  requestState: "pending" | "resolved" | null;
  sequence: number;
  occurredAt: string | null;
  label: string;
  content: string;
  density: TimelineRowDensity;
  role: TimelineRowRole;
  timelineItemId: string | null;
  isLive: boolean;
  defaultFoldEligible: boolean;
  showDetailButton: boolean;
  detailActionLabel: string | null;
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
const GENERIC_STATUS_CONTENT = new Set([
  "session.status_changed",
  "status changed",
  "thread status changed",
  "status update",
  "created",
  "running",
  "waiting input",
  "waiting approval",
  "completed",
  "stopped",
  "idle",
  "open",
  "stopping",
  "closed",
]);

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

function normalizedStatusValue(value: unknown) {
  return asNonEmptyString(value)?.replaceAll("_", " ") ?? null;
}

function statusChangedContent(payload: Record<string, unknown>) {
  return (
    payloadText(payload) ??
    normalizedStatusValue(payload.status) ??
    normalizedStatusValue(payload.to_status)
  );
}

function assistantDeltaText(payload: Record<string, unknown>) {
  return asNonEmptyString(payload.delta) ?? asNonEmptyString(payload.content);
}

function timelineItemContent(item: PublicTimelineItem) {
  if (item.kind === "session.status_changed") {
    return statusChangedContent(item.payload) ?? item.kind;
  }

  return payloadText(item.payload) ?? item.kind;
}

function streamEventContent(event: PublicThreadStreamEvent) {
  if (event.event_type === "session.status_changed") {
    return statusChangedContent(event.payload) ?? event.event_type;
  }

  return payloadText(event.payload) ?? event.event_type;
}

function payloadTurnId(payload: Record<string, unknown>) {
  return asNonEmptyString(payload.turn_id);
}

function payloadItemId(payload: Record<string, unknown>) {
  return asNonEmptyString(payload.item_id);
}

function payloadRequestId(payload: Record<string, unknown>) {
  return asNonEmptyString(payload.request_id);
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

function assistantTimelineKey(item: PublicTimelineItem) {
  return (
    asNonEmptyString(item.payload.message_id) ??
    item.item_id ??
    asNonEmptyString(item.payload.item_id)
  );
}

function normalizeContent(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function shouldHideRow(kind: string, content: string, payload: Record<string, unknown>) {
  if (kind === "session.status_changed") {
    const normalizedContent = normalizeContent(content);
    const normalizedStatus = normalizeContent(normalizedStatusValue(payload.status));
    const normalizedToStatus = normalizeContent(normalizedStatusValue(payload.to_status));

    if (
      normalizedContent.length === 0 ||
      GENERIC_STATUS_CONTENT.has(normalizedContent) ||
      (normalizedStatus.length > 0 &&
        GENERIC_STATUS_CONTENT.has(normalizedStatus) &&
        normalizedContent === normalizedStatus) ||
      (normalizedToStatus.length > 0 &&
        GENERIC_STATUS_CONTENT.has(normalizedToStatus) &&
        normalizedContent === normalizedToStatus)
    ) {
      return true;
    }
  }

  return false;
}

function timelineRowDetail(item: PublicTimelineItem, role: TimelineRowRole) {
  if (!item.timeline_item_id || role !== "event" || item.kind === "session.status_changed") {
    return {
      showDetailButton: false,
      detailActionLabel: null,
    };
  }

  const detail = getTimelineItemDetail(item);

  return {
    showDetailButton: detail.hasContext,
    detailActionLabel: detail.hasContext ? detail.actionLabel : null,
  };
}

function streamRowDetail() {
  return {
    showDetailButton: false,
    detailActionLabel: null,
  };
}

function requestStateFromKind(kind: string, payload: Record<string, unknown>) {
  const payloadStatus = asNonEmptyString(payload.status);

  if (payloadStatus === "pending" || payloadStatus === "resolved") {
    return payloadStatus;
  }

  if (kind.includes("resolved") || kind.includes("responded")) {
    return "resolved";
  }

  if (kind.includes("approval") || kind.includes("request")) {
    return "pending";
  }

  return null;
}

function isLikelyStructuredPayload(content: string) {
  const trimmed = content.trim();

  if (trimmed.length >= 120 && (/^[{[]/.test(trimmed) || /^```/.test(trimmed))) {
    return true;
  }

  if (/^\s*at\s.+\(.+\)$/m.test(content) || /^\s*at\s.+$/m.test(content)) {
    return true;
  }

  if (/^@@\s/m.test(content) || /^[+-]{3}\s/m.test(content)) {
    return true;
  }

  return false;
}

function isDefaultFoldEligible(kind: string, role: TimelineRowRole, content: string) {
  if (kind.startsWith("message.user") || kind.startsWith("message.assistant")) {
    return false;
  }

  if (kind.includes("approval") || kind.includes("request")) {
    return false;
  }

  if (role !== "event") {
    return false;
  }

  if (
    kind.includes("tool") ||
    kind.includes("command") ||
    kind.includes("log") ||
    kind.includes("trace") ||
    kind.includes("diff") ||
    kind.includes("patch") ||
    kind.includes("output")
  ) {
    return true;
  }

  return isLikelyStructuredPayload(content);
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
  const restCompletedAssistantKeys = new Set<string>();
  const restAssistantContents = new Set<string>();
  const restDedupKeys = new Set<string>();
  const assistantTimelineGroupAliases = new Map<
    string,
    {
      key: string;
      turnId: string | null;
      firstSequence: number;
      occurredAt: string | null;
      content: string;
      completedContent: string | null;
      completedSequence: number | null;
      completedAt: string | null;
      timelineItemId: string | null;
    }
  >();
  const assistantTimelineGroups = new Map<
    string,
    {
      key: string;
      turnId: string | null;
      firstSequence: number;
      occurredAt: string | null;
      content: string;
      completedContent: string | null;
      completedSequence: number | null;
      completedAt: string | null;
      timelineItemId: string | null;
    }
  >();
  let previousAssistantGroupKey: string | null = null;
  let previousAssistantGroupAnonymous = false;
  let previousAssistantGroupCompleted = false;

  for (const item of sortedTimelineItems) {
    restDedupKeys.add(`${item.kind}:${item.sequence}`);
    restDedupKeys.add(`id:${item.timeline_item_id}`);

    const content = timelineItemContent(item);
    if (isAssistantTimelineItem(item)) {
      for (const key of timelineAssistantKeys(item)) {
        restAssistantKeys.add(key);
      }
      const explicitKey = assistantTimelineKey(item);
      const key: string =
        explicitKey ??
        (previousAssistantGroupAnonymous &&
        previousAssistantGroupKey !== null &&
        !previousAssistantGroupCompleted
          ? previousAssistantGroupKey
          : item.timeline_item_id);
      const existing = assistantTimelineGroups.get(key);
      const group = existing ?? {
        key,
        turnId: item.turn_id,
        firstSequence: item.sequence,
        occurredAt: item.occurred_at,
        content: "",
        completedContent: null,
        completedSequence: null,
        completedAt: null,
        timelineItemId: item.timeline_item_id,
      };

      group.turnId = group.turnId ?? item.turn_id;
      group.timelineItemId = item.timeline_item_id;

      if (item.kind === "message.assistant.delta") {
        const delta = assistantDeltaText(item.payload);
        if (delta) {
          group.content = `${group.content}${delta}`;
        }
      }

      if (item.kind === "message.assistant.completed") {
        restCompletedAssistantKeys.add(key);
        for (const assistantKey of timelineAssistantKeys(item)) {
          restCompletedAssistantKeys.add(assistantKey);
        }
        group.completedContent = content;
        group.completedSequence = item.sequence;
        group.completedAt = item.occurred_at;
        group.timelineItemId = item.timeline_item_id;
        restAssistantContents.add(content);
      }

      assistantTimelineGroups.set(key, group);
      assistantTimelineGroupAliases.set(key, group);
      for (const assistantKey of timelineAssistantKeys(item)) {
        assistantTimelineGroupAliases.set(assistantKey, group);
      }
      previousAssistantGroupKey = key;
      previousAssistantGroupAnonymous = explicitKey === null;
      previousAssistantGroupCompleted = item.kind === "message.assistant.completed";
      continue;
    }

    previousAssistantGroupKey = null;
    previousAssistantGroupAnonymous = false;
    previousAssistantGroupCompleted = false;

    if (shouldHideRow(item.kind, content, item.payload)) {
      continue;
    }

    const role = timelineRole(item);
    rows.push({
      id: `timeline:${item.timeline_item_id}`,
      turnId: item.turn_id,
      itemId: item.item_id ?? payloadItemId(item.payload),
      requestId: payloadRequestId(item.payload),
      requestState: requestStateFromKind(item.kind, item.payload),
      sequence: item.sequence,
      occurredAt: item.occurred_at,
      label: timelineDisplayLabel(item.kind),
      content,
      density: classifyTimelineDensity(item.kind),
      role,
      timelineItemId: item.timeline_item_id,
      isLive: false,
      defaultFoldEligible: isDefaultFoldEligible(item.kind, role, content),
      ...timelineRowDetail(item, role),
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

    const restGroup =
      assistantTimelineGroupAliases.get(group.key) ??
      (group.itemId ? assistantTimelineGroupAliases.get(group.itemId) : undefined);
    if (restGroup && group.completedContent === null && restGroup.completedContent === null) {
      restGroup.turnId = restGroup.turnId ?? group.turnId;
      continue;
    }

    if (restGroup && group.completedContent !== null && restGroup.completedContent === null) {
      restGroup.turnId = restGroup.turnId ?? group.turnId;
      restGroup.completedContent = group.completedContent;
      restGroup.completedSequence = group.completedSequence;
      restGroup.completedAt = group.completedAt;
      restAssistantContents.add(group.completedContent);
      continue;
    }

    const keyConverged =
      restCompletedAssistantKeys.has(group.key) ||
      (group.itemId !== null && restCompletedAssistantKeys.has(group.itemId));
    const contentConverged = group.completedContent !== null && restAssistantContents.has(content);
    if (keyConverged || contentConverged) {
      continue;
    }

    const isCompleted = group.completedContent !== null;
    rows.push({
      id: `assistant:${group.key}`,
      turnId: group.turnId,
      itemId: group.itemId,
      requestId: null,
      requestState: null,
      sequence: group.completedSequence ?? group.firstSequence,
      occurredAt: group.completedAt ?? group.occurredAt,
      label: timelineDisplayLabel("message.assistant.completed", !isCompleted),
      content: isCompleted ? content : `${content}...`,
      density: "primary",
      role: "assistant",
      timelineItemId: null,
      isLive: !isCompleted,
      defaultFoldEligible: false,
      showDetailButton: false,
      detailActionLabel: null,
    });
  }

  for (const group of assistantTimelineGroups.values()) {
    const content = group.completedContent ?? group.content;
    if (!content) {
      continue;
    }

    const isCompleted = group.completedContent !== null;
    rows.push({
      id: `timeline-assistant:${group.key}`,
      turnId: group.turnId,
      itemId: null,
      requestId: null,
      requestState: null,
      sequence: group.completedSequence ?? group.firstSequence,
      occurredAt: group.completedAt ?? group.occurredAt,
      label: timelineDisplayLabel("message.assistant.completed", !isCompleted),
      content: isCompleted ? content : `${content}...`,
      density: "primary",
      role: "assistant",
      timelineItemId: group.timelineItemId,
      isLive: !isCompleted,
      defaultFoldEligible: false,
      showDetailButton: false,
      detailActionLabel: null,
    });
  }

  for (const [messageId, content] of Object.entries(draftAssistantMessages)) {
    if (assistantDeltaGroups.has(messageId) || restAssistantKeys.has(messageId) || !content) {
      continue;
    }

    rows.push({
      id: `draft:${messageId}`,
      turnId: null,
      itemId: null,
      requestId: null,
      requestState: null,
      sequence: Number.MAX_SAFE_INTEGER,
      occurredAt: null,
      label: timelineDisplayLabel("message.assistant.delta", true),
      content: `${content}...`,
      density: "primary",
      role: "assistant",
      timelineItemId: null,
      isLive: true,
      defaultFoldEligible: false,
      showDetailButton: false,
      detailActionLabel: null,
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

    const content = streamEventContent(event);
    if (shouldHideRow(event.event_type, content, event.payload)) {
      continue;
    }

    const role = eventRole(event);
    rows.push({
      id: `stream:${event.event_id}`,
      turnId: payloadTurnId(event.payload),
      itemId: payloadItemId(event.payload),
      requestId: payloadRequestId(event.payload),
      requestState: requestStateFromKind(event.event_type, event.payload),
      sequence: event.sequence,
      occurredAt: event.occurred_at,
      label: timelineDisplayLabel(event.event_type),
      content,
      density: classifyTimelineDensity(event.event_type),
      role,
      timelineItemId: null,
      isLive: false,
      defaultFoldEligible: isDefaultFoldEligible(event.event_type, role, content),
      ...streamRowDetail(),
    });
  }

  return {
    groups: buildGroups(sortRows(rows)),
  };
}
