import { expect, type Page, test } from "@playwright/test";

import {
  expectNoHorizontalScroll,
  mockApprovalFlow,
  stubEventSource,
} from "./helpers/browser-mocks";

async function expectMobileFollowupReachability(page: Page) {
  const mobileActions = page.locator(".thread-mobile-footer-actions");
  const footerThreadsButton = mobileActions.getByRole("button", { name: "Threads", exact: true });
  const footerDetailsButton = mobileActions.getByRole("button", { name: "Details", exact: true });

  await expect(mobileActions).toBeVisible();
  await expect(footerThreadsButton).toBeVisible();
  await expect(footerDetailsButton).toBeVisible();

  const mobileLayout = await page.evaluate(() => {
    const scrollingElement = document.scrollingElement ?? document.documentElement;
    const composer = document.querySelector<HTMLElement>(".chat-composer");
    const mobileActionsElement = document.querySelector<HTMLElement>(
      ".thread-mobile-footer-actions",
    );
    const composerRect = composer?.getBoundingClientRect() ?? null;
    const mobileActionsRect = mobileActionsElement?.getBoundingClientRect() ?? null;

    return {
      composerVisible:
        composerRect !== null && composerRect.top >= 0 && composerRect.bottom <= window.innerHeight,
      footerVisible:
        mobileActionsRect !== null &&
        mobileActionsRect.top >= 0 &&
        mobileActionsRect.bottom <= window.innerHeight,
      noDocumentVerticalScroll: scrollingElement.scrollHeight <= window.innerHeight + 1,
      noFooterComposerOverlap:
        composerRect !== null &&
        mobileActionsRect !== null &&
        mobileActionsRect.bottom <= composerRect.top + 1,
    };
  });

  expect(mobileLayout).toEqual({
    composerVisible: true,
    footerVisible: true,
    noDocumentVerticalScroll: true,
    noFooterComposerOverlap: true,
  });

  await footerThreadsButton.click();
  await expect(page.locator(".thread-navigation.open")).toBeVisible();
  await expect(
    page
      .locator("section.thread-navigation")
      .getByRole("button", { name: "Ask Codex", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close threads", exact: true }).click();
  await expect(page.locator(".thread-navigation.open")).toHaveCount(0);

  await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);
}

test.describe("Issue #222 approval resolution follow-up", () => {
  for (const decision of ["approved", "denied"] as const) {
    test(`keeps resolved follow-up usable after ${decision}`, async ({ page }, testInfo) => {
      const isMobile = testInfo.project.name === "mobile-chromium";
      const actionLabel = decision === "approved" ? "Approve request" : "Deny request";

      await stubEventSource(page);
      await mockApprovalFlow(page, { longTimeline: true });

      await page.goto("/chat?workspaceId=ws_alpha&threadId=thread_001");

      const pendingRequestCard = page.locator(".pending-request-card");
      const threadFeedbackCard = page.locator(".thread-feedback-card");
      const resolvedRequestCard = page.locator(".resolved-request-card");
      const threadHeaderStack = page.locator(".thread-view-card > .thread-view-header-stack");
      const timelineSection = page.getByRole("region", { name: "Timeline" });
      const composer = page.locator(".chat-composer");
      const composerInput = page.getByLabel("Send input");
      const composerSubmitButton = page.getByRole("button", { name: "Send input", exact: true });

      await expect(pendingRequestCard).toBeVisible();
      await expect(page.getByText("Apply the prepared deployment plan.")).toBeVisible();
      await expect(
        pendingRequestCard.getByRole("button", { name: "Approve request", exact: true }),
      ).toBeVisible();
      await expect(
        pendingRequestCard.getByRole("button", { name: "Deny request", exact: true }),
      ).toBeVisible();
      await expect(
        threadFeedbackCard.getByRole("button", { name: actionLabel, exact: true }),
      ).toBeVisible();
      await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);

      await threadFeedbackCard.getByRole("button", { name: actionLabel, exact: true }).click();

      await expect(resolvedRequestCard).toBeVisible();
      await expect(resolvedRequestCard).toContainText("Latest resolved request");
      await expect(resolvedRequestCard).toContainText(`Decision: ${decision}`);
      await expect(threadHeaderStack).toContainText("Waiting for your input");
      await expect(threadFeedbackCard).toHaveCount(0);
      await expect(composer).toBeVisible();
      await expect(composerInput).toBeVisible();
      await expect(composerInput).toBeEnabled();
      await composerInput.fill(`Continue after ${decision}`);
      await expect(composerSubmitButton).toBeVisible();
      await expect(composerSubmitButton).toBeEnabled();
      await expect(pendingRequestCard).toHaveCount(0);
      await expect(
        threadFeedbackCard.getByRole("button", { name: "Approve request", exact: true }),
      ).toHaveCount(0);
      await expect(
        threadFeedbackCard.getByRole("button", { name: "Deny request", exact: true }),
      ).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Interrupt thread", exact: true })).toHaveCount(
        0,
      );

      await expect(timelineSection).toContainText(`Latest request: ${decision}`);
      await expect(
        timelineSection.getByRole("button", { name: "Inspect request", exact: true }).last(),
      ).toBeVisible();

      if (isMobile) {
        await expectMobileFollowupReachability(page);
        await page
          .locator(".thread-mobile-footer-actions")
          .getByRole("button", { name: "Details", exact: true })
          .click();
      } else {
        await resolvedRequestCard
          .getByRole("button", { name: "Reopen request detail", exact: true })
          .click();
      }

      const detailSurface = page.locator(".thread-detail-surface");
      await expect(detailSurface).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Request detail", exact: true }),
      ).toBeVisible();
      await expect(detailSurface).toContainText("Decision");
      await expect(detailSurface).toContainText(decision);
      await expect(detailSurface).toContainText("Responded");
      await expect(
        detailSurface.getByRole("button", { name: "Approve request", exact: true }),
      ).toHaveCount(0);
      await expect(
        detailSurface.getByRole("button", { name: "Deny request", exact: true }),
      ).toHaveCount(0);
      await expect.poll(async () => expectNoHorizontalScroll(page)).toBe(true);
    });
  }
});
