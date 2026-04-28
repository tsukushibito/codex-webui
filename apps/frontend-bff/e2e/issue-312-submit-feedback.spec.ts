import { expect, type Page, test } from "@playwright/test";

import { expectNoHorizontalScroll, mockChatFlow, stubEventSource } from "./helpers/browser-mocks";

const FOLLOWUP_RESPONSE_DELAY_MS = 1_200;
const GEOMETRY_TOLERANCE_PX = 1;

type ThreadViewGeometry = {
  readableColumn: {
    left: number;
    right: number;
    top: number;
    width: number;
  } | null;
  scrollRegion: {
    height: number;
    top: number;
  } | null;
  threadFeedbackCount: number;
  timelineSection: {
    left: number;
    right: number;
    top: number;
    width: number;
  } | null;
};

async function readThreadViewGeometry(page: Page): Promise<ThreadViewGeometry> {
  return page.evaluate(() => {
    const asBox = (element: HTMLElement | null) => {
      if (!element) {
        return null;
      }

      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      };
    };

    const scrollRegion = document.querySelector<HTMLElement>(".thread-view-scroll-region");
    const scrollRegionRect = scrollRegion?.getBoundingClientRect() ?? null;

    return {
      readableColumn: asBox(
        document.querySelector<HTMLElement>(
          ".thread-view-scroll-region > .thread-view-readable-column",
        ),
      ),
      scrollRegion: scrollRegionRect
        ? {
            height: scrollRegionRect.height,
            top: scrollRegionRect.top,
          }
        : null,
      threadFeedbackCount: document.querySelectorAll(".thread-feedback-card").length,
      timelineSection: asBox(document.querySelector<HTMLElement>(".timeline-section")),
    };
  });
}

function expectStableGeometry(before: ThreadViewGeometry, pending: ThreadViewGeometry) {
  expect(before.readableColumn).not.toBeNull();
  expect(pending.readableColumn).not.toBeNull();
  expect(before.scrollRegion).not.toBeNull();
  expect(pending.scrollRegion).not.toBeNull();
  expect(before.timelineSection).not.toBeNull();
  expect(pending.timelineSection).not.toBeNull();

  expect(Math.abs(before.readableColumn!.left - pending.readableColumn!.left)).toBeLessThanOrEqual(
    GEOMETRY_TOLERANCE_PX,
  );
  expect(
    Math.abs(before.readableColumn!.right - pending.readableColumn!.right),
  ).toBeLessThanOrEqual(GEOMETRY_TOLERANCE_PX);
  expect(Math.abs(before.readableColumn!.top - pending.readableColumn!.top)).toBeLessThanOrEqual(
    GEOMETRY_TOLERANCE_PX,
  );
  expect(
    Math.abs(before.timelineSection!.left - pending.timelineSection!.left),
  ).toBeLessThanOrEqual(GEOMETRY_TOLERANCE_PX);
  expect(
    Math.abs(before.timelineSection!.right - pending.timelineSection!.right),
  ).toBeLessThanOrEqual(GEOMETRY_TOLERANCE_PX);
  expect(Math.abs(before.timelineSection!.top - pending.timelineSection!.top)).toBeLessThanOrEqual(
    GEOMETRY_TOLERANCE_PX,
  );
  expect(Math.abs(before.scrollRegion!.top - pending.scrollRegion!.top)).toBeLessThanOrEqual(
    GEOMETRY_TOLERANCE_PX,
  );
}

test("existing-thread follow-up pending stays near the composer without inserting a submit feedback card", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "desktop-only follow-up layout check");

  await page.setViewportSize({ width: 1440, height: 900 });
  await stubEventSource(page);
  await mockChatFlow(page, {
    existingThread: true,
    followupResponseDelayMs: FOLLOWUP_RESPONSE_DELAY_MS,
    longTimeline: true,
  });

  await page.goto("/chat?workspaceId=ws_alpha&threadId=thread_001");
  await expect(page.getByRole("region", { name: "Timeline", exact: true })).toBeVisible();
  await expect(page.locator(".thread-feedback-card")).toHaveCount(0);
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

  const before = await readThreadViewGeometry(page);

  await page.getByLabel("Continue thread").fill("Please continue from the pending draft.");
  await page.getByRole("button", { name: "Send message", exact: true }).click();

  const composerFeedback = page.locator(".composer-feedback-note");
  await expect(composerFeedback).toContainText("Sending input to the current thread.");
  await expect(composerFeedback).toHaveAttribute("role", "status");
  await expect(composerFeedback).toHaveAttribute("aria-live", "polite");
  await expect(page.locator(".thread-feedback-card")).toHaveCount(0);

  const pending = await readThreadViewGeometry(page);
  expect(pending.threadFeedbackCount).toBe(0);
  expectStableGeometry(before, pending);
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

  await expect(composerFeedback).toContainText("Input accepted. Waiting for thread updates.");
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);
});
