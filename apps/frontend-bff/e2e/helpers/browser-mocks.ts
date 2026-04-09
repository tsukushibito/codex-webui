import type { Page, Route } from "@playwright/test";

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

export async function stubEventSource(page: Page) {
  await page.addInitScript(() => {
    class MockEventSource {
      onmessage: ((event: MessageEvent<string>) => void) | null = null;
      onerror: (() => void) | null = null;

      constructor(public readonly url: string) {}

      close() {}
    }

    Object.defineProperty(window, "EventSource", {
      configurable: true,
      writable: true,
      value: MockEventSource,
    });
  });
}

export async function expectNoHorizontalScroll(page: Page) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  return metrics.scrollWidth <= metrics.clientWidth + 1;
}

export async function mockChatFlow(page: Page) {
  const timestamps = {
    created: "2026-04-05T02:30:00Z",
    updated: "2026-04-05T02:31:00Z",
    started: "2026-04-05T02:32:00Z",
    messaged: "2026-04-05T02:33:00Z",
    stopped: "2026-04-05T02:34:00Z",
  };

  let workspaceCreated = false;
  let sessionStatus: "created" | "waiting_input" | "running" | "stopped" = "created";
  let sessionExists = false;
  const messages: Array<{
    message_id: string;
    session_id: string;
    role: "user";
    content: string;
    created_at: string;
  }> = [];

  const workspace = {
    workspace_id: "ws_alpha",
    workspace_name: "alpha",
    created_at: timestamps.created,
    updated_at: timestamps.updated,
    active_session_summary: null,
    pending_approval_count: 0,
  };

  const session = () => ({
    session_id: "thread_001",
    workspace_id: "ws_alpha",
    title: "Fix build error",
    status: sessionStatus,
    created_at: timestamps.created,
    updated_at:
      sessionStatus === "stopped"
        ? timestamps.stopped
        : messages.length > 0
          ? timestamps.messaged
          : sessionStatus === "waiting_input"
            ? timestamps.started
            : timestamps.updated,
    started_at: sessionStatus === "created" ? null : timestamps.started,
    last_message_at: messages.length > 0 ? timestamps.messaged : null,
    active_approval_id: null,
    can_send_message: sessionStatus === "waiting_input",
    can_start: sessionStatus === "created",
    can_stop: sessionStatus === "waiting_input" || sessionStatus === "running",
  });

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname, searchParams } = url;

    if (pathname === "/api/v1/home" && request.method() === "GET") {
      return json(route, {
        workspaces: workspaceCreated ? [workspace] : [],
        pending_approval_count: 0,
        updated_at: timestamps.updated,
      });
    }

    if (pathname === "/api/v1/workspaces" && request.method() === "POST") {
      workspaceCreated = true;
      return json(route, workspace, 201);
    }

    if (
      pathname === "/api/v1/workspaces/ws_alpha/sessions" &&
      request.method() === "GET" &&
      searchParams.get("sort") === "-updated_at"
    ) {
      return json(route, {
        items: sessionExists ? [session()] : [],
        next_cursor: null,
        has_more: false,
      });
    }

    if (pathname === "/api/v1/workspaces/ws_alpha/sessions" && request.method() === "POST") {
      sessionExists = true;
      sessionStatus = "created";
      return json(route, session(), 201);
    }

    if (pathname === "/api/v1/sessions/thread_001" && request.method() === "GET") {
      return json(route, session());
    }

    if (pathname === "/api/v1/sessions/thread_001/messages" && request.method() === "GET") {
      return json(route, {
        items: messages,
        next_cursor: null,
        has_more: false,
      });
    }

    if (pathname === "/api/v1/sessions/thread_001/events" && request.method() === "GET") {
      return json(route, {
        items: [],
        next_cursor: null,
        has_more: false,
      });
    }

    if (pathname === "/api/v1/sessions/thread_001/start" && request.method() === "POST") {
      sessionStatus = "waiting_input";
      return json(route, session());
    }

    if (pathname === "/api/v1/sessions/thread_001/messages" && request.method() === "POST") {
      const body = request.postDataJSON() as {
        content: string;
      };

      sessionStatus = "running";
      const message = {
        message_id: `msg_${messages.length + 1}`,
        session_id: "thread_001",
        role: "user" as const,
        content: body.content,
        created_at: timestamps.messaged,
      };
      messages.push(message);
      return json(route, message, 202);
    }

    if (pathname === "/api/v1/sessions/thread_001/stop" && request.method() === "POST") {
      sessionStatus = "stopped";
      return json(route, {
        session: session(),
        canceled_approval: null,
      });
    }

    return route.abort();
  });
}

export async function mockApprovalFlow(page: Page) {
  const requestedAt = "2026-04-05T02:40:00Z";
  const resolvedAt = "2026-04-05T02:41:00Z";
  let pending = true;

  const approvalSummary = () => ({
    approval_id: "apr_001",
    session_id: "thread_001",
    workspace_id: "ws_alpha",
    status: pending ? "pending" : "approved",
    title: "Run deployment",
    description: "Apply the prepared deployment plan.",
    approval_category: "external_side_effect",
    requested_at: requestedAt,
  });

  const approvalDetail = () => ({
    ...approvalSummary(),
    resolution: pending ? null : "approved",
    resolved_at: pending ? null : resolvedAt,
    operation_summary: "Deploy the latest checked-in build to staging.",
    context: {
      environment: "staging",
      change_ticket: "CHG-93",
    },
  });

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;

    if (pathname === "/api/v1/approvals" && request.method() === "GET") {
      return json(route, {
        items: pending ? [approvalSummary()] : [],
        next_cursor: null,
        has_more: false,
      });
    }

    if (pathname === "/api/v1/approvals/apr_001" && request.method() === "GET") {
      return json(route, approvalDetail());
    }

    if (pathname === "/api/v1/approvals/apr_001/approve" && request.method() === "POST") {
      pending = false;
      return json(route, {
        approval: approvalDetail(),
        session: {
          session_id: "thread_001",
          workspace_id: "ws_alpha",
          title: "Fix build error",
          status: "running",
          created_at: requestedAt,
          updated_at: resolvedAt,
          started_at: requestedAt,
          last_message_at: requestedAt,
          active_approval_id: null,
          can_send_message: false,
          can_start: false,
          can_stop: true,
        },
      });
    }

    return route.abort();
  });
}
