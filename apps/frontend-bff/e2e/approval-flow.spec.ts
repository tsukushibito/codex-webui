import { expect, test } from "@playwright/test";

import {
  expectNoHorizontalScroll,
  mockApprovalFlow,
  stubEventSource,
} from "./helpers/browser-mocks";

test("renders the approval queue and resolves a pending approval on desktop and mobile", async ({
  page,
}) => {
  await stubEventSource(page);
  await mockApprovalFlow(page);

  await page.goto("/approvals");
  await expect(page.getByRole("heading", { name: "Approval", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Run deployment", exact: true })).toBeVisible();
  await expect(page.getByText("Deploy the latest checked-in build to staging.")).toBeVisible();
  await expect
    .poll(async () => expectNoHorizontalScroll(page))
    .toBe(true);

  await page.getByRole("button", { name: "Approve request" }).click();
  await expect(page.getByText("Approved apr_001. Session running.")).toBeVisible();
  await expect(page.getByText("No pending approvals.")).toBeVisible();
});
