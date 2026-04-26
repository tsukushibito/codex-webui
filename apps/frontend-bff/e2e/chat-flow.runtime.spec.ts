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

async function openMobileThreadNavigation(page: Page, isDesktop: boolean) {
  if (isDesktop) {
    return;
  }

  await page.getByRole("button", { name: "Threads", exact: true }).click();
  await expect(page.getByRole("region", { name: "Navigation", exact: true })).toBeVisible();
}

async function expectThreadWaitingForInput(page: Page) {
  const threadView = page.getByRole("region", { name: "Thread View", exact: true });

  await expect(threadView.getByText("Waiting for your input", { exact: true })).toBeVisible({
    timeout: 15_000,
  });
}

async function startThreadFromFirstInput(page: Page, isDesktop: boolean, firstInput: string) {
  const inputScope = isDesktop ? page : page.getByRole("region", { name: "Thread View" });
  const firstInputField = inputScope.getByLabel("Ask Codex");
  const startThreadButton = inputScope.getByRole("button", { name: "Start thread" });

  await firstInputField.fill(firstInput);
  await expect(startThreadButton).toBeVisible();
  await expect(startThreadButton).toBeEnabled();

  if (isDesktop) {
    await startThreadButton.click();
    await expect(page.getByText("Started thread")).toBeVisible({ timeout: 15_000 });
    return;
  }

  await Promise.all([
    page.getByText("Started thread").waitFor({ timeout: 15_000 }),
    startThreadButton.click({ force: true }),
  ]);
}

test("runs the main thread flow against the live runtime stack", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const isDesktop = testInfo.project.name === "desktop-chromium";
  const workspaceName = `pw-${Date.now()}`;
  const firstInput = "Runtime-backed thread flow";
  const followUpInput = "Please explain the diff.";
  const debugCapture = installChatFlowDebugCapture(page);

  try {
    await page.goto("/");
    await dismissNgrokInterstitial(page);
    await expect(
      page.getByRole("heading", { name: "Thread workspace", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Updated: Waiting")).not.toBeVisible({ timeout: 15_000 });

    await page.locator("details.workspace-switcher summary").click();
    const workspaceNameInput = page.getByLabel("New workspace");
    const createWorkspaceButton = page.getByRole("button", { name: "Create workspace" });
    await workspaceNameInput.fill(workspaceName);
    await expect(workspaceNameInput).toHaveValue(workspaceName);
    await expect(createWorkspaceButton).toBeEnabled({ timeout: 15_000 });
    await createWorkspaceButton.click();
    await expect(page.getByText(`Created workspace ${workspaceName}.`)).toBeVisible();

    await expect(page).toHaveURL(/\/chat\?workspaceId=/);
    const workspaceId = new URL(page.url()).searchParams.get("workspaceId") ?? "";
    expect(workspaceId).not.toBe("");
    await expect(page.locator("header.chat-topbar h1")).toHaveText(workspaceName);

    await openMobileThreadNavigation(page, isDesktop);
    await startThreadFromFirstInput(page, isDesktop, firstInput);

    await expect(page).toHaveURL(/threadId=/, { timeout: 15_000 });
    const threadId = new URL(page.url()).searchParams.get("threadId") ?? "";
    expect(threadId).not.toBe("");
    const currentThreadHeading = page
      .getByRole("region", { name: "Thread View", exact: true })
      .getByRole("heading")
      .first();
    await expect(currentThreadHeading).not.toHaveText("Select workspace", { timeout: 15_000 });

    await expect
      .poll(() => sawThreadStreamRequest(debugCapture, threadId), {
        timeout: 15_000,
        message: `expected a /stream request for thread ${threadId}`,
      })
      .toBe(true);

    const sendReplyButton = page.getByRole("button", { name: "Send input" });
    await expect(sendReplyButton).toBeDisabled();
    await expectThreadWaitingForInput(page);

    const threadViewPath = `/api/v1/threads/${threadId}/view`;
    const threadStreamPath = `/api/v1/threads/${threadId}/stream`;
    const threadViewRequestCountBeforeReload = countNetworkLines(debugCapture, threadViewPath);
    const threadStreamRequestCountBeforeReload = countNetworkLines(debugCapture, threadStreamPath);

    await page.reload();
    await expect(page).toHaveURL(new RegExp(`/chat\\?workspaceId=${workspaceId}`));
    await expect(page.locator("header.chat-topbar h1")).toHaveText(workspaceName);
    await expect(currentThreadHeading).toHaveText(firstInput, { timeout: 15_000 });
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

    await expectThreadWaitingForInput(page);
    await page.getByLabel("Send input").fill(followUpInput);
    await expect(sendReplyButton).toBeEnabled({ timeout: 15_000 });
    await sendReplyButton.click();
    await expect(page.getByText("Input accepted. Waiting for thread updates.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page
        .locator("article")
        .filter({
          has: page.getByText("You", { exact: true }),
          hasText: followUpInput,
        })
        .first(),
    ).toBeVisible({ timeout: 15_000 });
    await expectThreadWaitingForInput(page, threadId, isDesktop);

    const interruptThreadButton = page.getByRole("button", { name: "Interrupt thread" });
    if ((await interruptThreadButton.count()) > 0 && (await interruptThreadButton.isEnabled())) {
      await interruptThreadButton.click();
      await expect(page.getByText("Interrupt requested.")).toBeVisible({ timeout: 15_000 });
    } else if ((await interruptThreadButton.count()) > 0) {
      await expect(interruptThreadButton).toBeDisabled();
    }
  } finally {
    await attachChatFlowDebugArtifacts(testInfo, debugCapture, "chat-flow-runtime");
  }
});
