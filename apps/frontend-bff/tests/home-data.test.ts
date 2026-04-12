import { describe, expect, it, vi } from "vitest";

import { createWorkspaceFromHome, fetchHomeData } from "../src/home-data";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

describe("home data access", () => {
  it("loads the Home aggregate from the public API", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        workspaces: [
          {
            workspace_id: "ws_alpha",
            workspace_name: "alpha",
            created_at: "2026-03-27T05:12:34Z",
            updated_at: "2026-03-27T05:22:00Z",
            active_session_summary: null,
            pending_approval_count: 0,
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
        ],
        updated_at: "2026-03-27T05:22:00Z",
      }),
    );

    const result = await fetchHomeData(fetchMock);

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/home", {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });
    expect(result.resume_candidates).toHaveLength(1);
    expect(result.workspaces[0]?.workspace_name).toBe("alpha");
  });

  it("posts workspace creation through the public workspace endpoint", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse(
        {
          workspace_id: "ws_alpha",
          workspace_name: "alpha",
          directory_name: "alpha",
          created_at: "2026-03-27T05:12:34Z",
          updated_at: "2026-03-27T05:12:34Z",
          active_session_id: null,
          active_session_summary: null,
          pending_approval_count: 0,
        },
        201,
      ),
    );

    const result = await createWorkspaceFromHome("alpha", fetchMock);

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/workspaces", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        workspace_name: "alpha",
      }),
    });
    expect(result.workspace_name).toBe("alpha");
  });
});
