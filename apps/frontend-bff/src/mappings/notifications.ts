import type { RuntimeNotificationEvent } from "../runtime-types";
import type { PublicNotificationEvent } from "../thread-types";

export function mapNotificationEvent(event: RuntimeNotificationEvent): PublicNotificationEvent {
  return {
    thread_id: event.thread_id,
    event_type: event.event_type,
    occurred_at: event.occurred_at,
    high_priority: event.high_priority,
  };
}
