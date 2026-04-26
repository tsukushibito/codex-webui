// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ChatViewDetails,
  type ChatViewDetailsProps,
  type ThreadFeedbackAction,
} from "../src/chat-view-details";
import type {
  PublicRequestDetail,
  PublicThreadView,
  PublicTimelineItem,
} from "../src/thread-types";
import type { TimelineItemDetail } from "../src/timeline-item-detail";

function formatTimestamp(value: string | null) {
  return value ? `formatted:${value}` : "Not available";
}

function formatMachineLabel(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Not available";
}

function requestBadgeClass(request: PublicRequestDetail | null) {
  if (!request) {
    return "status-badge";
  }

  return request.status === "pending" ? "status-badge warning" : "status-badge success";
}

function renderThreadFeedbackAction(action: ThreadFeedbackAction) {
  return (
    <button
      className="secondary-link action-button compact-button"
      key={action.label}
      type="button"
    >
      {action.label}
    </button>
  );
}

function buildThreadView(): PublicThreadView {
  return {
    thread: {
      thread_id: "thread_001",
      workspace_id: "ws_001",
      title: "Timeline detail extraction",
      native_status: {
        thread_status: "running",
        active_flags: ["live"],
        latest_turn_status: "in_progress",
      },
      updated_at: "2026-03-27T06:30:00Z",
    },
    current_activity: {
      kind: "waiting_on_approval",
      label: "Waiting on approval",
    },
    pending_request: {
      request_id: "req_001",
      thread_id: "thread_001",
      turn_id: "turn_001",
      item_id: "item_approval_001",
      request_kind: "approval",
      status: "pending",
      risk_category: "network_access",
      summary: "Approval is required before Codex can continue.",
      requested_at: "2026-03-27T06:20:00Z",
    },
    latest_resolved_request: null,
    composer: {
      accepting_user_input: false,
      interrupt_available: true,
      blocked_by_request: true,
      input_unavailable_reason: "waiting_on_approval",
    },
    timeline: {
      items: [],
      next_cursor: null,
      has_more: false,
    },
  };
}

function buildRequestDetail(overrides: Partial<PublicRequestDetail> = {}): PublicRequestDetail {
  return {
    request_id: "req_001",
    thread_id: "thread_001",
    turn_id: "turn_001",
    item_id: "item_approval_001",
    request_kind: "approval",
    status: "pending",
    risk_category: "network_access",
    summary: "Approval request for pushing the branch.",
    reason: "The action would write to a remote repository.",
    operation_summary: "git push origin main",
    requested_at: "2026-03-27T06:20:00Z",
    responded_at: null,
    decision: null,
    decision_options: {
      policy_scope_supported: false,
      default_policy_scope: "once",
    },
    context: {
      repo: "origin",
    },
    ...overrides,
  };
}

function buildTimelineItem(): PublicTimelineItem {
  return {
    timeline_item_id: "timeline_001",
    thread_id: "thread_001",
    turn_id: "turn_001",
    item_id: "item_001",
    sequence: 7,
    occurred_at: "2026-03-27T06:25:00Z",
    kind: "tool.result.failed",
    payload: {
      output: "artifacts/visual-inspection/issue-219-failure.txt",
      operation: "Validate timeline detail surface",
      request_id: "req_001",
      error: "Expected contextual detail button",
    },
  };
}

function buildTimelineDetail(): TimelineItemDetail {
  return {
    actionLabel: "Inspect failure",
    title: "Failure detail",
    summary: "Validation evidence failed for the requested artifact surface.",
    sections: [
      {
        title: "Generated outputs",
        items: ["artifacts/visual-inspection/issue-219-failure.txt"],
      },
      {
        title: "Errors",
        items: ["Expected contextual detail button"],
      },
    ],
    fields: [
      { label: "Request ID", value: "req_001" },
      { label: "Operation", value: "Validate timeline detail surface" },
      {
        label: "Issue",
        value: "https://github.com/example/repo/issues/219",
        href: "https://github.com/example/repo/issues/219",
      },
    ],
    hasContext: true,
  };
}

function buildProps(overrides: Partial<ChatViewDetailsProps> = {}): ChatViewDetailsProps {
  return {
    selection: { kind: "thread_details" },
    workspaceId: "ws_001",
    selectedThreadId: "thread_001",
    selectedWorkspaceName: "Primary workspace",
    selectedThreadView: buildThreadView(),
    selectedRequestDetail: buildRequestDetail(),
    selectedTimelineItem: buildTimelineItem(),
    selectedTimelineItemDetail: buildTimelineDetail(),
    isOpeningSelectedThread: false,
    connectionState: "live",
    composerGuidance: "Input is paused while this thread waits for your approval response.",
    threadActivitySummary: "Codex is paused until you approve or deny the request below.",
    threadFeedback: {
      badgeTone: "warning",
      isVisible: true,
      title: "Approval required",
      summary: "Codex is blocked until you approve or deny the pending request in this thread.",
      actions: [{ kind: "request_detail", label: "Request detail" }],
    },
    timelineGroups: [
      {
        id: "group_001",
        turnId: "turn_001",
        rows: [
          {
            id: "row_approval",
            turnId: "turn_001",
            sequence: 7,
            occurredAt: "2026-03-27T06:25:00Z",
            label: "Approval context",
            content: "Push requires approval",
            density: "compact",
            role: "event",
            timelineItemId: "timeline_approval_001",
            isLive: false,
            showDetailButton: true,
            detailActionLabel: "Inspect request",
          },
        ],
      },
    ],
    isRespondingToRequest: false,
    formatTimestamp,
    formatMachineLabel,
    requestBadgeClass,
    renderThreadFeedbackAction,
    onClose: vi.fn(),
    onSelectRequestDetail: vi.fn(),
    onSelectTimelineItemDetail: vi.fn(),
    onApproveRequest: vi.fn(),
    onDenyRequest: vi.fn(),
    ...overrides,
  };
}

describe("ChatViewDetails", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders thread details with request and artifact actions plus debug JSON", async () => {
    const onClose = vi.fn();
    const onSelectRequestDetail = vi.fn();
    const onSelectTimelineItemDetail = vi.fn();
    const props = buildProps({
      onClose,
      onSelectRequestDetail,
      onSelectTimelineItemDetail,
    });

    const markup = renderToStaticMarkup(<ChatViewDetails {...props} />);
    expect(markup).toContain("Thread details");
    expect(markup).toContain("Primary workspace");
    expect(markup).toContain("Approval context");
    expect(markup).toContain("Debug: raw thread view JSON");
    expect(markup).toContain("&quot;thread_id&quot;: &quot;thread_001&quot;");

    await act(async () => {
      root.render(<ChatViewDetails {...props} />);
    });

    const buttons = Array.from(container.querySelectorAll("button"));
    const closeButton = buttons.find((button) => button.textContent === "Close");
    const requestDetailButton = buttons.filter(
      (button) => button.textContent === "Request detail",
    )[1];
    const artifactButton = buttons.find((button) => button.textContent === "Inspect request");

    await act(async () => {
      closeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      requestDetailButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      artifactButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelectRequestDetail).toHaveBeenCalledTimes(1);
    expect(onSelectTimelineItemDetail).toHaveBeenCalledWith("timeline_approval_001");
  });

  it("renders pending request detail actions and wires approve and deny", async () => {
    const onApproveRequest = vi.fn();
    const onDenyRequest = vi.fn();
    const props = buildProps({
      selection: { kind: "request_detail" },
      onApproveRequest,
      onDenyRequest,
    });

    const markup = renderToStaticMarkup(<ChatViewDetails {...props} />);
    expect(markup).toContain("Request detail");
    expect(markup).toContain('class="request-detail-field request-detail-field-code"');
    expect(markup).toContain(
      'Operation: <code class="artifact-inline">git push origin main</code>',
    );

    await act(async () => {
      root.render(<ChatViewDetails {...props} />);
    });

    const approveButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Approve request",
    );
    const denyButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Deny request",
    );

    await act(async () => {
      approveButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      denyButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onApproveRequest).toHaveBeenCalledTimes(1);
    expect(onDenyRequest).toHaveBeenCalledTimes(1);
  });

  it("renders structured timeline detail with artifact sections, linked fields, and debug JSON", () => {
    const props = buildProps({
      selection: { kind: "timeline_item_detail", timelineItemId: "timeline_001" },
    });

    const markup = renderToStaticMarkup(<ChatViewDetails {...props} />);
    expect(markup).toContain("Failure detail");
    expect(markup).toContain("Generated outputs");
    expect(markup).toContain("Expected contextual detail button");
    expect(markup).toContain('class="detail-link"');
    expect(markup).toContain("Debug: raw timeline payload JSON");
    expect(markup).toContain("&quot;operation&quot;: &quot;Validate timeline detail surface&quot;");
  });
});
