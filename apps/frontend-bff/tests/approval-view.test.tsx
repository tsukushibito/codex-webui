import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ApprovalView } from "../src/approval-view";

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

describe("ApprovalView", () => {
  it("renders the pending queue, minimum confirmation information, and actions", () => {
    const markup = renderToStaticMarkup(
      <ApprovalView
        approvals={[
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
        ]}
        connectionState="live"
        errorMessage={null}
        isLoadingApprovals={false}
        isLoadingDetail={false}
        isSubmitting={false}
        onApprove={() => {}}
        onDeny={() => {}}
        onSelectApproval={() => {}}
        selectedApproval={{
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
        }}
        selectedApprovalId="apr_001"
        statusMessage="Approval queue ready."
      />,
    );

    expect(markup).toContain("Pending approvals");
    expect(markup).toContain("Run git push");
    expect(markup).toContain("git push origin main");
    expect(markup).toContain("Approve request");
    expect(markup).toContain("Deny request");
    expect(markup).toContain("Open related Chat");
  });
});
