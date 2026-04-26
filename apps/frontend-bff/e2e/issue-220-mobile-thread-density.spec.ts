import { expect, test } from "@playwright/test";

import {
  expectNoHorizontalScroll,
  mockApprovalFlow,
  stubEventSource,
} from "./helpers/browser-mocks";

async function expectNoDocumentVerticalScroll(page: Parameters<typeof test>[0]["page"]) {
  return page.evaluate(() => {
    const scrollingElement = document.scrollingElement ?? document.documentElement;
    return scrollingElement.scrollHeight <= window.innerHeight + 1;
  });
}

async function collectOverflowingLabels(page: Parameters<typeof test>[0]["page"]) {
  return page.evaluate(() =>
    Array.from(
      document.querySelectorAll<HTMLElement>(
        ".thread-view-card .status-badge, .thread-view-card .metric-chip, .thread-view-card button",
      ),
    )
      .filter((element) => element.scrollWidth > element.clientWidth + 1)
      .map((element) => element.textContent?.trim() ?? ""),
  );
}

test("keeps selected pending-approval mobile thread dense and reachable at 360px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await stubEventSource(page);
  await mockApprovalFlow(page, { longTimeline: true });

  await page.goto("/chat?workspaceId=ws_alpha&threadId=thread_001");

  const scrollRegion = page.locator(".thread-view-scroll-region");
  const pendingCard = page.locator(".pending-request-card");
  const composer = page.locator(".chat-composer");
  const composerInput = page.locator("#thread-composer-input");
  const composerSubmitButton = composer.locator(".submit-button");
  const mobileActions = page.locator(".thread-mobile-footer-actions");
  const footerThreadsButton = mobileActions.getByRole("button", { name: "Threads" });
  const footerDetailsButton = mobileActions.getByRole("button", { name: "Details" });

  await expect(page.locator(".thread-view-card > .thread-view-header-stack header h2")).toHaveText(
    "Ask Codex in alpha",
  );
  await expect(page.getByText("Apply the prepared deployment plan.")).toBeVisible();
  await expect(pendingCard.getByRole("button", { name: "Approve request" })).toBeVisible();
  await expect(scrollRegion).toBeVisible();
  await expect(composer).toBeVisible();
  await expect(composerInput).toBeVisible();
  await expect(composerSubmitButton).toBeVisible();
  await expect(mobileActions).toBeVisible();
  await expect(footerThreadsButton).toBeVisible();
  await expect(footerDetailsButton).toBeVisible();

  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);
  await expect.poll(async () => expectNoDocumentVerticalScroll(page)).toBe(true);
  await expect.poll(async () => collectOverflowingLabels(page)).toEqual([]);

  const initialLayout = await page.evaluate(() => {
    const mobileActionsElement = document.querySelector<HTMLElement>(
      ".thread-mobile-footer-actions",
    );
    const composerElement = document.querySelector<HTMLElement>(".chat-composer");
    const mobileActionsRect = mobileActionsElement?.getBoundingClientRect() ?? null;
    const composerRect = composerElement?.getBoundingClientRect() ?? null;
    return {
      footerVisible:
        mobileActionsRect !== null &&
        mobileActionsRect.top >= 0 &&
        mobileActionsRect.bottom <= window.innerHeight,
      noOverlap:
        composerRect !== null &&
        mobileActionsRect !== null &&
        mobileActionsRect.bottom <= composerRect.top + 1,
    };
  });

  expect(initialLayout).toEqual({
    footerVisible: true,
    noOverlap: true,
  });

  await scrollRegion.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  await expect
    .poll(async () =>
      scrollRegion.evaluate((element) => ({
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        scrollTop: element.scrollTop,
      })),
    )
    .toMatchObject({
      clientHeight: expect.any(Number),
      scrollHeight: expect.any(Number),
      scrollTop: expect.any(Number),
    });

  const afterScroll = await page.evaluate(() => {
    const scrollRegionElement = document.querySelector<HTMLElement>(".thread-view-scroll-region");
    const footerThreadsElement = Array.from(
      document.querySelectorAll<HTMLButtonElement>(".thread-mobile-footer-actions button"),
    ).find((button) => button.textContent?.trim() === "Threads");
    const footerDetailsElement = Array.from(
      document.querySelectorAll<HTMLButtonElement>(".thread-mobile-footer-actions button"),
    ).find((button) => button.textContent?.trim() === "Details");
    const footerThreadsRect = footerThreadsElement?.getBoundingClientRect() ?? null;
    const footerDetailsRect = footerDetailsElement?.getBoundingClientRect() ?? null;

    return {
      scrollMoved:
        scrollRegionElement !== null &&
        scrollRegionElement.scrollTop > scrollRegionElement.clientHeight * 0.25,
      footerThreadsVisible:
        footerThreadsRect !== null &&
        footerThreadsRect.top >= 0 &&
        footerThreadsRect.bottom <= window.innerHeight,
      footerDetailsVisible:
        footerDetailsRect !== null &&
        footerDetailsRect.top >= 0 &&
        footerDetailsRect.bottom <= window.innerHeight,
    };
  });

  await expect(pendingCard.getByRole("button", { name: "Approve request" })).toBeVisible();
  await expect(pendingCard.getByRole("button", { name: "Deny request" })).toBeVisible();
  await expect(composerInput).toBeVisible();
  await expect(composerSubmitButton).toBeVisible();

  expect(afterScroll).toEqual({
    scrollMoved: true,
    footerThreadsVisible: true,
    footerDetailsVisible: true,
  });

  await footerDetailsButton.click();
  await expect(page.locator(".thread-detail-surface")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Request detail" })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.locator(".thread-detail-surface")).toHaveCount(0);

  await footerThreadsButton.click();
  await expect(page.locator(".thread-navigation.open")).toBeVisible();
});
