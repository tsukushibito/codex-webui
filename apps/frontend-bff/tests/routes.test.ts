import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as approvalActionApproveRoute from "../app/api/v1/approvals/[approvalId]/approve/route";
import * as approvalActionDenyRoute from "../app/api/v1/approvals/[approvalId]/deny/route";
import * as approvalDetailRoute from "../app/api/v1/approvals/[approvalId]/route";
import * as approvalListRoute from "../app/api/v1/approvals/route";
import * as approvalStreamRoute from "../app/api/v1/approvals/stream/route";
import * as sessionEventsRoute from "../app/api/v1/sessions/[sessionId]/events/route";
import * as sessionMessagesRoute from "../app/api/v1/sessions/[sessionId]/messages/route";
import * as sessionDetailRoute from "../app/api/v1/sessions/[sessionId]/route";
import * as sessionStartRoute from "../app/api/v1/sessions/[sessionId]/start/route";
import * as sessionStopRoute from "../app/api/v1/sessions/[sessionId]/stop/route";
import * as sessionStreamRoute from "../app/api/v1/sessions/[sessionId]/stream/route";
import * as workspaceSessionsRoute from "../app/api/v1/workspaces/[workspaceId]/sessions/route";
import {
  getHome,
  getNotificationsStream,
  getPendingRequest,
  getRequestDetail,
  getThread,
  getThreadStream,
  getThreadView,
  getTimeline,
  listThreads,
  listWorkspaces,
  postRequestResponse,
  postThreadInput,
  postThreadInterrupt,
  postWorkspaceInput,
} from "../src/handlers";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

function sseResponse(frames: string[]) {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const frame of frames) {
          controller.enqueue(encoder.encode(frame));
        }
        controller.close();
      },
    }),
    {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
      },
    },
  );
}

describe("frontend-bff route handlers", () => {
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
      "http://127.0.0.1:3001/api/v1/workspaces/ws_alpha/threads?sort=-updated_at",
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
        code: "session_not_found",
        message: "thread list missing",
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

  it("maps thread snapshots to the public thread facade", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        thread_id: "thread_001",
        workspace_id: "ws_alpha",
        title: "Investigate build",
        created_at: "2026-03-27T05:12:34Z",
        updated_at: "2026-03-27T05:22:00Z",
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
      }),
    );

    const response = await getThread(
      new Request("http://localhost/api/v1/threads/thread_001"),
      "thread_001",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/api/v1/threads/thread_001",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      thread_id: "thread_001",
      workspace_id: "ws_alpha",
      native_status: {
        thread_status: "idle",
        active_flags: [],
        latest_turn_status: "completed",
      },
      updated_at: "2026-03-27T05:22:00Z",
    });
  });

  it("forwards workspace input requests and maps accepted results to the public shape", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          thread: {
            thread_id: "thread_002",
            workspace_id: "ws_alpha",
            title: "Investigate build",
            created_at: "2026-03-27T05:12:34Z",
            updated_at: "2026-03-27T05:22:00Z",
            native_status: {
              thread_status: "running",
              active_flags: [],
              latest_turn_status: "running",
            },
            derived_hints: {
              accepting_user_input: false,
              has_pending_request: false,
              blocked_reason: null,
            },
          },
        },
        202,
      ),
    );

    const response = await postWorkspaceInput(
      new Request("http://localhost/api/v1/workspaces/ws_alpha/inputs", {
        method: "POST",
        body: JSON.stringify({
          client_request_id: "input_001",
          content: "Please investigate the build failure.",
        }),
      }),
      "ws_alpha",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/api/v1/workspaces/ws_alpha/inputs",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          client_request_id: "input_001",
          content: "Please investigate the build failure.",
        }),
      }),
    );
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({
      accepted: {
        thread_id: "thread_002",
        turn_id: null,
        input_item_id: null,
      },
      thread: {
        thread_id: "thread_002",
        workspace_id: "ws_alpha",
        native_status: {
          thread_status: "running",
          active_flags: [],
          latest_turn_status: "running",
        },
        updated_at: "2026-03-27T05:22:00Z",
      },
    });
  });

  it("forwards thread input requests and maps accepted results to the public shape", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          thread: {
            thread_id: "thread_001",
            workspace_id: "ws_alpha",
            title: "Investigate build",
            created_at: "2026-03-27T05:12:34Z",
            updated_at: "2026-03-27T05:23:00Z",
            native_status: {
              thread_status: "running",
              active_flags: [],
              latest_turn_status: "running",
            },
            derived_hints: {
              accepting_user_input: false,
              has_pending_request: false,
              blocked_reason: null,
            },
          },
          accepted_input: {
            message_id: "msg_001",
            session_id: "thread_001",
            role: "user",
            content: "Show me the root cause.",
            created_at: "2026-03-27T05:23:00Z",
            source_item_type: "user_message",
          },
        },
        202,
      ),
    );

    const response = await postThreadInput(
      new Request("http://localhost/api/v1/threads/thread_001/inputs", {
        method: "POST",
        body: JSON.stringify({
          client_request_id: "input_002",
          content: "Show me the root cause.",
        }),
      }),
      "thread_001",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/api/v1/threads/thread_001/inputs",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          client_request_id: "input_002",
          content: "Show me the root cause.",
        }),
      }),
    );
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({
      accepted: {
        thread_id: "thread_001",
        turn_id: null,
        input_item_id: "msg_001",
      },
      thread: {
        thread_id: "thread_001",
        workspace_id: "ws_alpha",
        native_status: {
          thread_status: "running",
          active_flags: [],
          latest_turn_status: "running",
        },
        updated_at: "2026-03-27T05:23:00Z",
      },
    });
  });

  it("forwards thread interrupts and maps runtime thread wrappers to the public thread facade", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        thread: {
          thread_id: "thread_001",
          workspace_id: "ws_alpha",
          title: "Investigate build",
          created_at: "2026-03-27T05:12:34Z",
          updated_at: "2026-03-27T05:24:00Z",
          native_status: {
            thread_status: "idle",
            active_flags: [],
            latest_turn_status: "interrupted",
          },
          derived_hints: {
            accepting_user_input: true,
            has_pending_request: false,
            blocked_reason: null,
          },
        },
      }),
    );

    const response = await postThreadInterrupt(
      new Request("http://localhost/api/v1/threads/thread_001/interrupt", {
        method: "POST",
      }),
      "thread_001",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/api/v1/threads/thread_001/interrupt",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      thread_id: "thread_001",
      workspace_id: "ws_alpha",
      native_status: {
        thread_status: "idle",
        active_flags: [],
        latest_turn_status: "interrupted",
      },
      updated_at: "2026-03-27T05:24:00Z",
    });
  });

  it("forwards request responses and maps resolved request results to the public action shape", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        request: {
          request_id: "req_001",
          thread_id: "thread_001",
          turn_id: "turn_001",
          item_id: "item_001",
          request_kind: "approval",
          status: "resolved",
          decision: "approved",
          risk_classification: "external_side_effect",
          operation_summary: "git push origin main",
          reason: "Codex requests permission to push changes to remote.",
          summary: "Run git push",
          requested_at: "2026-03-27T05:20:00Z",
          responded_at: "2026-03-27T05:21:00Z",
          context: null,
        },
        thread: {
          thread_id: "thread_001",
          workspace_id: "ws_alpha",
          title: "Investigate build",
          created_at: "2026-03-27T05:12:34Z",
          updated_at: "2026-03-27T05:21:00Z",
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
      }),
    );

    const response = await postRequestResponse(
      new Request("http://localhost/api/v1/requests/req_001/response", {
        method: "POST",
        body: JSON.stringify({
          client_response_id: "resp_001",
          decision: "approved",
        }),
      }),
      "req_001",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/api/v1/requests/req_001/response",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          client_response_id: "resp_001",
          decision: "approved",
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      request: {
        request_id: "req_001",
        status: "resolved",
        decision: "approved",
        responded_at: "2026-03-27T05:21:00Z",
      },
      thread: {
        thread_id: "thread_001",
        workspace_id: "ws_alpha",
        native_status: {
          thread_status: "running",
          active_flags: [],
          latest_turn_status: "running",
        },
        updated_at: "2026-03-27T05:21:00Z",
      },
    });
  });

  it("passes through request response conflict envelopes unchanged", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          error: {
            code: "idempotency_conflict",
            message: "request response id conflicts with an existing decision",
            details: {
              request_id: "req_001",
              client_response_id: "resp_001",
            },
          },
        },
        409,
      ),
    );

    const response = await postRequestResponse(
      new Request("http://localhost/api/v1/requests/req_001/response", {
        method: "POST",
        body: JSON.stringify({
          client_response_id: "resp_001",
          decision: "denied",
        }),
      }),
      "req_001",
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: {
        code: "idempotency_conflict",
        message: "request response id conflicts with an existing decision",
        details: {
          request_id: "req_001",
          client_response_id: "resp_001",
        },
      },
    });
  });

  it("preserves pending_request null semantics", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        thread_id: "thread_001",
        pending_request: null,
        latest_resolved_request: null,
        checked_at: "2026-03-27T05:22:00Z",
      }),
    );

    const response = await getPendingRequest(
      new Request("http://localhost/api/v1/threads/thread_001/pending_request"),
      "thread_001",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/api/v1/threads/thread_001/pending_request",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      thread_id: "thread_001",
      pending_request: null,
      latest_resolved_request: null,
      checked_at: "2026-03-27T05:22:00Z",
    });
  });

  it("maps thread_view helper responses to the public aggregate", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          thread: {
            thread_id: "thread_001",
            workspace_id: "ws_alpha",
            title: "Investigate build",
            created_at: "2026-03-27T05:12:34Z",
            updated_at: "2026-03-27T05:22:00Z",
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
          pending_request: null,
          latest_resolved_request: null,
          checked_at: "2026-03-27T05:22:00Z",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              timeline_item_id: "evt_001",
              thread_id: "thread_001",
              sequence: 42,
              item_kind: "message.user",
              occurred_at: "2026-03-27T05:22:10Z",
              summary: "user input accepted",
              content: "Please explain the diff.",
              request_id: null,
            },
            {
              timeline_item_id: "evt_002",
              thread_id: "thread_001",
              sequence: 43,
              item_kind: "message.assistant.completed",
              occurred_at: "2026-03-27T05:22:12Z",
              summary: "assistant completed",
              content: "Here is the explanation.",
              request_id: null,
            },
          ],
          next_cursor: null,
          has_more: false,
        }),
      );

    const response = await getThreadView(
      new Request("http://localhost/api/v1/threads/thread_001/view"),
      "thread_001",
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:3001/api/v1/threads/thread_001/view",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://127.0.0.1:3001/api/v1/threads/thread_001/timeline",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      thread: {
        thread_id: "thread_001",
        workspace_id: "ws_alpha",
        native_status: {
          thread_status: "idle",
          active_flags: [],
          latest_turn_status: "completed",
        },
        updated_at: "2026-03-27T05:22:00Z",
      },
      current_activity: {
        kind: "waiting_on_user_input",
        label: "Waiting for your input",
      },
      pending_request: null,
      latest_resolved_request: null,
      composer: {
        accepting_user_input: true,
        interrupt_available: false,
        blocked_by_request: false,
      },
      timeline: {
        items: [
          {
            timeline_item_id: "evt_001",
            thread_id: "thread_001",
            turn_id: null,
            item_id: null,
            sequence: 42,
            occurred_at: "2026-03-27T05:22:10Z",
            kind: "message.user",
            payload: {
              summary: "user input accepted",
              content: "Please explain the diff.",
            },
          },
          {
            timeline_item_id: "evt_002",
            thread_id: "thread_001",
            turn_id: null,
            item_id: null,
            sequence: 43,
            occurred_at: "2026-03-27T05:22:12Z",
            kind: "message.assistant.completed",
            payload: {
              summary: "assistant completed",
              content: "Here is the explanation.",
            },
          },
        ],
        next_cursor: null,
        has_more: false,
      },
    });
  });

  it("maps thread timeline responses to public timeline_item projections", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            timeline_item_id: "evt_001",
            thread_id: "thread_001",
            sequence: 42,
            item_kind: "request.started",
            occurred_at: "2026-03-27T05:22:10Z",
            summary: "approval requested",
            request_id: "req_001",
          },
        ],
        next_cursor: null,
        has_more: false,
      }),
    );

    const response = await getTimeline(
      new Request("http://localhost/api/v1/threads/thread_001/timeline?sort=-sequence"),
      "thread_001",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/api/v1/threads/thread_001/timeline?sort=-sequence",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [
        {
          timeline_item_id: "evt_001",
          thread_id: "thread_001",
          turn_id: null,
          item_id: null,
          sequence: 42,
          occurred_at: "2026-03-27T05:22:10Z",
          kind: "request.started",
          payload: {
            summary: "approval requested",
            request_id: "req_001",
          },
        },
      ],
      next_cursor: null,
      has_more: false,
    });
  });

  it("maps request detail responses to the public helper facade", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        request_id: "req_001",
        thread_id: "thread_001",
        turn_id: "turn_001",
        item_id: "item_001",
        request_kind: "approval",
        status: "pending",
        decision: null,
        risk_classification: "external_side_effect",
        operation_summary: "git push origin main",
        reason: "Codex requests permission to push changes to remote.",
        summary: "Run git push",
        requested_at: "2026-03-27T05:20:00Z",
        responded_at: null,
        context: {
          repo: "tsukushibito/codex-webui",
        },
      }),
    );

    const response = await getRequestDetail(
      new Request("http://localhost/api/v1/requests/req_001"),
      "req_001",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/api/v1/requests/req_001",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      request_id: "req_001",
      thread_id: "thread_001",
      turn_id: "turn_001",
      item_id: "item_001",
      request_kind: "approval",
      status: "pending",
      risk_category: "external_side_effect",
      summary: "Run git push",
      reason: "Codex requests permission to push changes to remote.",
      operation_summary: "git push origin main",
      requested_at: "2026-03-27T05:20:00Z",
      responded_at: null,
      decision: null,
      decision_options: {
        policy_scope_supported: false,
        default_policy_scope: "once",
      },
      context: {
        repo: "tsukushibito/codex-webui",
      },
    });
  });

  it("returns retired quarantine envelopes for legacy session route modules", async () => {
    const routes = [
      workspaceSessionsRoute.GET,
      workspaceSessionsRoute.POST,
      sessionDetailRoute.GET,
      sessionStartRoute.POST,
      sessionStopRoute.POST,
      sessionEventsRoute.GET,
      sessionMessagesRoute.GET,
      sessionMessagesRoute.POST,
      sessionStreamRoute.GET,
    ];

    for (const route of routes) {
      const response = route();

      expect(response.status).toBe(410);
      expect(await response.json()).toEqual({
        error: {
          code: "legacy_route_retired",
          message:
            "Legacy sessions routes are retired; use v0.9 thread and request endpoints instead.",
          details: {
            route_family: "sessions",
            replacement_endpoints: [
              "/api/v1/workspaces/{workspace_id}/threads",
              "/api/v1/threads/{thread_id}",
              "/api/v1/threads/{thread_id}/view",
              "/api/v1/threads/{thread_id}/pending_request",
              "/api/v1/requests/{request_id}",
              "/api/v1/requests/{request_id}/response",
            ],
          },
        },
      });
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns retired quarantine envelopes for standalone approval route modules", async () => {
    const routes = [
      approvalListRoute.GET,
      approvalDetailRoute.GET,
      approvalActionApproveRoute.POST,
      approvalActionDenyRoute.POST,
      approvalStreamRoute.GET,
    ];

    for (const route of routes) {
      const response = route();

      expect(response.status).toBe(410);
      expect(await response.json()).toEqual({
        error: {
          code: "legacy_route_retired",
          message:
            "Legacy approvals routes are retired; use v0.9 thread and request endpoints instead.",
          details: {
            route_family: "approvals",
            replacement_endpoints: [
              "/api/v1/workspaces/{workspace_id}/threads",
              "/api/v1/threads/{thread_id}",
              "/api/v1/threads/{thread_id}/view",
              "/api/v1/threads/{thread_id}/pending_request",
              "/api/v1/requests/{request_id}",
              "/api/v1/requests/{request_id}/response",
            ],
          },
        },
      });
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("relays thread stream events on the v0.9 thread stream path", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        ": connected\n\n",
        `data: ${JSON.stringify({
          event_id: "evt_thread_001",
          session_id: "thread_001",
          event_type: "message.assistant.delta",
          sequence: 12,
          occurred_at: "2026-03-27T05:20:10Z",
          payload: {
            message_id: "msg_assistant_003",
            delta: "Updated the config",
          },
          native_event_name: "item/delta",
        })}\n\n`,
        `data: ${JSON.stringify({
          event_id: "evt_thread_002",
          session_id: "thread_001",
          event_type: "message.assistant.completed",
          sequence: 13,
          occurred_at: "2026-03-27T05:20:12Z",
          payload: {
            message_id: "msg_assistant_003",
            content: "Updated the config and tests.",
          },
          native_event_name: "item/completed",
        })}\n\n`,
      ]),
    );

    const request = new Request("http://localhost/api/v1/threads/thread_001/stream");
    const response = await getThreadStream(request, "thread_001");

    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("x-accel-buffering")).toBe("no");
    const responseBody = await response.text();
    expect(responseBody).toContain(": stream-open");
    expect(responseBody).toContain(
      `data: ${JSON.stringify({
        event_id: "evt_thread_001",
        thread_id: "thread_001",
        event_type: "message.assistant.delta",
        sequence: 12,
        occurred_at: "2026-03-27T05:20:10Z",
        payload: {
          message_id: "msg_assistant_003",
          delta: "Updated the config",
        },
      })}`,
    );
    expect(responseBody).toContain(
      `data: ${JSON.stringify({
        event_id: "evt_thread_002",
        thread_id: "thread_001",
        event_type: "message.assistant.completed",
        sequence: 13,
        occurred_at: "2026-03-27T05:20:12Z",
        payload: {
          message_id: "msg_assistant_003",
          content: "Updated the config and tests.",
        },
      })}`,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/api/v1/threads/thread_001/stream",
      expect.objectContaining({
        headers: {
          accept: "text/event-stream",
        },
        cache: "no-store",
        signal: request.signal,
      }),
    );
  });

  it("relays notifications stream events on the v0.9 notifications path", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        `data: ${JSON.stringify({
          thread_id: "thread_001",
          event_type: "resume_candidate_changed",
          occurred_at: "2026-03-27T05:20:10Z",
          high_priority: true,
        })}\n\n`,
      ]),
    );

    const request = new Request("http://localhost/api/v1/notifications/stream");
    const response = await getNotificationsStream(request);

    expect(response.headers.get("content-type")).toContain("text/event-stream");
    await expect(response.text()).resolves.toContain(
      `data: ${JSON.stringify({
        thread_id: "thread_001",
        event_type: "resume_candidate_changed",
        occurred_at: "2026-03-27T05:20:10Z",
        high_priority: true,
      })}`,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/api/v1/notifications/stream",
      expect.objectContaining({
        headers: {
          accept: "text/event-stream",
        },
        cache: "no-store",
        signal: request.signal,
      }),
    );
  });

  it("returns a public runtime-unavailable error when codex-runtime cannot be reached", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));

    const response = await listWorkspaces(new Request("http://localhost/api/v1/workspaces"));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: {
        code: "session_runtime_error",
        message: "backend dependency temporarily unavailable",
        details: {
          cause: "connect ECONNREFUSED",
        },
      },
    });
  });
});
