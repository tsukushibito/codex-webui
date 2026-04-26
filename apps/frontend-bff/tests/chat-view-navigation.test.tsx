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

describe("ChatView navigation", () => {
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

    expect(markup).toContain('aria-label="Navigation"');
    expect(markup).toContain('aria-label="Thread View"');
    expect(markup).toContain('aria-label="Timeline"');
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
    expect(markup).toContain('aria-current="page"');
    expect(markup).not.toContain(">Selected<");
    expect(markup).toContain("Needs response");
    expect(markup).toContain('aria-label="Idle"');
    expect(markup.match(/<textarea/g) ?? []).toHaveLength(1);
    expect(markup).toContain('id="thread-composer-input"');
    expect(markup).not.toContain('id="thread-input"');
    expect(markup).not.toContain('id="message-input"');
    expect(markup).not.toContain("Home");
    expect(markup).not.toContain("Thread ref:");
  });

  it("switches desktop Navigation into a recoverable minibar", async () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    };
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });

    await act(async () => {
      root.render(
        <ChatView
          backgroundPriorityNotice={{
            threadId: "thread_approval",
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
          ]}
        />,
      );
    });

    const minimizeButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Minimize",
    );
    expect(minimizeButton).toBeDefined();

    await act(async () => {
      minimizeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector(".chat-layout.sidebar-minibar")).not.toBeNull();
    expect(container.textContent).toContain("Nav");
    expect(container.textContent).toContain("New");
    expect(container.querySelector('[aria-label="Expand Navigation"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Current thread: Active thread"]')).not.toBeNull();
    expect(
      container.querySelector('[aria-label="Waiting approval: Approval thread"]'),
    ).not.toBeNull();
    expect(storage.setItem).toHaveBeenCalledWith("codex-webui.sidebar-mode", "mini");

    const expandButton = container.querySelector(
      '[aria-label="Expand Navigation"]',
    ) as HTMLButtonElement;
    await act(async () => {
      expandButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector(".chat-layout.sidebar-minibar")).toBeNull();
    expect(storage.setItem).toHaveBeenCalledWith("codex-webui.sidebar-mode", "full");
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
    expect(container.querySelector('[aria-label="Idle"]')).not.toBeNull();
    expect(container.textContent).not.toContain("Running thread");
  });
});
