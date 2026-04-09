import crypto from "node:crypto";

import { desc, eq } from "drizzle-orm";

import { logLiveChatDebug } from "../../debug.js";
import type { RuntimeDatabase } from "../../db/database.js";
import { sessionEvents } from "../../db/schema.js";
import type {
  ApprovalStreamEventProjection,
  SessionEventProjection,
  SessionEventType,
  SessionStatus,
} from "./types.js";

function firstRow<T>(rows: T[]) {
  return rows[0];
}

function generateEventId() {
  return `evt_${crypto.randomUUID().replaceAll("-", "")}`;
}

function parseEventPayload(value: string) {
  return JSON.parse(value) as Record<string, unknown>;
}

export function mapSessionEventProjection(
  record: typeof sessionEvents.$inferSelect,
): SessionEventProjection {
  return {
    event_id: record.eventId,
    session_id: record.sessionId,
    event_type: record.eventType as SessionEventType,
    sequence: record.sequence,
    occurred_at: record.occurredAt,
    payload: parseEventPayload(record.payload),
    native_event_name: record.nativeEventName,
  };
}

export class SessionEventPublisher {
  private readonly sessionEventListeners = new Map<
    string,
    Set<(event: SessionEventProjection) => void>
  >();

  private readonly approvalEventListeners = new Set<
    (event: ApprovalStreamEventProjection) => void
  >();

  constructor(private readonly database: RuntimeDatabase) {}

  subscribeSessionEvents(
    sessionId: string,
    listener: (event: SessionEventProjection) => void,
  ) {
    const listeners = this.sessionEventListeners.get(sessionId) ?? new Set();
    listeners.add(listener);
    this.sessionEventListeners.set(sessionId, listeners);

    return () => {
      listeners.delete(listener);

      if (listeners.size === 0) {
        this.sessionEventListeners.delete(sessionId);
      }
    };
  }

  subscribeApprovalEvents(listener: (event: ApprovalStreamEventProjection) => void) {
    this.approvalEventListeners.add(listener);

    return () => {
      this.approvalEventListeners.delete(listener);
    };
  }

  appendSessionEvent(input: {
    sessionId: string;
    eventType: SessionEventType;
    occurredAt: string;
    payload: Record<string, unknown>;
    nativeEventName?: string | null;
  }) {
    const latestEvent = firstRow(
      this.database.db
        .select()
        .from(sessionEvents)
        .where(eq(sessionEvents.sessionId, input.sessionId))
        .orderBy(desc(sessionEvents.sequence), desc(sessionEvents.eventId))
        .limit(1)
        .all(),
    );
    const nextSequence = (latestEvent?.sequence ?? 0) + 1;

    const eventId = generateEventId();

    this.database.db
      .insert(sessionEvents)
      .values({
        eventId,
        sessionId: input.sessionId,
        eventType: input.eventType,
        sequence: nextSequence,
        occurredAt: input.occurredAt,
        payload: JSON.stringify(input.payload),
        nativeEventName: input.nativeEventName ?? null,
      })
      .run();

    const event = mapSessionEventProjection({
      eventId,
      sessionId: input.sessionId,
      eventType: input.eventType,
      sequence: nextSequence,
      occurredAt: input.occurredAt,
      payload: JSON.stringify(input.payload),
      nativeEventName: input.nativeEventName ?? null,
    });

    logLiveChatDebug("session-events", "appended session event", {
      session_id: event.session_id,
      event_type: event.event_type,
      sequence: event.sequence,
      native_event_name: event.native_event_name ?? null,
    });

    const sessionListeners = this.sessionEventListeners.get(input.sessionId);
    sessionListeners?.forEach((registered) => registered(event));

    if (
      event.event_type === "approval.requested" ||
      event.event_type === "approval.resolved"
    ) {
      const approvalEvent: ApprovalStreamEventProjection = {
        event_id: event.event_id,
        session_id: event.session_id,
        event_type: event.event_type,
        occurred_at: event.occurred_at,
        payload: event.payload,
        native_event_name: event.native_event_name,
      };

      this.approvalEventListeners.forEach((registered) => registered(approvalEvent));
    }
  }

  appendSessionStatusChangedEvent(input: {
    sessionId: string;
    occurredAt: string;
    fromStatus: SessionStatus;
    toStatus: SessionStatus;
    nativeEventName?: string | null;
  }) {
    this.appendSessionEvent({
      sessionId: input.sessionId,
      eventType: "session.status_changed",
      occurredAt: input.occurredAt,
      payload: {
        from_status: input.fromStatus,
        to_status: input.toStatus,
      },
      nativeEventName: input.nativeEventName,
    });
  }
}
