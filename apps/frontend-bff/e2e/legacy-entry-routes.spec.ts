import { expect, test } from "@playwright/test";

import { mockChatFlow, stubEventSource } from "./helpers/browser-mocks";

for (const route of ["/", "/approvals"]) {
  test(`redirects ${route} to the thread-first chat shell`, async ({ page }, testInfo) => {
    await stubEventSource(page);
    await mockChatFlow(page);

    await page.goto(route);

    const isDesktop = testInfo.project.name === "desktop-chromium";

    await expect(page).toHaveURL(/\/chat$/);
    await expect(
      page.getByRole("heading", { name: "Thread workspace", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "Thread View", exact: true })).toBeVisible();
    if (isDesktop) {
      await expect(page.locator("section.thread-navigation")).toBeVisible();
    } else {
      await page
        .locator("header.chat-topbar")
        .getByRole("button", { name: "Threads", exact: true })
        .click();
      await expect(page.locator("section.thread-navigation")).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Home", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Approvals", exact: true })).toHaveCount(0);
  });
}
