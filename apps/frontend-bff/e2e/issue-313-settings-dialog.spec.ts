import { expect, type Page, test } from "@playwright/test";

import { expectNoHorizontalScroll, fulfillJson, stubEventSource } from "./helpers/browser-mocks";

async function mockSettingsDialogSurface(page: Page, postedInputs: string[]) {
  const workspace = {
    workspace_id: "ws_alpha",
    workspace_name: "alpha",
    created_at: "2026-04-05T02:20:00Z",
    updated_at: "2026-04-05T02:33:00Z",
    active_session_summary: {
      session_id: "thread_001",
      status: "waiting_on_user_input",
      last_message_at: "2026-04-05T02:33:00Z",
    },
    pending_approval_count: 0,
  };

  const threadSummary = {
    thread_id: "thread_001",
    title: "Settings validation thread",
    workspace_id: "ws_alpha",
    native_status: {
      thread_status: "idle",
      active_flags: [],
      latest_turn_status: "completed",
    },
    updated_at: "2026-04-05T02:33:00Z",
  };

  const threadView = {
    thread: threadSummary,
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
      items: Array.from({ length: 24 }, (_, index) => ({
        timeline_item_id: `evt_${String(index + 1).padStart(3, "0")}`,
        thread_id: "thread_001",
        turn_id: `turn_${String(Math.floor(index / 2) + 1).padStart(3, "0")}`,
        item_id: `item_${String(index + 1).padStart(3, "0")}`,
        sequence: index + 1,
        occurred_at: `2026-04-05T02:${String(index).padStart(2, "0")}:00Z`,
        kind: index % 2 === 0 ? "message.user" : "message.assistant.completed",
        payload:
          index % 2 === 0
            ? {
                summary: "user input accepted",
                content: `Settings check user message ${index + 1}`,
              }
            : {
                summary: "assistant completed",
                content: `Settings check assistant message ${index + 1}`,
              },
      })),
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
        pending_approval_count: 0,
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
            badge: null,
            blocked_cue: null,
            resume_cue: {
              reason_kind: "active_thread",
              priority_band: "medium",
              label: "Resume here",
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
            turn_id: `turn_${String(postedInputs.length + 12).padStart(3, "0")}`,
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

function settingsButton(page: Page) {
  return page.getByRole("button", { name: "Settings", exact: true });
}

function settingsDialog(page: Page) {
  return page.getByRole("dialog", { name: "Settings", exact: true });
}

test("settings dialog preserves thread state, persists preferences, and avoids overflow", async ({
  page,
}) => {
  const postedInputs: string[] = [];

  await stubEventSource(page);
  await mockSettingsDialogSurface(page, postedInputs);

  await page.goto("/chat?workspaceId=ws_alpha&threadId=thread_001");
  await expect(page.getByRole("heading", { name: "Settings validation thread" })).toBeVisible();
  await expect(settingsButton(page)).toBeVisible();
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

  const composer = page.locator("#thread-composer-input");
  await composer.fill("Preserve this draft");
  await page.getByRole("button", { name: "Thread details", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Thread details", exact: true })).toBeVisible();

  const scrollRegion = page.locator(".thread-view-scroll-region");
  const scrollTopBefore = await scrollRegion.evaluate((element) => {
    element.scrollTop = 360;
    return element.scrollTop;
  });

  await settingsButton(page).click();
  await expect(settingsDialog(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Close settings", exact: true })).toBeFocused();

  await page
    .locator('.settings-dialog input[name="composer-keybinding-mode"][value="editor"]')
    .focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Close settings", exact: true })).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await expect(
    page.locator('.settings-dialog input[name="composer-keybinding-mode"][value="editor"]'),
  ).toBeFocused();

  await page.locator(".settings-dialog .composer-mode-option", { hasText: "Editor" }).click();
  await page.locator(".settings-dialog .composer-mode-option", { hasText: "Light" }).click();
  await expect(
    page.getByText("Enter adds a new line. Ctrl+Enter or Meta+Enter sends."),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => ({
        composerMode: window.localStorage.getItem("codex-webui.composer-keybinding-mode"),
        theme: window.localStorage.getItem("codex-webui.theme"),
      })),
    )
    .toEqual({ composerMode: "editor", theme: "light" });

  await page.getByRole("button", { name: "Close settings", exact: true }).click();
  await expect(settingsDialog(page)).toHaveCount(0);
  await expect(settingsButton(page)).toBeFocused();
  await expect(page.getByRole("heading", { name: "Thread details", exact: true })).toBeVisible();
  await expect(composer).toHaveValue("Preserve this draft");
  const scrollTopAfterClose = await scrollRegion.evaluate((element) => element.scrollTop);
  expect(Math.abs(scrollTopAfterClose - scrollTopBefore)).toBeLessThanOrEqual(2);

  await settingsButton(page).click();
  await expect(settingsDialog(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(settingsDialog(page)).toHaveCount(0);
  await expect(settingsButton(page)).toBeFocused();
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

  await composer.fill("Editor mode message");
  await composer.press("Enter");
  await expect(composer).toHaveValue("Editor mode message\n");
  expect(postedInputs).toHaveLength(0);

  await composer.press("Control+Enter");
  await expect.poll(() => postedInputs.length).toBe(1);
  expect(postedInputs[0]).toContain("Editor mode message");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Settings validation thread" })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => ({
        composerMode: window.localStorage.getItem("codex-webui.composer-keybinding-mode"),
        documentTheme: document.documentElement.dataset.theme ?? null,
        theme: window.localStorage.getItem("codex-webui.theme"),
      })),
    )
    .toEqual({ composerMode: "editor", documentTheme: "light", theme: "light" });

  await settingsButton(page).click();
  await expect(page.locator('input[name="thread-view-theme"][value="light"]')).toBeChecked();
  await expect(
    page.locator('input[name="composer-keybinding-mode"][value="editor"]'),
  ).toBeChecked();
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);
});
