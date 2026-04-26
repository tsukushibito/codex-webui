import type { PublicSessionSummary } from "./legacy-types";

function canStopForStatus(status: PublicSessionSummary["status"]) {
  return status === "running" || status === "waiting_input" || status === "waiting_approval";
}

export function applySessionStatus(
  session: PublicSessionSummary,
  status: PublicSessionSummary["status"],
  updatedAt: string,
  overrides: Partial<Pick<PublicSessionSummary, "last_message_at" | "active_approval_id">> = {},
): PublicSessionSummary {
  return {
    ...session,
    ...overrides,
    status,
    updated_at: updatedAt,
    can_send_message: status === "waiting_input",
    can_start: status === "created" ? session.can_start : false,
    can_stop: canStopForStatus(status),
  };
}
