import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getHome, listThreads, listWorkspaces } from "../src/handlers";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

describe("workspace/home route handlers", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps workspace list responses to the public shape", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            workspace_id: "ws_alpha",
            workspace_name: "alpha",
            directory_name: "alpha",
            created_at: "2026-03-27T05:12:34Z",
            updated_at: "2026-03-27T05:22:00Z",
            active_session_id: "thread_001",
            active_session_summary: {
              session_id: "thread_001",
              status: "running",
              last_message_at: "2026-03-27T05:21:40Z",
            },
            pending_approval_count: 1,
          },
        ],
        next_cursor: null,
        has_more: false,
      }),
    );

    const response = await listWorkspaces(
      new Request("http://localhost/api/v1/workspaces?sort=-updated_at"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [
        {
          workspace_id: "ws_alpha",
          workspace_name: "alpha",
          created_at: "2026-03-27T05:12:34Z",
          updated_at: "2026-03-27T05:22:00Z",
          active_session_summary: {
            session_id: "thread_001",
            status: "running",
            last_message_at: "2026-03-27T05:21:40Z",
          },
          pending_approval_count: 1,
        },
      ],
      next_cursor: null,
      has_more: false,
    });
  });

  it("combines workspace summaries and per-workspace threads for the Home response", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              workspace_id: "ws_alpha",
              workspace_name: "alpha",
              directory_name: "alpha",
              created_at: "2026-03-27T05:12:34Z",
              updated_at: "2026-03-27T05:21:00Z",
              active_session_id: "thread_001",
              active_session_summary: {
                session_id: "thread_001",
                status: "running",
                last_message_at: "2026-03-27T05:21:00Z",
              },
              pending_approval_count: 1,
            },
          ],
          next_cursor: null,
          has_more: false,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              thread_id: "thread_active",
              workspace_id: "ws_alpha",
              title: "Still running",
              created_at: "2026-03-27T05:10:00Z",
              updated_at: "2026-03-27T05:24:00Z",
              native_status: {
                thread_status: "running",
                active_flags: [],
                latest_turn_status: "running",
              },
              derived_hints: {
                accepting_user_input: false,
                has_pending_request: false,
                blocked_reason: "turn_in_progress",
              },
            },
            {
              thread_id: "thread_approval",
              workspace_id: "ws_alpha",
              title: "Needs approval",
              created_at: "2026-03-27T05:11:00Z",
              updated_at: "2026-03-27T05:23:00Z",
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
            {
              thread_id: "thread_failed",
              workspace_id: "ws_alpha",
              title: "Failed turn",
              created_at: "2026-03-27T05:09:00Z",
              updated_at: "2026-03-27T05:25:00Z",
              native_status: {
                thread_status: "idle",
                active_flags: [],
                latest_turn_status: "failed",
              },
              derived_hints: {
                accepting_user_input: true,
                has_pending_request: false,
                blocked_reason: null,
              },
            },
            {
              thread_id: "thread_idle",
              workspace_id: "ws_alpha",
              title: "Idle thread",
              created_at: "2026-03-27T05:08:00Z",
              updated_at: "2026-03-27T05:26:00Z",
              native_status: {
                thread_status: "idle",
                active_flags: [],
                latest_turn_status: "completed",
              },
              derived_hints: {
                accepting_user_input: true,
                has_pending_request: false,
                blocked_reason: null,
              },
            },
          ],
          next_cursor: null,
          has_more: false,
        }),
      );

    const response = await getHome(new Request("http://localhost/api/v1/home"));

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:3001/api/v1/workspaces",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://127.0.0.1:3001/api/v1/workspaces/ws_alpha/threads?sort=recommended",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      workspaces: [
        {
          workspace_id: "ws_alpha",
          workspace_name: "alpha",
          created_at: "2026-03-27T05:12:34Z",
          updated_at: "2026-03-27T05:21:00Z",
          active_session_summary: {
            session_id: "thread_001",
            status: "running",
            last_message_at: "2026-03-27T05:21:00Z",
          },
          pending_approval_count: 1,
        },
      ],
      resume_candidates: [
        {
          thread_id: "thread_approval",
          workspace_id: "ws_alpha",
          title: "Needs approval",
          native_status: {
            thread_status: "running",
            active_flags: ["waiting_on_request"],
            latest_turn_status: "running",
          },
          updated_at: "2026-03-27T05:23:00Z",
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
        {
          thread_id: "thread_failed",
          workspace_id: "ws_alpha",
          title: "Failed turn",
          native_status: {
            thread_status: "idle",
            active_flags: [],
            latest_turn_status: "failed",
          },
          updated_at: "2026-03-27T05:25:00Z",
          current_activity: {
            kind: "latest_turn_failed",
            label: "Latest turn failed",
          },
          badge: {
            kind: "latest_turn_failed",
            label: "Failed",
          },
          blocked_cue: {
            kind: "latest_turn_failed",
            label: "Needs attention",
          },
          resume_cue: {
            reason_kind: "latest_turn_failed",
            priority_band: "high",
            label: "Resume soon",
          },
        },
        {
          thread_id: "thread_active",
          workspace_id: "ws_alpha",
          title: "Still running",
          native_status: {
            thread_status: "running",
            active_flags: [],
            latest_turn_status: "running",
          },
          updated_at: "2026-03-27T05:24:00Z",
          current_activity: {
            kind: "running",
            label: "Running",
          },
          badge: null,
          blocked_cue: null,
          resume_cue: {
            reason_kind: "active_thread",
            priority_band: "medium",
            label: "Active now",
          },
        },
      ],
      updated_at: "2026-03-27T05:25:00Z",
    });
  });

  it("returns the first runtime error encountered during workspace thread fan-out for Home", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              workspace_id: "ws_alpha",
              workspace_name: "alpha",
              directory_name: "alpha",
              created_at: "2026-03-27T05:12:34Z",
              updated_at: "2026-03-27T05:21:00Z",
              active_session_id: null,
              active_session_summary: null,
              pending_approval_count: 0,
            },
          ],
          next_cursor: null,
          has_more: false,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            error: {
              code: "session_not_found",
              message: "thread list missing",
            },
          },
          404,
        ),
      );

    const response = await getHome(new Request("http://localhost/api/v1/home"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: {
        code: "thread_not_found",
        message: "thread was not found",
        details: {},
      },
    });
  });

  it("maps workspace thread list responses to v0.9 thread_list_item", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
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
      }),
    );

    const response = await listThreads(
      new Request("http://localhost/api/v1/workspaces/ws_alpha/threads?sort=-updated_at"),
      "ws_alpha",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/api/v1/workspaces/ws_alpha/threads?sort=-updated_at",
      expect.objectContaining({
        cache: "no-store",
      }),
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
});
