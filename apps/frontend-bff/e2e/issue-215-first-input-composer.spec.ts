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
  "issue-215-first-input-composer",
);

async function ensureEvidenceDir() {
  await mkdir(evidenceDir, { recursive: true });
}

async function openThreadsDrawerOnMobile(page: Page, isDesktop: boolean) {
  if (isDesktop) {
    return;
  }

  await page.getByRole("button", { name: "Threads", exact: true }).click();
  await expect(page.locator("section.thread-navigation")).toBeVisible();
}

async function captureViewport(page: Page, name: string) {
  await ensureEvidenceDir();
  await page.screenshot({
    fullPage: false,
    path: path.join(evidenceDir, name),
  });
}

async function readThreadViewMetrics(page: Page) {
  return page.evaluate(() => {
    const composer = document.querySelector<HTMLElement>(".thread-view-card .chat-composer");
    const scrollRegion = document.querySelector<HTMLElement>(
      ".thread-view-card .thread-view-scroll-region",
    );
    const scrollingElement = document.scrollingElement as HTMLElement | null;
    const composerRect = composer?.getBoundingClientRect() ?? null;
    const regionRect = scrollRegion?.getBoundingClientRect() ?? null;

    return {
      composerRect,
      documentClientHeight: document.documentElement.clientHeight,
      documentScrollHeight: document.documentElement.scrollHeight,
      regionClientHeight: scrollRegion?.clientHeight ?? null,
      regionRect,
      regionScrollHeight: scrollRegion?.scrollHeight ?? null,
      rootClientHeight: scrollingElement?.clientHeight ?? null,
      rootScrollHeight: scrollingElement?.scrollHeight ?? null,
      scrollY: window.scrollY,
      viewportHeight: window.innerHeight,
    };
  });
}

async function expectComposerReachableWithoutDocumentScroll(page: Page) {
  const metrics = await readThreadViewMetrics(page);

  expect(metrics.composerRect).not.toBeNull();
  expect(metrics.regionRect).not.toBeNull();
  expect(metrics.regionClientHeight).not.toBeNull();
  expect(metrics.regionScrollHeight).not.toBeNull();
  expect(metrics.rootClientHeight).not.toBeNull();
  expect(metrics.rootScrollHeight).not.toBeNull();

  expect(metrics.composerRect!.top).toBeGreaterThanOrEqual(0);
  expect(metrics.composerRect!.bottom).toBeLessThanOrEqual(metrics.viewportHeight);
  expect(metrics.regionRect!.height).toBeGreaterThan(0);
  expect(metrics.regionClientHeight!).toBeGreaterThan(0);
  expect(metrics.regionScrollHeight!).toBeGreaterThan(metrics.regionClientHeight!);
  expect(metrics.documentScrollHeight).toBeLessThanOrEqual(metrics.documentClientHeight + 1);
  expect(metrics.rootScrollHeight!).toBeLessThanOrEqual(metrics.rootClientHeight! + 1);
  expect(metrics.scrollY).toBe(0);
}

test("keeps Ask Codex and the single composer reachable on desktop and mobile", async ({
  page,
}, testInfo) => {
  const isDesktop = testInfo.project.name === "desktop-chromium";

  await stubEventSource(page);
  await mockChatFlow(page);

  await page.goto("/chat");
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

  await openThreadsDrawerOnMobile(page, isDesktop);
  await page.locator("details.workspace-switcher summary").click();
  await page.locator("#workspace-name").fill("alpha");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/\/chat\?workspaceId=ws_alpha$/);
  await page
    .locator("section.thread-navigation")
    .getByRole("button", { name: "Ask Codex", exact: true })
    .click();

  await expect(
    page.getByRole("heading", { name: "Ask Codex in alpha", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Ask Codex")).toBeVisible();

  if (!isDesktop) {
    await openThreadsDrawerOnMobile(page, isDesktop);
    await expect(
      page
        .locator("section.thread-navigation")
        .getByRole("button", { name: "Ask Codex", exact: true }),
    ).toBeVisible();
    await captureViewport(page, "mobile-first-input-navigation-ask-codex.png");
    await page.getByRole("button", { name: "Close threads", exact: true }).click();
  } else {
    await captureViewport(page, "desktop-first-input-composer.png");
  }

  await captureViewport(
    page,
    isDesktop
      ? "desktop-first-input-composer-reachable.png"
      : "mobile-first-input-composer-reachable.png",
  );

  await page.getByLabel("Ask Codex").fill("Fix build error");
  await page.getByRole("button", { name: "Start thread", exact: true }).click();
  await expect(page).toHaveURL(/\/chat\?workspaceId=ws_alpha&threadId=thread_001$/);
  await expect(page.getByLabel("Send input")).toBeVisible();

  await captureViewport(
    page,
    isDesktop ? "desktop-selected-thread-composer.png" : "mobile-selected-thread-composer.png",
  );

  if (!isDesktop) {
    await openThreadsDrawerOnMobile(page, isDesktop);
    await expect(
      page
        .locator("section.thread-navigation")
        .getByRole("button", { name: "Ask Codex", exact: true }),
    ).toBeVisible();
    await captureViewport(page, "mobile-selected-thread-ask-codex.png");
  }
});

test("keeps pending-request controls distinct while mobile composer stays reachable", async ({
  page,
}, testInfo) => {
  const isDesktop = testInfo.project.name === "desktop-chromium";

  await stubEventSource(page);
  await mockApprovalFlow(page, { longTimeline: true });

  await page.goto("/chat?workspaceId=ws_alpha&threadId=thread_001");

  const pendingRequestCard = page.locator(".pending-request-card");
  const interruptButton = page.getByRole("button", { name: "Interrupt thread", exact: true });

  await expect(pendingRequestCard).toBeVisible();
  await expect(
    pendingRequestCard.getByRole("button", { name: "Approve request", exact: true }),
  ).toBeVisible();
  await expect(
    pendingRequestCard.getByRole("button", { name: "Deny request", exact: true }),
  ).toBeVisible();
  await expect(interruptButton).toBeVisible();

  await captureViewport(
    page,
    isDesktop ? "desktop-pending-request-top.png" : "mobile-pending-request-top.png",
  );

  if (!isDesktop) {
    const initialScrollY = await page.evaluate(() => window.scrollY);
    await expectComposerReachableWithoutDocumentScroll(page);
    expect(await page.evaluate(() => window.scrollY)).toBe(initialScrollY);
  }

  await captureViewport(
    page,
    isDesktop ? "desktop-pending-request-composer.png" : "mobile-pending-request-composer.png",
  );

  if (!isDesktop) {
    await openThreadsDrawerOnMobile(page, isDesktop);
    await expect(
      page
        .locator("section.thread-navigation")
        .getByRole("button", { name: "Ask Codex", exact: true }),
    ).toBeVisible();
  }
});
