import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { listThreads } from "../src/handlers";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

const validThreadListResponse = {
  items: [
    {
      thread_id: "thread_001",
      workspace_id: "ws_alpha",
      title: "Investigate build",
      created_at: "2026-03-27T05:12:34Z",
      updated_at: "2026-03-27T05:22:00Z",
      native_status: {
        thread_status: "running",
        active_flags: ["waiting_on_request"],
        latest_turn_status: "running",
      },
      derived_hints: {
        accepting_user_input: false,
        has_pending_request: true,
        blocked_reason: "pending_request",
      },
    },
  ],
  next_cursor: null,
  has_more: false,
};

describe("runtime thread-list contract boundary", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts the runtime thread-list contract before mapping to the public shape", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(validThreadListResponse));

    const response = await listThreads(
      new Request("http://localhost/api/v1/workspaces/ws_alpha/threads?sort=-updated_at"),
      "ws_alpha",
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [
        {
          thread_id: "thread_001",
          workspace_id: "ws_alpha",
          title: "Investigate build",
          native_status: {
            thread_status: "running",
            active_flags: ["waiting_on_request"],
            latest_turn_status: "running",
          },
          updated_at: "2026-03-27T05:22:00Z",
          current_activity: {
            kind: "waiting_on_approval",
            label: "Approval required",
          },
          badge: {
            kind: "approval_required",
            label: "Approval required",
          },
          blocked_cue: {
            kind: "approval_required",
            label: "Needs your response",
          },
          resume_cue: {
            reason_kind: "waiting_on_approval",
            priority_band: "highest",
            label: "Resume here first",
          },
        },
      ],
      next_cursor: null,
      has_more: false,
    });
  });

  it("rejects drifted runtime thread-list responses before mapping", async () => {
    const driftedResponse = {
      ...validThreadListResponse,
      items: validThreadListResponse.items.map(({ derived_hints: _derivedHints, ...thread }) => ({
        ...thread,
        derived_status: {
          accepting_user_input: false,
          has_pending_request: true,
          blocked_reason: "pending_request",
        },
      })),
    };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(driftedResponse));

    const response = await listThreads(
      new Request("http://localhost/api/v1/workspaces/ws_alpha/threads"),
      "ws_alpha",
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        code: "internal_server_error",
        message: "unexpected frontend-bff failure",
        details: {},
      },
    });
  });
});
