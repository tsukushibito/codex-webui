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
  it("renders compact workspace context, switcher cues, and scoped navigation entry points", () => {
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
            {
              workspace_id: "ws_beta",
              workspace_name: "beta",
              created_at: "2026-03-27T05:12:34Z",
              updated_at: "2026-03-27T05:24:00Z",
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
            {
              thread_id: "thread_failed",
              workspace_id: "ws_beta",
              native_status: {
                thread_status: "idle",
                active_flags: [],
                latest_turn_status: "failed",
              },
              updated_at: "2026-03-27T05:24:00Z",
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
          ],
          updated_at: "2026-03-27T05:22:00Z",
        }}
        isLoading={false}
        isSubmitting={false}
        onCreateWorkspace={() => {}}
        onSelectedWorkspaceIdChange={() => {}}
        onWorkspaceNameChange={() => {}}
        selectedWorkspaceId="ws_alpha"
        statusMessage={null}
        workspaceName=""
      />,
    );

    expect(markup).toContain("Current workspace");
    expect(markup).toContain("Switch workspace");
    expect(markup).toContain('<details class="workspace-switcher">');
    expect(markup).toContain("<summary>Switch workspace</summary>");
    expect(markup).not.toContain('<details class="workspace-switcher" open="">');
    expect(markup).toContain('<select id="workspace-switcher"');
    expect(markup).toContain("alpha - 2 approvals");
    expect(markup).toContain("beta - Resume soon");
    expect(markup).toContain("Resume candidates: 2");
    expect(markup).toContain("Resume thread");
    expect(markup).toContain("/chat?workspaceId=ws_alpha&amp;threadId=thread_approval");
    expect(markup).toContain("/chat?workspaceId=ws_alpha");
    expect(markup).toContain("Needs your response");
    expect(markup).toContain("alpha");
    expect(markup).toContain("Ask Codex");
    expect(markup).toContain("Request queue: 2");
    expect(markup).toContain("Create workspace");
  });

  it("does not expose workspace-scoped chat links when no workspace exists", () => {
    const markup = renderToStaticMarkup(
      <HomeView
        errorMessage={null}
        home={{
          workspaces: [],
          resume_candidates: [],
          updated_at: "2026-03-27T05:22:00Z",
        }}
        isLoading={false}
        isSubmitting={false}
        onCreateWorkspace={() => {}}
        onSelectedWorkspaceIdChange={() => {}}
        onWorkspaceNameChange={() => {}}
        selectedWorkspaceId=""
        statusMessage={null}
        workspaceName=""
      />,
    );

    expect(markup).toContain("No workspace selected");
    expect(markup).toContain("Create a workspace to start a chat from Home.");
    expect(markup).toContain("No workspaces yet");
    expect(markup).not.toContain('href="/chat?workspaceId=');
  });
});
