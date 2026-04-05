// @vitest-environment jsdom

import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  PublicMessage,
  PublicSessionEvent,
  PublicSessionSummary,
} from "../src/chat-types";

const searchParams = new URLSearchParams({
  sessionId: "thread_001",
  workspaceId: "ws_alpha",
});

const chatDataMocks = vi.hoisted(() => ({
  createSessionFromChat: vi.fn(),
  listWorkspaceSessions: vi.fn(),
  loadChatSessionBundle: vi.fn(),
  sendSessionMessage: vi.fn(),
  startSessionFromChat: vi.fn(),
  stopSessionFromChat: vi.fn(),
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
  createSessionFromChat: chatDataMocks.createSessionFromChat,
  listWorkspaceSessions: chatDataMocks.listWorkspaceSessions,
  loadChatSessionBundle: chatDataMocks.loadChatSessionBundle,
  sendSessionMessage: chatDataMocks.sendSessionMessage,
  startSessionFromChat: chatDataMocks.startSessionFromChat,
  stopSessionFromChat: chatDataMocks.stopSessionFromChat,
}));

import { ChatPageClient } from "../src/chat-page-client";

function buildSession(
  overrides: Partial<PublicSessionSummary> = {},
): PublicSessionSummary {
  return {
    session_id: "thread_001",
    workspace_id: "ws_alpha",
    title: "Fix build error",
    status: "waiting_input",
    created_at: "2026-03-27T05:12:34Z",
    updated_at: "2026-03-27T05:22:00Z",
    started_at: "2026-03-27T05:13:00Z",
    last_message_at: "2026-03-27T05:21:40Z",
    active_approval_id: null,
    can_send_message: true,
    can_start: false,
    can_stop: true,
    ...overrides,
  };
}

function buildEvent(
  overrides: Partial<PublicSessionEvent> = {},
): PublicSessionEvent {
  return {
    event_id: "evt_001",
    session_id: "thread_001",
    event_type: "session.status_changed",
    sequence: 1,
    occurred_at: "2026-03-27T05:13:00Z",
    payload: {
      from_status: "created",
      to_status: "running",
    },
    ...overrides,
  };
}

function buildMessage(
  overrides: Partial<PublicMessage> = {},
): PublicMessage {
  return {
    message_id: "msg_user_001",
    session_id: "thread_001",
    role: "user",
    content: "Please explain the changes.",
    created_at: "2026-03-27T05:15:00Z",
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

describe("ChatPageClient", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("EventSource", MockEventSource);
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
      .IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    MockEventSource.instances = [];

    chatDataMocks.listWorkspaceSessions.mockReset();
    chatDataMocks.createSessionFromChat.mockReset();
    chatDataMocks.loadChatSessionBundle.mockReset();
    chatDataMocks.sendSessionMessage.mockReset();
    chatDataMocks.startSessionFromChat.mockReset();
    chatDataMocks.stopSessionFromChat.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
    vi.useRealTimers();
  });

  it("recovers visible transcript and event-log updates after a missed stream send flow", async () => {
    chatDataMocks.listWorkspaceSessions.mockResolvedValue({
      items: [buildSession()],
      next_cursor: null,
      has_more: false,
    });
    chatDataMocks.loadChatSessionBundle
      .mockResolvedValueOnce({
        session: buildSession(),
        messages: [],
        events: [buildEvent()],
      })
      .mockResolvedValueOnce({
        session: buildSession({
          status: "waiting_input",
          updated_at: "2026-03-27T05:15:03Z",
          last_message_at: "2026-03-27T05:15:00Z",
        }),
        messages: [buildMessage()],
        events: [
          buildEvent(),
          buildEvent({
            event_id: "evt_002",
            event_type: "message.user",
            sequence: 2,
            occurred_at: "2026-03-27T05:15:02Z",
            payload: {
              content: "Please explain the changes.",
              message_id: "msg_user_001",
            },
          }),
          buildEvent({
            event_id: "evt_003",
            sequence: 3,
            occurred_at: "2026-03-27T05:15:03Z",
            payload: {
              from_status: "running",
              to_status: "waiting_input",
            },
          }),
        ],
      })
      .mockResolvedValueOnce({
        session: buildSession({
          status: "waiting_input",
          updated_at: "2026-03-27T05:15:04Z",
          last_message_at: "2026-03-27T05:15:04Z",
        }),
        messages: [
          buildMessage(),
          buildMessage({
            message_id: "msg_asst_001",
            role: "assistant",
            content: "Here is the explanation.",
            created_at: "2026-03-27T05:15:04Z",
          }),
        ],
        events: [
          buildEvent(),
          buildEvent({
            event_id: "evt_002",
            event_type: "message.assistant.completed",
            sequence: 2,
            occurred_at: "2026-03-27T05:15:04Z",
            payload: {
              content: "Here is the explanation.",
              created_at: "2026-03-27T05:15:04Z",
              message_id: "msg_asst_001",
            },
          }),
        ],
      });
    chatDataMocks.sendSessionMessage.mockResolvedValue(buildMessage());

    await act(async () => {
      root.render(<ChatPageClient />);
    });
    await flushUi();

    expect(container.textContent).toContain("Fix build error");
    expect(container.textContent).toContain("No chat messages yet.");
    expect(MockEventSource.instances[0]?.url).toBe(
      "/api/v1/sessions/thread_001/stream",
    );

    const textarea = container.querySelector("#message-input");
    expect(textarea).not.toBeNull();

    await act(async () => {
      const setTextareaValue = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set;

      setTextareaValue?.call(
        textarea as HTMLTextAreaElement,
        "Please explain the changes.",
      );
      textarea!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await flushUi();

    const sendButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Send message",
    );
    expect(sendButton).not.toBeUndefined();
    expect((sendButton as HTMLButtonElement).disabled).toBe(false);

    await act(async () => {
      sendButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushUi();

    expect(chatDataMocks.sendSessionMessage).toHaveBeenCalledWith(
      "thread_001",
      "Please explain the changes.",
      expect.any(String),
    );
    expect(container.textContent).toContain(
      "Message accepted. Waiting for stream updates.",
    );
    expect(container.textContent).toContain("Please explain the changes.");
    expect(container.textContent).not.toContain("Here is the explanation.");

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    await flushUi();

    expect(chatDataMocks.loadChatSessionBundle).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(1);
    expect(container.textContent).toContain("Please explain the changes.");
    expect(container.textContent).not.toContain("Here is the explanation.");
    expect(container.textContent).toContain("message.user");
    expect(container.textContent).not.toContain("message.assistant.completed");

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    await flushUi();

    expect(chatDataMocks.loadChatSessionBundle).toHaveBeenCalledTimes(3);
    expect(container.textContent).toContain("Here is the explanation.");
    expect(container.textContent).toContain("message.assistant.completed");
    expect(vi.getTimerCount()).toBe(0);
  });
});
