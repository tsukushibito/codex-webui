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
  it("renders Navigation workspace switching, creation, and grouped thread cues", () => {
    const markup = renderToStaticMarkup(
      <ChatView
        connectionState="idle"
        draftAssistantMessages={{}}
        errorMessage={null}
        isCreatingThread={false}
        isCreatingWorkspace={false}
        isInterruptingThread={false}
        isLoadingThread={false}
        isLoadingThreads={false}
        isLoadingWorkspaces={false}
        isRespondingToRequest={false}
        isSendingMessage={false}
        messageDraft=""
        newThreadInput=""
        onApproveRequest={() => {}}
        onCreateThread={() => {}}
        onCreateWorkspace={() => {}}
        onDenyRequest={() => {}}
        onInterruptThread={() => {}}
        onMessageDraftChange={() => {}}
        onNewThreadInputChange={() => {}}
        onSelectThread={() => {}}
        onSelectWorkspace={() => {}}
        onSendMessage={() => {}}
        onWorkspaceNameChange={() => {}}
        selectedRequestDetail={null}
        selectedThreadId="thread_active"
        selectedThreadView={null}
        statusMessage={null}
        streamEvents={[]}
        threads={[
          {
            thread_id: "thread_approval",
            workspace_id: "ws_alpha",
            native_status: {
              thread_status: "running",
              active_flags: ["waiting_on_request"],
              latest_turn_status: "running",
            },
            updated_at: "2026-03-27T05:22:00Z",
            current_activity: {
              kind: "waiting_on_approval",
              label: "Approval required",
            },
            badge: {
              kind: "approval",
              label: "Waiting approval",
            },
            blocked_cue: {
              kind: "approval_required",
              label: "Needs response",
            },
            resume_cue: {
              reason_kind: "waiting_on_approval",
              priority_band: "highest",
              label: "Resume here first",
            },
          },
          {
            thread_id: "thread_active",
            workspace_id: "ws_alpha",
            native_status: {
              thread_status: "running",
              active_flags: [],
              latest_turn_status: "running",
            },
            updated_at: "2026-03-27T05:20:00Z",
            current_activity: {
              kind: "running",
              label: "Running",
            },
            badge: null,
            blocked_cue: null,
            resume_cue: null,
          },
          {
            thread_id: "thread_recent",
            workspace_id: "ws_alpha",
            native_status: {
              thread_status: "waiting_input",
              active_flags: [],
              latest_turn_status: null,
            },
            updated_at: "2026-03-27T05:18:00Z",
            current_activity: {
              kind: "waiting_on_user_input",
              label: "Waiting for your input",
            },
            badge: null,
            blocked_cue: null,
            resume_cue: {
              reason_kind: "recent",
              priority_band: "medium",
              label: "Recently updated",
            },
          },
        ]}
        workspaceId="ws_alpha"
        workspaceName=""
        workspaces={[
          {
            workspace_id: "ws_alpha",
            workspace_name: "alpha",
            created_at: "2026-03-27T05:00:00Z",
            updated_at: "2026-03-27T05:22:00Z",
            active_session_summary: null,
            pending_approval_count: 1,
          },
          {
            workspace_id: "ws_beta",
            workspace_name: "beta",
            created_at: "2026-03-27T04:00:00Z",
            updated_at: "2026-03-27T05:10:00Z",
            active_session_summary: {
              session_id: "thread_beta",
              status: "running",
              last_message_at: "2026-03-27T05:10:00Z",
            },
            pending_approval_count: 0,
          },
        ]}
      />,
    );

    expect(markup).toContain("Navigation");
    expect(markup).toContain("Switch workspace");
    expect(markup).toContain("Create workspace");
    expect(markup).toContain("1 approval");
    expect(markup).toContain("Attention needed");
    expect(markup).toContain("Active");
    expect(markup).toContain("Recent");
    expect(markup).toContain("Blocked: Needs response");
    expect(markup).toContain("Resume here first");
    expect(markup).toContain("Recently updated");
    expect(markup).not.toContain("Home");
  });

  it("renders thread context, pending request controls, and timeline state", () => {
    const markup = renderToStaticMarkup(
      <ChatView
        connectionState="live"
        draftAssistantMessages={{
          draft_001: "Streaming update",
        }}
        errorMessage={null}
        isCreatingThread={false}
        isCreatingWorkspace={false}
        isInterruptingThread={false}
        isLoadingThread={false}
        isLoadingThreads={false}
        isLoadingWorkspaces={false}
        isRespondingToRequest={false}
        isSendingMessage={false}
        messageDraft=""
        newThreadInput=""
        onCreateWorkspace={() => {}}
        onApproveRequest={() => {}}
        onCreateThread={() => {}}
        onDenyRequest={() => {}}
        onInterruptThread={() => {}}
        onMessageDraftChange={() => {}}
        onNewThreadInputChange={() => {}}
        onSelectWorkspace={() => {}}
        onSelectThread={() => {}}
        onSendMessage={() => {}}
        onWorkspaceNameChange={() => {}}
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
              thread_status: "running",
              active_flags: ["waiting_on_request"],
              latest_turn_status: "running",
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
                  summary: "user input accepted",
                  content: "Please explain the diff.",
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
              content: "Run git push",
            },
          },
        ]}
        threads={[
          {
            thread_id: "thread_001",
            workspace_id: "ws_alpha",
            native_status: {
              thread_status: "running",
              active_flags: ["waiting_on_request"],
              latest_turn_status: "running",
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
        workspaceName=""
        workspaces={[
          {
            workspace_id: "ws_alpha",
            workspace_name: "alpha",
            created_at: "2026-03-27T05:00:00Z",
            updated_at: "2026-03-27T05:22:00Z",
            active_session_summary: null,
            pending_approval_count: 1,
          },
        ]}
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
        isCreatingWorkspace={false}
        isInterruptingThread={false}
        isLoadingThread={false}
        isLoadingThreads={false}
        isLoadingWorkspaces={false}
        isRespondingToRequest={false}
        isSendingMessage={false}
        messageDraft=""
        newThreadInput=""
        onCreateWorkspace={() => {}}
        onApproveRequest={() => {}}
        onCreateThread={() => {}}
        onDenyRequest={() => {}}
        onInterruptThread={() => {}}
        onMessageDraftChange={() => {}}
        onNewThreadInputChange={() => {}}
        onSelectWorkspace={() => {}}
        onSelectThread={() => {}}
        onSendMessage={() => {}}
        onWorkspaceNameChange={() => {}}
        selectedRequestDetail={null}
        selectedThreadId={null}
        selectedThreadView={null}
        statusMessage="Thread started."
        streamEvents={[]}
        threads={[]}
        workspaceId="ws_alpha"
        workspaceName=""
        workspaces={[]}
      />,
    );

    expect(markup).toContain("chat-feedback-stack");
    expect(markup).toContain("Thread started.");
    expect(markup).toContain("Failed to interrupt the thread.");
    expect(markup.indexOf("chat-feedback-stack")).toBeLessThan(
      markup.indexOf("chat-panel create-card"),
    );
  });

  it("renders latest resolved request recovery affordance without response controls", () => {
    const markup = renderToStaticMarkup(
      <ChatView
        connectionState="idle"
        draftAssistantMessages={{}}
        errorMessage={null}
        isCreatingThread={false}
        isCreatingWorkspace={false}
        isInterruptingThread={false}
        isLoadingThread={false}
        isLoadingThreads={false}
        isLoadingWorkspaces={false}
        isRespondingToRequest={false}
        isSendingMessage={false}
        messageDraft=""
        newThreadInput=""
        onCreateWorkspace={() => {}}
        onApproveRequest={() => {}}
        onCreateThread={() => {}}
        onDenyRequest={() => {}}
        onInterruptThread={() => {}}
        onMessageDraftChange={() => {}}
        onNewThreadInputChange={() => {}}
        onSelectWorkspace={() => {}}
        onSelectThread={() => {}}
        onSendMessage={() => {}}
        onWorkspaceNameChange={() => {}}
        selectedRequestDetail={{
          request_id: "req_001",
          thread_id: "thread_001",
          turn_id: "turn_001",
          item_id: "item_001",
          request_kind: "approval",
          status: "resolved",
          risk_category: "external_side_effect",
          summary: "Run git push",
          reason: "Codex requested permission to push changes.",
          operation_summary: "git push origin main",
          requested_at: "2026-03-27T05:20:00Z",
          responded_at: "2026-03-27T05:21:00Z",
          decision: "approved",
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
              thread_status: "waiting_input",
              active_flags: [],
              latest_turn_status: null,
            },
            updated_at: "2026-03-27T05:22:00Z",
          },
          current_activity: {
            kind: "waiting_on_user_input",
            label: "Waiting for your input",
          },
          pending_request: null,
          latest_resolved_request: {
            request_id: "req_001",
            thread_id: "thread_001",
            turn_id: "turn_001",
            item_id: "item_001",
            request_kind: "approval",
            status: "resolved",
            decision: "approved",
            requested_at: "2026-03-27T05:20:00Z",
            responded_at: "2026-03-27T05:21:00Z",
          },
          composer: {
            accepting_user_input: true,
            interrupt_available: false,
            blocked_by_request: false,
          },
          timeline: {
            items: [],
            next_cursor: null,
            has_more: false,
          },
        }}
        statusMessage={null}
        streamEvents={[]}
        threads={[]}
        workspaceId="ws_alpha"
        workspaceName=""
        workspaces={[]}
      />,
    );

    expect(markup).toContain("Latest resolved request");
    expect(markup).toContain("Decision: approved");
    expect(markup).toContain("Reopen request detail");
    expect(markup).not.toContain("Approve request");
    expect(markup).not.toContain("Deny request");
  });
});
