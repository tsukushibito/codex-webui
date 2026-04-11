import type React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { HomeView } from "../src/home-view";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a className={className} href={href}>
      {children}
    </a>
  ),
}));

describe("HomeView", () => {
  it("renders workspace summaries and navigation entry points", () => {
    const markup = renderToStaticMarkup(
      <HomeView
        errorMessage={null}
        home={{
          workspaces: [
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
              pending_approval_count: 2,
            },
          ],
          resume_candidates: [
            {
              thread_id: "thread_approval",
              workspace_id: "ws_alpha",
              native_status: {
                thread_status: "active",
                active_flags: ["waitingOnApproval"],
                latest_turn_status: "inProgress",
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
        }}
        isLoading={false}
        isSubmitting={false}
        onCreateWorkspace={() => {}}
        onWorkspaceNameChange={() => {}}
        statusMessage={null}
        workspaceName=""
      />,
    );

    expect(markup).toContain("Resume candidates: 1");
    expect(markup).toContain("Resume thread");
    expect(markup).toContain("Needs your response");
    expect(markup).toContain("alpha");
    expect(markup).toContain("Open thread");
    expect(markup).toContain("Open thread shell");
    expect(markup).toContain("Request queue: 2");
    expect(markup).toContain("Create workspace");
  });
});
