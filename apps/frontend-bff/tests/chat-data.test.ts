import { describe, expect, it, vi } from "vitest";

import {
  getRequestDetail,
  interruptThreadFromChat,
  listWorkspaceThreads,
  loadChatThreadBundle,
  respondToPendingRequest,
  sendThreadInput,
  startThreadFromChat,
} from "../src/chat-data";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

describe("chat data access", () => {
  it("loads workspace threads from the v0.9 public API", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            thread_id: "thread_001",
            workspace_id: "ws_alpha",
            native_status: {
              thread_status: "running",
              active_flags: [],
              latest_turn_status: "running",
            },
            updated_at: "2026-03-27T05:22:00Z",
            current_activity: {
              kind: "running",
              label: "Running",
            },
            badge: null,
            blocked_cue: null,
            resume_cue: null,
          },
        ],
        next_cursor: null,
        has_more: false,
      }),
    );

    const result = await listWorkspaceThreads("ws_alpha", fetchMock);

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/workspaces/ws_alpha/threads?sort=-updated_at", {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });
    expect(result.items[0]?.thread_id).toBe("thread_001");
  });

  it("starts a thread from first input and sends follow-up input through thread endpoints", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            accepted: {
              thread_id: "thread_002",
              turn_id: "turn_001",
              input_item_id: "item_001",
            },
            thread: {
              thread_id: "thread_002",
              workspace_id: "ws_alpha",
              native_status: {
                thread_status: "running",
                active_flags: [],
                latest_turn_status: "running",
              },
              updated_at: "2026-03-27T05:15:00Z",
            },
          },
          202,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            accepted: {
              thread_id: "thread_002",
              turn_id: "turn_002",
              input_item_id: "item_002",
            },
            thread: {
              thread_id: "thread_002",
              workspace_id: "ws_alpha",
              native_status: {
                thread_status: "running",
                active_flags: [],
                latest_turn_status: "running",
              },
              updated_at: "2026-03-27T05:16:00Z",
            },
          },
          202,
        ),
      );

    const started = await startThreadFromChat(
      "ws_alpha",
      "Review docs",
      "input_start_001",
      fetchMock,
    );
    const reply = await sendThreadInput(
      "thread_002",
      "Please explain the changes.",
      "input_followup_001",
      fetchMock,
    );

    expect(started.thread.thread_id).toBe("thread_002");
    expect(reply.accepted.input_item_id).toBe("item_002");
  });

  it("loads thread view and pending request detail for chat refresh", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          thread: {
            thread_id: "thread_001",
            workspace_id: "ws_alpha",
            native_status: {
              thread_status: "running",
              active_flags: ["waiting_on_request"],
              latest_turn_status: "running",
            },
            updated_at: "2026-03-27T05:22:00Z",
          },
          current_activity: {
            kind: "waiting_on_approval",
            label: "Approval required",
          },
          pending_request: {
            request_id: "req_001",
            thread_id: "thread_001",
            turn_id: "turn_001",
            item_id: "item_001",
            request_kind: "approval",
            status: "pending",
            risk_category: "external_side_effect",
            summary: "Run git push",
            requested_at: "2026-03-27T05:20:00Z",
          },
          latest_resolved_request: null,
          composer: {
            accepting_user_input: false,
            interrupt_available: true,
            blocked_by_request: true,
          },
          timeline: {
            items: [],
            next_cursor: null,
            has_more: false,
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
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
          context: null,
        }),
      );

    const bundle = await loadChatThreadBundle("thread_001", fetchMock);

    expect(bundle.view.thread.thread_id).toBe("thread_001");
    expect(bundle.pendingRequestDetail?.request_id).toBe("req_001");
  });

  it("loads request detail, submits a request response, and interrupts a thread", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
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
          context: null,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
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
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          thread_id: "thread_001",
          workspace_id: "ws_alpha",
          native_status: {
            thread_status: "idle",
            active_flags: [],
            latest_turn_status: "interrupted",
          },
          updated_at: "2026-03-27T05:22:00Z",
        }),
      );

    const detail = await getRequestDetail("req_001", fetchMock);
    const response = await respondToPendingRequest(
      "req_001",
      "approved",
      "response_001",
      fetchMock,
    );
    const interrupted = await interruptThreadFromChat("thread_001", fetchMock);

    expect(detail.request_id).toBe("req_001");
    expect(response.request.decision).toBe("approved");
    expect(interrupted.thread_id).toBe("thread_001");
  });
});
