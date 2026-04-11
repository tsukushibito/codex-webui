import { expect, test } from "@playwright/test";

import { expectNoHorizontalScroll } from "./helpers/browser-mocks";

test("runs the main thread flow against the live runtime stack", async ({ page }) => {
  const workspaceName = `pw-${Date.now()}`;
  const firstInput = "Runtime-backed thread flow";
  const followUpInput = "Please explain the diff.";

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Home", exact: true })).toBeVisible();

  await page.getByLabel("Workspace name").fill(workspaceName);
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page.getByText(`Workspace "${workspaceName}" created.`)).toBeVisible();
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

  await page
    .locator("article.workspace-card")
    .filter({ has: page.getByRole("heading", { name: workspaceName, exact: true }) })
    .getByRole("link", { name: "Open thread" })
    .click();
  await expect(page).toHaveURL(/\/chat\?workspaceId=/);
  await expect(page.getByRole("heading", { name: "Chat", exact: true })).toBeVisible();

  await page.getByLabel("First input").fill(firstInput);
  await expect(page.getByRole("button", { name: "Start new thread" })).toBeEnabled();
  await page.getByRole("button", { name: "Start new thread" }).click();
  await expect(page.getByText("Started thread")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /thread_/ })).toBeVisible({ timeout: 15_000 });

  const sendReplyButton = page.getByRole("button", { name: "Send reply" });
  if (await sendReplyButton.isEnabled()) {
    await page.getByLabel("Send follow-up input").fill(followUpInput);
    await sendReplyButton.click();
    await expect(page.getByText("Input accepted. Waiting for thread updates.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(followUpInput)).toBeVisible({ timeout: 15_000 });
  } else {
    await expect(sendReplyButton).toBeDisabled();
  }

  const interruptThreadButton = page.getByRole("button", { name: "Interrupt thread" });
  if (await interruptThreadButton.isEnabled()) {
    await interruptThreadButton.click();
    await expect(page.getByText("Interrupt requested.")).toBeVisible({ timeout: 15_000 });
  } else {
    await expect(interruptThreadButton).toBeDisabled();
  }
});
