import type { Page, Route } from "@playwright/test";

export function fulfillJson(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

const json = fulfillJson;

export function mockWorkspaceFixture(
  overrides: Partial<{
    workspace_id: string;
    workspace_name: string;
    created_at: string;
    updated_at: string;
    active_session_summary: {
      session_id: string;
      status: string;
      last_message_at: string | null;
    } | null;
    pending_approval_count: number;
  }> = {},
) {
  return {
    workspace_id: "ws_alpha",
    workspace_name: "alpha",
    created_at: "2026-04-05T02:20:00Z",
    updated_at: "2026-04-05T02:21:00Z",
    active_session_summary: null,
    pending_approval_count: 0,
    ...overrides,
  };
}

export function mockThreadSummaryFixture(
  overrides: Partial<{
    thread_id: string;
    workspace_id: string;
    native_status: {
      thread_status: string;
      active_flags: string[];
      latest_turn_status: string | null;
    };
    updated_at: string;
  }> = {},
) {
  return {
    thread_id: "thread_001",
    workspace_id: "ws_alpha",
    native_status: {
      thread_status: "idle",
      active_flags: [],
      latest_turn_status: "completed",
    },
    updated_at: "2026-04-05T02:21:00Z",
    ...overrides,
  };
}

export function mockThreadListItemFixture(
  overrides: Partial<{
    thread_id: string;
    workspace_id: string;
    native_status: {
      thread_status: string;
      active_flags: string[];
      latest_turn_status: string | null;
    };
    updated_at: string;
    current_activity: {
      kind: string;
      label: string;
    };
    badge: {
      kind: string;
      label: string;
    } | null;
    blocked_cue: {
      kind: string;
      label: string;
    } | null;
    resume_cue: {
      reason_kind: string;
      priority_band: "low" | "medium" | "high" | "highest";
      label: string;
    } | null;
  }> = {},
) {
  return {
    ...mockThreadSummaryFixture(),
    current_activity: {
      kind: "waiting_on_user_input",
      label: "Waiting for your input",
    },
    badge: null,
    blocked_cue: null,
    resume_cue: {
      reason_kind: "active_thread",
      priority_band: "medium" as const,
      label: "Active now",
    },
    ...overrides,
  };
}

export function mockTimelineItemFixture(
  overrides: Partial<{
    timeline_item_id: string;
    thread_id: string;
    turn_id: string | null;
    item_id: string | null;
    sequence: number;
    occurred_at: string;
    kind: string;
    payload: Record<string, unknown>;
  }> = {},
) {
  return {
    timeline_item_id: "evt_001",
    thread_id: "thread_001",
    turn_id: null,
    item_id: null,
    sequence: 1,
    occurred_at: "2026-04-05T02:21:00Z",
    kind: "message.assistant.completed",
    payload: {
      summary: "assistant completed",
      content: "Fixture message",
    },
    ...overrides,
  };
}

export function mockApprovalRequestFixture(
  overrides: Partial<{
    request_id: string;
    thread_id: string;
    turn_id: string;
    item_id: string;
    request_kind: string;
    status: "pending" | "resolved";
    risk_category: string;
    summary: string;
    requested_at: string;
    responded_at?: string | null;
    decision?: "approved" | "denied" | "pending" | null;
  }> = {},
) {
  return {
    request_id: "req_001",
    thread_id: "thread_001",
    turn_id: "turn_001",
    item_id: "item_001",
    request_kind: "approval",
    status: "pending" as const,
    risk_category: "external_side_effect",
    summary: "Run deployment",
    requested_at: "2026-04-05T02:40:00Z",
    ...overrides,
  };
}

export function mockThreadViewFixture(
  overrides: Partial<{
    thread: ReturnType<typeof mockThreadSummaryFixture>;
    current_activity: {
      kind: string;
      label: string;
    };
    pending_request: ReturnType<typeof mockApprovalRequestFixture> | null;
    latest_resolved_request: Record<string, unknown> | null;
    composer: {
      accepting_user_input: boolean;
      interrupt_available: boolean;
      blocked_by_request: boolean;
    };
    timeline: {
      items: ReturnType<typeof mockTimelineItemFixture>[];
      next_cursor: string | null;
      has_more: boolean;
    };
  }> = {},
) {
  return {
    thread: mockThreadSummaryFixture(),
    current_activity: {
      kind: "waiting_on_user_input",
      label: "Waiting for your input",
    },
    pending_request: null,
    latest_resolved_request: null,
    composer: {
      accepting_user_input: true,
      interrupt_available: false,
      blocked_by_request: false,
    },
    timeline: {
      items: [mockTimelineItemFixture()],
      next_cursor: null,
      has_more: false,
    },
    ...overrides,
  };
}

export function mockApprovalRequestDetailFixture(
  overrides: Partial<{
    request_id: string;
    thread_id: string;
    turn_id: string;
    item_id: string;
    request_kind: string;
    status: "pending" | "resolved";
    risk_category: string;
    summary: string;
    reason: string;
    operation_summary: string;
    requested_at: string;
    responded_at: string | null;
    decision: "approved" | "denied" | "pending" | null;
    decision_options: {
      policy_scope_supported: boolean;
      default_policy_scope: string;
    };
    context: Record<string, unknown>;
  }> = {},
) {
  return {
    ...mockApprovalRequestFixture(),
    reason: "Apply the prepared deployment plan.",
    operation_summary: "Deploy the latest checked-in build to staging.",
    responded_at: null,
    decision: null,
    decision_options: {
      policy_scope_supported: false,
      default_policy_scope: "once",
    },
    context: {
      environment: "staging",
      change_ticket: "CHG-93",
    },
    ...overrides,
  };
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

export async function mockChatFlow(
  page: Page,
  options: {
    existingThread?: boolean;
    followupResponseDelayMs?: number;
    longTimeline?: boolean;
  } = {},
) {
  const timestamps = {
    created: "2026-04-05T02:30:00Z",
    updated: "2026-04-05T02:31:00Z",
    firstInput: "2026-04-05T02:32:00Z",
    replied: "2026-04-05T02:33:00Z",
    assistantDelta: "2026-04-05T02:33:02Z",
    assistantCompleted: "2026-04-05T02:33:04Z",
    interrupted: "2026-04-05T02:34:00Z",
  };

  let messageCount = 0;
  let sequenceCount = 0;
  let workspaceCreated = false;
  let threadExists = false;
  let followupCount = 0;
  let threadStatus: "idle" | "running" = "idle";
  let latestTurnStatus: "completed" | "running" | "interrupted" = "completed";
  const existingThread = options.existingThread ?? false;
  const followupResponseDelayMs = options.followupResponseDelayMs ?? 0;
  const longTimeline = options.longTimeline ?? false;
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

  function nextSequence() {
    sequenceCount += 1;
    return sequenceCount;
  }

  function buildLongTimelineItems() {
    return Array.from({ length: 18 }, (_, index) => ({
      timeline_item_id: `evt_long_${index + 2}`,
      thread_id: "thread_001",
      turn_id: null,
      item_id: null,
      sequence: nextSequence(),
      occurred_at: timestamps.firstInput,
      kind:
        index % 3 === 0
          ? "message.user"
          : index % 3 === 1
            ? "message.assistant.completed"
            : "session.status_changed",
      payload:
        index % 3 === 0
          ? {
              summary: `User follow-up ${index + 1}`,
              content: `Long thread filler item ${index + 1} keeps the timeline tall enough to require in-panel scrolling.`,
            }
          : index % 3 === 1
            ? {
                summary: `Assistant output ${index + 1}`,
                content: `Expanded assistant context ${index + 1} keeps the thread body long enough to exercise follow mode in the scroll region.`,
              }
            : {
                summary: `Status update ${index + 1}`,
              },
    }));
  }

  function currentThreadSummary() {
    return {
      thread_id: "thread_001",
      workspace_id: "ws_alpha",
      native_status: {
        thread_status: threadStatus === "running" ? "running" : "idle",
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

  if (existingThread) {
    workspaceCreated = true;
    threadExists = true;
    messageCount = 1;
    timelineItems.push(
      {
        timeline_item_id: "evt_1",
        thread_id: "thread_001",
        turn_id: null,
        item_id: null,
        sequence: nextSequence(),
        occurred_at: timestamps.firstInput,
        kind: "message.user",
        payload: {
          summary: "user input accepted",
          content: "Inspect scroll follow behavior",
        },
      },
      ...(longTimeline ? buildLongTimelineItems() : []),
    );
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

    if (pathname === "/api/v1/workspaces" && request.method() === "GET") {
      return json(route, {
        items: workspaceCreated ? [workspace] : [],
        next_cursor: null,
        has_more: false,
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
      const sequence = nextSequence();
      const initialUserItem = {
        timeline_item_id: `evt_${messageCount}`,
        thread_id: "thread_001",
        turn_id: null,
        item_id: null,
        sequence,
        occurred_at: timestamps.firstInput,
        kind: "message.user",
        payload: {
          summary: "user input accepted",
          content: body.content,
        },
      };
      timelineItems.splice(
        0,
        timelineItems.length,
        initialUserItem,
        ...(longTimeline ? buildLongTimelineItems() : []),
      );

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

      if (followupResponseDelayMs > 0) {
        await new Promise((resolve) => {
          setTimeout(resolve, followupResponseDelayMs);
        });
      }

      followupCount += 1;
      threadExists = true;
      threadStatus = "running";
      latestTurnStatus = "running";
      messageCount += 1;
      const userSequence = nextSequence();
      timelineItems.push({
        timeline_item_id: `evt_${messageCount}`,
        thread_id: "thread_001",
        turn_id: null,
        item_id: null,
        sequence: userSequence,
        occurred_at: timestamps.replied,
        kind: "message.user",
        payload: {
          summary: "user input accepted",
          content: body.content,
        },
      });

      await emitMockEventSourceMessage(page, {
        event_id: `evt_stream_${messageCount}`,
        thread_id: "thread_001",
        event_type: "message.user",
        sequence: userSequence,
        occurred_at: timestamps.replied,
        payload: {
          summary: "user input accepted",
          content: body.content,
        },
      });

      if (followupCount > 1) {
        const assistantReply = "Here is the explanation.";
        setTimeout(() => {
          void (async () => {
            const deltaSequence = nextSequence();
            await emitMockEventSourceMessage(page, {
              event_id: `evt_stream_delta_${deltaSequence}`,
              thread_id: "thread_001",
              event_type: "message.assistant.delta",
              sequence: deltaSequence,
              occurred_at: timestamps.assistantDelta,
              payload: {
                message_id: "msg_assistant_001",
                delta: "Here is the",
              },
            });

            threadStatus = "idle";
            latestTurnStatus = "completed";
            const completedSequence = nextSequence();
            messageCount += 1;
            timelineItems.push({
              timeline_item_id: `evt_${messageCount}`,
              thread_id: "thread_001",
              turn_id: null,
              item_id: null,
              sequence: completedSequence,
              occurred_at: timestamps.assistantCompleted,
              kind: "message.assistant.completed",
              payload: {
                summary: "assistant completed",
                content: assistantReply,
              },
            });

            await emitMockEventSourceMessage(page, {
              event_id: `evt_stream_completed_${completedSequence}`,
              thread_id: "thread_001",
              event_type: "message.assistant.completed",
              sequence: completedSequence,
              occurred_at: timestamps.assistantCompleted,
              payload: {
                message_id: "msg_assistant_001",
                content: assistantReply,
              },
            });
          })();
        }, 25);
      }

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
      const sequence = nextSequence();
      timelineItems.push({
        timeline_item_id: `evt_${messageCount}`,
        thread_id: "thread_001",
        turn_id: null,
        item_id: null,
        sequence,
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

export async function mockApprovalFlow(
  page: Page,
  options: {
    longTimeline?: boolean;
  } = {},
) {
  const requestedAt = "2026-04-05T02:40:00Z";
  const resolvedAt = "2026-04-05T02:41:00Z";
  let resolution: "pending" | "approved" | "denied" = "pending";
  const longTimeline = options.longTimeline ?? false;

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
      thread_status: resolution === "pending" ? "running" : "idle",
      active_flags: resolution === "pending" ? ["waiting_on_request"] : [],
      latest_turn_status: resolution === "pending" ? "running" : "completed",
    },
    updated_at: resolution === "pending" ? requestedAt : resolvedAt,
  });

  const pendingTimelineItems = longTimeline
    ? Array.from({ length: 18 }, (_, index) => ({
        timeline_item_id: `evt_long_${index + 2}`,
        thread_id: "thread_001",
        turn_id: null,
        item_id: null,
        sequence: index + 2,
        occurred_at: requestedAt,
        kind:
          index % 3 === 0
            ? "message.user"
            : index % 3 === 1
              ? "message.assistant.completed"
              : "session.status_changed",
        payload:
          index % 3 === 0
            ? {
                summary: `User follow-up ${index + 1}`,
                content: `Long timeline filler item ${index + 1} keeps the pending approval thread tall enough to require in-panel scrolling on mobile.`,
              }
            : index % 3 === 1
              ? {
                  summary: `Assistant output ${index + 1}`,
                  content: `Expanded assistant context ${index + 1} for the pending approval state. This entry is intentionally verbose to force scroll-region overflow.`,
                }
              : {
                  summary: `Status update ${index + 1}`,
                },
      }))
    : [];

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
        ...pendingTimelineItems,
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
                  summary: `Latest request: ${resolution}`,
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

    if (pathname === "/api/v1/workspaces" && request.method() === "GET") {
      return json(route, {
        items: [
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
