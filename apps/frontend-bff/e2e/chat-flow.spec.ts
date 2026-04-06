import { expect, test } from "@playwright/test";

import {
  expectNoHorizontalScroll,
  mockChatFlow,
  stubEventSource,
} from "./helpers/browser-mocks";

async function sectionBox(
  section: ReturnType<Parameters<typeof test>[0]["page"]["locator"]>,
) {
  await expect(section).toBeVisible();

  const box = await section.boundingBox();
  expect(box).not.toBeNull();

  return box!;
}

async function sectionBoxByHeading(
  page: Parameters<typeof test>[0]["page"],
  heading: string,
) {
  const section = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: heading, exact: true }) })
    .first();

  return sectionBox(section);
}

async function desktopChatCardLayout(page: Parameters<typeof test>[0]["page"]) {
  const [createCard, currentSessionCard, messagesCard, eventLogCard] = await Promise.all([
    sectionBoxByHeading(page, "Create or select a session"),
    sectionBox(
      page
        .locator("section")
        .filter({ has: page.getByText("Current session", { exact: true }) })
        .first(),
    ),
    sectionBoxByHeading(page, "Messages"),
    sectionBoxByHeading(page, "Event log"),
  ]);

  return {
    createCard,
    currentSessionCard,
    messagesCard,
    eventLogCard,
  };
}

function expectDesktopLayoutStable(
  baseline: Awaited<ReturnType<typeof desktopChatCardLayout>>,
  current: Awaited<ReturnType<typeof desktopChatCardLayout>>,
) {
  const closeWithin = (received: number, expected: number, tolerance = 8) => {
    expect(Math.abs(received - expected)).toBeLessThanOrEqual(tolerance);
  };

  expect(current.createCard.x).toBeCloseTo(baseline.createCard.x, 0);
  expect(current.currentSessionCard.x).toBeCloseTo(baseline.currentSessionCard.x, 0);
  expect(current.messagesCard.x).toBeCloseTo(baseline.messagesCard.x, 0);
  expect(current.eventLogCard.x).toBeCloseTo(baseline.eventLogCard.x, 0);

  expect(current.createCard.x).toBeCloseTo(current.messagesCard.x, 0);
  expect(current.currentSessionCard.x).toBeCloseTo(current.eventLogCard.x, 0);
  expect(current.currentSessionCard.x).toBeGreaterThan(current.createCard.x + 20);
  expect(current.eventLogCard.x).toBeGreaterThan(current.messagesCard.x + 20);

  expect(current.createCard.y).toBeCloseTo(current.currentSessionCard.y, 0);
  expect(current.messagesCard.y).toBeCloseTo(current.eventLogCard.y, 0);
  expect(current.messagesCard.y).toBeGreaterThan(current.createCard.y + 20);
  expect(current.eventLogCard.y).toBeGreaterThan(current.currentSessionCard.y + 20);
  closeWithin(
    current.currentSessionCard.x - current.createCard.x,
    baseline.currentSessionCard.x - baseline.createCard.x,
  );
  closeWithin(
    current.messagesCard.y - current.createCard.y,
    baseline.messagesCard.y - baseline.createCard.y,
  );
  closeWithin(
    current.eventLogCard.x - current.messagesCard.x,
    baseline.eventLogCard.x - baseline.messagesCard.x,
  );
}

test("runs the main chat flow from Home through stop on desktop and mobile", async ({
  page,
}, testInfo) => {
  const isDesktop = testInfo.project.name === "desktop-chromium";

  await stubEventSource(page);
  await mockChatFlow(page);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Home", exact: true })).toBeVisible();
  await expect
    .poll(async () => expectNoHorizontalScroll(page))
    .toBe(true);

  await page.getByLabel("Workspace name").fill("alpha");
  await expect(page.getByRole("button", { name: "Create workspace" })).toBeEnabled();
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page.getByText('Workspace "alpha" created.')).toBeVisible();

  await page.getByRole("link", { name: "Go to Chat" }).click();
  await expect(page).toHaveURL(/\/chat\?workspaceId=ws_alpha/);
  await expect(page.getByRole("heading", { name: "Chat", exact: true })).toBeVisible();
  await expect
    .poll(async () => expectNoHorizontalScroll(page))
    .toBe(true);

  let baselineDesktopLayout:
    | Awaited<ReturnType<typeof desktopChatCardLayout>>
    | undefined;

  if (isDesktop) {
    baselineDesktopLayout = await desktopChatCardLayout(page);
  }

  await page.getByLabel("New session title").fill("Fix build error");
  await page.getByRole("button", { name: "Create session" }).click();
  await expect(page.getByText('Session "Fix build error" created.')).toBeVisible();
  if (isDesktop) {
    expectDesktopLayoutStable(
      baselineDesktopLayout!,
      await desktopChatCardLayout(page),
    );
  } else {
    await expect
      .poll(async () => expectNoHorizontalScroll(page))
      .toBe(true);
  }

  await page.getByRole("button", { name: "Start session" }).click();
  await expect(page.getByText("Session started.")).toBeVisible();
  if (isDesktop) {
    expectDesktopLayoutStable(
      baselineDesktopLayout!,
      await desktopChatCardLayout(page),
    );
  } else {
    await expect
      .poll(async () => expectNoHorizontalScroll(page))
      .toBe(true);
  }

  await page.getByRole("textbox", { name: "Send message" }).fill("Please explain the diff.");
  await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled();
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Message accepted. Waiting for stream updates.")).toBeVisible();
  await expect(page.getByText("Please explain the diff.")).toBeVisible();
  if (isDesktop) {
    expectDesktopLayoutStable(
      baselineDesktopLayout!,
      await desktopChatCardLayout(page),
    );
  } else {
    await expect
      .poll(async () => expectNoHorizontalScroll(page))
      .toBe(true);
  }

  await page.getByRole("button", { name: "Stop session" }).click();
  await expect(page.getByText("Session stopped.")).toBeVisible();
  if (isDesktop) {
    expectDesktopLayoutStable(
      baselineDesktopLayout!,
      await desktopChatCardLayout(page),
    );
  } else {
    await expect
      .poll(async () => expectNoHorizontalScroll(page))
      .toBe(true);
  }
});
