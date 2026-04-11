// @vitest-environment jsdom

import type React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  PublicRequestDetail,
  PublicThreadInputAcceptedResponse,
  PublicThreadListItem,
  PublicThreadStreamEvent,
  PublicThreadView,
} from "../src/thread-types";

const searchParams = new URLSearchParams({
  threadId: "thread_001",
  workspaceId: "ws_alpha",
});

const chatDataMocks = vi.hoisted(() => ({
  interruptThreadFromChat: vi.fn(),
  listWorkspaceThreads: vi.fn(),
  loadChatThreadBundle: vi.fn(),
  respondToPendingRequest: vi.fn(),
  sendThreadInput: vi.fn(),
  startThreadFromChat: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
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

vi.mock("../src/chat-data", () => ({
  interruptThreadFromChat: chatDataMocks.interruptThreadFromChat,
  listWorkspaceThreads: chatDataMocks.listWorkspaceThreads,
  loadChatThreadBundle: chatDataMocks.loadChatThreadBundle,
  respondToPendingRequest: chatDataMocks.respondToPendingRequest,
  sendThreadInput: chatDataMocks.sendThreadInput,
  startThreadFromChat: chatDataMocks.startThreadFromChat,
}));

import { ChatPageClient } from "../src/chat-page-client";

function buildThreadListItem(overrides: Partial<PublicThreadListItem> = {}): PublicThreadListItem {
  return {
    thread_id: "thread_001",
    workspace_id: "ws_alpha",
    native_status: {
      thread_status: "active",
      active_flags: [],
      latest_turn_status: "inProgress",
    },
    updated_at: "2026-03-27T05:22:00Z",
    current_activity: {
      kind: "in_progress",
      label: "In progress",
    },
    badge: null,
    blocked_cue: null,
    resume_cue: null,
    ...overrides,
  };
}

function buildThreadView(overrides: Partial<PublicThreadView> = {}): PublicThreadView {
  return {
    thread: {
      thread_id: "thread_001",
      workspace_id: "ws_alpha",
      native_status: {
        thread_status: "active",
        active_flags: [],
        latest_turn_status: "inProgress",
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
      interrupt_available: true,
      blocked_by_request: false,
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
          },
        },
      ],
      next_cursor: null,
      has_more: false,
    },
    ...overrides,
  };
}

function buildPendingRequestDetail(
  overrides: Partial<PublicRequestDetail> = {},
): PublicRequestDetail {
  return {
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
    ...overrides,
  };
}

function buildAcceptedInputResponse(
  overrides: Partial<PublicThreadInputAcceptedResponse> = {},
): PublicThreadInputAcceptedResponse {
  return {
    accepted: {
      thread_id: "thread_001",
      turn_id: "turn_001",
      input_item_id: "item_001",
    },
    thread: {
      thread_id: "thread_001",
      workspace_id: "ws_alpha",
      native_status: {
        thread_status: "active",
        active_flags: [],
        latest_turn_status: "inProgress",
      },
      updated_at: "2026-03-27T05:23:00Z",
    },
    ...overrides,
  };
}

class MockEventSource {
  static instances: MockEventSource[] = [];

  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onopen: (() => void) | null = null;
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

describe("ChatPageClient", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("EventSource", MockEventSource);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    MockEventSource.instances = [];

    chatDataMocks.interruptThreadFromChat.mockReset();
    chatDataMocks.listWorkspaceThreads.mockReset();
    chatDataMocks.loadChatThreadBundle.mockReset();
    chatDataMocks.respondToPendingRequest.mockReset();
    chatDataMocks.sendThreadInput.mockReset();
    chatDataMocks.startThreadFromChat.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
    delete (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
      .IS_REACT_ACT_ENVIRONMENT;
    vi.useRealTimers();
  });

  it("loads the selected thread from v0.9 endpoints and sends follow-up input", async () => {
    chatDataMocks.listWorkspaceThreads.mockResolvedValue({
      items: [buildThreadListItem()],
      next_cursor: null,
      has_more: false,
    });
    chatDataMocks.loadChatThreadBundle.mockResolvedValue({
      view: buildThreadView(),
      pendingRequestDetail: null,
    });
    chatDataMocks.sendThreadInput.mockResolvedValue(buildAcceptedInputResponse());

    await act(async () => {
      root.render(<ChatPageClient />);
    });
    await flushUi();

    expect(container.textContent).toContain("thread_001");
    expect(container.textContent).toContain("Waiting for your input");
    expect(MockEventSource.instances[0]?.url).toBe("/api/v1/threads/thread_001/stream");

    const textarea = container.querySelector("#message-input");
    expect(textarea).not.toBeNull();

    await act(async () => {
      const setTextareaValue = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set;

      setTextareaValue?.call(textarea as HTMLTextAreaElement, "Continue with the fix.");
      textarea!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await flushUi();

    const sendButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Send reply",
    );
    expect(sendButton).not.toBeUndefined();

    await act(async () => {
      sendButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushUi();

    expect(chatDataMocks.sendThreadInput).toHaveBeenCalledWith(
      "thread_001",
      "Continue with the fix.",
      expect.stringMatching(/^input_followup_/),
    );
  });

  it("responds to a pending request from thread context instead of the approvals page", async () => {
    const pendingRequestDetail = buildPendingRequestDetail();
    chatDataMocks.listWorkspaceThreads.mockResolvedValue({
      items: [
        buildThreadListItem({
          blocked_cue: {
            kind: "approval_required",
            label: "Needs your response",
          },
          resume_cue: {
            reason_kind: "waiting_on_approval",
            priority_band: "highest",
            label: "Resume here first",
          },
        }),
      ],
      next_cursor: null,
      has_more: false,
    });
    chatDataMocks.loadChatThreadBundle.mockResolvedValue({
      view: buildThreadView({
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
      }),
      pendingRequestDetail,
    });
    chatDataMocks.respondToPendingRequest.mockResolvedValue({
      request: {
        request_id: "req_001",
        status: "resolved",
        decision: "approved",
        responded_at: "2026-03-27T05:21:00Z",
      },
      thread: {
        thread_id: "thread_001",
        workspace_id: "ws_alpha",
        native_status: {
          thread_status: "active",
          active_flags: [],
          latest_turn_status: "inProgress",
        },
        updated_at: "2026-03-27T05:21:00Z",
      },
    });

    await act(async () => {
      root.render(<ChatPageClient />);
    });
    await flushUi();

    expect(container.textContent).toContain("Run git push");
    expect(container.textContent).toContain("Codex requests permission to push changes to remote.");

    const approveButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Approve request",
    );
    expect(approveButton).not.toBeUndefined();

    await act(async () => {
      approveButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushUi();

    expect(chatDataMocks.respondToPendingRequest).toHaveBeenCalledWith(
      "req_001",
      "approved",
      expect.stringMatching(/^response_/),
    );
  });

  it("refreshes thread state after a thread stream event arrives", async () => {
    const streamEvent: PublicThreadStreamEvent = {
      event_id: "evt_002",
      thread_id: "thread_001",
      event_type: "approval.requested",
      sequence: 2,
      occurred_at: "2026-03-27T05:20:00Z",
      payload: {
        summary: "Run git push",
      },
    };

    chatDataMocks.listWorkspaceThreads.mockResolvedValue({
      items: [buildThreadListItem()],
      next_cursor: null,
      has_more: false,
    });
    chatDataMocks.loadChatThreadBundle.mockResolvedValue({
      view: buildThreadView(),
      pendingRequestDetail: null,
    });

    await act(async () => {
      root.render(<ChatPageClient />);
    });
    await flushUi();

    await act(async () => {
      MockEventSource.instances[0]?.onmessage?.(
        new MessageEvent("message", {
          data: JSON.stringify(streamEvent),
        }),
      );
    });
    await flushUi();

    expect(chatDataMocks.loadChatThreadBundle).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain("Request pending. Respond from the current thread.");
  });
});
