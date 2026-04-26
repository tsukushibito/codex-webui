import { expect, type Page, test } from "@playwright/test";

import {
  expectNoHorizontalScroll,
  mockApprovalFlow,
  mockChatFlow,
  stubEventSource,
} from "./helpers/browser-mocks";

async function expectTimelineFirstViewport(page: Page) {
  const metrics = await page.evaluate(() => {
    const threadView = document.querySelector<HTMLElement>(".thread-view-card");
    const header = document.querySelector<HTMLElement>(".thread-view-header-stack");
    const body = document.querySelector<HTMLElement>(".thread-view-body");
    const timeline = document.querySelector<HTMLElement>(".thread-view-scroll-region");

    return {
      bodyHeight: body?.getBoundingClientRect().height ?? 0,
      headerHeight: header?.getBoundingClientRect().height ?? 0,
      threadViewHeight: threadView?.getBoundingClientRect().height ?? 0,
      timelineHeight: timeline?.getBoundingClientRect().height ?? 0,
    };
  });

  expect(metrics.threadViewHeight).toBeGreaterThan(0);
  expect(metrics.timelineHeight).toBeGreaterThan(120);
  expect(metrics.timelineHeight).toBeGreaterThan(metrics.headerHeight);
  expect(metrics.bodyHeight / metrics.threadViewHeight).toBeGreaterThan(0.58);
}

test("desktop preserves Timeline-first IA, recoverable details, and Navigation minibar", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "desktop-only IA viewport check");

  await stubEventSource(page);
  await mockChatFlow(page);

  await page.goto("/chat");
  await page.locator("details.workspace-switcher summary").click();
  await page.locator("#workspace-name").fill("alpha");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await page.getByLabel("Ask Codex").fill("Inspect the Timeline-first IA");
  await page.getByRole("button", { name: "Start thread", exact: true }).click();
  await expect(page).toHaveURL(/threadId=thread_001/);
  await expect(page.getByRole("region", { name: "Timeline", exact: true })).toBeVisible();

  const navigation = page.getByRole("region", { name: "Navigation", exact: true });
  const selectedThreadCard = navigation.locator(".thread-summary-card.active");
  await expect(selectedThreadCard).toHaveAttribute("aria-current", "page");
  await expect(selectedThreadCard).not.toContainText("Selected");
  await expect(page.locator(".current-activity-card")).toHaveCount(0);
  await expect(page.locator(".thread-feedback-card-inline")).toHaveCount(0);
  await expectTimelineFirstViewport(page);
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

  await page.getByRole("button", { name: "Details", exact: true }).first().click();
  const detailSurface = page.locator(".thread-detail-surface");
  await expect(detailSurface).toBeVisible();
  await expect(page.getByRole("heading", { name: "Thread details", exact: true })).toBeVisible();
  await expect(detailSurface).toContainText("Overview");
  await expect(detailSurface).toContainText("Status");
  await expect(detailSurface).toContainText("Next action");
  await expect(detailSurface).toContainText("Requests");
  await expect(detailSurface).toContainText("Artifacts");
  await expect(detailSurface).toContainText("Debug: raw thread view JSON");

  await detailSurface.getByRole("button", { name: "Close", exact: true }).click();
  await expect(detailSurface).toHaveCount(0);
  await page.getByLabel("Collapse Navigation to minibar").click();
  await expect(page.locator(".chat-layout.sidebar-minibar")).toBeVisible();
  await expect(page.getByRole("button", { name: "Expand Navigation", exact: true })).toBeVisible();
  await expect(page.locator(".navigation-minibar-stack .minibar-button.active")).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.getByRole("button", { name: "Expand Navigation", exact: true }).click();
  await expect(page.locator(".chat-layout.sidebar-minibar")).toHaveCount(0);

  await testInfo.attach("issue-235-desktop-timeline-first", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

test("mobile keeps compact thread recovery and details reachable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "mobile-only compact recovery check");

  await stubEventSource(page);
  await mockApprovalFlow(page, { longTimeline: true });

  await page.goto("/chat?workspaceId=ws_alpha&threadId=thread_001");
  await expect(page.getByRole("region", { name: "Timeline", exact: true })).toBeVisible();
  await expect(page.locator(".pending-request-card")).toBeVisible();
  await expect(page.locator(".thread-mobile-footer-actions")).toBeVisible();
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

  await page
    .locator(".thread-mobile-footer-actions")
    .getByRole("button", { name: "Details", exact: true })
    .click();
  const detailSurface = page.locator(".thread-detail-surface");
  await expect(detailSurface).toBeVisible();
  await expect(page.getByRole("heading", { name: "Request detail", exact: true })).toBeVisible();
  await expect(detailSurface).toContainText("Apply the prepared deployment plan.");
  await expect(detailSurface.getByRole("button", { name: "Approve request" })).toBeVisible();
  await expect(detailSurface.getByRole("button", { name: "Deny request" })).toBeVisible();
  await detailSurface.getByRole("button", { name: "Close", exact: true }).click();

  await page
    .locator(".thread-mobile-footer-actions")
    .getByRole("button", { name: "Threads", exact: true })
    .click();
  await expect(page.locator(".thread-navigation.open")).toBeVisible();
  await expect(
    page.locator("section.thread-navigation").getByRole("button", { name: /Needs your response/ }),
  ).toBeVisible();
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

  await testInfo.attach("issue-235-mobile-thread-recovery", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});
