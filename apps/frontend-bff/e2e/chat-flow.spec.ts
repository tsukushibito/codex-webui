import { expect, test } from "@playwright/test";

import {
  expectNoHorizontalScroll,
  mockChatFlow,
  stubEventSource,
} from "./helpers/browser-mocks";

test("runs the main chat flow from Home through stop on desktop and mobile", async ({
  page,
}) => {
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

  await page.getByLabel("New session title").fill("Fix build error");
  await page.getByRole("button", { name: "Create session" }).click();
  await expect(page.getByText('Session "Fix build error" created.')).toBeVisible();

  await page.getByRole("button", { name: "Start session" }).click();
  await expect(page.getByText("Session started.")).toBeVisible();

  await page.getByRole("textbox", { name: "Send message" }).fill("Please explain the diff.");
  await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled();
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Message accepted. Waiting for stream updates.")).toBeVisible();
  await expect(page.getByText("Please explain the diff.")).toBeVisible();

  await page.getByRole("button", { name: "Stop session" }).click();
  await expect(page.getByText("Session stopped.")).toBeVisible();
});
