import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { expectNoHorizontalScroll, fulfillJson, stubEventSource } from "./helpers/browser-mocks";

const evidenceDir = path.resolve(
  process.cwd(),
  "..",
  "..",
  "artifacts",
  "visual-inspection",
  "issue-306-theme-switching",
);

async function ensureEvidenceDir() {
  await mkdir(evidenceDir, { recursive: true });
}

async function captureThemeScreenshot(page: Page, filename: string) {
  await ensureEvidenceDir();
  await page.screenshot({
    fullPage: false,
    path: path.join(evidenceDir, filename),
  });
}

function primaryApproveButton(page: Page) {
  return page.locator(".approve-button").first();
}

function primaryDenyButton(page: Page) {
  return page.locator(".danger-button").first();
}

async function mockThemeSurface(page: Page) {
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
    title: "Theme validation thread",
    workspace_id: "ws_alpha",
    native_status: {
      thread_status: "idle",
      active_flags: [],
      latest_turn_status: "completed",
    },
    updated_at: "2026-04-05T02:33:00Z",
  };

  const timelineItems = Array.from({ length: 28 }, (_, index) => ({
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
            content: `Theme check user message ${index + 1}`,
          }
        : {
            summary: "assistant completed",
            content: `Theme check assistant message ${index + 1}`,
          },
  }));

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
      items: timelineItems,
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
      return fulfillJson(
        route,
        {
          accepted: {
            thread_id: "thread_001",
            turn_id: "turn_015",
            input_item_id: "item_999",
          },
          thread: threadSummary,
        },
        202,
      );
    }

    return route.abort();
  });
}

async function mockApprovalThemeSurface(
  page: Page,
  {
    responseMode = "success",
  }: {
    responseMode?: "success" | "delayed-success" | "error";
  } = {},
) {
  const requestedAt = "2026-04-05T02:40:00Z";
  const resolvedAt = "2026-04-05T02:41:00Z";
  let resolution: "pending" | "approved" | "denied" = "pending";

  const pendingRequest = () => ({
    request_id: "req_001",
    thread_id: "thread_001",
    turn_id: "turn_001",
    item_id: "item_001",
    request_kind: "approval",
    status: "pending" as const,
    risk_category: "external_side_effect" as const,
    summary: "Run deployment",
    requested_at: requestedAt,
  });

  const resolvedRequest = () => ({
    request_id: "req_001",
    thread_id: "thread_001",
    turn_id: "turn_001",
    item_id: "item_001",
    request_kind: "approval",
    status: "resolved" as const,
    decision: resolution,
    requested_at: requestedAt,
    responded_at: resolvedAt,
  });

  const currentThread = () => ({
    thread_id: "thread_001",
    title: "Approval thread",
    workspace_id: "ws_alpha",
    native_status: {
      thread_status: resolution === "pending" ? "running" : "idle",
      active_flags: resolution === "pending" ? ["waiting_on_request"] : [],
      latest_turn_status: resolution === "pending" ? "running" : "completed",
    },
    updated_at: resolution === "pending" ? requestedAt : resolvedAt,
  });

  const currentThreadView = () => ({
    thread: currentThread(),
    current_activity:
      resolution === "pending"
        ? {
            kind: "waiting_on_approval",
            label: "Approval required",
          }
        : {
            kind: "waiting_on_user_input",
            label: "Waiting for your input",
          },
    pending_request: resolution === "pending" ? pendingRequest() : null,
    latest_resolved_request: resolution === "pending" ? null : resolvedRequest(),
    composer: {
      accepting_user_input: resolution !== "pending",
      interrupt_available: resolution === "pending",
      blocked_by_request: resolution === "pending",
      input_unavailable_reason: null,
    },
    timeline: {
      items: [
        {
          timeline_item_id: "evt_001",
          thread_id: "thread_001",
          turn_id: "turn_001",
          item_id: "item_001",
          sequence: 1,
          occurred_at: requestedAt,
          kind: "approval.requested",
          payload: {
            summary: "Run deployment",
          },
        },
        ...(resolution === "pending"
          ? []
          : [
              {
                timeline_item_id: "evt_002",
                thread_id: "thread_001",
                turn_id: "turn_001",
                item_id: "item_001",
                sequence: 2,
                occurred_at: resolvedAt,
                kind: "approval.resolved",
                payload: {
                  summary: `Latest request: ${resolution}`,
                },
              },
            ]),
      ],
      next_cursor: null,
      has_more: false,
    },
  });

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;

    if (pathname === "/api/v1/home" && request.method() === "GET") {
      return fulfillJson(route, {
        workspaces: [
          {
            workspace_id: "ws_alpha",
            workspace_name: "alpha",
            created_at: "2026-04-05T02:20:00Z",
            updated_at: resolution === "pending" ? requestedAt : resolvedAt,
            active_session_summary: {
              session_id: "thread_001",
              status: resolution === "pending" ? "waiting_approval" : "running",
              last_message_at: resolution === "pending" ? null : resolvedAt,
            },
            pending_approval_count: resolution === "pending" ? 1 : 0,
          },
        ],
        resume_candidates: [],
        pending_approval_count: resolution === "pending" ? 1 : 0,
        updated_at: resolution === "pending" ? requestedAt : resolvedAt,
      });
    }

    if (pathname === "/api/v1/workspaces" && request.method() === "GET") {
      return fulfillJson(route, {
        items: [
          {
            workspace_id: "ws_alpha",
            workspace_name: "alpha",
            created_at: "2026-04-05T02:20:00Z",
            updated_at: resolution === "pending" ? requestedAt : resolvedAt,
            active_session_summary: {
              session_id: "thread_001",
              status: resolution === "pending" ? "waiting_approval" : "running",
              last_message_at: resolution === "pending" ? null : resolvedAt,
            },
            pending_approval_count: resolution === "pending" ? 1 : 0,
          },
        ],
        next_cursor: null,
        has_more: false,
      });
    }

    if (pathname === "/api/v1/workspaces/ws_alpha/threads" && request.method() === "GET") {
      return fulfillJson(route, {
        items: [
          {
            ...currentThread(),
            current_activity: currentThreadView().current_activity,
            badge:
              resolution === "pending"
                ? {
                    kind: "approval_required",
                    label: "Approval required",
                  }
                : null,
            blocked_cue:
              resolution === "pending"
                ? {
                    kind: "approval_required",
                    label: "Needs your response",
                  }
                : null,
            resume_cue:
              resolution === "pending"
                ? {
                    reason_kind: "waiting_on_approval",
                    priority_band: "highest",
                    label: "Resume here first",
                  }
                : {
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
      return fulfillJson(route, currentThread());
    }

    if (pathname === "/api/v1/threads/thread_001/view" && request.method() === "GET") {
      return fulfillJson(route, currentThreadView());
    }

    if (pathname === "/api/v1/threads/thread_001/timeline" && request.method() === "GET") {
      return fulfillJson(route, currentThreadView().timeline);
    }

    if (pathname === "/api/v1/requests/req_001" && request.method() === "GET") {
      return fulfillJson(route, {
        request_id: "req_001",
        thread_id: "thread_001",
        turn_id: "turn_001",
        item_id: "item_001",
        request_kind: "approval",
        status: resolution === "pending" ? "pending" : "resolved",
        risk_category: "external_side_effect",
        summary: "Run deployment",
        reason: "Apply the prepared deployment plan.",
        operation_summary: "Deploy the latest checked-in build to staging.",
        requested_at: requestedAt,
        responded_at: resolution === "pending" ? null : resolvedAt,
        decision: resolution === "pending" ? null : resolution,
        decision_options: {
          policy_scope_supported: false,
          default_policy_scope: "once",
        },
        context: {
          environment: "staging",
          change_ticket: "CHG-93",
        },
      });
    }

    if (pathname === "/api/v1/requests/req_001/response" && request.method() === "POST") {
      if (responseMode === "error") {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "request_failed",
              message: "Failed to respond to the request.",
              details: {},
            },
          }),
        });
      }

      if (responseMode === "delayed-success") {
        await new Promise((resolve) => {
          setTimeout(resolve, 800);
        });
      }

      const body = request.postDataJSON() as {
        decision: "approved" | "denied";
      };

      resolution = body.decision;

      return fulfillJson(route, {
        request: {
          request_id: "req_001",
          status: "resolved",
          decision: body.decision,
          responded_at: resolvedAt,
        },
        thread: currentThread(),
      });
    }

    return route.abort();
  });
}

test("persists theme across reload and preserves thread state while toggling", async ({ page }) => {
  await stubEventSource(page);
  await mockThemeSurface(page);

  await page.goto("/chat?workspaceId=ws_alpha&threadId=thread_001");
  await expect(page.getByRole("heading", { name: "Theme validation thread" })).toBeVisible();
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

  const themeSwitch = page.getByRole("switch", { name: "Dark theme" });
  await expect(themeSwitch).toHaveAttribute("aria-checked", "true");
  await expect
    .poll(() =>
      page.evaluate(() => ({
        colorScheme: document.documentElement.style.colorScheme,
        theme: document.documentElement.dataset.theme ?? null,
      })),
    )
    .toEqual({ colorScheme: "dark", theme: "dark" });

  const composer = page.getByLabel("Continue thread");
  await composer.fill("Preserve this draft");
  await page.getByRole("button", { name: "Thread details", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Thread details", exact: true })).toBeVisible();

  const scrollTopBefore = await page.locator(".thread-view-scroll-region").evaluate((element) => {
    element.scrollTop = 420;
    return element.scrollTop;
  });

  await themeSwitch.click();

  await expect(themeSwitch).toHaveAttribute("aria-checked", "false");
  await expect(page).toHaveURL(/workspaceId=ws_alpha&threadId=thread_001/);
  await expect(page.getByRole("heading", { name: "Thread details", exact: true })).toBeVisible();
  await expect(composer).toHaveValue("Preserve this draft");
  await expect
    .poll(() =>
      page.evaluate(() => ({
        colorScheme: document.documentElement.style.colorScheme,
        storedTheme: window.localStorage.getItem("codex-webui.theme"),
        theme: document.documentElement.dataset.theme ?? null,
      })),
    )
    .toEqual({ colorScheme: "light", storedTheme: "light", theme: "light" });

  const scrollTopAfter = await page
    .locator(".thread-view-scroll-region")
    .evaluate((element) => element.scrollTop);
  expect(Math.abs(scrollTopAfter - scrollTopBefore)).toBeLessThanOrEqual(2);
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Theme validation thread" })).toBeVisible();
  await expect(themeSwitch).toHaveAttribute("aria-checked", "false");
  await expect
    .poll(() =>
      page.evaluate(() => ({
        colorScheme: document.documentElement.style.colorScheme,
        storedTheme: window.localStorage.getItem("codex-webui.theme"),
        theme: document.documentElement.dataset.theme ?? null,
      })),
    )
    .toEqual({ colorScheme: "light", storedTheme: "light", theme: "light" });
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);
});

test("captures dark and light theme evidence on desktop and mobile", async ({ page }, testInfo) => {
  await stubEventSource(page);
  await mockThemeSurface(page);

  const viewportLabel = testInfo.project.name === "desktop-chromium" ? "desktop" : "mobile";

  await page.goto("/chat?workspaceId=ws_alpha&threadId=thread_001");
  await expect(page.getByRole("heading", { name: "Theme validation thread" })).toBeVisible();
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

  await captureThemeScreenshot(page, `${viewportLabel}-dark.png`);

  const themeSwitch = page.getByRole("switch", { name: "Dark theme" });
  await themeSwitch.click();
  await expect(themeSwitch).toHaveAttribute("aria-checked", "false");
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

  await captureThemeScreenshot(page, `${viewportLabel}-light.png`);
});

test("captures pending request controls and detail surface in dark and light themes", async ({
  page,
}, testInfo) => {
  await stubEventSource(page);
  await mockApprovalThemeSurface(page);

  const viewportLabel = testInfo.project.name === "desktop-chromium" ? "desktop" : "mobile";

  await page.goto("/chat?workspaceId=ws_alpha&threadId=thread_001");
  await expect(primaryApproveButton(page)).toBeVisible();
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

  await captureThemeScreenshot(page, `${viewportLabel}-pending-request-dark.png`);

  await page.getByRole("button", { name: "Thread details", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Thread details", exact: true })).toBeVisible();
  await captureThemeScreenshot(page, `${viewportLabel}-detail-dark.png`);
  await page.getByRole("button", { name: "Close", exact: true }).click();

  const themeSwitch = page.getByRole("switch", { name: "Dark theme" });
  await themeSwitch.click();
  await expect(themeSwitch).toHaveAttribute("aria-checked", "false");
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

  await captureThemeScreenshot(page, `${viewportLabel}-pending-request-light.png`);

  await page.getByRole("button", { name: "Thread details", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Thread details", exact: true })).toBeVisible();
  await captureThemeScreenshot(page, `${viewportLabel}-detail-light.png`);
});

test("captures request feedback states across dark and light themes", async ({
  browser,
  page,
}, testInfo) => {
  const viewportLabel = testInfo.project.name === "desktop-chromium" ? "desktop" : "mobile";

  await stubEventSource(page);
  await mockApprovalThemeSurface(page, { responseMode: "delayed-success" });

  await page.goto("/chat?workspaceId=ws_alpha&threadId=thread_001");
  await expect(primaryApproveButton(page)).toBeVisible();

  await primaryApproveButton(page).click();
  await expect(page.getByText("Submitting request response.")).toBeVisible();
  await captureThemeScreenshot(page, `${viewportLabel}-feedback-info-dark.png`);

  await expect(page.getByText("Approved req_001.")).toBeVisible();
  await captureThemeScreenshot(page, `${viewportLabel}-feedback-success-dark.png`);

  await page.close();

  const errorPage = await browser.newPage();
  await stubEventSource(errorPage);
  await mockApprovalThemeSurface(errorPage, { responseMode: "error" });

  await errorPage.goto("/chat?workspaceId=ws_alpha&threadId=thread_001");
  await expect(primaryApproveButton(errorPage)).toBeVisible();

  const themeSwitch = errorPage.getByRole("switch", { name: "Dark theme" });
  await themeSwitch.click();
  await expect(themeSwitch).toHaveAttribute("aria-checked", "false");

  await primaryDenyButton(errorPage).click();
  await expect(errorPage.getByText("Failed to respond to the request.")).toBeVisible();
  await captureThemeScreenshot(errorPage, `${viewportLabel}-feedback-error-light.png`);

  await errorPage.close();
});
