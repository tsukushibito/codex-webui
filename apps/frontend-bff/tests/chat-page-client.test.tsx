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
  createWorkspaceFromChat: vi.fn(),
  interruptThreadFromChat: vi.fn(),
  listChatWorkspaces: vi.fn(),
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
  createWorkspaceFromChat: chatDataMocks.createWorkspaceFromChat,
  interruptThreadFromChat: chatDataMocks.interruptThreadFromChat,
  listChatWorkspaces: chatDataMocks.listChatWorkspaces,
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
    title: "Investigate build",
    native_status: {
      thread_status: "running",
      active_flags: ["waiting_on_request"],
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
    ...overrides,
  };
}

function buildWorkspace(overrides: Record<string, unknown> = {}) {
  return {
    workspace_id: "ws_alpha",
    workspace_name: "alpha",
    created_at: "2026-03-27T05:00:00Z",
    updated_at: "2026-03-27T05:22:00Z",
    active_session_summary: null,
    pending_approval_count: 0,
    ...overrides,
  };
}

function buildThreadView(overrides: Partial<PublicThreadView> = {}): PublicThreadView {
  return {
    thread: {
      thread_id: "thread_001",
      workspace_id: "ws_alpha",
      title: "Investigate build",
      native_status: {
        thread_status: "running",
        active_flags: ["waiting_on_request"],
        latest_turn_status: "running",
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
            content: "Please explain the changes.",
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

function buildResolvedRequestDetail(
  overrides: Partial<PublicRequestDetail> = {},
): PublicRequestDetail {
  return buildPendingRequestDetail({
    status: "resolved",
    decision: "approved",
    responded_at: "2026-03-27T05:21:00Z",
    ...overrides,
  });
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
      title: "Investigate build",
      native_status: {
        thread_status: "running",
        active_flags: ["waiting_on_request"],
        latest_turn_status: "running",
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

function createDeferred<T>() {
  let resolve: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return {
    promise,
    resolve: resolve!,
  };
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

    chatDataMocks.createWorkspaceFromChat.mockReset();
    chatDataMocks.interruptThreadFromChat.mockReset();
    chatDataMocks.listChatWorkspaces.mockReset();
    chatDataMocks.listWorkspaceThreads.mockReset();
    chatDataMocks.loadChatThreadBundle.mockReset();
    chatDataMocks.respondToPendingRequest.mockReset();
    chatDataMocks.sendThreadInput.mockReset();
    chatDataMocks.startThreadFromChat.mockReset();
    chatDataMocks.listChatWorkspaces.mockResolvedValue({
      items: [buildWorkspace()],
      next_cursor: null,
      has_more: false,
    });
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
    chatDataMocks.listWorkspaceThreads
      .mockResolvedValueOnce({
        items: [
          buildThreadListItem({
            native_status: {
              thread_status: "waiting_input",
              active_flags: [],
              latest_turn_status: null,
            },
            current_activity: {
              kind: "waiting_on_user_input",
              label: "Waiting for your input",
            },
          }),
        ],
        next_cursor: null,
        has_more: false,
      })
      .mockResolvedValueOnce({
        items: [
          buildThreadListItem({
            current_activity: {
              kind: "running",
              label: "Running",
            },
          }),
        ],
        next_cursor: null,
        has_more: false,
      });
    chatDataMocks.loadChatThreadBundle
      .mockResolvedValueOnce({
        view: buildThreadView({
          thread: {
            thread_id: "thread_001",
            workspace_id: "ws_alpha",
            title: "Investigate build",
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
        }),
        pendingRequestDetail: null,
      })
      .mockResolvedValueOnce({
        view: buildThreadView({
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
              {
                timeline_item_id: "evt_001",
                thread_id: "thread_001",
                turn_id: null,
                item_id: null,
                sequence: 1,
                occurred_at: "2026-03-27T05:22:00Z",
                kind: "message.assistant.completed",
                payload: {
                  summary: "assistant completed",
                  content: "Please explain the changes.",
                },
              },
              {
                timeline_item_id: "evt_002",
                thread_id: "thread_001",
                turn_id: "turn_001",
                item_id: "item_001",
                sequence: 2,
                occurred_at: "2026-03-27T05:23:00Z",
                kind: "message.user",
                payload: {
                  summary: "user input accepted",
                  content: "Continue with the fix.",
                },
              },
            ],
            next_cursor: null,
            has_more: false,
          },
        }),
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

    const textarea = container.querySelector("#thread-composer-input");
    expect(textarea).not.toBeNull();
    expect(container.querySelectorAll("textarea")).toHaveLength(1);

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
      (button) => button.textContent === "Send input",
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
    expect(chatDataMocks.loadChatThreadBundle).toHaveBeenCalledTimes(2);
    expect((textarea as HTMLTextAreaElement).value).toBe("");
    expect(container.textContent).toContain("Running");
    expect(container.textContent).toContain("Continue with the fix.");
  });

  it("converges a newly started thread back to sendable follow-up input without reload", async () => {
    const originalThreadId = searchParams.get("threadId");
    searchParams.delete("threadId");
    let startedThreadViewLoads = 0;
    let followUpSubmitted = false;

    const startedThreadRunningView = buildThreadView({
      thread: {
        thread_id: "thread_new",
        workspace_id: "ws_alpha",
        title: "Start a new thread",
        native_status: {
          thread_status: "running",
          active_flags: ["turn_active"],
          latest_turn_status: "running",
        },
        updated_at: "2026-03-27T05:23:00Z",
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
          {
            timeline_item_id: "evt_new_001",
            thread_id: "thread_new",
            turn_id: "turn_new_001",
            item_id: "item_new_001",
            sequence: 1,
            occurred_at: "2026-03-27T05:23:00Z",
            kind: "message.user",
            payload: {
              summary: "user input accepted",
              content: "Start a new thread.",
            },
          },
        ],
        next_cursor: null,
        has_more: false,
      },
    });
    const startedThreadReadyView = buildThreadView({
      thread: {
        thread_id: "thread_new",
        workspace_id: "ws_alpha",
        title: "Start a new thread",
        native_status: {
          thread_status: "waiting_input",
          active_flags: [],
          latest_turn_status: null,
        },
        updated_at: "2026-03-27T05:23:04Z",
      },
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
      timeline: {
        items: [
          {
            timeline_item_id: "evt_new_001",
            thread_id: "thread_new",
            turn_id: "turn_new_001",
            item_id: "item_new_001",
            sequence: 1,
            occurred_at: "2026-03-27T05:23:00Z",
            kind: "message.user",
            payload: {
              summary: "user input accepted",
              content: "Start a new thread.",
            },
          },
        ],
        next_cursor: null,
        has_more: false,
      },
    });
    const followUpRunningView = buildThreadView({
      thread: {
        thread_id: "thread_new",
        workspace_id: "ws_alpha",
        title: "Start a new thread",
        native_status: {
          thread_status: "running",
          active_flags: ["turn_active"],
          latest_turn_status: "running",
        },
        updated_at: "2026-03-27T05:23:08Z",
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
          {
            timeline_item_id: "evt_new_001",
            thread_id: "thread_new",
            turn_id: "turn_new_001",
            item_id: "item_new_001",
            sequence: 1,
            occurred_at: "2026-03-27T05:23:00Z",
            kind: "message.user",
            payload: {
              summary: "user input accepted",
              content: "Start a new thread.",
            },
          },
          {
            timeline_item_id: "evt_new_002",
            thread_id: "thread_new",
            turn_id: "turn_new_002",
            item_id: "item_new_002",
            sequence: 2,
            occurred_at: "2026-03-27T05:23:08Z",
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
    });

    chatDataMocks.listWorkspaceThreads
      .mockResolvedValueOnce({
        items: [],
        next_cursor: null,
        has_more: false,
      })
      .mockResolvedValue({
        items: [
          buildThreadListItem({
            thread_id: "thread_new",
            native_status: {
              thread_status: "waiting_input",
              active_flags: [],
              latest_turn_status: null,
            },
            current_activity: {
              kind: "waiting_on_user_input",
              label: "Waiting for your input",
            },
          }),
        ],
        next_cursor: null,
        has_more: false,
      });
    chatDataMocks.startThreadFromChat.mockResolvedValue(
      buildAcceptedInputResponse({
        accepted: {
          thread_id: "thread_new",
          turn_id: "turn_new_001",
          input_item_id: "item_new_001",
        },
        thread: {
          thread_id: "thread_new",
          workspace_id: "ws_alpha",
          title: "Start a new thread",
          native_status: {
            thread_status: "running",
            active_flags: ["turn_active"],
            latest_turn_status: "running",
          },
          updated_at: "2026-03-27T05:23:00Z",
        },
      }),
    );
    chatDataMocks.loadChatThreadBundle.mockImplementation(async () => ({
      view: followUpSubmitted
        ? followUpRunningView
        : startedThreadViewLoads++ === 0
          ? startedThreadRunningView
          : startedThreadReadyView,
      pendingRequestDetail: null,
    }));
    chatDataMocks.sendThreadInput.mockImplementation(async () => {
      followUpSubmitted = true;

      return buildAcceptedInputResponse({
        accepted: {
          thread_id: "thread_new",
          turn_id: "turn_new_002",
          input_item_id: "item_new_002",
        },
        thread: {
          thread_id: "thread_new",
          workspace_id: "ws_alpha",
          title: "Start a new thread",
          native_status: {
            thread_status: "running",
            active_flags: ["turn_active"],
            latest_turn_status: "running",
          },
          updated_at: "2026-03-27T05:23:08Z",
        },
      });
    });

    try {
      await act(async () => {
        root.render(<ChatPageClient />);
      });
      await flushUi();

      const firstInputTextarea = container.querySelector("#thread-composer-input");
      expect(firstInputTextarea).not.toBeNull();
      expect(container.querySelectorAll("textarea")).toHaveLength(1);

      await act(async () => {
        const setTextareaValue = Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          "value",
        )?.set;

        setTextareaValue?.call(firstInputTextarea as HTMLTextAreaElement, "Start a new thread.");
        firstInputTextarea!.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await flushUi();

      const startThreadButton = Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent === "Start thread",
      );
      expect(startThreadButton).not.toBeUndefined();

      await act(async () => {
        startThreadButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      await flushUi();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(400);
      });
      await flushUi();

      expect(container.textContent).toContain("Started thread thread_new.");
      expect(container.textContent).toContain("Waiting for your input");

      const followUpTextarea = container.querySelector("#thread-composer-input");
      expect(followUpTextarea).not.toBeNull();
      expect(container.querySelectorAll("textarea")).toHaveLength(1);
      expect((followUpTextarea as HTMLTextAreaElement).value).toBe("");

      const sendButton = Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent === "Send input",
      );
      expect(sendButton).not.toBeUndefined();
      expect((sendButton as HTMLButtonElement).disabled).toBe(true);

      await act(async () => {
        const setTextareaValue = Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          "value",
        )?.set;

        setTextareaValue?.call(followUpTextarea as HTMLTextAreaElement, "Please explain the diff.");
        followUpTextarea!.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await flushUi();

      expect((sendButton as HTMLButtonElement).disabled).toBe(false);

      await act(async () => {
        sendButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      await flushUi();

      expect(chatDataMocks.sendThreadInput).toHaveBeenCalledWith(
        "thread_new",
        "Please explain the diff.",
        expect.stringMatching(/^input_followup_/),
      );
      expect(container.textContent).toContain("Input accepted. Waiting for thread updates.");
      expect(container.textContent).toContain("Please explain the diff.");
    } finally {
      if (originalThreadId) {
        searchParams.set("threadId", originalThreadId);
      } else {
        searchParams.delete("threadId");
      }
    }
  });

  it("creates a workspace from Navigation and starts first input in that workspace", async () => {
    const originalThreadId = searchParams.get("threadId");
    const originalWorkspaceId = searchParams.get("workspaceId");
    searchParams.delete("threadId");
    searchParams.delete("workspaceId");

    chatDataMocks.listChatWorkspaces
      .mockResolvedValueOnce({
        items: [],
        next_cursor: null,
        has_more: false,
      })
      .mockResolvedValue({
        items: [
          buildWorkspace({
            workspace_id: "ws_created",
            workspace_name: "created",
            updated_at: "2026-03-27T05:30:00Z",
          }),
        ],
        next_cursor: null,
        has_more: false,
      });
    chatDataMocks.createWorkspaceFromChat.mockResolvedValue(
      buildWorkspace({
        workspace_id: "ws_created",
        workspace_name: "created",
        updated_at: "2026-03-27T05:30:00Z",
      }),
    );
    chatDataMocks.listWorkspaceThreads.mockResolvedValue({
      items: [],
      next_cursor: null,
      has_more: false,
    });
    chatDataMocks.startThreadFromChat.mockResolvedValue(
      buildAcceptedInputResponse({
        accepted: {
          thread_id: "thread_created",
          turn_id: "turn_created_001",
          input_item_id: "item_created_001",
        },
        thread: {
          thread_id: "thread_created",
          workspace_id: "ws_created",
          title: "Created workspace thread",
          native_status: {
            thread_status: "running",
            active_flags: ["turn_active"],
            latest_turn_status: "running",
          },
          updated_at: "2026-03-27T05:31:00Z",
        },
      }),
    );
    chatDataMocks.loadChatThreadBundle.mockResolvedValue({
      view: buildThreadView({
        thread: {
          thread_id: "thread_created",
          workspace_id: "ws_created",
          title: "Created workspace thread",
          native_status: {
            thread_status: "running",
            active_flags: ["turn_active"],
            latest_turn_status: "running",
          },
          updated_at: "2026-03-27T05:31:00Z",
        },
      }),
      pendingRequestDetail: null,
    });

    try {
      await act(async () => {
        root.render(<ChatPageClient />);
      });
      await flushUi();

      expect(container.textContent).toContain(
        "Select or create a workspace from Navigation before starting work.",
      );
      const disabledComposer = container.querySelector("#thread-composer-input");
      expect(disabledComposer).not.toBeNull();
      expect((disabledComposer as HTMLTextAreaElement).disabled).toBe(true);
      expect(container.querySelectorAll("textarea")).toHaveLength(1);

      const workspaceInput = container.querySelector("#workspace-name");
      expect(workspaceInput).not.toBeNull();

      await act(async () => {
        const setInputValue = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set;

        setInputValue?.call(workspaceInput as HTMLInputElement, "created");
        workspaceInput!.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await flushUi();

      const createWorkspaceButton = Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent === "Create workspace",
      );
      expect(createWorkspaceButton).not.toBeUndefined();

      await act(async () => {
        createWorkspaceButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      await flushUi();

      expect(chatDataMocks.createWorkspaceFromChat).toHaveBeenCalledWith("created");
      expect(container.textContent).toContain("Created workspace created.");
      expect(container.textContent).toContain("Ask Codex");

      const firstInputTextarea = container.querySelector("#thread-composer-input");
      expect(firstInputTextarea).not.toBeNull();
      expect(container.querySelectorAll("textarea")).toHaveLength(1);

      await act(async () => {
        const setTextareaValue = Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          "value",
        )?.set;

        setTextareaValue?.call(firstInputTextarea as HTMLTextAreaElement, "Start scoped work.");
        firstInputTextarea!.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await flushUi();

      const startThreadButton = Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent === "Start thread",
      );
      expect(startThreadButton).not.toBeUndefined();

      await act(async () => {
        startThreadButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      await flushUi();

      expect(chatDataMocks.startThreadFromChat).toHaveBeenCalledWith(
        "ws_created",
        "Start scoped work.",
        expect.stringMatching(/^input_start_/),
      );
    } finally {
      if (originalThreadId) {
        searchParams.set("threadId", originalThreadId);
      } else {
        searchParams.delete("threadId");
      }

      if (originalWorkspaceId) {
        searchParams.set("workspaceId", originalWorkspaceId);
      } else {
        searchParams.delete("workspaceId");
      }
    }
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
          thread_status: "running",
          active_flags: ["waiting_on_request"],
          latest_turn_status: "running",
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
    expect(container.textContent).not.toContain("Operation: git push origin main");

    const requestDetailButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Request detail",
    );
    expect(requestDetailButton).not.toBeUndefined();

    await act(async () => {
      requestDetailButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushUi();

    expect(container.textContent).toContain("Operation: git push origin main");

    const approveButton = Array.from(container.querySelectorAll("button"))
      .reverse()
      .find((button) => button.textContent === "Approve request");
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

  it("reopens latest resolved request detail without response actions", async () => {
    chatDataMocks.listWorkspaceThreads.mockResolvedValue({
      items: [buildThreadListItem()],
      next_cursor: null,
      has_more: false,
    });
    chatDataMocks.loadChatThreadBundle.mockResolvedValue({
      view: buildThreadView({
        latest_resolved_request: {
          request_id: "req_001",
          thread_id: "thread_001",
          turn_id: "turn_001",
          item_id: "item_001",
          request_kind: "approval",
          status: "resolved",
          decision: "denied",
          requested_at: "2026-03-27T05:20:00Z",
          responded_at: "2026-03-27T05:21:00Z",
        },
      }),
      latestResolvedRequestDetail: buildResolvedRequestDetail({
        decision: "denied",
        responded_at: "2026-03-27T05:21:00Z",
      }),
      pendingRequestDetail: null,
    });

    await act(async () => {
      root.render(<ChatPageClient />);
    });
    await flushUi();

    expect(container.textContent).toContain("Latest resolved request");
    expect(container.textContent).toContain("Decision: denied");

    const detailButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Reopen request detail",
    );
    expect(detailButton).not.toBeUndefined();

    await act(async () => {
      detailButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushUi();

    expect(container.textContent).toContain("Request detail");
    expect(container.textContent).toContain("Decision");
    expect(container.textContent).toContain("Responded");
    expect(container.textContent).not.toContain("Approve request");
    expect(container.textContent).not.toContain("Deny request");
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

  it("marks stream sequence gaps as inconsistent and reacquires selected thread state", async () => {
    const firstEvent: PublicThreadStreamEvent = {
      event_id: "evt_002",
      thread_id: "thread_001",
      event_type: "session.status_changed",
      sequence: 2,
      occurred_at: "2026-03-27T05:20:00Z",
      payload: {
        status: "running",
      },
    };
    const gapEvent: PublicThreadStreamEvent = {
      event_id: "evt_004",
      thread_id: "thread_001",
      event_type: "approval.requested",
      sequence: 4,
      occurred_at: "2026-03-27T05:21:00Z",
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
          data: JSON.stringify(firstEvent),
        }),
      );
    });
    await flushUi();

    await act(async () => {
      MockEventSource.instances[0]?.onmessage?.(
        new MessageEvent("message", {
          data: JSON.stringify(gapEvent),
        }),
      );
    });
    await flushUi();

    expect(chatDataMocks.loadChatThreadBundle).toHaveBeenCalledTimes(3);
    expect(container.textContent).toContain(
      "Thread stream changed unexpectedly. Reacquiring thread state.",
    );
  });

  it("shows a targeted notice for a background high-priority thread and opens it on demand", async () => {
    chatDataMocks.listWorkspaceThreads
      .mockResolvedValueOnce({
        items: [
          buildThreadListItem(),
          buildThreadListItem({
            thread_id: "thread_background",
            native_status: {
              thread_status: "waiting_input",
              active_flags: ["waiting_on_request"],
              latest_turn_status: null,
            },
            current_activity: {
              kind: "waiting_on_approval",
              label: "Approval required",
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
          }),
        ],
        next_cursor: null,
        has_more: false,
      })
      .mockResolvedValueOnce({
        items: [
          buildThreadListItem(),
          buildThreadListItem({
            thread_id: "thread_background",
            native_status: {
              thread_status: "waiting_input",
              active_flags: ["waiting_on_request"],
              latest_turn_status: null,
            },
            current_activity: {
              kind: "waiting_on_approval",
              label: "Approval required",
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
          }),
        ],
        next_cursor: null,
        has_more: false,
      });
    chatDataMocks.loadChatThreadBundle
      .mockResolvedValueOnce({
        view: buildThreadView(),
        pendingRequestDetail: null,
      })
      .mockResolvedValueOnce({
        view: buildThreadView({
          thread: {
            thread_id: "thread_background",
            workspace_id: "ws_alpha",
            title: "Background work",
            native_status: {
              thread_status: "waiting_input",
              active_flags: ["waiting_on_request"],
              latest_turn_status: null,
            },
            updated_at: "2026-03-27T05:25:00Z",
          },
          current_activity: {
            kind: "waiting_on_approval",
            label: "Approval required",
          },
          composer: {
            accepting_user_input: false,
            interrupt_available: false,
            blocked_by_request: true,
            input_unavailable_reason: null,
          },
        }),
        pendingRequestDetail: buildPendingRequestDetail({
          thread_id: "thread_background",
        }),
      });

    await act(async () => {
      root.render(<ChatPageClient />);
    });
    await flushUi();

    const notifications = MockEventSource.instances.find(
      (instance) => instance.url === "/api/v1/notifications/stream",
    );
    expect(notifications).not.toBeUndefined();

    await act(async () => {
      notifications?.onmessage?.(
        new MessageEvent("message", {
          data: JSON.stringify({
            thread_id: "thread_background",
            event_type: "approval.requested",
            occurred_at: "2026-03-27T05:25:00Z",
            high_priority: true,
          }),
        }),
      );
    });
    await flushUi();

    expect(chatDataMocks.listWorkspaceThreads).toHaveBeenCalledTimes(2);
    expect(chatDataMocks.loadChatThreadBundle).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("thread_001");
    expect(container.textContent).toContain("High-priority background thread needs attention.");
    expect(container.textContent).toContain("Background thread needs attention");
    expect(container.textContent).toContain("Reason: Needs response");

    const openThreadButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Open thread",
    );
    expect(openThreadButton).not.toBeUndefined();

    await act(async () => {
      openThreadButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushUi();

    expect(chatDataMocks.loadChatThreadBundle).toHaveBeenCalledTimes(2);
    expect(
      Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent === "Open thread",
      ),
    ).toBeUndefined();
    expect(container.textContent).toContain("thread_background");
    expect(container.textContent).toContain("Approval required");
  });

  it("refreshes the selected thread for a high-priority current-thread notification without a background notice", async () => {
    chatDataMocks.listWorkspaceThreads
      .mockResolvedValueOnce({
        items: [buildThreadListItem()],
        next_cursor: null,
        has_more: false,
      })
      .mockResolvedValueOnce({
        items: [
          buildThreadListItem({
            updated_at: "2026-03-27T05:25:00Z",
            current_activity: {
              kind: "waiting_on_approval",
              label: "Approval required",
            },
            blocked_cue: {
              kind: "approval_required",
              label: "Needs response",
            },
          }),
        ],
        next_cursor: null,
        has_more: false,
      });
    chatDataMocks.loadChatThreadBundle
      .mockResolvedValueOnce({
        view: buildThreadView(),
        pendingRequestDetail: null,
      })
      .mockResolvedValueOnce({
        view: buildThreadView({
          current_activity: {
            kind: "waiting_on_approval",
            label: "Approval required",
          },
          pending_request: {
            request_id: "req_selected",
            thread_id: "thread_001",
            turn_id: "turn_001",
            item_id: "item_001",
            request_kind: "approval",
            status: "pending",
            risk_category: "external_side_effect",
            summary: "Run git push",
            requested_at: "2026-03-27T05:25:00Z",
          },
          composer: {
            accepting_user_input: false,
            interrupt_available: true,
            blocked_by_request: true,
            input_unavailable_reason: null,
          },
        }),
        pendingRequestDetail: buildPendingRequestDetail(),
      });

    await act(async () => {
      root.render(<ChatPageClient />);
    });
    await flushUi();

    const notifications = MockEventSource.instances.find(
      (instance) => instance.url === "/api/v1/notifications/stream",
    );

    await act(async () => {
      notifications?.onmessage?.(
        new MessageEvent("message", {
          data: JSON.stringify({
            thread_id: "thread_001",
            event_type: "approval.requested",
            occurred_at: "2026-03-27T05:25:00Z",
            high_priority: true,
          }),
        }),
      );
    });
    await flushUi();

    expect(chatDataMocks.loadChatThreadBundle).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain("Approval required");
    expect(container.textContent).not.toContain("Background thread needs attention");
    expect(
      Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent === "Open thread",
      ),
    ).toBeUndefined();
  });

  it("keeps the generic high-priority status when the refreshed workspace list does not include the target thread", async () => {
    chatDataMocks.listWorkspaceThreads
      .mockResolvedValueOnce({
        items: [buildThreadListItem()],
        next_cursor: null,
        has_more: false,
      })
      .mockResolvedValueOnce({
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

    const notifications = MockEventSource.instances.find(
      (instance) => instance.url === "/api/v1/notifications/stream",
    );

    await act(async () => {
      notifications?.onmessage?.(
        new MessageEvent("message", {
          data: JSON.stringify({
            thread_id: "thread_missing",
            event_type: "approval.requested",
            occurred_at: "2026-03-27T05:25:00Z",
            high_priority: true,
          }),
        }),
      );
    });
    await flushUi();

    expect(container.textContent).toContain("High-priority background thread needs attention.");
    expect(container.textContent).not.toContain("Background thread needs attention");
    expect(
      Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent === "Open thread",
      ),
    ).toBeUndefined();
  });

  it("keeps the final assistant message visible after completion refresh", async () => {
    const initialThreadView = buildThreadView({
      timeline: {
        items: [],
        next_cursor: null,
        has_more: false,
      },
    });
    const finalThreadView = buildThreadView({
      timeline: {
        items: [
          {
            timeline_item_id: "evt_002",
            thread_id: "thread_001",
            turn_id: null,
            item_id: null,
            sequence: 2,
            occurred_at: "2026-03-27T05:22:05Z",
            kind: "message.assistant.completed",
            payload: {
              summary: "assistant completed",
              content: "Here is the explanation.",
            },
          },
        ],
        next_cursor: null,
        has_more: false,
      },
    });
    const deltaEvent: PublicThreadStreamEvent = {
      event_id: "evt_delta_001",
      thread_id: "thread_001",
      event_type: "message.assistant.delta",
      sequence: 2,
      occurred_at: "2026-03-27T05:22:03Z",
      payload: {
        message_id: "msg_asst_001",
        delta: "Working on it",
      },
    };
    const completedEvent: PublicThreadStreamEvent = {
      event_id: "evt_completed_001",
      thread_id: "thread_001",
      event_type: "message.assistant.completed",
      sequence: 3,
      occurred_at: "2026-03-27T05:22:05Z",
      payload: {
        message_id: "msg_asst_001",
        content: "Here is the explanation.",
      },
    };

    chatDataMocks.listWorkspaceThreads.mockResolvedValue({
      items: [buildThreadListItem()],
      next_cursor: null,
      has_more: false,
    });
    chatDataMocks.loadChatThreadBundle
      .mockResolvedValueOnce({
        view: initialThreadView,
        pendingRequestDetail: null,
      })
      .mockResolvedValueOnce({
        view: finalThreadView,
        pendingRequestDetail: null,
      });

    await act(async () => {
      root.render(<ChatPageClient />);
    });
    await flushUi();

    await act(async () => {
      MockEventSource.instances[0]?.onmessage?.(
        new MessageEvent("message", {
          data: JSON.stringify(deltaEvent),
        }),
      );
    });
    await flushUi();

    expect(container.textContent).toContain("Working on it");

    await act(async () => {
      MockEventSource.instances[0]?.onmessage?.(
        new MessageEvent("message", {
          data: JSON.stringify(completedEvent),
        }),
      );
    });
    await flushUi();

    expect(chatDataMocks.loadChatThreadBundle).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain("Here is the explanation.");
    expect(container.textContent).not.toContain("Working on it…");
  });

  it("renders the final assistant message from the stream even before thread refresh converges", async () => {
    const initialThreadView = buildThreadView({
      timeline: {
        items: [],
        next_cursor: null,
        has_more: false,
      },
    });
    const completedEvent: PublicThreadStreamEvent = {
      event_id: "evt_completed_002",
      thread_id: "thread_001",
      event_type: "message.assistant.completed",
      sequence: 3,
      occurred_at: "2026-03-27T05:22:05Z",
      payload: {
        message_id: "msg_asst_002",
        content: "The live stream completed normally.",
      },
    };

    chatDataMocks.listWorkspaceThreads.mockResolvedValue({
      items: [buildThreadListItem()],
      next_cursor: null,
      has_more: false,
    });
    chatDataMocks.loadChatThreadBundle
      .mockResolvedValueOnce({
        view: initialThreadView,
        pendingRequestDetail: null,
      })
      .mockResolvedValueOnce({
        view: initialThreadView,
        pendingRequestDetail: null,
      });

    await act(async () => {
      root.render(<ChatPageClient />);
    });
    await flushUi();

    await act(async () => {
      MockEventSource.instances[0]?.onmessage?.(
        new MessageEvent("message", {
          data: JSON.stringify(completedEvent),
        }),
      );
    });
    await flushUi();

    expect(chatDataMocks.loadChatThreadBundle).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain("The live stream completed normally.");
  });

  it("polls active thread state and converges to waiting input without relying on stream delivery", async () => {
    const runningThreadListItem = buildThreadListItem({
      native_status: {
        thread_status: "running",
        active_flags: [],
        latest_turn_status: "running",
      },
      current_activity: {
        kind: "running",
        label: "Running",
      },
    });
    const waitingThreadListItem = buildThreadListItem({
      native_status: {
        thread_status: "waiting_input",
        active_flags: [],
        latest_turn_status: null,
      },
      current_activity: {
        kind: "waiting_on_user_input",
        label: "Waiting for your input",
      },
    });
    const runningThreadView = buildThreadView({
      thread: {
        thread_id: "thread_001",
        workspace_id: "ws_alpha",
        title: "Investigate build",
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
      composer: {
        accepting_user_input: false,
        interrupt_available: true,
        blocked_by_request: false,
        input_unavailable_reason: null,
      },
    });
    const waitingThreadView = buildThreadView({
      thread: {
        thread_id: "thread_001",
        workspace_id: "ws_alpha",
        title: "Investigate build",
        native_status: {
          thread_status: "waiting_input",
          active_flags: [],
          latest_turn_status: null,
        },
        updated_at: "2026-03-27T05:23:00Z",
      },
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
    });

    chatDataMocks.listWorkspaceThreads
      .mockResolvedValueOnce({
        items: [runningThreadListItem],
        next_cursor: null,
        has_more: false,
      })
      .mockResolvedValueOnce({
        items: [waitingThreadListItem],
        next_cursor: null,
        has_more: false,
      });
    chatDataMocks.loadChatThreadBundle
      .mockResolvedValueOnce({
        view: runningThreadView,
        pendingRequestDetail: null,
      })
      .mockResolvedValueOnce({
        view: waitingThreadView,
        pendingRequestDetail: null,
      });

    await act(async () => {
      root.render(<ChatPageClient />);
    });
    await flushUi();

    expect(container.textContent).toContain("Running");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    await flushUi();

    expect(chatDataMocks.loadChatThreadBundle).toHaveBeenCalledTimes(2);
    expect(chatDataMocks.listWorkspaceThreads).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain("Waiting for your input");
  });

  it("ignores stale refresh responses after send and keeps the latest thread state", async () => {
    const waitingThreadListItem = buildThreadListItem({
      native_status: {
        thread_status: "waiting_input",
        active_flags: [],
        latest_turn_status: null,
      },
      current_activity: {
        kind: "waiting_on_user_input",
        label: "Waiting for your input",
      },
    });
    const initialThreadView = buildThreadView({
      thread: {
        thread_id: "thread_001",
        workspace_id: "ws_alpha",
        title: "Investigate build",
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
      composer: {
        accepting_user_input: true,
        interrupt_available: false,
        blocked_by_request: false,
        input_unavailable_reason: null,
      },
    });
    const runningThreadView = buildThreadView({
      thread: {
        thread_id: "thread_001",
        workspace_id: "ws_alpha",
        title: "Investigate build",
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
      composer: {
        accepting_user_input: false,
        interrupt_available: true,
        blocked_by_request: false,
        input_unavailable_reason: null,
      },
      timeline: {
        items: [
          {
            timeline_item_id: "evt_user_002",
            thread_id: "thread_001",
            turn_id: null,
            item_id: null,
            sequence: 2,
            occurred_at: "2026-03-27T05:23:00Z",
            kind: "message.user",
            payload: {
              summary: "user input accepted",
              content: "Continue with the fix.",
            },
          },
        ],
        next_cursor: null,
        has_more: false,
      },
    });
    const completedThreadView = buildThreadView({
      thread: {
        thread_id: "thread_001",
        workspace_id: "ws_alpha",
        title: "Investigate build",
        native_status: {
          thread_status: "waiting_input",
          active_flags: [],
          latest_turn_status: null,
        },
        updated_at: "2026-03-27T05:24:00Z",
      },
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
      timeline: {
        items: [
          {
            timeline_item_id: "evt_user_002",
            thread_id: "thread_001",
            turn_id: null,
            item_id: null,
            sequence: 2,
            occurred_at: "2026-03-27T05:23:00Z",
            kind: "message.user",
            payload: {
              summary: "user input accepted",
              content: "Continue with the fix.",
            },
          },
          {
            timeline_item_id: "evt_completed_003",
            thread_id: "thread_001",
            turn_id: null,
            item_id: null,
            sequence: 3,
            occurred_at: "2026-03-27T05:24:00Z",
            kind: "message.assistant.completed",
            payload: {
              summary: "assistant completed",
              content: "Fix applied.",
            },
          },
        ],
        next_cursor: null,
        has_more: false,
      },
    });
    const sendRefresh = createDeferred<{
      view: PublicThreadView;
      pendingRequestDetail: PublicRequestDetail | null;
    }>();
    const completionRefresh = createDeferred<{
      view: PublicThreadView;
      pendingRequestDetail: PublicRequestDetail | null;
    }>();
    const statusChangedEvent: PublicThreadStreamEvent = {
      event_id: "evt_status_001",
      thread_id: "thread_001",
      event_type: "session.status_changed",
      sequence: 3,
      occurred_at: "2026-03-27T05:24:00Z",
      payload: {
        status: "waiting_input",
      },
    };

    chatDataMocks.listWorkspaceThreads.mockResolvedValue({
      items: [waitingThreadListItem],
      next_cursor: null,
      has_more: false,
    });
    chatDataMocks.loadChatThreadBundle
      .mockResolvedValueOnce({
        view: initialThreadView,
        pendingRequestDetail: null,
      })
      .mockImplementationOnce(() => sendRefresh.promise)
      .mockImplementationOnce(() => completionRefresh.promise);
    chatDataMocks.sendThreadInput.mockResolvedValue(buildAcceptedInputResponse());

    await act(async () => {
      root.render(<ChatPageClient />);
    });
    await flushUi();

    const textarea = container.querySelector("#thread-composer-input");
    expect(textarea).not.toBeNull();
    expect(container.querySelectorAll("textarea")).toHaveLength(1);

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
      (button) => button.textContent === "Send input",
    );
    expect(sendButton).not.toBeUndefined();

    await act(async () => {
      sendButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    await act(async () => {
      MockEventSource.instances[0]?.onmessage?.(
        new MessageEvent("message", {
          data: JSON.stringify(statusChangedEvent),
        }),
      );
      await Promise.resolve();
    });

    completionRefresh.resolve({
      view: completedThreadView,
      pendingRequestDetail: null,
    });
    await flushUi();

    expect(container.textContent).toContain("Waiting for your input");
    expect(container.textContent).toContain("Fix applied.");

    sendRefresh.resolve({
      view: runningThreadView,
      pendingRequestDetail: null,
    });
    await flushUi();

    expect(chatDataMocks.loadChatThreadBundle).toHaveBeenCalledTimes(3);
    expect(container.textContent).toContain("Waiting for your input");
    expect(container.textContent).not.toContain("Current threadRunning");
  });
});
