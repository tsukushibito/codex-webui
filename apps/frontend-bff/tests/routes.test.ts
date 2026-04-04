import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  approveApproval,
  createSession,
  getApproval,
  getApprovalStream,
  getHome,
  getSessionStream,
  listEvents,
  listWorkspaces,
  stopSession,
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

  it("combines workspace summaries and approval summary for the Home response", async () => {
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
          pending_approval_count: 2,
          updated_at: "2026-03-27T05:22:00Z",
        }),
      );

    const response = await getHome(
      new Request("http://localhost/api/v1/home"),
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
      pending_approval_count: 2,
      updated_at: "2026-03-27T05:22:00Z",
    });
  });

  it("derives can_start from the workspace active session after session creation", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(
          {
            session_id: "thread_002",
            workspace_id: "ws_alpha",
            title: "Fix build error",
            status: "created",
            created_at: "2026-03-27T05:12:34Z",
            updated_at: "2026-03-27T05:12:34Z",
            started_at: null,
            last_message_at: null,
            active_approval_id: null,
            current_turn_id: null,
            app_session_overlay_state: "open",
          },
          201,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse({
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
          pending_approval_count: 0,
        }),
      );

    const response = await createSession(
      new Request("http://localhost/api/v1/workspaces/ws_alpha/sessions", {
        method: "POST",
        body: JSON.stringify({
          title: "Fix build error",
        }),
      }),
      "ws_alpha",
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      session_id: "thread_002",
      status: "created",
      can_send_message: false,
      can_start: false,
      can_stop: false,
    });
  });

  it("maps stop results and canceled approvals to the public shape", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          session: {
            session_id: "thread_001",
            workspace_id: "ws_alpha",
            title: "Fix build error",
            status: "stopped",
            created_at: "2026-03-27T05:12:34Z",
            updated_at: "2026-03-27T05:24:00Z",
            started_at: "2026-03-27T05:13:00Z",
            last_message_at: "2026-03-27T05:23:00Z",
            active_approval_id: null,
            current_turn_id: "turn_009",
            app_session_overlay_state: "closed",
          },
          canceled_approval: {
            approval_id: "apr_001",
            session_id: "thread_001",
            workspace_id: "ws_alpha",
            status: "canceled",
            resolution: "canceled",
            approval_category: "external_side_effect",
            summary: "Run git push",
            reason: "Codex requests permission to push changes to remote.",
            operation_summary: "git push origin main",
            context: null,
            created_at: "2026-03-27T05:18:00Z",
            resolved_at: "2026-03-27T05:24:00Z",
            native_request_kind: "approval_request",
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          workspace_id: "ws_alpha",
          workspace_name: "alpha",
          directory_name: "alpha",
          created_at: "2026-03-27T05:12:34Z",
          updated_at: "2026-03-27T05:24:00Z",
          active_session_id: null,
          active_session_summary: null,
          pending_approval_count: 0,
        }),
      );

    const response = await stopSession(
      new Request("http://localhost/api/v1/sessions/thread_001/stop", {
        method: "POST",
      }),
      "thread_001",
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      session: {
        session_id: "thread_001",
        workspace_id: "ws_alpha",
        title: "Fix build error",
        status: "stopped",
        created_at: "2026-03-27T05:12:34Z",
        updated_at: "2026-03-27T05:24:00Z",
        started_at: "2026-03-27T05:13:00Z",
        last_message_at: "2026-03-27T05:23:00Z",
        active_approval_id: null,
        can_send_message: false,
        can_start: false,
        can_stop: false,
      },
      canceled_approval: {
        approval_id: "apr_001",
        session_id: "thread_001",
        workspace_id: "ws_alpha",
        status: "canceled",
        resolution: "canceled",
        approval_category: "external_side_effect",
        title: "Run git push",
        description: "Codex requests permission to push changes to remote.",
        requested_at: "2026-03-27T05:18:00Z",
        resolved_at: "2026-03-27T05:24:00Z",
      },
    });
  });

  it("maps approval detail and approval action responses to public fields", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        approval_id: "apr_001",
        session_id: "thread_001",
        workspace_id: "ws_alpha",
        status: "pending",
        resolution: null,
        approval_category: "external_side_effect",
        summary: "Run git push",
        reason: "Codex requests permission to push changes to remote.",
        operation_summary: "git push origin main",
        context: {
          command: "git push origin main",
        },
        created_at: "2026-03-27T05:18:00Z",
        resolved_at: null,
        native_request_kind: "approval_request",
      }),
    );

    const detailResponse = await getApproval(
      new Request("http://localhost/api/v1/approvals/apr_001"),
      "apr_001",
    );

    expect(detailResponse.status).toBe(200);
    expect(await detailResponse.json()).toEqual({
      approval_id: "apr_001",
      session_id: "thread_001",
      workspace_id: "ws_alpha",
      status: "pending",
      resolution: null,
      approval_category: "external_side_effect",
      title: "Run git push",
      description: "Codex requests permission to push changes to remote.",
      operation_summary: "git push origin main",
      requested_at: "2026-03-27T05:18:00Z",
      resolved_at: null,
      context: {
        command: "git push origin main",
      },
    });

    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          approval: {
            approval_id: "apr_001",
            session_id: "thread_001",
            workspace_id: "ws_alpha",
            status: "approved",
            resolution: "approved",
            approval_category: "external_side_effect",
            summary: "Run git push",
            reason: "Codex requests permission to push changes to remote.",
            operation_summary: "git push origin main",
            context: {
              command: "git push origin main",
            },
            created_at: "2026-03-27T05:18:00Z",
            resolved_at: "2026-03-27T05:19:00Z",
            native_request_kind: "approval_request",
          },
          session: {
            session_id: "thread_001",
            workspace_id: "ws_alpha",
            title: "Fix build error",
            status: "running",
            created_at: "2026-03-27T05:12:34Z",
            updated_at: "2026-03-27T05:19:00Z",
            started_at: "2026-03-27T05:13:00Z",
            last_message_at: "2026-03-27T05:18:00Z",
            active_approval_id: null,
            current_turn_id: "turn_009",
            app_session_overlay_state: "open",
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          workspace_id: "ws_alpha",
          workspace_name: "alpha",
          directory_name: "alpha",
          created_at: "2026-03-27T05:12:34Z",
          updated_at: "2026-03-27T05:19:00Z",
          active_session_id: "thread_001",
          active_session_summary: {
            session_id: "thread_001",
            status: "running",
            last_message_at: "2026-03-27T05:18:00Z",
          },
          pending_approval_count: 0,
        }),
      );

    const actionResponse = await approveApproval(
      new Request("http://localhost/api/v1/approvals/apr_001/approve", {
        method: "POST",
      }),
      "apr_001",
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:3001/api/v1/approvals/apr_001/resolve",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          resolution: "approved",
        }),
      }),
    );

    expect(actionResponse.status).toBe(200);
    expect(await actionResponse.json()).toEqual({
      approval: {
        approval_id: "apr_001",
        session_id: "thread_001",
        workspace_id: "ws_alpha",
        status: "approved",
        resolution: "approved",
        approval_category: "external_side_effect",
        title: "Run git push",
        description: "Codex requests permission to push changes to remote.",
        requested_at: "2026-03-27T05:18:00Z",
        resolved_at: "2026-03-27T05:19:00Z",
      },
      session: {
        session_id: "thread_001",
        workspace_id: "ws_alpha",
        title: "Fix build error",
        status: "running",
        created_at: "2026-03-27T05:12:34Z",
        updated_at: "2026-03-27T05:19:00Z",
        started_at: "2026-03-27T05:13:00Z",
        last_message_at: "2026-03-27T05:18:00Z",
        active_approval_id: null,
        can_send_message: false,
        can_start: false,
        can_stop: true,
      },
    });
  });

  it("removes native_event_name from public event responses", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            event_id: "evt_001",
            session_id: "thread_001",
            event_type: "approval.requested",
            sequence: 8,
            occurred_at: "2026-03-27T05:18:00Z",
            payload: {
              approval_id: "apr_001",
              summary: "Run git push",
            },
            native_event_name: "request/started",
          },
        ],
        next_cursor: null,
        has_more: false,
      }),
    );

    const response = await listEvents(
      new Request("http://localhost/api/v1/sessions/thread_001/events"),
      "thread_001",
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [
        {
          event_id: "evt_001",
          session_id: "thread_001",
          event_type: "approval.requested",
          sequence: 8,
          occurred_at: "2026-03-27T05:18:00Z",
          payload: {
            approval_id: "apr_001",
            summary: "Run git push",
          },
        },
      ],
      next_cursor: null,
      has_more: false,
    });
  });

  it("relays session stream events using the public envelope", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        ": connected\n\n",
        `data: ${JSON.stringify({
          event_id: "evt_001",
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
      ]),
    );

    const response = await getSessionStream(
      new Request("http://localhost/api/v1/sessions/thread_001/stream"),
      "thread_001",
    );

    expect(response.headers.get("content-type")).toContain("text/event-stream");
    await expect(response.text()).resolves.toContain(
      `data: ${JSON.stringify({
        event_id: "evt_001",
        session_id: "thread_001",
        event_type: "message.assistant.delta",
        sequence: 12,
        occurred_at: "2026-03-27T05:20:10Z",
        payload: {
          message_id: "msg_assistant_003",
          delta: "Updated the config",
        },
      })}`,
    );
  });

  it("maps approval stream payloads from summary to title", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        `data: ${JSON.stringify({
          event_id: "evt_apr_001",
          session_id: "thread_001",
          event_type: "approval.requested",
          occurred_at: "2026-03-27T05:18:00Z",
          payload: {
            approval_id: "apr_001",
            workspace_id: "ws_alpha",
            summary: "Run git push",
            approval_category: "external_side_effect",
          },
          native_event_name: "request/started",
        })}\n\n`,
      ]),
    );

    const response = await getApprovalStream(
      new Request("http://localhost/api/v1/approvals/stream"),
    );

    expect(response.headers.get("content-type")).toContain("text/event-stream");
    await expect(response.text()).resolves.toContain(
      `data: ${JSON.stringify({
        event_id: "evt_apr_001",
        session_id: "thread_001",
        event_type: "approval.requested",
        occurred_at: "2026-03-27T05:18:00Z",
        payload: {
          approval_id: "apr_001",
          workspace_id: "ws_alpha",
          title: "Run git push",
          approval_category: "external_side_effect",
        },
      })}`,
    );
  });

  it("returns a public runtime-unavailable error when codex-runtime cannot be reached", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));

    const response = await listWorkspaces(
      new Request("http://localhost/api/v1/workspaces"),
    );

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
