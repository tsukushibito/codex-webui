import { expect, type Page, test } from "@playwright/test";

import { expectNoHorizontalScroll, fulfillJson, stubEventSource } from "./helpers/browser-mocks";

type ComposerMockState = "available" | "approval_blocked" | "unavailable";

async function mockComposerKeybindingSurface(
  page: Page,
  {
    postedInputs,
    state,
  }: {
    postedInputs: string[];
    state: ComposerMockState;
  },
) {
  const workspace = {
    workspace_id: "ws_alpha",
    workspace_name: "alpha",
    created_at: "2026-04-05T02:20:00Z",
    updated_at: "2026-04-05T02:33:00Z",
    active_session_summary: {
      session_id: "thread_001",
      status: state === "approval_blocked" ? "waiting_approval" : "running",
      last_message_at: "2026-04-05T02:33:00Z",
    },
    pending_approval_count: state === "approval_blocked" ? 1 : 0,
  };

  const threadSummary = {
    thread_id: "thread_001",
    workspace_id: "ws_alpha",
    native_status: {
      thread_status: state === "approval_blocked" ? "running" : "idle",
      active_flags: state === "approval_blocked" ? ["waiting_on_request"] : [],
      latest_turn_status: state === "approval_blocked" ? "running" : "completed",
    },
    updated_at: "2026-04-05T02:33:00Z",
  };

  const threadView = {
    thread: threadSummary,
    current_activity:
      state === "approval_blocked"
        ? {
            kind: "waiting_on_approval",
            label: "Approval required",
          }
        : {
            kind: "waiting_on_user_input",
            label: "Waiting for your input",
          },
    pending_request:
      state === "approval_blocked"
        ? {
            request_id: "req_001",
            thread_id: "thread_001",
            turn_id: "turn_001",
            item_id: "item_001",
            request_kind: "approval",
            status: "pending",
            risk_category: "external_side_effect",
            summary: "Run deployment",
            requested_at: "2026-04-05T02:40:00Z",
          }
        : null,
    latest_resolved_request: null,
    composer: {
      accepting_user_input: state === "available",
      interrupt_available: state === "approval_blocked",
      blocked_by_request: state === "approval_blocked",
      input_unavailable_reason: state === "unavailable" ? "session_locked" : null,
    },
    timeline: {
      items: [
        {
          timeline_item_id: "evt_001",
          thread_id: "thread_001",
          turn_id: null,
          item_id: null,
          sequence: 1,
          occurred_at: "2026-04-05T02:32:00Z",
          kind: "message.user",
          payload: {
            summary: "user input accepted",
            content: "Inspect composer shortcuts",
          },
        },
        {
          timeline_item_id: "evt_002",
          thread_id: "thread_001",
          turn_id: null,
          item_id: null,
          sequence: 2,
          occurred_at: "2026-04-05T02:33:00Z",
          kind: "message.assistant.completed",
          payload: {
            summary: "assistant completed",
            content: "Ready for the next instruction.",
          },
        },
      ],
      next_cursor: null,
      has_more: false,
    },
  };

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;

    if (pathname === "/api/v1/home" && request.method() === "GET") {
      return fulfillJson(route, {
        workspaces: [workspace],
        resume_candidates: [],
        pending_approval_count: workspace.pending_approval_count,
        updated_at: workspace.updated_at,
      });
    }

    if (pathname === "/api/v1/workspaces" && request.method() === "GET") {
      return fulfillJson(route, {
        items: [workspace],
        next_cursor: null,
        has_more: false,
      });
    }

    if (pathname === "/api/v1/workspaces/ws_alpha/threads" && request.method() === "GET") {
      return fulfillJson(route, {
        items: [
          {
            ...threadSummary,
            current_activity: threadView.current_activity,
            badge:
              state === "approval_blocked"
                ? {
                    kind: "approval",
                    label: "Waiting approval",
                  }
                : null,
            blocked_cue:
              state === "approval_blocked"
                ? {
                    kind: "approval_required",
                    label: "Needs response",
                  }
                : null,
            resume_cue: {
              reason_kind: state === "approval_blocked" ? "waiting_on_approval" : "active_thread",
              priority_band: state === "approval_blocked" ? "highest" : "medium",
              label: state === "approval_blocked" ? "Resume here first" : "Resume here",
            },
          },
        ],
        next_cursor: null,
        has_more: false,
      });
    }

    if (pathname === "/api/v1/threads/thread_001" && request.method() === "GET") {
      return fulfillJson(route, threadSummary);
    }

    if (pathname === "/api/v1/threads/thread_001/view" && request.method() === "GET") {
      return fulfillJson(route, threadView);
    }

    if (pathname === "/api/v1/threads/thread_001/timeline" && request.method() === "GET") {
      return fulfillJson(route, threadView.timeline);
    }

    if (pathname === "/api/v1/threads/thread_001/inputs" && request.method() === "POST") {
      const body = request.postDataJSON() as { content: string };
      postedInputs.push(body.content);
      return fulfillJson(
        route,
        {
          accepted: {
            thread_id: "thread_001",
            turn_id: null,
            input_item_id: `msg_${postedInputs.length}`,
          },
          thread: threadSummary,
        },
        202,
      );
    }

    return route.abort();
  });
}

test("persists composer keybinding mode and respects chat/editor shortcuts without overflow", async ({
  page,
}) => {
  const postedInputs: string[] = [];

  await stubEventSource(page);
  await mockComposerKeybindingSurface(page, {
    postedInputs,
    state: "available",
  });

  await page.goto("/chat?workspaceId=ws_alpha&threadId=thread_001");
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

  const textarea = page.locator("#thread-composer-input");

  await expect(page.getByText("Enter sends. Shift+Enter adds a new line.")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Chat/i })).toBeChecked();

  await textarea.fill("First line");
  await textarea.press("Shift+Enter");
  await expect(textarea).toHaveValue("First line\n");
  expect(postedInputs).toHaveLength(0);

  await textarea.press("Enter");
  await expect.poll(() => postedInputs.length).toBe(1);
  expect(postedInputs[0]).toContain("First line");

  await page.locator(".composer-mode-option", { hasText: "Editor" }).click();
  await expect(
    page.getByText("Enter adds a new line. Ctrl+Enter or Meta+Enter sends."),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: /Editor/i })).toBeChecked();
  await expect
    .poll(async () =>
      page.evaluate(() => window.localStorage.getItem("codex-webui.composer-keybinding-mode")),
    )
    .toBe("editor");

  await page.reload();
  await expect(page.getByRole("radio", { name: /Editor/i })).toBeChecked();
  await expect(
    page.getByText("Enter adds a new line. Ctrl+Enter or Meta+Enter sends."),
  ).toBeVisible();
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

  await textarea.fill("Second line");
  await textarea.press("Enter");
  await expect(textarea).toHaveValue("Second line\n");
  expect(postedInputs).toHaveLength(1);

  await textarea.press("Control+Enter");
  await expect.poll(() => postedInputs.length).toBe(2);
  expect(postedInputs[1]).toContain("Second line");

  await textarea.fill("Click send still works");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect.poll(() => postedInputs.length).toBe(3);
  expect(postedInputs[2]).toBe("Click send still works");
});

test("guards keyboard submit for IME, approval-blocked, and unavailable composer states", async ({
  page,
}) => {
  const availablePosts: string[] = [];

  await stubEventSource(page);
  await mockComposerKeybindingSurface(page, {
    postedInputs: availablePosts,
    state: "available",
  });

  await page.goto("/chat?workspaceId=ws_alpha&threadId=thread_001");
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

  await page.locator("#thread-composer-input").fill("IME guarded");
  await page.locator("#thread-composer-input").evaluate((element) => {
    const event = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
    });
    Object.defineProperty(event, "isComposing", {
      configurable: true,
      value: true,
    });
    element.dispatchEvent(event);
  });

  expect(availablePosts).toHaveLength(0);

  const blockedPosts: string[] = [];
  await page.unroute("**/api/v1/**");
  await mockComposerKeybindingSurface(page, {
    postedInputs: blockedPosts,
    state: "approval_blocked",
  });

  await page.goto("/chat?workspaceId=ws_alpha&threadId=thread_001");
  await expect(page.locator("#thread-composer-input")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Send message", exact: true })).toBeDisabled();
  await page.locator("#thread-composer-input").evaluate((element) => {
    element.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Enter",
      }),
    );
  });
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);
  expect(blockedPosts).toHaveLength(0);

  const unavailablePosts: string[] = [];
  await page.unroute("**/api/v1/**");
  await mockComposerKeybindingSurface(page, {
    postedInputs: unavailablePosts,
    state: "unavailable",
  });

  await page.goto("/chat?workspaceId=ws_alpha&threadId=thread_001");
  await expect(page.locator("#thread-composer-input")).toBeDisabled();
  await expect(page.getByText("session locked")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send message", exact: true })).toBeDisabled();
  await page.locator("#thread-composer-input").evaluate((element) => {
    element.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Enter",
      }),
    );
  });
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);
  expect(unavailablePosts).toHaveLength(0);
});
