// @vitest-environment jsdom

import type React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

  it("renders Navigation workspace switching, creation, and grouped thread cues", () => {
    const markup = renderToStaticMarkup(
      <ChatView
        backgroundPriorityNotice={null}
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
        composerDraft=""
        onApproveRequest={() => {}}
        onSubmitComposer={() => {}}
        onCreateWorkspace={() => {}}
        onDenyRequest={() => {}}
        onInterruptThread={() => {}}
        onOpenBackgroundPriorityThread={() => {}}
        onAskCodex={() => {}}
        onComposerDraftChange={() => {}}
        onSelectThread={() => {}}
        onSelectWorkspace={() => {}}
        onWorkspaceNameChange={() => {}}
        selectedRequestDetail={null}
        selectedThreadId="thread_active"
        selectedThreadView={null}
        statusMessage={null}
        streamEvents={[]}
        threads={[
          {
            thread_id: "thread_approval",
            title: "Approval thread",
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
            title: "Active thread",
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
            title: "Recent thread",
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
            resume_cue: null,
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
    expect(markup).toContain(">Ask Codex<");
    expect(markup).toContain("1 approval");
    expect(markup).toContain("All");
    expect(markup).toContain("Active");
    expect(markup).toContain("Waiting approval");
    expect(markup).toContain("Errors / Failed");
    expect(markup).toContain("Recent");
    expect(markup).toContain("Approval thread");
    expect(markup).toContain("Active thread");
    expect(markup).toContain("Recent thread");
    expect(markup).toContain("Selected");
    expect(markup).toContain("Needs response");
    expect(markup).toContain("Waiting for your input");
    expect(markup.match(/<textarea/g) ?? []).toHaveLength(1);
    expect(markup).toContain('id="thread-composer-input"');
    expect(markup).not.toContain('id="thread-input"');
    expect(markup).not.toContain('id="message-input"');
    expect(markup).not.toContain("Home");
    expect(markup).not.toContain("Thread ref:");
  });

  it("filters visible rows without changing thread selection behavior", async () => {
    const onSelectThread = vi.fn();
    const onSelectWorkspace = vi.fn();

    await act(async () => {
      root.render(
        <ChatView
          backgroundPriorityNotice={{
            threadId: "thread_waiting",
            reason: "Needs response",
          }}
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
          composerDraft=""
          onApproveRequest={() => {}}
          onSubmitComposer={() => {}}
          onCreateWorkspace={() => {}}
          onDenyRequest={() => {}}
          onInterruptThread={() => {}}
          onOpenBackgroundPriorityThread={() => {}}
          onAskCodex={() => {}}
          onComposerDraftChange={() => {}}
          onSelectThread={onSelectThread}
          onSelectWorkspace={onSelectWorkspace}
          onWorkspaceNameChange={() => {}}
          selectedRequestDetail={null}
          selectedThreadId="thread_active"
          selectedThreadView={null}
          statusMessage={null}
          streamEvents={[]}
          threads={[
            {
              thread_id: "thread_waiting",
              title: "Approval thread",
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
              title: "Active thread",
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
              thread_id: "thread_failed",
              title: "Failed thread",
              workspace_id: "ws_alpha",
              native_status: {
                thread_status: "idle",
                active_flags: [],
                latest_turn_status: "failed",
              },
              updated_at: "2026-03-27T05:19:00Z",
              current_activity: {
                kind: "latest_turn_failed",
                label: "Latest turn failed",
              },
              badge: null,
              blocked_cue: null,
              resume_cue: null,
            },
            {
              thread_id: "thread_recent",
              title: "Recent thread",
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
              resume_cue: null,
            },
          ]}
          workspaceId="ws_alpha"
          workspaceName=""
          workspaces={[]}
        />,
      );
    });

    expect(container.textContent).toContain("Approval thread");
    expect(container.textContent).toContain("Active thread");
    expect(container.textContent).toContain("Failed thread");
    expect(container.textContent).toContain("Recent thread");
    expect(container.textContent).toContain("Background notice: Needs response");

    const filterButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Waiting approval"),
    );
    expect(filterButton).not.toBeUndefined();

    await act(async () => {
      filterButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Approval thread");
    expect(container.textContent).not.toContain("Active thread");
    expect(container.textContent).not.toContain("Failed thread");
    expect(container.textContent).not.toContain("Recent thread");
    expect(onSelectThread).not.toHaveBeenCalled();
    expect(onSelectWorkspace).not.toHaveBeenCalled();
  });

  it("treats a normal waiting-input thread with no resume cue as Recent", async () => {
    await act(async () => {
      root.render(
        <ChatView
          backgroundPriorityNotice={null}
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
          composerDraft=""
          onApproveRequest={() => {}}
          onSubmitComposer={() => {}}
          onCreateWorkspace={() => {}}
          onDenyRequest={() => {}}
          onInterruptThread={() => {}}
          onOpenBackgroundPriorityThread={() => {}}
          onAskCodex={() => {}}
          onComposerDraftChange={() => {}}
          onSelectThread={() => {}}
          onSelectWorkspace={() => {}}
          onWorkspaceNameChange={() => {}}
          selectedRequestDetail={null}
          selectedThreadId={null}
          selectedThreadView={null}
          statusMessage={null}
          streamEvents={[]}
          threads={[
            {
              thread_id: "thread_running",
              title: "Running thread",
              workspace_id: "ws_alpha",
              native_status: {
                thread_status: "running",
                active_flags: [],
                latest_turn_status: "running",
              },
              updated_at: "2026-03-27T05:22:00Z",
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
              title: "Mapped idle thread",
              workspace_id: "ws_alpha",
              native_status: {
                thread_status: "waiting_input",
                active_flags: [],
                latest_turn_status: null,
              },
              updated_at: "2026-03-27T05:21:00Z",
              current_activity: {
                kind: "waiting_on_user_input",
                label: "Waiting for your input",
              },
              badge: null,
              blocked_cue: null,
              resume_cue: null,
            },
          ]}
          workspaceId="ws_alpha"
          workspaceName=""
          workspaces={[]}
        />,
      );
    });

    const recentFilterButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Recent1"),
    );
    expect(recentFilterButton).not.toBeUndefined();

    await act(async () => {
      recentFilterButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Mapped idle thread");
    expect(container.textContent).toContain("Waiting for your input");
    expect(container.textContent).not.toContain("Running thread");
  });

  it("renders thread context, pending request controls, and timeline state", () => {
    const markup = renderToStaticMarkup(
      <ChatView
        backgroundPriorityNotice={null}
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
        composerDraft=""
        onCreateWorkspace={() => {}}
        onApproveRequest={() => {}}
        onSubmitComposer={() => {}}
        onDenyRequest={() => {}}
        onInterruptThread={() => {}}
        onOpenBackgroundPriorityThread={() => {}}
        onAskCodex={() => {}}
        onComposerDraftChange={() => {}}
        onSelectWorkspace={() => {}}
        onSelectThread={() => {}}
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
            title: "Approval thread",
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
            input_unavailable_reason: null,
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
              {
                timeline_item_id: "evt_file_001",
                thread_id: "thread_001",
                turn_id: "turn_001",
                item_id: "item_file_001",
                sequence: 2,
                occurred_at: "2026-03-27T05:15:00Z",
                kind: "file.changed",
                payload: {
                  summary: "Updated apps/frontend-bff/src/chat-view.tsx",
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
            sequence: 3,
            occurred_at: "2026-03-27T05:18:00Z",
            payload: {
              summary: "Run git push",
              content: "Run git push",
            },
          },
          {
            event_id: "evt_stream_002",
            thread_id: "thread_001",
            event_type: "session.status_changed",
            sequence: 4,
            occurred_at: "2026-03-27T05:19:00Z",
            payload: {
              summary: "Tool output received",
            },
          },
        ]}
        threads={[
          {
            thread_id: "thread_001",
            title: "Approval thread",
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

    expect(markup).toContain("Approval thread");
    expect(markup).toContain("Workspace alpha");
    expect(markup).toContain("Approval required");
    expect(markup).toContain("Codex is paused until you approve or deny the request below.");
    expect(markup).toContain("Approve request");
    expect(markup).toContain("Input is paused while this thread waits for your approval response.");
    expect(markup).toContain("Operation: git push origin main");
    expect(markup).toContain("Interrupt thread");
    expect(markup).toContain("Please explain the diff.");
    expect(markup).toContain("Updated apps/frontend-bff/src/chat-view.tsx");
    expect(markup).toContain("Streaming update");
    expect(markup).toContain("Request needs attention");
    expect(markup).toContain("timeline-row-prominent");
    expect(markup).toContain("Status update");
    expect(markup).toContain("timeline-row-compact");
    expect(markup.match(/Timeline item detail/g) ?? []).toHaveLength(1);
    expect(markup).not.toContain("approval.requested");
    expect(markup).not.toContain("session.status_changed");
    expect(markup.match(/<textarea/g) ?? []).toHaveLength(1);
    expect(markup).toContain('id="thread-composer-input"');
    expect(markup).not.toContain('id="thread-input"');
    expect(markup).not.toContain('id="message-input"');
  });

  it("renders transient feedback above the chat panels", () => {
    const markup = renderToStaticMarkup(
      <ChatView
        backgroundPriorityNotice={null}
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
        composerDraft=""
        onCreateWorkspace={() => {}}
        onApproveRequest={() => {}}
        onSubmitComposer={() => {}}
        onDenyRequest={() => {}}
        onInterruptThread={() => {}}
        onOpenBackgroundPriorityThread={() => {}}
        onAskCodex={() => {}}
        onComposerDraftChange={() => {}}
        onSelectWorkspace={() => {}}
        onSelectThread={() => {}}
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
        backgroundPriorityNotice={null}
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
        composerDraft=""
        onCreateWorkspace={() => {}}
        onApproveRequest={() => {}}
        onSubmitComposer={() => {}}
        onDenyRequest={() => {}}
        onInterruptThread={() => {}}
        onOpenBackgroundPriorityThread={() => {}}
        onAskCodex={() => {}}
        onComposerDraftChange={() => {}}
        onSelectWorkspace={() => {}}
        onSelectThread={() => {}}
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
            title: "Resolved request thread",
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
            input_unavailable_reason: null,
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

  it("renders a targeted background-priority notice with a direct thread action", () => {
    const markup = renderToStaticMarkup(
      <ChatView
        backgroundPriorityNotice={{
          threadId: "thread_background",
          reason: "Needs response",
        }}
        connectionState="live"
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
        composerDraft=""
        onCreateWorkspace={() => {}}
        onApproveRequest={() => {}}
        onSubmitComposer={() => {}}
        onDenyRequest={() => {}}
        onInterruptThread={() => {}}
        onOpenBackgroundPriorityThread={() => {}}
        onAskCodex={() => {}}
        onComposerDraftChange={() => {}}
        onSelectWorkspace={() => {}}
        onSelectThread={() => {}}
        onWorkspaceNameChange={() => {}}
        selectedRequestDetail={null}
        selectedThreadId="thread_001"
        selectedThreadView={null}
        statusMessage="High-priority background thread needs attention."
        streamEvents={[]}
        threads={[]}
        workspaceId="ws_alpha"
        workspaceName=""
        workspaces={[]}
      />,
    );

    expect(markup).toContain("Background thread needs attention");
    expect(markup).toContain("thread_background");
    expect(markup).toContain("Reason: Needs response");
    expect(markup).toContain("Open thread");
  });

  it("renders recovery input-unavailable reason as the single disabled composer state", () => {
    const markup = renderToStaticMarkup(
      <ChatView
        backgroundPriorityNotice={null}
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
        composerDraft="Follow up after recovery."
        onCreateWorkspace={() => {}}
        onApproveRequest={() => {}}
        onSubmitComposer={() => {}}
        onDenyRequest={() => {}}
        onInterruptThread={() => {}}
        onOpenBackgroundPriorityThread={() => {}}
        onAskCodex={() => {}}
        onComposerDraftChange={() => {}}
        onSelectWorkspace={() => {}}
        onSelectThread={() => {}}
        onWorkspaceNameChange={() => {}}
        selectedRequestDetail={null}
        selectedThreadId="thread_001"
        selectedThreadView={{
          thread: {
            thread_id: "thread_001",
            title: "Failed thread",
            workspace_id: "ws_alpha",
            native_status: {
              thread_status: "idle",
              active_flags: [],
              latest_turn_status: "failed",
            },
            updated_at: "2026-03-27T05:22:00Z",
          },
          current_activity: {
            kind: "latest_turn_failed",
            label: "Latest turn failed",
          },
          pending_request: null,
          latest_resolved_request: null,
          composer: {
            accepting_user_input: false,
            interrupt_available: false,
            blocked_by_request: false,
            input_unavailable_reason: "recovery_pending",
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

    expect(markup).toContain("Input unavailable: recovery pending.");
    expect(markup.match(/<textarea/g) ?? []).toHaveLength(1);
    expect(markup).toContain("disabled");
    expect(markup).not.toContain('id="thread-input"');
    expect(markup).not.toContain('id="message-input"');
  });
});
