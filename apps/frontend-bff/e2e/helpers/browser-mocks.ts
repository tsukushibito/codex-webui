import type { Page, Route } from "@playwright/test";

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

type MockEventSourceInstance = {
  emit: (data: unknown) => void;
};

export async function stubEventSource(page: Page) {
  await page.addInitScript(() => {
    class MockEventSource {
      onmessage: ((event: MessageEvent<string>) => void) | null = null;
      onerror: (() => void) | null = null;
      onopen: (() => void) | null = null;
      readyState = 1;
      withCredentials = false;
      url: string;

      constructor(url: string) {
        this.url = url;

        const windowWithMockSources = window as Window & {
          __mockEventSourceInstances?: MockEventSource[];
        };

        windowWithMockSources.__mockEventSourceInstances ??= [];
        windowWithMockSources.__mockEventSourceInstances.push(this);
        window.setTimeout(() => {
          this.onopen?.();
        }, 0);
      }

      close() {}

      emit(data: unknown) {
        this.onmessage?.({
          data: JSON.stringify(data),
        } as MessageEvent<string>);
      }
    }

    Object.defineProperty(window, "EventSource", {
      configurable: true,
      writable: true,
      value: MockEventSource,
    });
  });
}

export async function emitMockEventSourceMessage(page: Page, data: unknown) {
  await page.evaluate((message) => {
    const windowWithMockSources = window as Window & {
      __mockEventSourceInstances?: MockEventSourceInstance[];
    };

    for (const instance of windowWithMockSources.__mockEventSourceInstances ?? []) {
      instance.emit(message);
    }
  }, data);
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
    firstInput: "2026-04-05T02:32:00Z",
    replied: "2026-04-05T02:33:00Z",
    interrupted: "2026-04-05T02:34:00Z",
  };

  let messageCount = 0;
  let workspaceCreated = false;
  let threadExists = false;
  let threadStatus: "idle" | "running" = "idle";
  let latestTurnStatus: "completed" | "inProgress" | "interrupted" = "completed";
  const timelineItems: Array<{
    timeline_item_id: string;
    thread_id: string;
    turn_id: null;
    item_id: null;
    sequence: number;
    occurred_at: string;
    kind: string;
    payload: Record<string, unknown>;
  }> = [];

  const workspace = {
    workspace_id: "ws_alpha",
    workspace_name: "alpha",
    created_at: timestamps.created,
    updated_at: timestamps.updated,
    active_session_summary: null,
    pending_approval_count: 0,
  };

  function currentThreadSummary() {
    return {
      thread_id: "thread_001",
      workspace_id: "ws_alpha",
      native_status: {
        thread_status: threadStatus === "running" ? "active" : "idle",
        active_flags: [],
        latest_turn_status: latestTurnStatus,
      },
      updated_at:
        latestTurnStatus === "interrupted"
          ? timestamps.interrupted
          : threadStatus === "running"
            ? timestamps.replied
            : timelineItems.length > 0
              ? timestamps.firstInput
              : timestamps.updated,
    };
  }

  function currentActivity() {
    if (threadStatus === "running") {
      return {
        kind: "running",
        label: "Running",
      };
    }

    return {
      kind: "waiting_on_user_input",
      label: "Waiting for your input",
    };
  }

  function threadListItem() {
    return {
      ...currentThreadSummary(),
      current_activity: currentActivity(),
      badge: null,
      blocked_cue: null,
      resume_cue:
        threadStatus === "running"
          ? {
              reason_kind: "active_thread",
              priority_band: "medium" as const,
              label: "Active now",
            }
          : {
              reason_kind: "active_thread",
              priority_band: "low" as const,
              label: "Resume here",
            },
    };
  }

  function threadView() {
    return {
      thread: currentThreadSummary(),
      current_activity: currentActivity(),
      pending_request: null,
      latest_resolved_request: null,
      composer: {
        accepting_user_input: threadStatus !== "running",
        interrupt_available: threadStatus === "running",
        blocked_by_request: false,
      },
      timeline: {
        items: timelineItems,
        next_cursor: null,
        has_more: false,
      },
    };
  }

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;

    if (pathname === "/api/v1/home" && request.method() === "GET") {
      return json(route, {
        workspaces: workspaceCreated ? [workspace] : [],
        resume_candidates: [],
        pending_approval_count: 0,
        updated_at: timestamps.updated,
      });
    }

    if (pathname === "/api/v1/workspaces" && request.method() === "POST") {
      workspaceCreated = true;
      return json(route, workspace, 201);
    }

    if (pathname === "/api/v1/workspaces/ws_alpha/threads" && request.method() === "GET") {
      return json(route, {
        items: threadExists ? [threadListItem()] : [],
        next_cursor: null,
        has_more: false,
      });
    }

    if (pathname === "/api/v1/workspaces/ws_alpha/inputs" && request.method() === "POST") {
      const body = request.postDataJSON() as {
        content: string;
      };

      threadExists = true;
      threadStatus = "idle";
      latestTurnStatus = "completed";
      messageCount += 1;
      timelineItems.splice(0, timelineItems.length, {
        timeline_item_id: `evt_${messageCount}`,
        thread_id: "thread_001",
        turn_id: null,
        item_id: null,
        sequence: 1,
        occurred_at: timestamps.firstInput,
        kind: "message.user",
        payload: {
          summary: body.content,
        },
      });

      return json(
        route,
        {
          accepted: {
            thread_id: "thread_001",
            turn_id: null,
            input_item_id: `msg_${messageCount}`,
          },
          thread: currentThreadSummary(),
        },
        202,
      );
    }

    if (pathname === "/api/v1/threads/thread_001" && request.method() === "GET") {
      return json(route, currentThreadSummary());
    }

    if (pathname === "/api/v1/threads/thread_001/view" && request.method() === "GET") {
      return json(route, threadView());
    }

    if (pathname === "/api/v1/threads/thread_001/timeline" && request.method() === "GET") {
      return json(route, {
        items: timelineItems,
        next_cursor: null,
        has_more: false,
      });
    }

    if (pathname === "/api/v1/threads/thread_001/inputs" && request.method() === "POST") {
      const body = request.postDataJSON() as {
        content: string;
      };

      threadExists = true;
      threadStatus = "running";
      latestTurnStatus = "inProgress";
      messageCount += 1;
      timelineItems.push({
        timeline_item_id: `evt_${messageCount}`,
        thread_id: "thread_001",
        turn_id: null,
        item_id: null,
        sequence: messageCount,
        occurred_at: timestamps.replied,
        kind: "message.user",
        payload: {
          summary: body.content,
        },
      });

      await emitMockEventSourceMessage(page, {
        event_id: `evt_stream_${messageCount}`,
        thread_id: "thread_001",
        event_type: "message.user",
        sequence: messageCount,
        occurred_at: timestamps.replied,
        payload: {
          summary: body.content,
        },
      });

      return json(
        route,
        {
          accepted: {
            thread_id: "thread_001",
            turn_id: null,
            input_item_id: `msg_${messageCount}`,
          },
          thread: currentThreadSummary(),
        },
        202,
      );
    }

    if (pathname === "/api/v1/threads/thread_001/interrupt" && request.method() === "POST") {
      threadStatus = "idle";
      latestTurnStatus = "interrupted";
      messageCount += 1;
      timelineItems.push({
        timeline_item_id: `evt_${messageCount}`,
        thread_id: "thread_001",
        turn_id: null,
        item_id: null,
        sequence: messageCount,
        occurred_at: timestamps.interrupted,
        kind: "thread.interrupted",
        payload: {
          summary: "Thread interrupted.",
        },
      });

      return json(route, currentThreadSummary());
    }

    return route.abort();
  });
}

export async function mockApprovalFlow(page: Page) {
  const requestedAt = "2026-04-05T02:40:00Z";
  const resolvedAt = "2026-04-05T02:41:00Z";
  let resolution: "pending" | "approved" | "denied" = "pending";

  const pendingRequest = () => ({
    request_id: "req_001",
    thread_id: "thread_001",
    turn_id: "turn_001",
    item_id: "item_001",
    request_kind: "approval",
    status: "pending" as const,
    risk_category: "external_side_effect" as const,
    summary: "Run deployment",
    requested_at: requestedAt,
  });

  const resolvedRequest = () => ({
    request_id: "req_001",
    thread_id: "thread_001",
    turn_id: "turn_001",
    item_id: "item_001",
    request_kind: "approval",
    status: "resolved" as const,
    decision: resolution,
    requested_at: requestedAt,
    responded_at: resolvedAt,
  });

  const currentThread = () => ({
    thread_id: "thread_001",
    workspace_id: "ws_alpha",
    native_status: {
      thread_status: resolution === "pending" ? "active" : "idle",
      active_flags: resolution === "pending" ? ["waitingOnApproval"] : [],
      latest_turn_status: resolution === "pending" ? "inProgress" : "completed",
    },
    updated_at: resolution === "pending" ? requestedAt : resolvedAt,
  });

  const currentThreadView = () => ({
    thread: currentThread(),
    current_activity:
      resolution === "pending"
        ? {
            kind: "waiting_on_approval",
            label: "Approval required",
          }
        : {
            kind: "waiting_on_user_input",
            label: "Waiting for your input",
          },
    pending_request: resolution === "pending" ? pendingRequest() : null,
    latest_resolved_request: resolution === "pending" ? null : resolvedRequest(),
    composer: {
      accepting_user_input: resolution !== "pending",
      interrupt_available: resolution === "pending",
      blocked_by_request: resolution === "pending",
    },
    timeline: {
      items: [
        {
          timeline_item_id: "evt_001",
          thread_id: "thread_001",
          turn_id: null,
          item_id: null,
          sequence: 1,
          occurred_at: requestedAt,
          kind: "approval.requested",
          payload: {
            summary: "Run deployment",
          },
        },
        ...(resolution === "pending"
          ? []
          : [
              {
                timeline_item_id: "evt_002",
                thread_id: "thread_001",
                turn_id: null,
                item_id: null,
                sequence: 2,
                occurred_at: resolvedAt,
                kind: "approval.resolved",
                payload: {
                  summary: `Approval ${resolution}.`,
                },
              },
            ]),
      ],
      next_cursor: null,
      has_more: false,
    },
  });

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;

    if (pathname === "/api/v1/home" && request.method() === "GET") {
      return json(route, {
        workspaces: [
          {
            workspace_id: "ws_alpha",
            workspace_name: "alpha",
            created_at: "2026-04-05T02:20:00Z",
            updated_at: resolution === "pending" ? requestedAt : resolvedAt,
            active_session_summary: {
              session_id: "thread_001",
              status: resolution === "pending" ? "waiting_approval" : "running",
              last_message_at: resolution === "pending" ? null : resolvedAt,
            },
            pending_approval_count: resolution === "pending" ? 1 : 0,
          },
        ],
        resume_candidates: [],
        pending_approval_count: resolution === "pending" ? 1 : 0,
        updated_at: resolution === "pending" ? requestedAt : resolvedAt,
      });
    }

    if (pathname === "/api/v1/workspaces/ws_alpha/threads" && request.method() === "GET") {
      return json(route, {
        items: [
          {
            ...currentThread(),
            current_activity:
              resolution === "pending"
                ? {
                    kind: "waiting_on_approval",
                    label: "Approval required",
                  }
                : {
                    kind: "waiting_on_user_input",
                    label: "Waiting for your input",
                  },
            badge:
              resolution === "pending"
                ? {
                    kind: "approval_required",
                    label: "Approval required",
                  }
                : null,
            blocked_cue:
              resolution === "pending"
                ? {
                    kind: "approval_required",
                    label: "Needs your response",
                  }
                : null,
            resume_cue:
              resolution === "pending"
                ? {
                    reason_kind: "waiting_on_approval",
                    priority_band: "highest" as const,
                    label: "Resume here first",
                  }
                : {
                    reason_kind: "active_thread",
                    priority_band: "medium" as const,
                    label: "Active now",
                  },
          },
        ],
        next_cursor: null,
        has_more: false,
      });
    }

    if (pathname === "/api/v1/threads/thread_001" && request.method() === "GET") {
      return json(route, currentThread());
    }

    if (pathname === "/api/v1/threads/thread_001/view" && request.method() === "GET") {
      return json(route, currentThreadView());
    }

    if (pathname === "/api/v1/threads/thread_001/timeline" && request.method() === "GET") {
      return json(route, currentThreadView().timeline);
    }

    if (pathname === "/api/v1/requests/req_001" && request.method() === "GET") {
      return json(route, {
        request_id: "req_001",
        thread_id: "thread_001",
        turn_id: "turn_001",
        item_id: "item_001",
        request_kind: "approval",
        status: resolution === "pending" ? "pending" : "resolved",
        risk_category: "external_side_effect",
        summary: "Run deployment",
        reason: "Apply the prepared deployment plan.",
        operation_summary: "Deploy the latest checked-in build to staging.",
        requested_at: requestedAt,
        responded_at: resolution === "pending" ? null : resolvedAt,
        decision: resolution === "pending" ? null : resolution,
        decision_options: {
          policy_scope_supported: false,
          default_policy_scope: "once",
        },
        context: {
          environment: "staging",
          change_ticket: "CHG-93",
        },
      });
    }

    if (pathname === "/api/v1/approvals" && request.method() === "GET") {
      return json(route, {
        items:
          resolution === "pending"
            ? [
                {
                  approval_id: "apr_001",
                  session_id: "thread_001",
                  workspace_id: "ws_alpha",
                  status: "pending",
                  resolution: null,
                  approval_category: "external_side_effect",
                  title: "Run deployment",
                  description: "Apply the prepared deployment plan.",
                  requested_at: requestedAt,
                  resolved_at: null,
                },
              ]
            : [],
        next_cursor: null,
        has_more: false,
      });
    }

    if (pathname === "/api/v1/approvals/apr_001" && request.method() === "GET") {
      return json(route, {
        approval_id: "apr_001",
        session_id: "thread_001",
        workspace_id: "ws_alpha",
        status: resolution === "pending" ? "pending" : resolution,
        resolution: resolution === "pending" ? null : resolution,
        approval_category: "external_side_effect",
        title: "Run deployment",
        description: "Apply the prepared deployment plan.",
        requested_at: requestedAt,
        resolved_at: resolution === "pending" ? null : resolvedAt,
        operation_summary: "Deploy the latest checked-in build to staging.",
        context: {
          environment: "staging",
          change_ticket: "CHG-93",
        },
      });
    }

    if (pathname === "/api/v1/approvals/apr_001/approve" && request.method() === "POST") {
      resolution = "approved";
      return json(
        route,
        {
          request: {
            request_id: "req_001",
            status: "resolved",
            decision: "approved",
            responded_at: resolvedAt,
          },
          thread: currentThread(),
        },
        200,
      );
    }

    if (pathname === "/api/v1/approvals/apr_001/deny" && request.method() === "POST") {
      resolution = "denied";
      return json(
        route,
        {
          request: {
            request_id: "req_001",
            status: "resolved",
            decision: "denied",
            responded_at: resolvedAt,
          },
          thread: currentThread(),
        },
        200,
      );
    }

    if (pathname === "/api/v1/requests/req_001/response" && request.method() === "POST") {
      const body = request.postDataJSON() as {
        decision: "approved" | "denied";
      };

      resolution = body.decision;
      return json(
        route,
        {
          request: {
            request_id: "req_001",
            status: "resolved",
            decision: body.decision,
            responded_at: resolvedAt,
          },
          thread: currentThread(),
        },
        200,
      );
    }

    return route.abort();
  });
}
