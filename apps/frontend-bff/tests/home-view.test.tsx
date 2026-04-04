import React from "react";
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
          pending_approval_count: 3,
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

    expect(markup).toContain("Pending approvals: 3");
    expect(markup).toContain("alpha");
    expect(markup).toContain("Go to Chat");
    expect(markup).toContain("Review approvals");
    expect(markup).toContain("Create workspace");
  });
});
