import { expect, test } from "@playwright/test";

import {
  expectNoHorizontalScroll,
  mockApprovalFlow,
  stubEventSource,
} from "./helpers/browser-mocks";

async function runRequestDecisionFlow(
  page: Parameters<typeof test>[0]["page"],
  decision: "approved" | "denied",
) {
  await stubEventSource(page);
  await mockApprovalFlow(page);

  await page.goto("/chat?workspaceId=ws_alpha&threadId=thread_001");
  await expect(page.locator("header.chat-topbar h1")).toHaveText("alpha");
  await expect(page.locator(".thread-view-card > .thread-view-header-stack header h2")).toHaveText(
    "Ask Codex in alpha",
  );
  await expect(page.locator(".request-detail-card")).toBeVisible();
  await expect(page.getByText("Apply the prepared deployment plan.")).toBeVisible();
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

  const actionLabel = decision === "approved" ? "Approve request" : "Deny request";
  await page.locator(".thread-feedback-card").getByRole("button", { name: actionLabel }).click();
  await expect(
    page.getByText(`${decision === "approved" ? "Approved" : "Denied"} req_001.`),
  ).toBeVisible();
  await expect(page.getByText(`Decision: ${decision}`)).toBeVisible();
  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);
}

test("resolves a pending approval on desktop and mobile", async ({ page }) => {
  await runRequestDecisionFlow(page, "approved");
});

test("denies a pending approval on desktop and mobile", async ({ page }) => {
  await runRequestDecisionFlow(page, "denied");
});
