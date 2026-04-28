// @vitest-environment jsdom

import type React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatView, type ChatViewProps } from "../src/chat-view";

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

  function buildThreadViewTimelineItems(count: number) {
    return Array.from({ length: count }, (_, index) => ({
      timeline_item_id: `evt_${index + 1}`,
      thread_id: "thread_001",
      turn_id: null,
      item_id: null,
      sequence: index + 1,
      occurred_at: `2026-03-27T05:${String(10 + index).padStart(2, "0")}:00Z`,
      kind: index % 2 === 0 ? "message.user" : "message.assistant.completed",
      payload:
        index % 2 === 0
          ? {
              summary: "user input accepted",
              content: `User message ${index + 1}`,
            }
          : {
              summary: "assistant completed",
              content: `Assistant message ${index + 1}`,
            },
    }));
  }

  function buildChatViewBaseProps(overrides: Partial<ChatViewProps> = {}): ChatViewProps {
    return {
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
      selectedThreadView: {
        thread: {
          thread_id: "thread_001",
          title: "Scrolling thread",
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
          accepting_user_input: true,
          interrupt_available: true,
          blocked_by_request: false,
          input_unavailable_reason: null,
        },
        timeline: {
          items: buildThreadViewTimelineItems(12),
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
      ...overrides,
    };
  }

  function composerTextarea(container: HTMLDivElement) {
    const textarea = container.querySelector<HTMLTextAreaElement>("#thread-composer-input");
    expect(textarea).not.toBeNull();
    return textarea!;
  }

  function dispatchComposerKeydown(
    textarea: HTMLTextAreaElement,
    init: KeyboardEventInit & { isComposing?: boolean; keyCode?: number } = {},
  ) {
    const event = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
      ...init,
    });

    if (typeof init.isComposing === "boolean") {
      Object.defineProperty(event, "isComposing", {
        configurable: true,
        value: init.isComposing,
      });
    }

    if (typeof init.keyCode === "number") {
      Object.defineProperty(event, "keyCode", {
        configurable: true,
        value: init.keyCode,
      });
    }

    textarea.dispatchEvent(event);
    return event;
  }

  function installScrollRegionMetrics(element: HTMLElement, options?: { clientHeight?: number }) {
    let clientHeight = options?.clientHeight ?? 240;
    let scrollHeight = 1600;
    let scrollTop = 0;

    const clampScrollTop = (value: number) =>
      Math.max(0, Math.min(value, Math.max(0, scrollHeight - clientHeight)));

    Object.defineProperty(element, "clientHeight", {
      configurable: true,
      get: () => clientHeight,
    });
    Object.defineProperty(element, "scrollHeight", {
      configurable: true,
      get: () => scrollHeight,
    });
    Object.defineProperty(element, "scrollTop", {
      configurable: true,
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = clampScrollTop(value);
      },
    });
    element.scrollTo = vi.fn((options?: ScrollToOptions | number, y?: number) => {
      const nextTop =
        typeof options === "number" ? (y ?? 0) : ((options?.top ?? element.scrollTop) as number);
      element.scrollTop = nextTop;
    });

    return {
      getScrollTop: () => scrollTop,
      setClientHeight: (value: number) => {
        clientHeight = value;
        scrollTop = clampScrollTop(scrollTop);
      },
      setScrollHeight: (value: number) => {
        scrollHeight = value;
        scrollTop = clampScrollTop(scrollTop);
      },
      setScrollTop: (value: number) => {
        element.scrollTop = value;
      },
    };
  }

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
    expect(markup).not.toContain("chat-topbar");
    expect(markup).toContain("Request summary");
    expect(markup).toContain("Run git push");
    expect(markup).toContain("Reason");
    expect(markup).toContain("Codex requests permission to push changes to remote.");
    expect(markup).toContain("Operation");
    expect(markup).toContain("git push origin main");
    expect(markup).toContain('aria-label="Thread details"');
    expect(markup).toContain("alpha");
    expect(markup).not.toContain("Workspace:");
    expect(markup).not.toContain("Stream:");
    expect(markup).not.toContain(">Refresh<");
    expect(markup).not.toContain("thread-feedback-card-inline");
    expect(markup).toContain("Please explain the diff.");
    expect(markup).not.toContain("Updated apps/frontend-bff/src/chat-view.tsx");
    expect(markup).toContain("Streaming update");
    expect(markup).toContain("Request needs attention");
    expect(markup).toContain("timeline-row-prominent");
    expect(markup).not.toContain("pending-request-card-fallback");
    expect(markup).toContain("Request detail");
    expect(markup).toContain("thread-feedback-card");
    expect(markup).not.toContain("Status update");
    expect(markup).not.toContain("timeline-row-compact");
    expect(markup).not.toContain("Inspect artifacts");
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

    expect(container.querySelector(".thread-view-header-stack header .status-badge")).toBeNull();
    expect(container.querySelector(".timeline-request-row-status .status-badge")).toBeNull();
    expect(container.querySelector(".thread-feedback-card-inline")).toBeNull();
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
    expect(container.querySelector(".thread-feedback-card")?.textContent).toContain(
      "Codex is running",
    );
    expect(container.textContent).toContain("Streaming");
    expect(container.querySelector(".timeline-row-live-status")).not.toBeNull();
  });

  it("does not add reconnecting feedback cards when a live assistant row is present", async () => {
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

    expect(container.querySelector(".thread-feedback-card-inline")).toBeNull();
    expect(container.querySelector(".thread-feedback-card")?.textContent).toContain(
      "Reconnecting live updates",
    );
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

  it("routes legacy feedback props into scoped thread and composer surfaces", () => {
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

    expect(markup).toContain("thread-surface-feedback");
    expect(markup).toContain("chat-composer-feedback-slot");
    expect(markup).toContain("Thread started.");
    expect(markup).toContain("Failed to interrupt the thread.");
    expect(markup).not.toContain("chat-feedback-stack");
    expect(markup).not.toContain("error-banner");
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

    const detailsButton = container.querySelector(
      'button[aria-label="Thread details"]',
    ) as HTMLButtonElement | null;
    expect(detailsButton).not.toBeNull();

    await act(async () => {
      detailsButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
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

    expect(markup).not.toContain("Input unavailable: recovery pending.");
    expect(markup.match(/<textarea/g) ?? []).toHaveLength(1);
    expect(markup).toContain("disabled");
    expect(markup).not.toContain('id="thread-input"');
    expect(markup).not.toContain('id="message-input"');
  });

  it("filters tool output rows out of the simplified chat timeline", async () => {
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

    expect(container.textContent).not.toContain("diagnostic line 08");
    expect(container.textContent).not.toContain("diagnostic line 12");
    expect(
      Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent === "Show more",
      ),
    ).toBeUndefined();
  });

  it("does not surface a latest-activity CTA when newer timeline rows arrive", async () => {
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

    expect(container.textContent).toContain("Second item");
    expect(container.textContent).not.toContain("New activity is available below.");
    expect(container.textContent).not.toContain("Jump to latest activity");
  });

  it("keeps live assistant updates inside the same streaming row without a CTA", async () => {
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

    await act(async () => {
      root.render(
        <ChatView {...baseProps} draftAssistantMessages={{ msg_live_001: "Working longer now" }} />,
      );
    });

    await act(async () => {
      root.render(
        <ChatView
          {...baseProps}
          draftAssistantMessages={{ msg_live_001: "Working longer now with more streamed detail" }}
        />,
      );
    });

    expect(container.textContent).toContain("Working longer now with more streamed detail");
    expect(container.querySelectorAll(".timeline-row-live-status")).toHaveLength(1);
    expect(container.textContent).not.toContain("New activity is available below.");
  });

  it("re-enables follow mode when sending a message so the accepted user row is brought back into view", async () => {
    const onSubmitComposer = vi.fn();
    const idleThreadView = {
      ...buildChatViewBaseProps().selectedThreadView!,
      composer: {
        accepting_user_input: true,
        interrupt_available: false,
        blocked_by_request: false,
        input_unavailable_reason: null,
      },
      thread: {
        ...buildChatViewBaseProps().selectedThreadView!.thread,
        native_status: {
          thread_status: "idle",
          active_flags: [],
          latest_turn_status: "completed",
        },
      },
      current_activity: {
        kind: "waiting_on_user_input",
        label: "Waiting for your input",
      },
    };
    const baseProps = buildChatViewBaseProps({
      composerDraft: "Please continue from here.",
      onSubmitComposer,
      selectedThreadView: idleThreadView,
    });

    await act(async () => {
      root.render(<ChatView {...baseProps} />);
    });

    const scrollRegion = container.querySelector<HTMLElement>(".thread-view-scroll-region");
    expect(scrollRegion).not.toBeNull();

    const metrics = installScrollRegionMetrics(scrollRegion!);

    await act(async () => {
      root.render(<ChatView {...baseProps} />);
    });

    metrics.setScrollTop(920);
    await act(async () => {
      scrollRegion!.dispatchEvent(new UIEvent("scroll", { bubbles: true }));
    });

    const submitButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Send message"]',
    );
    expect(submitButton).not.toBeNull();

    metrics.setScrollHeight(1760);
    await act(async () => {
      submitButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onSubmitComposer).toHaveBeenCalledTimes(1);

    const acceptedThreadView = {
      ...idleThreadView,
      thread: {
        ...idleThreadView.thread,
        native_status: {
          thread_status: "running",
          active_flags: [],
          latest_turn_status: "running",
        },
      },
      current_activity: {
        kind: "running",
        label: "Running",
      },
      composer: {
        accepting_user_input: false,
        interrupt_available: true,
        blocked_by_request: false,
        input_unavailable_reason: null,
      },
      timeline: {
        items: [
          ...idleThreadView.timeline.items,
          {
            timeline_item_id: "evt_accepted",
            thread_id: "thread_001",
            turn_id: null,
            item_id: null,
            sequence: 13,
            occurred_at: "2026-03-27T05:40:00Z",
            kind: "message.user",
            payload: {
              summary: "user input accepted",
              content: "Please continue from here.",
            },
          },
        ],
        next_cursor: null,
        has_more: false,
      },
    };

    await act(async () => {
      root.render(
        <ChatView
          {...baseProps}
          composerDraft=""
          isSendingMessage={true}
          selectedThreadView={acceptedThreadView}
        />,
      );
    });

    expect(metrics.getScrollTop()).toBe(1520);
    expect(container.textContent).toContain("Please continue from here.");
    expect(container.textContent).not.toContain("Jump to latest activity");
  });

  it("uses chat mode shortcuts by default and persists editor mode after mount", async () => {
    const storage = {
      getItem: vi.fn((key: string) =>
        key === "codex-webui.composer-keybinding-mode" ? "editor" : null,
      ),
      setItem: vi.fn(),
    };
    const onSubmitComposer = vi.fn();

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });

    await act(async () => {
      root.render(
        <ChatView
          {...buildChatViewBaseProps({
            composerDraft: "Run the next step",
            onSubmitComposer,
            selectedThreadView: {
              ...buildChatViewBaseProps().selectedThreadView!,
              current_activity: {
                kind: "waiting_on_user_input",
                label: "Waiting for your input",
              },
              composer: {
                accepting_user_input: true,
                interrupt_available: false,
                blocked_by_request: false,
                input_unavailable_reason: null,
              },
            },
          })}
        />,
      );
    });

    const textarea = composerTextarea(container);
    expect(container.textContent).toContain(
      "Enter adds a new line. Ctrl+Enter or Meta+Enter sends.",
    );
    expect(storage.getItem).toHaveBeenCalledWith("codex-webui.composer-keybinding-mode");

    await act(async () => {
      dispatchComposerKeydown(textarea);
      dispatchComposerKeydown(textarea, { ctrlKey: true });
    });

    expect(onSubmitComposer).toHaveBeenCalledTimes(1);

    const chatModeButton = container.querySelector<HTMLInputElement>(
      'input[name="composer-keybinding-mode"][value="chat"]',
    );
    expect(chatModeButton).not.toBeNull();

    await act(async () => {
      chatModeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(storage.setItem).toHaveBeenCalledWith("codex-webui.composer-keybinding-mode", "chat");
    expect(container.textContent).toContain("Enter sends. Shift+Enter adds a new line.");

    await act(async () => {
      dispatchComposerKeydown(textarea);
      dispatchComposerKeydown(textarea, { shiftKey: true });
    });

    expect(onSubmitComposer).toHaveBeenCalledTimes(2);
  });

  it("does not keyboard-submit while composing, disabled, unavailable, empty, or prevented", async () => {
    const onSubmitComposer = vi.fn();
    const storage = {
      getItem: vi.fn(() => "chat"),
      setItem: vi.fn(),
    };

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });

    const baseThreadView = {
      ...buildChatViewBaseProps().selectedThreadView!,
      current_activity: {
        kind: "waiting_on_user_input",
        label: "Waiting for your input",
      },
      composer: {
        accepting_user_input: true,
        interrupt_available: false,
        blocked_by_request: false,
        input_unavailable_reason: null,
      },
    };

    await act(async () => {
      root.render(
        <ChatView
          {...buildChatViewBaseProps({
            composerDraft: "Ready",
            onSubmitComposer,
            selectedThreadView: baseThreadView,
          })}
        />,
      );
    });

    const textarea = composerTextarea(container);

    await act(async () => {
      dispatchComposerKeydown(textarea, { isComposing: true });
      dispatchComposerKeydown(textarea, { keyCode: 229 });
      const preventedEvent = new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Enter",
      });
      preventedEvent.preventDefault();
      textarea.dispatchEvent(preventedEvent);
    });

    expect(onSubmitComposer).toHaveBeenCalledTimes(0);

    await act(async () => {
      root.render(
        <ChatView
          {...buildChatViewBaseProps({
            composerDraft: "",
            onSubmitComposer,
            selectedThreadView: baseThreadView,
          })}
        />,
      );
    });

    await act(async () => {
      dispatchComposerKeydown(composerTextarea(container));
    });

    await act(async () => {
      root.render(
        <ChatView
          {...buildChatViewBaseProps({
            composerDraft: "Ready",
            isSendingMessage: true,
            onSubmitComposer,
            selectedThreadView: baseThreadView,
          })}
        />,
      );
    });

    await act(async () => {
      dispatchComposerKeydown(composerTextarea(container));
    });

    await act(async () => {
      root.render(
        <ChatView
          {...buildChatViewBaseProps({
            composerDraft: "Ready",
            onSubmitComposer,
            selectedThreadView: {
              ...baseThreadView,
              composer: {
                ...baseThreadView.composer,
                accepting_user_input: false,
                input_unavailable_reason: "session_locked",
              },
            },
          })}
        />,
      );
    });

    await act(async () => {
      dispatchComposerKeydown(composerTextarea(container));
    });

    expect(onSubmitComposer).toHaveBeenCalledTimes(0);
  });

  it("falls back to chat mode when localStorage is inaccessible", async () => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("storage unavailable");
      },
    });

    await act(async () => {
      root.render(<ChatView {...buildChatViewBaseProps()} />);
    });

    expect(container.textContent).toContain("Enter sends. Shift+Enter adds a new line.");
  });
});
