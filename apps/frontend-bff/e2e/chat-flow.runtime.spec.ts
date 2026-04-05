import { expect, test } from "@playwright/test";

test("runs the main chat flow against the live runtime stack", async ({ page }) => {
  const workspaceName = `pw-${Date.now()}`;
  const sessionTitle = "Runtime-backed chat flow";
  const message = "Please explain the diff.";
  const createSessionButton = page.getByRole("button", { name: "Create session" });
  const startSessionButton = page.getByRole("button", { name: "Start session" });
  const stopSessionButton = page.getByRole("button", { name: "Stop session" });
  const sendMessageButton = page.getByRole("button", { name: "Send message" });
  const currentSessionSection = page.locator("section.workspace-card").filter({
    has: page.getByRole("heading", { name: sessionTitle, exact: true }),
  });
  const currentSessionStatus = currentSessionSection.locator(".status-badge");

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Home", exact: true })).toBeVisible();

  await page.getByLabel("Workspace name").fill(workspaceName);
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page.getByText(`Workspace "${workspaceName}" created.`)).toBeVisible();

  const workspaceCard = page.locator("article.workspace-card").filter({
    has: page.getByRole("heading", { name: workspaceName, exact: true }),
  });
  await workspaceCard.getByRole("link", { name: "Go to Chat" }).click();
  await expect(page).toHaveURL(/\/chat\?workspaceId=/);
  await expect(page.getByRole("heading", { name: "Chat", exact: true })).toBeVisible();

  await page.getByLabel("New session title").fill(sessionTitle);
  await expect(createSessionButton).toBeEnabled();
  await createSessionButton.click();
  await expect(currentSessionSection).toBeVisible({ timeout: 15_000 });
  await expect(currentSessionStatus).toHaveText("created", { timeout: 15_000 });
  await expect(startSessionButton).toBeEnabled({ timeout: 15_000 });

  await startSessionButton.click();
  const composer = page.getByLabel("Send message");
  await composer.fill(message);
  await expect(sendMessageButton).toBeEnabled({ timeout: 15_000 });
  await expect(sendMessageButton).toBeEnabled();
  await sendMessageButton.click();
  await expect(page.getByText(message)).toBeVisible();
  await expect(currentSessionStatus).toHaveText(/running|waiting input/);
  await expect(stopSessionButton).toBeEnabled({ timeout: 15_000 });
});
