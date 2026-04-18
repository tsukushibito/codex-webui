import { expect, type Page, test } from "@playwright/test";

import {
  attachChatFlowDebugArtifacts,
  installChatFlowDebugCapture,
  sawThreadStreamRequest,
} from "./helpers/chat-flow-debug";

function countNetworkLines(debugCapture: { networkLines: string[] }, pattern: string) {
  return debugCapture.networkLines.filter((line) => line.includes(pattern)).length;
}

async function dismissNgrokInterstitial(page: Page) {
  const visitSiteButton = page.getByRole("button", { name: "Visit Site" });
  try {
    await visitSiteButton.click({ timeout: 5_000 });
  } catch {
    return;
  }
}

test("runs the main thread flow against the live runtime stack", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const workspaceName = `pw-${Date.now()}`;
  const firstInput = "Runtime-backed thread flow";
  const followUpInput = "Please explain the diff.";
  const debugCapture = installChatFlowDebugCapture(page);

  try {
    await page.goto("/");
    await dismissNgrokInterstitial(page);
    await expect(page.getByRole("heading", { name: "Home", exact: true })).toBeVisible();
    await expect(page.getByText("Updated: Waiting")).not.toBeVisible({ timeout: 15_000 });

    const workspaceNameInput = page.getByLabel("Workspace name");
    const createWorkspaceButton = page.getByRole("button", { name: "Create workspace" });
    await workspaceNameInput.fill(workspaceName);
    await expect(workspaceNameInput).toHaveValue(workspaceName);
    await expect(createWorkspaceButton).toBeEnabled({ timeout: 15_000 });
    await createWorkspaceButton.click();
    await expect(page.getByText(`Workspace "${workspaceName}" created.`)).toBeVisible();

    await page
      .locator("article.workspace-card")
      .filter({ has: page.getByRole("heading", { name: workspaceName, exact: true }) })
      .getByRole("link", { name: "Open thread" })
      .click();
    await expect(page).toHaveURL(/\/chat\?workspaceId=/);
    const workspaceId = new URL(page.url()).searchParams.get("workspaceId") ?? "";
    expect(workspaceId).not.toBe("");
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

    const sendReplyButton = page.getByRole("button", { name: "Send reply" });
    await expect(sendReplyButton).toBeDisabled();
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

    const threadViewPath = `/api/v1/threads/${threadId}/view`;
    const threadStreamPath = `/api/v1/threads/${threadId}/stream`;
    const threadViewRequestCountBeforeReload = countNetworkLines(debugCapture, threadViewPath);
    const threadStreamRequestCountBeforeReload = countNetworkLines(debugCapture, threadStreamPath);

    await page.reload();
    await expect(page).toHaveURL(new RegExp(`/chat\\?workspaceId=${workspaceId}`));
    await expect(page.getByRole("heading", { name: "Chat", exact: true })).toBeVisible();
    await expect(currentThreadHeading).toHaveText(threadId, { timeout: 15_000 });
    await expect
      .poll(() => countNetworkLines(debugCapture, threadViewPath), {
        timeout: 15_000,
        message: `expected thread view reacquisition for thread ${threadId} after reload`,
      })
      .toBeGreaterThan(threadViewRequestCountBeforeReload);
    await expect
      .poll(() => countNetworkLines(debugCapture, threadStreamPath), {
        timeout: 15_000,
        message: `expected thread stream reconnect for thread ${threadId} after reload`,
      })
      .toBeGreaterThan(threadStreamRequestCountBeforeReload);

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
    await page.getByLabel("Send follow-up input").fill(followUpInput);
    await expect(sendReplyButton).toBeEnabled({ timeout: 15_000 });
    await sendReplyButton.click();
    await expect(page.getByText("Input accepted. Waiting for thread updates.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page
        .locator("article")
        .filter({
          has: page.getByText("message.user", { exact: true }),
          hasText: followUpInput,
        })
        .first(),
    ).toBeVisible({ timeout: 15_000 });
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
