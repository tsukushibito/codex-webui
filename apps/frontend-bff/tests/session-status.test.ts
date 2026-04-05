import { describe, expect, it } from "vitest";

import type { PublicSessionSummary } from "../src/chat-types";
import { applySessionStatus } from "../src/session-status";

function buildSession(
  overrides: Partial<PublicSessionSummary> = {},
): PublicSessionSummary {
  return {
    session_id: "thread_001",
    workspace_id: "ws_alpha",
    title: "Fix build error",
    status: "running",
    created_at: "2026-03-27T05:12:34Z",
    updated_at: "2026-03-27T05:13:00Z",
    started_at: "2026-03-27T05:13:00Z",
    last_message_at: null,
    active_approval_id: null,
    can_send_message: false,
    can_start: false,
    can_stop: true,
    ...overrides,
  };
}

describe("applySessionStatus", () => {
  it("recomputes can_* when a session becomes waiting_input", () => {
    expect(
      applySessionStatus(
        buildSession(),
        "waiting_input",
        "2026-03-27T05:14:00Z",
      ),
    ).toMatchObject({
      status: "waiting_input",
      updated_at: "2026-03-27T05:14:00Z",
      can_send_message: true,
      can_start: false,
      can_stop: true,
    });
  });

  it("recomputes can_* when a session becomes running through a local send", () => {
    expect(
      applySessionStatus(
        buildSession({
          status: "waiting_input",
          can_send_message: true,
        }),
        "running",
        "2026-03-27T05:15:00Z",
        {
          last_message_at: "2026-03-27T05:15:00Z",
        },
      ),
    ).toMatchObject({
      status: "running",
      updated_at: "2026-03-27T05:15:00Z",
      last_message_at: "2026-03-27T05:15:00Z",
      can_send_message: false,
      can_start: false,
      can_stop: true,
    });
  });
});
