import { describe, expect, it, vi } from "vitest";

import {
  createSessionFromChat,
  listWorkspaceSessions,
  loadChatSessionBundle,
  sendSessionMessage,
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
  it("loads workspace sessions from the public API", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            session_id: "thread_001",
            workspace_id: "ws_alpha",
            title: "Fix build error",
            status: "waiting_input",
            created_at: "2026-03-27T05:12:34Z",
            updated_at: "2026-03-27T05:22:00Z",
            started_at: "2026-03-27T05:13:00Z",
            last_message_at: "2026-03-27T05:21:40Z",
            active_approval_id: null,
            can_send_message: true,
            can_start: false,
            can_stop: true,
          },
        ],
        next_cursor: null,
        has_more: false,
      }),
    );

    const result = await listWorkspaceSessions("ws_alpha", fetchMock);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/workspaces/ws_alpha/sessions?sort=-updated_at",
      {
        cache: "no-store",
        headers: {
          accept: "application/json",
        },
      },
    );
    expect(result.items[0]?.session_id).toBe("thread_001");
  });

  it("creates sessions and sends messages through the public API", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            session_id: "thread_002",
            workspace_id: "ws_alpha",
            title: "Review docs",
            status: "created",
            created_at: "2026-03-27T05:12:34Z",
            updated_at: "2026-03-27T05:12:34Z",
            started_at: null,
            last_message_at: null,
            active_approval_id: null,
            can_send_message: false,
            can_start: true,
            can_stop: false,
          },
          201,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            message_id: "msg_user_001",
            session_id: "thread_002",
            role: "user",
            content: "Please explain the changes.",
            created_at: "2026-03-27T05:15:00Z",
          },
          202,
        ),
      );

    const session = await createSessionFromChat("ws_alpha", "Review docs", fetchMock);
    const message = await sendSessionMessage(
      "thread_002",
      "Please explain the changes.",
      "msgclient_001",
      fetchMock,
    );

    expect(session.title).toBe("Review docs");
    expect(message.message_id).toBe("msg_user_001");
  });

  it("loads session, messages, and events in parallel for a chat refresh", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          session_id: "thread_001",
          workspace_id: "ws_alpha",
          title: "Fix build error",
          status: "waiting_input",
          created_at: "2026-03-27T05:12:34Z",
          updated_at: "2026-03-27T05:22:00Z",
          started_at: "2026-03-27T05:13:00Z",
          last_message_at: "2026-03-27T05:21:40Z",
          active_approval_id: null,
          can_send_message: true,
          can_start: false,
          can_stop: true,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [],
          next_cursor: null,
          has_more: false,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              event_id: "evt_001",
              session_id: "thread_001",
              event_type: "session.status_changed",
              sequence: 1,
              occurred_at: "2026-03-27T05:13:00Z",
              payload: {
                from_status: "created",
                to_status: "running",
              },
            },
          ],
          next_cursor: null,
          has_more: false,
        }),
      );

    const bundle = await loadChatSessionBundle("thread_001", fetchMock);

    expect(bundle.session.session_id).toBe("thread_001");
    expect(bundle.events[0]?.event_type).toBe("session.status_changed");
  });
});
