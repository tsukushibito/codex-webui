import { chromium } from "../../apps/frontend-bff/node_modules/@playwright/test/index.mjs";
import { writeFile } from "node:fs/promises";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const outputPath =
  process.env.MEASURE_360_OUTPUT ??
  "artifacts/issue-168-legacy-surface-validation/360-no-horizontal-scroll-measurements.json";

const timestamps = {
  created: "2026-04-22T13:00:00Z",
  updated: "2026-04-22T13:01:00Z",
  requested: "2026-04-22T13:02:00Z",
};

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function threadSummary(threadId, status = "idle") {
  return {
    thread_id: threadId,
    workspace_id: "ws_alpha",
    native_status: {
      thread_status: status,
      active_flags: status === "running" ? ["waiting_on_request"] : [],
      latest_turn_status: status === "running" ? "running" : "completed",
    },
    updated_at: timestamps.updated,
  };
}

function threadListItem(threadId, status = "idle") {
  return {
    ...threadSummary(threadId, status),
    current_activity:
      status === "running"
        ? { kind: "waiting_on_approval", label: "Approval required" }
        : { kind: "waiting_on_user_input", label: "Waiting for your input" },
    badge: status === "running" ? { kind: "approval_required", label: "Approval required" } : null,
    blocked_cue:
      status === "running" ? { kind: "approval_required", label: "Needs your response" } : null,
    resume_cue: {
      reason_kind: status === "running" ? "waiting_on_approval" : "active_thread",
      priority_band: status === "running" ? "highest" : "low",
      label: status === "running" ? "Resume here first" : "Resume here",
    },
  };
}

function threadView(threadId, withRequest = false) {
  return {
    thread: threadSummary(threadId, withRequest ? "running" : "idle"),
    current_activity: withRequest
      ? { kind: "waiting_on_approval", label: "Approval required" }
      : { kind: "waiting_on_user_input", label: "Waiting for your input" },
    pending_request: withRequest
      ? {
          request_id: "req_001",
          thread_id: threadId,
          turn_id: "turn_001",
          item_id: "item_001",
          request_kind: "approval",
          status: "pending",
          risk_category: "external_side_effect",
          summary: "Run deployment",
          requested_at: timestamps.requested,
        }
      : null,
    latest_resolved_request: null,
    composer: {
      accepting_user_input: !withRequest,
      interrupt_available: withRequest,
      blocked_by_request: withRequest,
    },
    timeline: {
      items: [
        {
          timeline_item_id: "evt_001",
          thread_id: threadId,
          turn_id: null,
          item_id: null,
          sequence: 1,
          occurred_at: timestamps.updated,
          kind: withRequest ? "approval.requested" : "message.assistant.completed",
          payload: {
            summary: withRequest ? "Run deployment" : "Thread ready for follow-up input.",
            content: withRequest ? undefined : "Thread ready for follow-up input.",
          },
        },
      ],
      next_cursor: null,
      has_more: false,
    },
  };
}

async function installBrowserStubs(page) {
  await page.addInitScript(() => {
    class MockEventSource {
      onopen = null;
      onmessage = null;
      onerror = null;
      readyState = 1;
      withCredentials = false;

      constructor(url) {
        this.url = url;
        window.setTimeout(() => this.onopen?.(), 0);
      }

      close() {}
    }

    Object.defineProperty(window, "EventSource", {
      configurable: true,
      writable: true,
      value: MockEventSource,
    });
  });

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());

    if (pathname === "/api/v1/home" && request.method() === "GET") {
      return json(route, {
        workspaces: [
          {
            workspace_id: "ws_alpha",
            workspace_name: "alpha",
            created_at: timestamps.created,
            updated_at: timestamps.updated,
            active_session_summary: null,
            pending_approval_count: 1,
          },
        ],
        resume_candidates: [threadListItem("thread_request", "running")],
        pending_approval_count: 1,
        updated_at: timestamps.updated,
      });
    }

    if (pathname === "/api/v1/workspaces/ws_alpha/threads" && request.method() === "GET") {
      return json(route, {
        items: [threadListItem("thread_001"), threadListItem("thread_request", "running")],
        next_cursor: null,
        has_more: false,
      });
    }

    if (pathname === "/api/v1/threads/thread_001/view" && request.method() === "GET") {
      return json(route, threadView("thread_001"));
    }

    if (pathname === "/api/v1/threads/thread_request/view" && request.method() === "GET") {
      return json(route, threadView("thread_request", true));
    }

    if (pathname === "/api/v1/requests/req_001" && request.method() === "GET") {
      return json(route, {
        request_id: "req_001",
        thread_id: "thread_request",
        turn_id: "turn_001",
        item_id: "item_001",
        request_kind: "approval",
        status: "pending",
        risk_category: "external_side_effect",
        summary: "Run deployment",
        reason: "Apply the prepared deployment plan.",
        operation_summary: "Deploy the latest checked-in build to staging.",
        requested_at: timestamps.requested,
        responded_at: null,
        decision: null,
        decision_options: {
          policy_scope_supported: false,
          default_policy_scope: "once",
        },
        context: {
          environment: "staging",
          change_ticket: "CHG-168",
        },
      });
    }

    return route.abort("blockedbyclient");
  });
}

async function measure(page, name, path, readyLocator) {
  await page.goto(`${baseURL}${path}`);
  await readyLocator(page).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(250);
  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentElementClientWidth: document.documentElement.clientWidth,
    documentElementScrollWidth: document.documentElement.scrollWidth,
  }));

  return {
    name,
    path,
    ...metrics,
    passed:
      metrics.viewportWidth === 360 &&
      metrics.documentElementScrollWidth <= metrics.documentElementClientWidth + 1,
  };
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 360, height: 800 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
});

try {
  await installBrowserStubs(page);

  const measurements = [
    await measure(page, "Home", "/", (nextPage) =>
      nextPage.getByRole("heading", { name: "Home", exact: true }),
    ),
    await measure(page, "Chat thread", "/chat?workspaceId=ws_alpha&threadId=thread_001", (nextPage) =>
      nextPage.getByRole("heading", { name: "thread_001", exact: true }),
    ),
    await measure(
      page,
      "Chat request detail",
      "/chat?workspaceId=ws_alpha&threadId=thread_request",
      (nextPage) => nextPage.locator(".request-detail-card"),
    ),
  ];

  const result = {
    measuredAt: new Date().toISOString(),
    baseURL,
    cssViewportWidth: 360,
    measurements,
    passed: measurements.every((entry) => entry.passed),
  };

  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.passed ? 0 : 1;
} finally {
  await browser.close();
}
