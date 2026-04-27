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
              request_id: "req_001",
              turn_id: "turn_001",
              item_id: "item_001",
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
    expect(markup).toContain("Approve request");
    expect(markup).toContain("Pending request");
    expect(markup).toContain("Request summary");
    expect(markup).toContain("Run git push");
    expect(markup).toContain("Reason");
    expect(markup).toContain("Codex requests permission to push changes to remote.");
    expect(markup).toContain("Operation");
    expect(markup).toContain("git push origin main");
    expect(markup).toContain(">Threads<");
    expect(markup).toContain('aria-label="Thread details"');
    expect(markup).toContain("Input paused for approval.");
    expect(markup).not.toContain("Workspace:");
    expect(markup).not.toContain("Stream:");
    expect(markup).not.toContain(">Refresh<");
    expect(markup).not.toContain("thread-feedback-card-inline");
    expect(markup).toContain("Please explain the diff.");
    expect(markup).toContain("Updated apps/frontend-bff/src/chat-view.tsx");
    expect(markup).toContain("Streaming update");
    expect(markup).toContain("Request needs attention");
    expect(markup).toContain("timeline-row-prominent");
    expect(markup).not.toContain("pending-request-card-fallback");
    expect(markup).toContain("Request detail");
    expect(markup.indexOf("Please explain the diff.")).toBeLessThan(
      markup.indexOf("Approve request"),
    );
    expect(markup).toContain("Status update");
    expect(markup).toContain("timeline-row-compact");
    expect(markup).toContain("Inspect artifacts");
    expect(markup).not.toContain("Timeline item detail");
    expect(markup).not.toContain("approval.requested");
    expect(markup).not.toContain("session.status_changed");
    expect(markup.match(/<textarea/g) ?? []).toHaveLength(1);
    expect(markup).toContain('id="thread-composer-input"');
    expect(markup).toContain('class="composer-input-frame"');
    expect(markup).toContain('aria-label="Send message"');
    expect(markup).not.toContain("Send input");
    expect(markup).not.toContain('id="thread-input"');
    expect(markup).not.toContain('id="message-input"');
  });

  it("tones selected pending approval activity badges as warning state", async () => {
    await act(async () => {
      root.render(
        <ChatView
          backgroundPriorityNotice={null}
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
          selectedThreadId="thread_001"
          selectedThreadView={{
            thread: {
              thread_id: "thread_001",
              workspace_id: "ws_alpha",
              title: "Approval thread",
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
            pending_request: null,
            latest_resolved_request: null,
            composer: {
              accepting_user_input: false,
              interrupt_available: true,
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
    });

    const inlineFeedbackBadge = container.querySelector(
      ".thread-feedback-card-inline .status-badge",
    );

    expect(container.querySelector(".thread-view-header-stack header .status-badge")).toBeNull();
    expect(inlineFeedbackBadge?.textContent).toContain("Approval required");
    expect(inlineFeedbackBadge?.className).toContain("warning");
    expect(inlineFeedbackBadge?.className).not.toContain("success");
  });

  it("keeps normal running progress inside the live assistant row instead of the thread feedback card", async () => {
    await act(async () => {
      root.render(
        <ChatView
          backgroundPriorityNotice={null}
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
          selectedThreadId="thread_001"
          selectedThreadView={{
            thread: {
              thread_id: "thread_001",
              title: "Running thread",
              workspace_id: "ws_alpha",
              native_status: {
                thread_status: "running",
                active_flags: [],
                latest_turn_status: "running",
              },
              updated_at: "2026-03-27T05:22:00Z",
            },
            current_activity: {
              kind: "running",
              label: "Codex is running",
            },
            pending_request: null,
            latest_resolved_request: null,
            composer: {
              accepting_user_input: false,
              interrupt_available: true,
              blocked_by_request: false,
              input_unavailable_reason: null,
            },
            timeline: {
              items: [
                {
                  timeline_item_id: "evt_live_001",
                  thread_id: "thread_001",
                  turn_id: "turn_001",
                  item_id: "item_live_001",
                  sequence: 1,
                  occurred_at: "2026-03-27T05:20:00Z",
                  kind: "message.assistant.delta",
                  payload: {
                    message_id: "message_001",
                    delta: "Streaming answer",
                  },
                },
              ],
              next_cursor: null,
              has_more: false,
            },
          }}
          statusMessage={null}
          streamEvents={[]}
          threads={[
            {
              thread_id: "thread_001",
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
                label: "Codex is running",
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
              pending_approval_count: 0,
            },
          ]}
        />,
      );
    });

    expect(container.querySelector(".thread-feedback-card-inline")).toBeNull();
    expect(container.textContent).toContain("Streaming");
    expect(container.textContent).not.toContain("Codex is running");
    expect(container.querySelector(".timeline-row-live-status")).not.toBeNull();
  });

  it("keeps reconnecting feedback visible when a live assistant row is present", async () => {
    await act(async () => {
      root.render(
        <ChatView
          backgroundPriorityNotice={null}
          connectionState="reconnecting"
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
          selectedThreadId="thread_001"
          selectedThreadView={{
            thread: {
              thread_id: "thread_001",
              title: "Running thread",
              workspace_id: "ws_alpha",
              native_status: {
                thread_status: "running",
                active_flags: [],
                latest_turn_status: "running",
              },
              updated_at: "2026-03-27T05:22:00Z",
            },
            current_activity: {
              kind: "running",
              label: "Codex is running",
            },
            pending_request: null,
            latest_resolved_request: null,
            composer: {
              accepting_user_input: false,
              interrupt_available: true,
              blocked_by_request: false,
              input_unavailable_reason: null,
            },
            timeline: {
              items: [
                {
                  timeline_item_id: "evt_live_001",
                  thread_id: "thread_001",
                  turn_id: "turn_001",
                  item_id: "item_live_001",
                  sequence: 1,
                  occurred_at: "2026-03-27T05:20:00Z",
                  kind: "message.assistant.delta",
                  payload: {
                    message_id: "message_001",
                    delta: "Streaming answer",
                  },
                },
              ],
              next_cursor: null,
              has_more: false,
            },
          }}
          statusMessage={null}
          streamEvents={[]}
          threads={[
            {
              thread_id: "thread_001",
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
                label: "Codex is running",
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
              pending_approval_count: 0,
            },
          ]}
        />,
      );
    });

    expect(container.querySelector(".thread-feedback-card-inline")).not.toBeNull();
    expect(container.textContent).toContain("Reconnecting live updates");
    expect(container.querySelector(".timeline-row-live-status")).not.toBeNull();
    expect(container.textContent).toContain("Streaming");
  });

  it("shows the first running progress in the timeline before assistant content arrives", async () => {
    await act(async () => {
      root.render(
        <ChatView
          backgroundPriorityNotice={null}
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
          selectedThreadId="thread_001"
          selectedThreadView={{
            thread: {
              thread_id: "thread_001",
              title: "Running thread",
              workspace_id: "ws_alpha",
              native_status: {
                thread_status: "running",
                active_flags: [],
                latest_turn_status: "running",
              },
              updated_at: "2026-03-27T05:22:00Z",
            },
            current_activity: {
              kind: "running",
              label: "Codex is running",
            },
            pending_request: null,
            latest_resolved_request: null,
            composer: {
              accepting_user_input: false,
              interrupt_available: true,
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
          threads={[
            {
              thread_id: "thread_001",
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
                label: "Codex is running",
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
              pending_approval_count: 0,
            },
          ]}
        />,
      );
    });

    expect(container.querySelector(".thread-feedback-card-inline")).toBeNull();
    expect(container.querySelector(".timeline-row-live-placeholder")).not.toBeNull();
    expect(container.querySelector(".timeline-row-live-status")).not.toBeNull();
    expect(container.querySelector(".timeline-row-content")?.textContent ?? "").toBe("");
    expect(container.textContent).toContain("Streaming");
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

  it("renders structured timeline detail before collapsed debug JSON", async () => {
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
          selectedThreadId="thread_001"
          selectedThreadView={{
            thread: {
              thread_id: "thread_001",
              title: "Failure thread",
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
              accepting_user_input: true,
              interrupt_available: false,
              blocked_by_request: false,
              input_unavailable_reason: null,
            },
            timeline: {
              items: [
                {
                  timeline_item_id: "evt_failure_001",
                  thread_id: "thread_001",
                  turn_id: "turn_001",
                  item_id: "item_failure_001",
                  sequence: 1,
                  occurred_at: "2026-03-27T05:15:00Z",
                  kind: "turn.failed",
                  payload: {
                    summary: "Tests failed after the patch",
                    command: "npm run check",
                    file_paths: ["apps/frontend-bff/src/chat-view.tsx"],
                    tests: ["tests/chat-view.test.tsx"],
                    diff: "diff --git a/apps/frontend-bff/src/chat-view.tsx b/apps/frontend-bff/src/chat-view.tsx",
                    request_id: "req_failure_001",
                    output: "artifacts/visual-inspection/issue-219-failure.txt",
                    operation: "Validate timeline detail surface",
                    target: "Issue #219",
                    consequence: "Turn halted until review",
                    error: "Expected contextual detail button",
                  },
                },
              ],
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
    });

    const inspectButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Inspect failure",
    );
    expect(inspectButton).not.toBeUndefined();

    await act(async () => {
      inspectButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Failure detail");
    expect(container.textContent).toContain("Commands");
    expect(container.textContent).toContain("apps/frontend-bff/src/chat-view.tsx");
    expect(container.textContent).toContain("tests/chat-view.test.tsx");
    expect(container.textContent).toContain("Request ID");
    expect(container.textContent).toContain("Debug: raw timeline payload JSON");
    expect(container.querySelectorAll(".detail-artifact-section").length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".artifact-inline").length).toBeGreaterThan(0);
    expect(container.querySelector(".request-detail-field-code")).not.toBeNull();

    const debugDetails = container.querySelector("details.detail-debug");
    expect(debugDetails).not.toBeNull();
    expect(debugDetails?.hasAttribute("open")).toBe(false);
    expect(container.innerHTML.indexOf("Commands")).toBeLessThan(
      container.innerHTML.indexOf("Debug: raw timeline payload JSON"),
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
            items: [
              {
                timeline_item_id: "timeline_resolved_001",
                thread_id: "thread_001",
                turn_id: "turn_001",
                item_id: "item_001",
                sequence: 1,
                occurred_at: "2026-03-27T05:21:00Z",
                kind: "approval.resolved",
                payload: {
                  request_id: "req_001",
                  item_id: "item_001",
                  turn_id: "turn_001",
                  summary: "Run git push",
                  status: "resolved",
                },
              },
            ],
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

    expect(markup).not.toContain("Latest resolved request");
    expect(markup).toContain("Resolved: approved");
    expect(markup).toContain("Request detail");
    expect(markup).toContain('aria-label="Send message"');
    expect(markup).not.toContain("Approve request");
    expect(markup).not.toContain("Deny request");
  });

  it("keeps a compact fallback request summary above the timeline when no contextual row matches", () => {
    const markup = renderToStaticMarkup(
      <ChatView
        backgroundPriorityNotice={null}
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
            title: "Fallback request thread",
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
                turn_id: "turn_001",
                item_id: "item_user_001",
                sequence: 1,
                occurred_at: "2026-03-27T05:14:00Z",
                kind: "message.user",
                payload: {
                  content: "Please explain the diff.",
                },
              },
            ],
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

    expect(markup).toContain("pending-request-card-fallback");
    expect(markup).toContain("Request summary");
    expect(markup).toContain("Approve request");
    expect(markup).toContain("Deny request");
    expect(markup).toContain("Request detail");
    expect(markup).not.toContain("Pending request</span></div></article>");
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

  it("renders ready-state recovery CTA to focus the composer", () => {
    const markup = renderToStaticMarkup(
      <ChatView
        backgroundPriorityNotice={null}
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
        selectedThreadView={{
          thread: {
            thread_id: "thread_001",
            title: "Ready thread",
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
          latest_resolved_request: null,
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

    expect(markup).not.toContain("Ready for your next input.");
    expect(markup).not.toContain(
      "Codex is idle and the composer below is available for the next instruction.",
    );
    expect(markup).not.toContain("Focus composer");
    expect(markup).not.toContain("thread-feedback-card-inline");
  });

  it("opens Thread Details with status metadata and collapsed debug content", async () => {
    await act(async () => {
      root.render(
        <ChatView
          backgroundPriorityNotice={null}
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
          selectedThreadId="thread_001"
          selectedThreadView={{
            thread: {
              thread_id: "thread_001",
              title: "Ready thread",
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
            latest_resolved_request: null,
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
          workspaces={[
            {
              workspace_id: "ws_alpha",
              workspace_name: "alpha",
              created_at: "2026-03-27T05:00:00Z",
              updated_at: "2026-03-27T05:22:00Z",
              active_session_summary: null,
              pending_approval_count: 0,
            },
          ]}
        />,
      );
    });

    const detailsButton = container.querySelector(
      'button[aria-label="Thread details"]',
    ) as HTMLButtonElement | null;
    expect(detailsButton).toBeDefined();
    expect(container.querySelector(".thread-view-header-stack header .status-badge")).toBeNull();
    expect(container.textContent).not.toContain("Started in");

    await act(async () => {
      detailsButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Thread details");
    expect(container.textContent).toContain("Overview");
    expect(container.textContent).toContain("Status");
    expect(container.textContent).toContain("Next action");
    expect(container.textContent).toContain("Requests");
    expect(container.textContent).toContain("Artifacts");
    expect(container.textContent).toContain("Ready thread");
    expect(container.textContent).toContain("Waiting for your input");
    expect(container.textContent).toContain("This thread is ready for your next input.");
    expect(container.textContent).toContain("Thread ID");
    expect(container.textContent).toContain("Workspace ID");
    expect(container.textContent).toContain("Stream");
    expect(container.textContent).toContain("Live");
    expect(container.textContent).toContain("Refresh thread");
    expect(container.textContent).toContain("No pending or recently resolved request.");
    expect(container.textContent).toContain("Debug: raw thread view JSON");
    const debugDetails = container.querySelector("details.detail-debug");
    expect(debugDetails).not.toBeNull();
    expect(debugDetails?.hasAttribute("open")).toBe(false);
  });

  it("lists contextual artifacts from Thread Details and opens their detail", async () => {
    await act(async () => {
      root.render(
        <ChatView
          backgroundPriorityNotice={null}
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
          selectedThreadId="thread_001"
          selectedThreadView={{
            thread: {
              thread_id: "thread_001",
              title: "Artifact thread",
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
            latest_resolved_request: null,
            composer: {
              accepting_user_input: true,
              interrupt_available: false,
              blocked_by_request: false,
              input_unavailable_reason: null,
            },
            timeline: {
              items: [
                {
                  timeline_item_id: "timeline_failure",
                  thread_id: "thread_001",
                  turn_id: "turn_001",
                  item_id: "item_failure_001",
                  sequence: 1,
                  occurred_at: "2026-03-27T05:15:00Z",
                  kind: "turn.failed",
                  payload: {
                    summary: "Tests failed after the patch",
                    command: "npm run check",
                    file_paths: ["apps/frontend-bff/src/chat-view.tsx"],
                    tests: ["tests/chat-view.test.tsx"],
                    request_id: "req_failure_001",
                  },
                },
              ],
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
    });

    const detailsButton = container.querySelector(
      'button[aria-label="Thread details"]',
    ) as HTMLButtonElement | null;
    await act(async () => {
      detailsButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Thread details");
    expect(container.textContent).toContain("Artifacts");
    expect(container.textContent).toContain("Turn failed");
    expect(container.textContent).toContain("Tests failed after the patch");

    const artifactButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Inspect failure",
    );
    expect(artifactButton).toBeDefined();

    await act(async () => {
      artifactButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Failure detail");
    expect(container.textContent).toContain("Commands");
    expect(container.textContent).toContain("npm run check");
    expect(container.textContent).toContain("apps/frontend-bff/src/chat-view.tsx");
    expect(container.textContent).toContain("Debug: raw timeline payload JSON");
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

  it("folds long timeline rows and expands them in place", async () => {
    const longOutput = Array.from(
      { length: 12 },
      (_, index) => `diagnostic line ${String(index + 1).padStart(2, "0")}`,
    ).join("\n");

    await act(async () => {
      root.render(
        <ChatView
          backgroundPriorityNotice={null}
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
          selectedThreadId="thread_001"
          selectedThreadView={{
            thread: {
              thread_id: "thread_001",
              title: "Dense timeline thread",
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
            latest_resolved_request: null,
            composer: {
              accepting_user_input: true,
              interrupt_available: false,
              blocked_by_request: false,
              input_unavailable_reason: null,
            },
            timeline: {
              items: [
                {
                  timeline_item_id: "evt_long_001",
                  thread_id: "thread_001",
                  turn_id: "turn_001",
                  item_id: "item_long_001",
                  sequence: 1,
                  occurred_at: "2026-03-27T05:22:00Z",
                  kind: "tool.output",
                  payload: {
                    content: longOutput,
                  },
                },
              ],
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
    });

    expect(container.textContent).toContain("diagnostic line 08");
    expect(container.textContent).not.toContain("diagnostic line 12");

    const showMoreButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Show more",
    );
    expect(showMoreButton).toBeDefined();
    expect(showMoreButton?.getAttribute("aria-expanded")).toBe("false");

    await act(async () => {
      showMoreButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("diagnostic line 12");
    expect(container.textContent).toContain("Show less");
  });

  it("surfaces a latest-activity CTA when auto-scroll is suppressed", async () => {
    const baseProps = {
      backgroundPriorityNotice: null,
      connectionState: "live" as const,
      draftAssistantMessages: {},
      errorMessage: null,
      isCreatingThread: false,
      isCreatingWorkspace: false,
      isInterruptingThread: false,
      isLoadingThread: false,
      isLoadingThreads: false,
      isLoadingWorkspaces: false,
      isRespondingToRequest: false,
      isSendingMessage: false,
      composerDraft: "",
      onCreateWorkspace: () => {},
      onApproveRequest: () => {},
      onSubmitComposer: () => {},
      onDenyRequest: () => {},
      onInterruptThread: () => {},
      onOpenBackgroundPriorityThread: () => {},
      onAskCodex: () => {},
      onComposerDraftChange: () => {},
      onSelectWorkspace: () => {},
      onSelectThread: () => {},
      onWorkspaceNameChange: () => {},
      selectedRequestDetail: null,
      selectedThreadId: "thread_001",
      statusMessage: null,
      threads: [],
      workspaceId: "ws_alpha",
      workspaceName: "",
      workspaces: [],
    };

    await act(async () => {
      root.render(
        <ChatView
          {...baseProps}
          selectedThreadView={{
            thread: {
              thread_id: "thread_001",
              title: "Scroll thread",
              workspace_id: "ws_alpha",
              native_status: {
                thread_status: "running",
                active_flags: [],
                latest_turn_status: "running",
              },
              updated_at: "2026-03-27T05:22:00Z",
            },
            current_activity: {
              kind: "running",
              label: "Running",
            },
            pending_request: null,
            latest_resolved_request: null,
            composer: {
              accepting_user_input: false,
              interrupt_available: true,
              blocked_by_request: false,
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
                  occurred_at: "2026-03-27T05:22:00Z",
                  kind: "message.user",
                  payload: {
                    summary: "user input accepted",
                    content: "First item",
                  },
                },
              ],
              next_cursor: null,
              has_more: false,
            },
          }}
          streamEvents={[]}
        />,
      );
    });

    const scrollRegion = container.querySelector(".thread-view-scroll-region") as HTMLDivElement;
    expect(scrollRegion).not.toBeNull();
    Object.defineProperty(scrollRegion, "clientHeight", {
      configurable: true,
      value: 100,
    });
    Object.defineProperty(scrollRegion, "scrollHeight", {
      configurable: true,
      value: 1000,
      writable: true,
    });
    Object.defineProperty(scrollRegion, "scrollTop", {
      configurable: true,
      value: 780,
      writable: true,
    });

    await act(async () => {
      scrollRegion.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    await act(async () => {
      root.render(
        <ChatView
          {...baseProps}
          selectedThreadView={{
            thread: {
              thread_id: "thread_001",
              title: "Scroll thread",
              workspace_id: "ws_alpha",
              native_status: {
                thread_status: "running",
                active_flags: [],
                latest_turn_status: "running",
              },
              updated_at: "2026-03-27T05:23:00Z",
            },
            current_activity: {
              kind: "running",
              label: "Running",
            },
            pending_request: null,
            latest_resolved_request: null,
            composer: {
              accepting_user_input: false,
              interrupt_available: true,
              blocked_by_request: false,
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
                  occurred_at: "2026-03-27T05:22:00Z",
                  kind: "message.user",
                  payload: {
                    summary: "user input accepted",
                    content: "First item",
                  },
                },
                {
                  timeline_item_id: "evt_002",
                  thread_id: "thread_001",
                  turn_id: null,
                  item_id: null,
                  sequence: 2,
                  occurred_at: "2026-03-27T05:23:00Z",
                  kind: "message.assistant.completed",
                  payload: {
                    summary: "assistant completed",
                    content: "Second item",
                  },
                },
              ],
              next_cursor: null,
              has_more: false,
            },
          }}
          streamEvents={[]}
        />,
      );
    });

    expect(container.textContent).toContain("New activity is available below.");
    const jumpButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Jump to latest activity",
    );
    expect(jumpButton).not.toBeUndefined();

    await act(async () => {
      jumpButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(scrollRegion.scrollTop).toBe(1000);
    expect(container.textContent).not.toContain("New activity is available below.");
  });

  it("keeps following latest activity when live assistant content grows on the same row", async () => {
    const baseProps = {
      backgroundPriorityNotice: null,
      connectionState: "live" as const,
      errorMessage: null,
      isCreatingThread: false,
      isCreatingWorkspace: false,
      isInterruptingThread: false,
      isLoadingThread: false,
      isLoadingThreads: false,
      isLoadingWorkspaces: false,
      isRespondingToRequest: false,
      isSendingMessage: false,
      composerDraft: "",
      onCreateWorkspace: () => {},
      onApproveRequest: () => {},
      onSubmitComposer: () => {},
      onDenyRequest: () => {},
      onInterruptThread: () => {},
      onOpenBackgroundPriorityThread: () => {},
      onAskCodex: () => {},
      onComposerDraftChange: () => {},
      onSelectWorkspace: () => {},
      onSelectThread: () => {},
      onWorkspaceNameChange: () => {},
      selectedRequestDetail: null,
      selectedThreadId: "thread_001",
      selectedThreadView: {
        thread: {
          thread_id: "thread_001",
          title: "Streaming thread",
          workspace_id: "ws_alpha",
          native_status: {
            thread_status: "running",
            active_flags: [],
            latest_turn_status: "running",
          },
          updated_at: "2026-03-27T05:22:00Z",
        },
        current_activity: {
          kind: "running",
          label: "Running",
        },
        pending_request: null,
        latest_resolved_request: null,
        composer: {
          accepting_user_input: false,
          interrupt_available: true,
          blocked_by_request: false,
          input_unavailable_reason: null,
        },
        timeline: {
          items: [],
          next_cursor: null,
          has_more: false,
        },
      },
      statusMessage: null,
      streamEvents: [],
      threads: [],
      workspaceId: "ws_alpha",
      workspaceName: "",
      workspaces: [],
    };

    await act(async () => {
      root.render(<ChatView {...baseProps} draftAssistantMessages={{ msg_live_001: "Working" }} />);
    });

    const scrollRegion = container.querySelector(".thread-view-scroll-region") as HTMLDivElement;
    expect(scrollRegion).not.toBeNull();
    Object.defineProperty(scrollRegion, "clientHeight", {
      configurable: true,
      value: 100,
    });
    Object.defineProperty(scrollRegion, "scrollHeight", {
      configurable: true,
      value: 1000,
      writable: true,
    });
    Object.defineProperty(scrollRegion, "scrollTop", {
      configurable: true,
      value: 1000,
      writable: true,
    });

    await act(async () => {
      root.render(
        <ChatView {...baseProps} draftAssistantMessages={{ msg_live_001: "Working longer now" }} />,
      );
    });

    Object.defineProperty(scrollRegion, "scrollHeight", {
      configurable: true,
      value: 1400,
      writable: true,
    });

    await act(async () => {
      root.render(
        <ChatView
          {...baseProps}
          draftAssistantMessages={{ msg_live_001: "Working longer now with more streamed detail" }}
        />,
      );
    });

    expect(scrollRegion.scrollTop).toBe(1400);
    expect(container.textContent).not.toContain("New activity is available below.");
  });
});
