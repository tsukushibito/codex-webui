// @vitest-environment jsdom

import type React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicApprovalDetail, PublicApprovalSummary } from "../src/approval-types";

const approvalDataMocks = vi.hoisted(() => ({
  approveApproval: vi.fn(),
  denyApproval: vi.fn(),
  fetchApprovalDetail: vi.fn(),
  fetchPendingApprovals: vi.fn(),
}));

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

vi.mock("../src/approval-data", () => ({
  approveApproval: approvalDataMocks.approveApproval,
  denyApproval: approvalDataMocks.denyApproval,
  fetchApprovalDetail: approvalDataMocks.fetchApprovalDetail,
  fetchPendingApprovals: approvalDataMocks.fetchPendingApprovals,
}));

import { ApprovalPageClient } from "../src/approval-page-client";

function buildApprovalSummary(
  overrides: Partial<PublicApprovalSummary> = {},
): PublicApprovalSummary {
  return {
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
    ...overrides,
  };
}

function buildApprovalDetail(overrides: Partial<PublicApprovalDetail> = {}): PublicApprovalDetail {
  return {
    ...buildApprovalSummary(),
    operation_summary: "git push origin main",
    context: {
      command: "git push origin main",
    },
    ...overrides,
  };
}

class MockEventSource {
  static instances: MockEventSource[] = [];

  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  readonly close = vi.fn();

  constructor(readonly url: string) {
    MockEventSource.instances.push(this);
  }
}

async function flushUi() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("ApprovalPageClient", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("EventSource", MockEventSource);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    MockEventSource.instances = [];

    approvalDataMocks.approveApproval.mockReset();
    approvalDataMocks.denyApproval.mockReset();
    approvalDataMocks.fetchApprovalDetail.mockReset();
    approvalDataMocks.fetchPendingApprovals.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
    delete (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
      .IS_REACT_ACT_ENVIRONMENT;
  });

  it("updates the approval queue and selected detail without reload when approval is requested", async () => {
    approvalDataMocks.fetchPendingApprovals
      .mockResolvedValueOnce({
        items: [],
        next_cursor: null,
        has_more: false,
      })
      .mockResolvedValueOnce({
        items: [buildApprovalSummary()],
        next_cursor: null,
        has_more: false,
      });
    approvalDataMocks.fetchApprovalDetail.mockResolvedValue(buildApprovalDetail());

    await act(async () => {
      root.render(<ApprovalPageClient />);
    });
    await flushUi();

    expect(container.textContent).toContain("No pending approvals.");
    const stream = MockEventSource.instances[0];
    expect(stream?.url).toBe("/api/v1/approvals/stream");

    await act(async () => {
      stream?.onmessage?.(
        new MessageEvent("message", {
          data: JSON.stringify({
            event_type: "approval.requested",
            approval_id: "apr_001",
            session_id: "thread_001",
            occurred_at: "2026-03-27T05:18:00Z",
            payload: {
              approval_id: "apr_001",
            },
          }),
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushUi();

    expect(approvalDataMocks.fetchPendingApprovals).toHaveBeenCalledTimes(2);
    expect(approvalDataMocks.fetchApprovalDetail).toHaveBeenCalledWith("apr_001");
    expect(container.textContent).toContain("New approval requested. Queue refreshed.");
    expect(container.textContent).toContain("Run git push");
    expect(container.textContent).toContain("git push origin main");
  });
});
