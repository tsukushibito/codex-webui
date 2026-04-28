import { expect, type Page, test } from "@playwright/test";

import { expectNoHorizontalScroll, mockChatFlow, stubEventSource } from "./helpers/browser-mocks";

const FOLLOWUP_RESPONSE_DELAY_MS = 1_200;

type BoundaryBoxes = {
  composer: { bottom: number; top: number } | null;
  inlineStatus: { bottom: number; top: number } | null;
  latestTimelineRow: { bottom: number; top: number } | null;
};

async function readBoundaryBoxes(page: Page): Promise<BoundaryBoxes> {
  return page.evaluate(() => {
    const toBox = (element: Element | null) => {
      if (!(element instanceof HTMLElement)) {
        return null;
      }

      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom };
    };

    const timelineRows = Array.from(document.querySelectorAll(".timeline-row"));
    const latestTimelineRow = timelineRows.at(-1) ?? null;

    return {
      composer: toBox(document.querySelector(".chat-composer")),
      inlineStatus: toBox(document.querySelector(".thread-inline-status")),
      latestTimelineRow: toBox(latestTimelineRow),
    };
  });
}

function expectBoundaryOrder(boxes: BoundaryBoxes) {
  expect(boxes.latestTimelineRow).not.toBeNull();
  expect(boxes.inlineStatus).not.toBeNull();
  expect(boxes.composer).not.toBeNull();
  expect(boxes.latestTimelineRow!.top).toBeLessThan(boxes.inlineStatus!.top);
  expect(boxes.inlineStatus!.top).toBeLessThan(boxes.composer!.top);
}

test.describe("Issue 316 inline status boundary", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await page.setViewportSize(
      testInfo.project.name === "mobile-chromium"
        ? { width: 360, height: 800 }
        : { width: 1440, height: 900 },
    );
    await stubEventSource(page);
    await mockChatFlow(page, {
      existingThread: true,
      followupResponseDelayMs: FOLLOWUP_RESPONSE_DELAY_MS,
      longTimeline: true,
    });
  });

  test("keeps follow-up submit feedback inline at the timeline/composer boundary", async ({
    page,
  }) => {
    await page.goto("/chat?workspaceId=ws_alpha&threadId=thread_001");

    await expect(page.getByRole("region", { name: "Timeline", exact: true })).toBeVisible();
    await expect(page.locator(".thread-feedback-card")).toHaveCount(0);
    await expect(page.getByText("Keyboard shortcuts", { exact: true })).toHaveCount(0);
    await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

    await page.getByLabel("Continue thread").fill("Please continue from the pending draft.");
    await page.getByRole("button", { name: "Send message", exact: true }).click();

    const inlineStatus = page.locator(".thread-inline-status");
    await expect(inlineStatus).toContainText("Sending input to the current thread.");
    await expect(inlineStatus).toHaveAttribute("role", "status");
    await expect(inlineStatus).toHaveAttribute("aria-live", "polite");
    await expect(page.locator(".thread-feedback-card")).toHaveCount(0);
    await expect(
      page.getByText("Please continue from the pending draft.", { exact: true }),
    ).toBeVisible();
    await expect(page.locator("#thread-composer-input")).toBeVisible();
    expectBoundaryOrder(await readBoundaryBoxes(page));
    await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

    await expect(inlineStatus).toContainText("Input accepted. Waiting for thread updates.");
    await expect(
      page.getByText("Please continue from the pending draft.", { exact: true }),
    ).toBeVisible();
    await expect(page.locator("#thread-composer-input")).toBeVisible();
    expectBoundaryOrder(await readBoundaryBoxes(page));
    await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);
  });

  test("keeps reconnecting feedback compact and visible with timeline and composer", async ({
    page,
  }) => {
    await page.goto("/chat?workspaceId=ws_alpha&threadId=thread_001");

    await expect(page.getByRole("region", { name: "Timeline", exact: true })).toBeVisible();

    await page.evaluate(() => {
      const instances = (
        window as Window & {
          __mockEventSourceInstances?: Array<{ onerror: (() => void) | null }>;
        }
      ).__mockEventSourceInstances;

      for (const instance of instances ?? []) {
        instance.onerror?.();
      }
    });

    const inlineStatus = page.locator(".thread-inline-status");
    await expect(inlineStatus).toContainText("Reconnecting live updates");
    await expect(inlineStatus).toContainText("Refresh thread");
    await expect(inlineStatus).toHaveAttribute("role", "status");
    await expect(page.locator(".thread-feedback-card")).toHaveCount(0);
    await expect(page.locator(".timeline-row").last()).toBeVisible();
    await expect(page.locator("#thread-composer-input")).toBeVisible();
    expectBoundaryOrder(await readBoundaryBoxes(page));
    await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);
  });
});
