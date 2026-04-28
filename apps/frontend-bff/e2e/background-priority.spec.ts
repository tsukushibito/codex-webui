import { expect, test } from "@playwright/test";

import {
  fulfillJson,
  mockApprovalRequestDetailFixture,
  mockApprovalRequestFixture,
  mockThreadListItemFixture,
  mockThreadSummaryFixture,
  mockThreadViewFixture,
  mockTimelineItemFixture,
  mockWorkspaceFixture,
  stubEventSource,
} from "./helpers/browser-mocks";

async function emitNotificationEvent(
  page: Parameters<typeof test>[0]["page"],
  payload: Record<string, unknown>,
) {
  await page.evaluate((message) => {
    const windowWithMockSources = window as Window & {
      __mockEventSourceInstances?: Array<{
        url: string;
        emit: (data: unknown) => void;
      }>;
    };

    for (const instance of windowWithMockSources.__mockEventSourceInstances ?? []) {
      if (instance.url === "/api/v1/notifications/stream") {
        instance.emit(message);
      }
    }
  }, payload);
}

async function mockBackgroundPriorityFlow(page: Parameters<typeof test>[0]["page"]) {
  const baseTimestamp = "2026-04-24T03:10:00Z";

  const workspace = mockWorkspaceFixture({
    created_at: "2026-04-24T03:00:00Z",
    updated_at: baseTimestamp,
    active_session_summary: {
      session_id: "thread_001",
      status: "running",
      last_message_at: baseTimestamp,
    },
    pending_approval_count: 1,
  });

  const primaryThread = mockThreadListItemFixture({
    thread_id: "thread_001",
    workspace_id: "ws_alpha",
    native_status: {
      thread_status: "running",
      active_flags: [],
      latest_turn_status: "completed",
    },
    updated_at: baseTimestamp,
    current_activity: {
      kind: "waiting_on_user_input",
      label: "Waiting for your input",
    },
    badge: null,
    blocked_cue: null,
    resume_cue: {
      reason_kind: "active_thread",
      priority_band: "medium",
      label: "Active now",
    },
  });

  const backgroundThread = mockThreadListItemFixture({
    thread_id: "thread_background",
    workspace_id: "ws_alpha",
    native_status: {
      thread_status: "waiting_input",
      active_flags: ["waiting_on_request"],
      latest_turn_status: null,
    },
    updated_at: "2026-04-24T03:11:00Z",
    current_activity: {
      kind: "waiting_on_approval",
      label: "Approval required",
    },
    badge: {
      kind: "approval_required",
      label: "Approval required",
    },
    blocked_cue: {
      kind: "approval_required",
      label: "Needs response",
    },
    resume_cue: {
      reason_kind: "waiting_on_approval",
      priority_band: "highest",
      label: "Resume here first",
    },
  });

  const threadViewById = {
    thread_001: mockThreadViewFixture({
      thread: mockThreadSummaryFixture({
        thread_id: "thread_001",
        workspace_id: "ws_alpha",
        native_status: primaryThread.native_status,
        updated_at: primaryThread.updated_at,
      }),
      current_activity: primaryThread.current_activity,
      pending_request: null,
      latest_resolved_request: null,
      composer: {
        accepting_user_input: true,
        interrupt_available: false,
        blocked_by_request: false,
      },
      timeline: {
        items: [
          mockTimelineItemFixture({
            timeline_item_id: "evt_001",
            thread_id: "thread_001",
            sequence: 1,
            occurred_at: baseTimestamp,
            kind: "message.assistant.completed",
            payload: {
              summary: "assistant completed",
              content: "Primary thread is idle.",
            },
          }),
        ],
        next_cursor: null,
        has_more: false,
      },
    }),
    thread_background: mockThreadViewFixture({
      thread: mockThreadSummaryFixture({
        thread_id: "thread_background",
        workspace_id: "ws_alpha",
        native_status: backgroundThread.native_status,
        updated_at: backgroundThread.updated_at,
      }),
      current_activity: backgroundThread.current_activity,
      pending_request: mockApprovalRequestFixture({
        request_id: "req_background",
        thread_id: "thread_background",
        turn_id: "turn_background",
        item_id: "item_background",
        request_kind: "approval",
        status: "pending",
        risk_category: "external_side_effect",
        summary: "Deploy background fix",
        requested_at: backgroundThread.updated_at,
      }),
      latest_resolved_request: null,
      composer: {
        accepting_user_input: false,
        interrupt_available: false,
        blocked_by_request: true,
      },
      timeline: {
        items: [
          mockTimelineItemFixture({
            timeline_item_id: "evt_100",
            thread_id: "thread_background",
            sequence: 1,
            occurred_at: backgroundThread.updated_at,
            kind: "approval.requested",
            payload: {
              summary: "Deploy background fix",
            },
          }),
        ],
        next_cursor: null,
        has_more: false,
      },
    }),
  };

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;

    if (pathname === "/api/v1/workspaces" && request.method() === "GET") {
      return fulfillJson(route, {
        items: [workspace],
        next_cursor: null,
        has_more: false,
      });
    }

    if (pathname === "/api/v1/workspaces/ws_alpha/threads" && request.method() === "GET") {
      return fulfillJson(route, {
        items: [primaryThread, backgroundThread],
        next_cursor: null,
        has_more: false,
      });
    }

    if (
      (pathname === "/api/v1/threads/thread_001/view" ||
        pathname === "/api/v1/threads/thread_background/view") &&
      request.method() === "GET"
    ) {
      const threadId = pathname.includes("thread_background") ? "thread_background" : "thread_001";
      return fulfillJson(route, threadViewById[threadId]);
    }

    if (pathname === "/api/v1/requests/req_background" && request.method() === "GET") {
      return fulfillJson(
        route,
        mockApprovalRequestDetailFixture({
          request_id: "req_background",
          thread_id: "thread_background",
          turn_id: "turn_background",
          item_id: "item_background",
          request_kind: "approval",
          status: "pending",
          risk_category: "external_side_effect",
          summary: "Deploy background fix",
          reason: "The background deployment needs approval.",
          operation_summary: "Deploy the prepared fix to staging.",
          requested_at: backgroundThread.updated_at,
          responded_at: null,
          decision: null,
          decision_options: {
            policy_scope_supported: false,
            default_policy_scope: "once",
          },
          context: {
            environment: "staging",
          },
        }),
      );
    }

    return route.abort();
  });
}

test("returns to a high-priority background thread from the lightweight notification path on desktop and mobile", async ({
  page,
}, testInfo) => {
  const isDesktop = testInfo.project.name === "desktop-chromium";

  await stubEventSource(page);
  await mockBackgroundPriorityFlow(page);

  await page.goto("/chat?workspaceId=ws_alpha&threadId=thread_001");
  await expect(page).toHaveURL(/\/chat\?workspaceId=ws_alpha&threadId=thread_001$/);
  const threadView = page.getByRole("region", { name: "Thread View", exact: true });
  await expect(threadView).toBeVisible();
  await expect(threadView.getByText("Primary thread is idle.")).toBeVisible();
  const threadViewBoxBefore = await threadView.boundingBox();
  expect(threadViewBoxBefore).not.toBeNull();
  await page.screenshot({
    path: testInfo.outputPath(`issue-302-background-priority-before-${testInfo.project.name}.png`),
    fullPage: true,
  });

  if (!isDesktop) {
    await expect(
      page
        .locator(".thread-mobile-footer-actions")
        .getByRole("button", { name: "Threads", exact: true }),
    ).toBeVisible();
  }

  await emitNotificationEvent(page, {
    thread_id: "thread_background",
    event_type: "approval.requested",
    occurred_at: "2026-04-24T03:11:00Z",
    high_priority: true,
  });

  await expect(page.locator(".navigation-feedback-note-notification")).toContainText(
    "High-priority background thread needs attention.",
  );
  await expect(page.locator(".background-priority-notice")).toContainText(
    "Background thread needs attention",
  );
  await expect(page.locator(".background-priority-notice")).toContainText("Reason: Needs response");
  const threadViewBoxAfterNotice = await threadView.boundingBox();
  expect(threadViewBoxAfterNotice).not.toBeNull();
  expect(threadViewBoxAfterNotice?.x).toBe(threadViewBoxBefore?.x);
  expect(threadViewBoxAfterNotice?.y).toBe(threadViewBoxBefore?.y);
  expect(threadViewBoxAfterNotice?.width).toBe(threadViewBoxBefore?.width);
  await page.screenshot({
    path: testInfo.outputPath(`issue-302-background-priority-after-${testInfo.project.name}.png`),
    fullPage: true,
  });

  if (!isDesktop) {
    await page
      .locator(".thread-mobile-footer-actions")
      .getByRole("button", { name: "Threads", exact: true })
      .click();
    await expect(page.locator(".thread-navigation.open")).toBeVisible();
  }

  await page.getByRole("button", { name: "Open thread", exact: true }).click();

  await expect(page).toHaveURL(/\/chat\?workspaceId=ws_alpha&threadId=thread_background$/);
  await expect(threadView.getByText("Deploy background fix").first()).toBeVisible();
  await expect(page.locator(".request-detail-card.pending-request-card")).toBeVisible();
  await expect(page.locator(".request-detail-card.pending-request-card")).toContainText(
    "Deploy background fix",
  );
  await expect(page.locator(".request-detail-card.pending-request-card")).toContainText(
    "The background deployment needs approval.",
  );
  await expect(
    page.locator(".request-detail-card.pending-request-card").getByRole("button", {
      name: "Approve request",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".background-priority-notice")).toHaveCount(0);
  await expect(page).not.toHaveURL(/\/approvals(\/|$)/);
});
