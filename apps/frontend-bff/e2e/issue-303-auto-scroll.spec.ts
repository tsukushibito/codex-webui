import { expect, type Page, test } from "@playwright/test";

import {
  emitMockEventSourceMessage,
  expectNoHorizontalScroll,
  mockChatFlow,
  stubEventSource,
} from "./helpers/browser-mocks";

const LATEST_ACTIVITY_READABLE_THRESHOLD_PX = 80;

async function readScrollMetrics(page: Page) {
  return page.locator(".thread-view-scroll-region").evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    scrollTop: element.scrollTop,
    distanceFromBottom: Math.max(
      0,
      element.scrollHeight - element.clientHeight - element.scrollTop,
    ),
  }));
}

test("long thread follows sends and exposes jump-to-latest only after suspended live updates", async ({
  page,
}) => {
  await stubEventSource(page);
  await mockChatFlow(page, { existingThread: true, longTimeline: true });

  await page.goto("/chat?workspaceId=ws_alpha&threadId=thread_001");
  await expect(page.getByRole("region", { name: "Timeline", exact: true })).toBeVisible();
  await expect
    .poll(async () => (await readScrollMetrics(page)).distanceFromBottom, {
      message: "thread view should start pinned to the latest timeline row",
    })
    .toBeLessThanOrEqual(1);
  await expect(
    page.getByRole("button", { name: "Jump to latest activity", exact: true }),
  ).toHaveCount(0);

  await page.locator(".thread-view-scroll-region").evaluate((element) => {
    element.scrollTop = Math.max(0, element.scrollHeight - element.clientHeight - 320);
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });

  await expect(
    page.getByRole("button", { name: "Jump to latest activity", exact: true }),
  ).toHaveCount(0);

  await page.getByLabel("Continue thread").fill("Please continue from here.");
  await page.getByRole("button", { name: "Send message", exact: true }).click();

  await expect(page.getByText("Input accepted. Waiting for thread updates.")).toBeVisible();
  await expect(page.getByText("Please continue from here.")).toBeVisible();
  await expect
    .poll(async () => (await readScrollMetrics(page)).distanceFromBottom, {
      message: "sending should resume follow mode and bring the accepted user row into view",
    })
    .toBeLessThanOrEqual(LATEST_ACTIVITY_READABLE_THRESHOLD_PX);
  await expect(
    page.getByRole("button", { name: "Jump to latest activity", exact: true }),
  ).toHaveCount(0);

  await page.locator(".thread-view-scroll-region").evaluate((element) => {
    element.scrollTop = Math.max(0, element.scrollHeight - element.clientHeight - 360);
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });

  await emitMockEventSourceMessage(page, {
    event_id: "evt_stream_issue_303_completed",
    thread_id: "thread_001",
    event_type: "message.assistant.completed",
    sequence: 999,
    occurred_at: "2026-04-05T02:33:06Z",
    payload: {
      message_id: "msg_assistant_issue_303",
      content: "Live update arrived while the viewport was intentionally scrolled away.",
    },
  });

  const jumpButton = page.getByRole("button", { name: "Jump to latest activity", exact: true });
  await expect(jumpButton).toBeVisible();
  await jumpButton.click();

  await expect(
    page.getByText("Live update arrived while the viewport was intentionally scrolled away."),
  ).toBeVisible();
  await expect
    .poll(async () => (await readScrollMetrics(page)).distanceFromBottom, {
      message: "jumping should restore follow mode at the latest streamed activity",
    })
    .toBeLessThanOrEqual(LATEST_ACTIVITY_READABLE_THRESHOLD_PX);
  await expect(jumpButton).toHaveCount(0);
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);
});
