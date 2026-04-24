import { expect, type Page, test } from "@playwright/test";

import { expectNoHorizontalScroll, mockChatFlow, stubEventSource } from "./helpers/browser-mocks";
import {
  attachChatFlowDebugArtifacts,
  installChatFlowDebugCapture,
} from "./helpers/chat-flow-debug";

async function locatorBox(locator: ReturnType<Page["locator"]>) {
  await expect(locator).toBeVisible();

  const box = await locator.boundingBox();
  expect(box).not.toBeNull();

  return box!;
}

async function timelineBox(page: Page) {
  return locatorBox(page.getByRole("region", { name: "Timeline", exact: true }));
}

async function threadCards(page: Page) {
  return {
    navigationCard: await locatorBox(page.locator("section.thread-navigation")),
    currentCard: await locatorBox(page.locator("section.thread-view-card")),
    timelineCard: await timelineBox(page),
  };
}

async function openMobileThreadNavigation(page: Page, isDesktop: boolean) {
  if (isDesktop) {
    return;
  }

  const threadsButton = page.getByRole("button", { name: "Threads", exact: true });
  if (await threadsButton.isVisible()) {
    await threadsButton.click();
  }
  await expect(page.locator("section.thread-navigation")).toBeVisible();
}

async function startThreadFromComposer(page: Page, isDesktop: boolean, firstInput: string) {
  const inputScope = isDesktop ? page : page.locator("section.thread-view-card");
  const firstInputField = inputScope.getByLabel("Ask Codex");
  const startThreadButton = inputScope.getByRole("button", { name: "Start thread", exact: true });

  await firstInputField.fill(firstInput);
  await expect(startThreadButton).toBeEnabled();

  if (isDesktop) {
    await startThreadButton.click();
    await expect(page.getByText("Started thread thread_001.")).toBeVisible();
    return;
  }

  await startThreadButton.click({ force: true });
}

function expectDesktopThreadLayoutStable(
  baseline: Awaited<ReturnType<typeof threadCards>>,
  current: Awaited<ReturnType<typeof threadCards>>,
) {
  expect(current.navigationCard.x).toBeCloseTo(baseline.navigationCard.x, 0);
  expect(current.currentCard.x).toBeCloseTo(baseline.currentCard.x, 0);
  expect(current.timelineCard.x).toBeCloseTo(baseline.timelineCard.x, 0);
  expect(current.currentCard.x).toBeGreaterThan(current.navigationCard.x + 20);
  expect(current.timelineCard.x).toBeGreaterThan(current.currentCard.x);
  expect(current.timelineCard.x).toBeLessThan(current.currentCard.x + current.currentCard.width);
  expect(current.timelineCard.y).toBeGreaterThan(current.currentCard.y + 20);
}

async function expectThreadRunning(page: Page, isDesktop: boolean) {
  if (isDesktop) {
    await expect(
      page
        .locator(".thread-summary-card")
        .filter({ hasText: "thread_001" })
        .getByText("Running", { exact: true }),
    ).toBeVisible();
    return;
  }

  await expect(
    page.locator("section.thread-view-card").getByText("Running", { exact: true }).first(),
  ).toBeVisible();
}

test("runs the main thread flow from Home through interrupt on desktop and mobile", async ({
  page,
}, testInfo) => {
  const isDesktop = testInfo.project.name === "desktop-chromium";
  const debugSink = installChatFlowDebugCapture(page);

  try {
    await stubEventSource(page);
    await mockChatFlow(page);

    await page.goto("/chat");
    await expect(
      page.getByRole("heading", { name: "Thread workspace", exact: true }),
    ).toBeVisible();
    await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

    await openMobileThreadNavigation(page, isDesktop);
    await page.locator("details.workspace-switcher summary").click();
    await page.locator("#workspace-name").fill("alpha");
    await expect(page.getByRole("button", { name: "Create workspace" })).toBeEnabled();
    await page.getByRole("button", { name: "Create workspace" }).click();
    await expect(page.getByText("Created workspace alpha.")).toBeVisible();
    await expect(page).toHaveURL(/\/chat\?workspaceId=ws_alpha$/);
    await expect(page.locator("header.chat-topbar h1")).toHaveText("alpha");
    await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

    let baselineLayout: Awaited<ReturnType<typeof threadCards>> | undefined;
    if (isDesktop) {
      baselineLayout = await threadCards(page);
      await expect(page.getByRole("heading", { name: "New thread", exact: true })).toBeVisible();
    } else {
      await openMobileThreadNavigation(page, isDesktop);
      await expect(page.locator("section.thread-navigation")).toBeVisible();
      await expect(page.getByRole("heading", { name: "New thread", exact: true })).toBeVisible();
      await expect(page.getByRole("region", { name: "Timeline", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Close threads", exact: true }).click();
    }

    await startThreadFromComposer(page, isDesktop, "Fix build error");
    if (isDesktop) {
      await expect(page.getByText("Started thread thread_001.")).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "thread_001", exact: true })).toBeVisible();
    await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);
    if (isDesktop) {
      expectDesktopThreadLayoutStable(baselineLayout!, await threadCards(page));
    }

    const sendReplyButton = page.getByRole("button", { name: "Send input", exact: true });
    await page.getByLabel("Send input").fill("Please explain the diff.");
    await expect(sendReplyButton).toBeEnabled();
    await sendReplyButton.click();
    await expect(page.getByText("Input accepted. Waiting for thread updates.")).toBeVisible();
    await expectThreadRunning(page, isDesktop);
    await expect(page.getByRole("button", { name: "Interrupt thread" })).toBeEnabled();
    await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);
    if (isDesktop) {
      expectDesktopThreadLayoutStable(baselineLayout!, await threadCards(page));
    }

    await page.getByRole("button", { name: "Interrupt thread" }).click();
    await expect(page.getByText("Interrupt requested.")).toBeVisible();
    await expect(page.getByText("Thread interrupted.")).toBeVisible();
    await page.getByLabel("Send input").fill("Resume after interrupt.");
    await expect(sendReplyButton).toBeEnabled();
    await sendReplyButton.click();
    await expect(
      page.locator(".chat-message-list").getByText("Here is the explanation.").first(),
    ).toBeVisible();
    await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);
    if (isDesktop) {
      expectDesktopThreadLayoutStable(baselineLayout!, await threadCards(page));
    }
  } finally {
    await attachChatFlowDebugArtifacts(testInfo, debugSink, "chat-flow");
  }
});
