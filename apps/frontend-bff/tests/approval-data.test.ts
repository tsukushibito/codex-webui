import { describe, expect, it, vi } from "vitest";

import {
  approveApproval,
  fetchApprovalDetail,
  fetchPendingApprovals,
} from "../src/approval-data";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

describe("approval data access", () => {
  it("loads the pending approval queue from the public API", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            approval_id: "apr_001",
            session_id: "thread_001",
            workspace_id: "ws_alpha",
            status: "pending",
            resolution: null,
            approval_category: "external_side_effect",
            title: "Run git push",
            description: "Codex requests permission to push changes to remote.",
            requested_at: "2026-03-27T05:18:00Z",
            resolved_at: null,
          },
        ],
        next_cursor: null,
        has_more: false,
      }),
    );

    const result = await fetchPendingApprovals(fetchMock);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/approvals?status=pending&sort=-requested_at",
      {
        cache: "no-store",
        headers: {
          accept: "application/json",
        },
      },
    );
    expect(result.items[0]?.approval_id).toBe("apr_001");
  });

  it("loads details and resolves approvals through the public API", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
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
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
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
        }),
      );

    const detail = await fetchApprovalDetail("apr_001", fetchMock);
    const result = await approveApproval("apr_001", fetchMock);

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/v1/approvals/apr_001", {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/approvals/apr_001/approve",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      },
    );
    expect(detail.operation_summary).toBe("git push origin main");
    expect(result.approval.status).toBe("approved");
  });
});
