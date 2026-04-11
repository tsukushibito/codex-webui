import type React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ChatView } from "../src/chat-view";

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

describe("ChatView", () => {
  it("renders thread context, pending request controls, and timeline state", () => {
    const markup = renderToStaticMarkup(
      <ChatView
        connectionState="live"
        draftAssistantMessages={{
          draft_001: "Streaming update",
        }}
        errorMessage={null}
        isCreatingThread={false}
        isInterruptingThread={false}
        isLoadingThread={false}
        isLoadingThreads={false}
        isRespondingToRequest={false}
        isSendingMessage={false}
        messageDraft=""
        newThreadInput=""
        onApproveRequest={() => {}}
        onCreateThread={() => {}}
        onDenyRequest={() => {}}
        onInterruptThread={() => {}}
        onMessageDraftChange={() => {}}
        onNewThreadInputChange={() => {}}
        onSelectThread={() => {}}
        onSendMessage={() => {}}
        selectedRequestDetail={{
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
        }}
        selectedThreadId="thread_001"
        selectedThreadView={{
          thread: {
            thread_id: "thread_001",
            workspace_id: "ws_alpha",
            native_status: {
              thread_status: "active",
              active_flags: ["waitingOnApproval"],
              latest_turn_status: "inProgress",
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
            items: [
              {
                timeline_item_id: "evt_001",
                thread_id: "thread_001",
                turn_id: null,
                item_id: null,
                sequence: 1,
                occurred_at: "2026-03-27T05:14:00Z",
                kind: "message.user",
                payload: {
                  summary: "Please explain the diff.",
                },
              },
            ],
            next_cursor: null,
            has_more: false,
          },
        }}
        statusMessage="Request pending."
        streamEvents={[
          {
            event_id: "evt_stream_001",
            thread_id: "thread_001",
            event_type: "approval.requested",
            sequence: 2,
            occurred_at: "2026-03-27T05:18:00Z",
            payload: {
              summary: "Run git push",
            },
          },
        ]}
        threads={[
          {
            thread_id: "thread_001",
            workspace_id: "ws_alpha",
            native_status: {
              thread_status: "active",
              active_flags: ["waitingOnApproval"],
              latest_turn_status: "inProgress",
            },
            updated_at: "2026-03-27T05:22:00Z",
            current_activity: {
              kind: "waiting_on_approval",
              label: "Approval required",
            },
            badge: null,
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
        ]}
        workspaceId="ws_alpha"
      />,
    );

    expect(markup).toContain("thread_001");
    expect(markup).toContain("Approval required");
    expect(markup).toContain("Approve request");
    expect(markup).toContain("Please explain the diff.");
    expect(markup).toContain("Streaming update");
    expect(markup).toContain("approval.requested");
  });

  it("renders transient feedback above the chat panels", () => {
    const markup = renderToStaticMarkup(
      <ChatView
        connectionState="live"
        draftAssistantMessages={{}}
        errorMessage="Failed to interrupt the thread."
        isCreatingThread={false}
        isInterruptingThread={false}
        isLoadingThread={false}
        isLoadingThreads={false}
        isRespondingToRequest={false}
        isSendingMessage={false}
        messageDraft=""
        newThreadInput=""
        onApproveRequest={() => {}}
        onCreateThread={() => {}}
        onDenyRequest={() => {}}
        onInterruptThread={() => {}}
        onMessageDraftChange={() => {}}
        onNewThreadInputChange={() => {}}
        onSelectThread={() => {}}
        onSendMessage={() => {}}
        selectedRequestDetail={null}
        selectedThreadId={null}
        selectedThreadView={null}
        statusMessage="Thread started."
        streamEvents={[]}
        threads={[]}
        workspaceId="ws_alpha"
      />,
    );

    expect(markup).toContain("chat-feedback-stack");
    expect(markup).toContain("Thread started.");
    expect(markup).toContain("Failed to interrupt the thread.");
    expect(markup.indexOf("chat-feedback-stack")).toBeLessThan(
      markup.indexOf("chat-panel create-card"),
    );
  });
});
