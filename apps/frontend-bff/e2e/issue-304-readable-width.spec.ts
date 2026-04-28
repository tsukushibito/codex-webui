import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, type Page, test } from "@playwright/test";

import {
  expectNoHorizontalScroll,
  mockApprovalFlow,
  mockChatFlow,
  stubEventSource,
} from "./helpers/browser-mocks";

const evidenceDir = path.resolve(
  process.cwd(),
  "..",
  "..",
  "artifacts",
  "visual-inspection",
  "issue-304-readable-width",
);

async function captureVisualEvidence(page: Page, name: string) {
  await mkdir(evidenceDir, { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: path.join(evidenceDir, name),
  });
}

async function readReadableWidthMetrics(page: Page) {
  return page.evaluate(() => {
    const navigation = document.querySelector<HTMLElement>("section.thread-navigation");
    const threadView = document.querySelector<HTMLElement>(".thread-view-card");
    const detailSurface = document.querySelector<HTMLElement>(".thread-detail-surface");
    const scrollColumn = document.querySelector<HTMLElement>(
      ".thread-view-scroll-region > .thread-view-readable-column",
    );
    const footerColumn = document.querySelector<HTMLElement>(
      ".thread-mobile-footer-actions.thread-view-readable-column",
    );
    const composerColumn = document.querySelector<HTMLElement>(
      ".thread-view-body > .thread-view-readable-column:last-child",
    );
    const composer = document.querySelector<HTMLElement>(".chat-composer");
    const timelineSection = document.querySelector<HTMLElement>(".timeline-section");
    const fallbackRequestCard = document.querySelector<HTMLElement>(
      ".thread-view-scroll-region .request-detail-card",
    );

    const rowRects = Array.from(document.querySelectorAll<HTMLElement>(".timeline-row"))
      .slice(0, 3)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          width: rect.width,
        };
      });

    const asBox = (element: HTMLElement | null) => {
      if (!element) {
        return null;
      }

      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };

    return {
      composer: asBox(composer),
      composerColumn: asBox(composerColumn),
      detailSurface: asBox(detailSurface),
      fallbackRequestCard: asBox(fallbackRequestCard),
      footerColumn: asBox(footerColumn),
      navigation: asBox(navigation),
      rowRects,
      scrollColumn: asBox(scrollColumn),
      threadView: asBox(threadView),
      timelineSection: asBox(timelineSection),
      viewportWidth: window.innerWidth,
    };
  });
}

function expectCenteredWithinThreadView(
  threadView: NonNullable<Awaited<ReturnType<typeof readReadableWidthMetrics>>["threadView"]>,
  column: NonNullable<Awaited<ReturnType<typeof readReadableWidthMetrics>>["scrollColumn"]>,
  tolerance = 3,
) {
  const leftMargin = column.left - threadView.left;
  const rightMargin = threadView.right - column.right;

  expect(Math.abs(leftMargin - rightMargin)).toBeLessThanOrEqual(tolerance);
}

test("wide desktop constrains and centers the Thread View readable column without affecting shell edges", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "desktop-only readable width check");

  await page.setViewportSize({ width: 1680, height: 900 });
  await stubEventSource(page);
  await mockApprovalFlow(page, { longTimeline: true });

  await page.goto("/chat?workspaceId=ws_alpha&threadId=thread_001");
  await expect(page.getByRole("region", { name: "Navigation", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Timeline", exact: true })).toBeVisible();
  await expect(page.locator(".request-detail-card.pending-request-card")).toBeVisible();

  const metrics = await readReadableWidthMetrics(page);
  expect(metrics.threadView).not.toBeNull();
  expect(metrics.navigation).not.toBeNull();
  expect(metrics.scrollColumn).not.toBeNull();
  expect(metrics.timelineSection).not.toBeNull();
  expect(metrics.fallbackRequestCard).not.toBeNull();
  expect(metrics.composer).not.toBeNull();

  expect(metrics.navigation!.left).toBeLessThanOrEqual(1);
  expect(metrics.scrollColumn!.width).toBeLessThanOrEqual(962);
  expect(metrics.timelineSection!.width).toBeLessThanOrEqual(962);
  expectCenteredWithinThreadView(metrics.threadView!, metrics.scrollColumn!);
  expect(Math.abs(metrics.scrollColumn!.left - metrics.timelineSection!.left)).toBeLessThanOrEqual(
    1,
  );
  expect(
    Math.abs(metrics.scrollColumn!.left - metrics.fallbackRequestCard!.left),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(metrics.scrollColumn!.right - metrics.fallbackRequestCard!.right),
  ).toBeLessThanOrEqual(1);
  expect(Math.abs(metrics.scrollColumn!.left - metrics.composer!.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(metrics.scrollColumn!.right - metrics.composer!.right)).toBeLessThanOrEqual(1);
  for (const rowRect of metrics.rowRects) {
    expect(rowRect.width).toBeLessThanOrEqual(962);
  }
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);
  await captureVisualEvidence(page, "desktop-wide-readable-column.png");
  await testInfo.attach("issue-304-wide-desktop-readable-column", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  await page.getByRole("button", { name: "Thread details", exact: true }).click();
  await expect(page.locator(".thread-detail-surface")).toBeVisible();

  const detailMetrics = await readReadableWidthMetrics(page);
  expect(detailMetrics.detailSurface).not.toBeNull();
  expect(detailMetrics.scrollColumn).not.toBeNull();
  expect(detailMetrics.detailSurface!.width).toBeGreaterThan(280);
  expect(detailMetrics.detailSurface!.left).toBeGreaterThan(detailMetrics.scrollColumn!.right);
  expect(detailMetrics.scrollColumn!.width).toBeLessThanOrEqual(962);
  expectCenteredWithinThreadView(detailMetrics.threadView!, detailMetrics.scrollColumn!);
  await captureVisualEvidence(page, "desktop-wide-detail-surface.png");
  await testInfo.attach("issue-304-wide-desktop-detail-surface", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

test("normal desktop uses the available Thread View width below the readability cap", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "desktop-only width check");

  await page.setViewportSize({ width: 1024, height: 900 });
  await stubEventSource(page);
  await mockChatFlow(page);

  await page.goto("/chat");
  await page.locator("details.workspace-switcher summary").click();
  await page.locator("#workspace-name").fill("alpha");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await page.getByLabel("Ask Codex").fill("Inspect normal desktop readable width");
  await page.getByRole("button", { name: "Start thread", exact: true }).click();
  await expect(page).toHaveURL(/threadId=thread_001/);
  await expect(page.getByRole("region", { name: "Timeline", exact: true })).toBeVisible();

  const metrics = await readReadableWidthMetrics(page);
  expect(metrics.threadView).not.toBeNull();
  expect(metrics.scrollColumn).not.toBeNull();
  expect(metrics.composer).not.toBeNull();

  expect(metrics.scrollColumn!.width).toBeGreaterThan(metrics.threadView!.width - 48);
  expect(metrics.threadView!.right - metrics.scrollColumn!.right).toBeLessThanOrEqual(24);
  expect(metrics.scrollColumn!.left - metrics.threadView!.left).toBeLessThanOrEqual(24);
  expect(Math.abs(metrics.scrollColumn!.left - metrics.composer!.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(metrics.scrollColumn!.right - metrics.composer!.right)).toBeLessThanOrEqual(1);
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);
  await captureVisualEvidence(page, "desktop-normal-readable-column.png");
  await testInfo.attach("issue-304-normal-desktop-readable-column", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

test("mobile keeps the readable column full width without overflow or clipped controls", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "mobile-only width check");

  await page.setViewportSize({ width: 360, height: 800 });
  await stubEventSource(page);
  await mockApprovalFlow(page, { longTimeline: true });

  await page.goto("/chat?workspaceId=ws_alpha&threadId=thread_001");
  await expect(page.getByRole("region", { name: "Timeline", exact: true })).toBeVisible();
  await expect(page.locator(".thread-mobile-footer-actions")).toBeVisible();
  await expect(page.locator(".chat-composer")).toBeVisible();
  await expect(page.locator(".chat-textarea")).toBeVisible();

  const metrics = await readReadableWidthMetrics(page);
  expect(metrics.scrollColumn).not.toBeNull();
  expect(metrics.footerColumn).not.toBeNull();
  expect(metrics.composerColumn).not.toBeNull();
  expect(metrics.composer).not.toBeNull();
  expect(metrics.threadView).not.toBeNull();

  expect(metrics.scrollColumn!.width).toBeGreaterThanOrEqual(metrics.threadView!.width - 24);
  expect(metrics.scrollColumn!.width).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.footerColumn!.width).toBeGreaterThanOrEqual(metrics.threadView!.width - 24);
  expect(metrics.composerColumn!.width).toBeGreaterThanOrEqual(metrics.threadView!.width - 24);
  expect(metrics.composer!.right).toBeLessThanOrEqual(metrics.viewportWidth);
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);
  await captureVisualEvidence(page, "mobile-readable-column.png");
  await testInfo.attach("issue-304-mobile-readable-column", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});
