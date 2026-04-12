import { expect, test } from "@playwright/test";

import {
  attachChatFlowDebugArtifacts,
  installChatFlowDebugCapture,
  sawThreadStreamRequest,
} from "./helpers/chat-flow-debug";

test("runs the main thread flow against the live runtime stack", async ({ page }, testInfo) => {
  const workspaceName = `pw-${Date.now()}`;
  const firstInput = "Runtime-backed thread flow";
  const followUpInput = "Please explain the diff.";
  const debugCapture = installChatFlowDebugCapture(page);

  try {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Home", exact: true })).toBeVisible();

    await page.getByLabel("Workspace name").fill(workspaceName);
    await page.getByRole("button", { name: "Create workspace" }).click();
    await expect(page.getByText(`Workspace "${workspaceName}" created.`)).toBeVisible();

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

    const currentThreadHeading = page
      .locator("section.chat-panel.workspace-card")
      .filter({ has: page.getByText("Current thread", { exact: true }) })
      .getByRole("heading")
      .first();
    await expect(currentThreadHeading).not.toHaveText("Select a thread", { timeout: 15_000 });
    const threadId = (await currentThreadHeading.textContent())?.trim() ?? "";
    expect(threadId).not.toBe("");

    await expect
      .poll(() => sawThreadStreamRequest(debugCapture, threadId), {
        timeout: 15_000,
        message: `expected a /stream request for thread ${threadId}`,
      })
      .toBe(true);
    await expect(
      page
        .locator(".thread-summary-card")
        .filter({ hasText: threadId })
        .getByText("Waiting for your input", { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page
        .locator("section.chat-panel.workspace-card")
        .filter({ has: page.getByText("Current thread", { exact: true }) })
        .getByText("Waiting for your input", { exact: true }),
    ).toBeVisible({ timeout: 15_000 });

    const sendReplyButton = page.getByRole("button", { name: "Send reply" });
    if (await sendReplyButton.isEnabled()) {
      await page.getByLabel("Send follow-up input").fill(followUpInput);
      await sendReplyButton.click();
      await expect(page.getByText("Input accepted. Waiting for thread updates.")).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByText(followUpInput)).toBeVisible({ timeout: 15_000 });
      await expect(
        page
          .locator(".thread-summary-card")
          .filter({ hasText: threadId })
          .getByText("Waiting for your input", { exact: true }),
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        page
          .locator("section.chat-panel.workspace-card")
          .filter({ has: page.getByText("Current thread", { exact: true }) })
          .getByText("Waiting for your input", { exact: true }),
      ).toBeVisible({ timeout: 15_000 });
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
  } finally {
    await attachChatFlowDebugArtifacts(testInfo, debugCapture, "chat-flow-runtime");
  }
});
