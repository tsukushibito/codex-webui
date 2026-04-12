import { expect, type Page, test } from "@playwright/test";

import { expectNoHorizontalScroll, mockChatFlow, stubEventSource } from "./helpers/browser-mocks";
import {
  attachChatFlowDebugArtifacts,
  installChatFlowDebugCapture,
} from "./helpers/chat-flow-debug";

async function sectionByHeading(page: Page, heading: string) {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: heading, exact: true }) })
    .first();
}

async function sectionBox(page: Page, heading: string) {
  const section = await sectionByHeading(page, heading);
  await expect(section).toBeVisible();

  const box = await section.boundingBox();
  expect(box).not.toBeNull();

  return box!;
}

async function threadCards(page: Page, currentThreadHeading: string) {
  return {
    startCard: await sectionBox(page, "Start or resume a thread"),
    currentCard: await sectionBox(page, currentThreadHeading),
    timelineCard: await sectionBox(page, "Timeline"),
  };
}

function expectDesktopThreadLayoutStable(
  baseline: Awaited<ReturnType<typeof threadCards>>,
  current: Awaited<ReturnType<typeof threadCards>>,
) {
  expect(current.startCard.x).toBeCloseTo(baseline.startCard.x, 0);
  expect(current.currentCard.x).toBeCloseTo(baseline.currentCard.x, 0);
  expect(current.timelineCard.x).toBeCloseTo(baseline.timelineCard.x, 0);
  expect(current.currentCard.x).toBeGreaterThan(current.startCard.x + 20);
  expect(current.timelineCard.x).toBeCloseTo(current.startCard.x, 0);
  expect(current.startCard.y).toBeCloseTo(current.currentCard.y, 0);
  expect(current.timelineCard.y).toBeGreaterThan(current.currentCard.y + 20);
}

test("runs the main thread flow from Home through interrupt on desktop and mobile", async ({
  page,
}, testInfo) => {
  const isDesktop = testInfo.project.name === "desktop-chromium";
  const debugSink = installChatFlowDebugCapture(page);

  try {
    await stubEventSource(page);
    await mockChatFlow(page);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Home", exact: true })).toBeVisible();
    await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

    await page.getByLabel("Workspace name").fill("alpha");
    await expect(page.getByRole("button", { name: "Create workspace" })).toBeEnabled();
    await page.getByRole("button", { name: "Create workspace" }).click();
    await expect(page.getByText('Workspace "alpha" created.')).toBeVisible();

    await page
      .locator("article.workspace-card")
      .filter({ has: page.getByRole("heading", { name: "alpha", exact: true }) })
      .getByRole("link", { name: "Open thread" })
      .click();
    await expect(page).toHaveURL(/\/chat\?workspaceId=ws_alpha/);
    await expect(page.getByRole("heading", { name: "Chat", exact: true })).toBeVisible();
    await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

    let baselineLayout: Awaited<ReturnType<typeof threadCards>> | undefined;
    if (isDesktop) {
      baselineLayout = await threadCards(page, "Select a thread");
    } else {
      await expect(
        page.getByRole("heading", { name: "Start or resume a thread", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Select a thread", exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("heading", { name: "Timeline", exact: true })).toBeVisible();
    }

    await page.getByLabel("First input").fill("Fix build error");
    await expect(page.getByRole("button", { name: "Start new thread" })).toBeEnabled();
    await page.getByRole("button", { name: "Start new thread" }).click();
    await expect(page.getByText("Started thread thread_001.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "thread_001", exact: true })).toBeVisible();
    await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);
    if (isDesktop) {
      expectDesktopThreadLayoutStable(baselineLayout!, await threadCards(page, "thread_001"));
    }

    const sendReplyButton = page.getByRole("button", { name: "Send reply" });
    await page.getByLabel("Send follow-up input").fill("Please explain the diff.");
    await expect(sendReplyButton).toBeEnabled();
    await sendReplyButton.click();
    await expect(page.getByText("Input accepted. Waiting for thread updates.")).toBeVisible();
    await expect(
      page
        .locator(".thread-summary-card")
        .filter({ hasText: "thread_001" })
        .getByText("Running", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Interrupt thread" })).toBeEnabled();
    await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);
    if (isDesktop) {
      expectDesktopThreadLayoutStable(baselineLayout!, await threadCards(page, "thread_001"));
    }

    await page.getByRole("button", { name: "Interrupt thread" }).click();
    await expect(page.getByText("Interrupt requested.")).toBeVisible();
    await expect(page.getByText("Thread interrupted.")).toBeVisible();
    await page.getByLabel("Send follow-up input").fill("Resume after interrupt.");
    await expect(sendReplyButton).toBeEnabled();
    await sendReplyButton.click();
    await expect(page.getByText("Input accepted. Waiting for thread updates.")).toBeVisible();
    await expect(
      page.locator(".chat-message-list").getByText("Here is the explanation.").first(),
    ).toBeVisible();
    await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);
    if (isDesktop) {
      expectDesktopThreadLayoutStable(baselineLayout!, await threadCards(page, "thread_001"));
    }
  } finally {
    await attachChatFlowDebugArtifacts(testInfo, debugSink, "chat-flow");
  }
});
