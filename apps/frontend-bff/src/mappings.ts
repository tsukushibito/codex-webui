import type {
  ListResponse,
  RuntimeApprovalProjection,
  RuntimeApprovalResolveResult,
  RuntimeApprovalStreamEventProjection,
  RuntimeLatestResolvedRequestSummary,
  RuntimeMessageProjection,
  RuntimePendingRequestSummary,
  RuntimeRequestDetailView,
  RuntimeRequestResponseResult,
  RuntimeSessionEventProjection,
  RuntimeSessionSummary,
  RuntimeStopResult,
  RuntimeThreadInputAcceptedResponse,
  RuntimeThreadPendingRequestView,
  RuntimeThreadSummary,
  RuntimeThreadViewHelper,
  RuntimeTimelineItem,
  RuntimeWorkspaceSummary,
} from "./runtime-types";

function deriveCanStart(session: RuntimeSessionSummary, activeSessionId: string | null) {
  if (session.status !== "created") {
    return false;
  }

  return activeSessionId === null || activeSessionId === session.session_id;
}

export function mapWorkspace(workspace: RuntimeWorkspaceSummary) {
  return {
    workspace_id: workspace.workspace_id,
    workspace_name: workspace.workspace_name,
    created_at: workspace.created_at,
    updated_at: workspace.updated_at,
    active_session_summary: workspace.active_session_summary,
    pending_approval_count: workspace.pending_approval_count,
  };
}

export function mapWorkspaceList(response: ListResponse<RuntimeWorkspaceSummary>) {
  return {
    items: response.items.map(mapWorkspace),
    next_cursor: response.next_cursor,
    has_more: response.has_more,
  };
}

function hasActiveFlag(thread: RuntimeThreadSummary, flag: string) {
  return thread.native_status.active_flags.includes(flag);
}

function deriveThreadCurrentActivity(thread: RuntimeThreadSummary) {
  if (thread.derived_hints.has_pending_request || hasActiveFlag(thread, "waitingOnApproval")) {
    return {
      kind: "waiting_on_approval",
      label: "Approval required",
    };
  }

  if (hasActiveFlag(thread, "systemError")) {
    return {
      kind: "system_error",
      label: "System error",
    };
  }

  if (thread.native_status.latest_turn_status === "failed") {
    return {
      kind: "latest_turn_failed",
      label: "Latest turn failed",
    };
  }

  if (thread.native_status.thread_status === "active") {
    return {
      kind: "running",
      label: "Running",
    };
  }

  if (thread.derived_hints.accepting_user_input) {
    return {
      kind: "waiting_on_user_input",
      label: "Waiting for your input",
    };
  }

  return {
    kind: "idle",
    label: "Idle",
  };
}

function deriveThreadBadge(thread: RuntimeThreadSummary) {
  if (thread.derived_hints.has_pending_request || hasActiveFlag(thread, "waitingOnApproval")) {
    return {
      kind: "approval_required",
      label: "Approval required",
    };
  }

  if (hasActiveFlag(thread, "systemError")) {
    return {
      kind: "system_error",
      label: "System error",
    };
  }

  if (thread.native_status.latest_turn_status === "failed") {
    return {
      kind: "latest_turn_failed",
      label: "Failed",
    };
  }

  return null;
}

function deriveThreadBlockedCue(thread: RuntimeThreadSummary) {
  if (thread.derived_hints.has_pending_request || hasActiveFlag(thread, "waitingOnApproval")) {
    return {
      kind: "approval_required",
      label: "Needs your response",
    };
  }

  if (hasActiveFlag(thread, "systemError")) {
    return {
      kind: "system_error",
      label: "Needs attention",
    };
  }

  if (thread.native_status.latest_turn_status === "failed") {
    return {
      kind: "latest_turn_failed",
      label: "Needs attention",
    };
  }

  return null;
}

function deriveThreadResumeCue(thread: RuntimeThreadSummary) {
  if (thread.derived_hints.has_pending_request || hasActiveFlag(thread, "waitingOnApproval")) {
    return {
      reason_kind: "waiting_on_approval",
      priority_band: "highest" as const,
      label: "Resume here first",
    };
  }

  if (hasActiveFlag(thread, "systemError")) {
    return {
      reason_kind: "system_error",
      priority_band: "high" as const,
      label: "Resume soon",
    };
  }

  if (thread.native_status.latest_turn_status === "failed") {
    return {
      reason_kind: "latest_turn_failed",
      priority_band: "high" as const,
      label: "Resume soon",
    };
  }

  if (thread.native_status.thread_status === "active") {
    return {
      reason_kind: "active_thread",
      priority_band: "medium" as const,
      label: "Active now",
    };
  }

  return null;
}

export function mapThread(thread: RuntimeThreadSummary) {
  return {
    thread_id: thread.thread_id,
    workspace_id: thread.workspace_id,
    native_status: thread.native_status,
    updated_at: thread.updated_at,
  };
}

export function mapThreadListItem(thread: RuntimeThreadSummary) {
  return {
    ...mapThread(thread),
    current_activity: deriveThreadCurrentActivity(thread),
    badge: deriveThreadBadge(thread),
    blocked_cue: deriveThreadBlockedCue(thread),
    resume_cue: deriveThreadResumeCue(thread),
  };
}

export function mapThreadList(response: ListResponse<RuntimeThreadSummary>) {
  return {
    items: response.items.map(mapThreadListItem),
    next_cursor: response.next_cursor,
    has_more: response.has_more,
  };
}

export function mapThreadInputAcceptedResponse(response: RuntimeThreadInputAcceptedResponse) {
  return {
    accepted: {
      thread_id: response.thread.thread_id,
      turn_id: null,
      input_item_id: response.accepted_input?.message_id ?? null,
    },
    thread: mapThread(response.thread),
  };
}

export function mapRequestResponseResult(response: RuntimeRequestResponseResult) {
  return {
    request: {
      request_id: response.request.request_id,
      status: response.request.status,
      decision: response.request.decision,
      responded_at: response.request.responded_at,
    },
    thread: mapThread(response.thread),
  };
}

function mapPendingRequestSummary(request: RuntimePendingRequestSummary) {
  return {
    request_id: request.request_id,
    thread_id: request.thread_id,
    turn_id: request.turn_id,
    item_id: request.item_id,
    request_kind: request.request_kind,
    status: request.status,
    risk_category: request.risk_classification,
    summary: request.summary,
    requested_at: request.requested_at,
  };
}

function mapLatestResolvedRequest(request: RuntimeLatestResolvedRequestSummary) {
  return {
    request_id: request.request_id,
    thread_id: request.thread_id,
    turn_id: request.turn_id,
    item_id: request.item_id,
    request_kind: request.request_kind,
    status: request.status,
    decision: request.decision,
    requested_at: request.requested_at,
    responded_at: request.responded_at,
  };
}

function mapTimelineItem(item: RuntimeTimelineItem) {
  return {
    timeline_item_id: item.timeline_item_id,
    thread_id: item.thread_id,
    turn_id: null,
    item_id: null,
    sequence: item.sequence,
    occurred_at: item.occurred_at,
    kind: item.item_kind,
    payload: {
      summary: item.summary,
      ...(item.request_id ? { request_id: item.request_id } : {}),
    },
  };
}

export function mapTimeline(response: ListResponse<RuntimeTimelineItem>) {
  return {
    items: response.items.map(mapTimelineItem),
    next_cursor: response.next_cursor,
    has_more: response.has_more,
  };
}

export function mapPendingRequestView(view: RuntimeThreadPendingRequestView) {
  return {
    thread_id: view.thread_id,
    pending_request: view.pending_request ? mapPendingRequestSummary(view.pending_request) : null,
    latest_resolved_request: view.latest_resolved_request
      ? mapLatestResolvedRequest(view.latest_resolved_request)
      : null,
    checked_at: view.checked_at,
  };
}

export function mapThreadView(
  view: RuntimeThreadViewHelper,
  timeline: ListResponse<RuntimeTimelineItem>,
) {
  return {
    thread: mapThread(view.thread),
    current_activity: deriveThreadCurrentActivity(view.thread),
    pending_request: view.pending_request ? mapPendingRequestSummary(view.pending_request) : null,
    latest_resolved_request: view.latest_resolved_request
      ? mapLatestResolvedRequest(view.latest_resolved_request)
      : null,
    composer: {
      accepting_user_input: view.thread.derived_hints.accepting_user_input,
      interrupt_available: view.thread.native_status.thread_status === "active",
      blocked_by_request: view.thread.derived_hints.has_pending_request,
    },
    timeline: mapTimeline(timeline),
  };
}

export function mapRequestDetail(detail: RuntimeRequestDetailView) {
  return {
    request_id: detail.request_id,
    thread_id: detail.thread_id,
    turn_id: detail.turn_id,
    item_id: detail.item_id,
    request_kind: detail.request_kind,
    status: detail.status,
    risk_category: detail.risk_classification,
    summary: detail.summary,
    reason: detail.reason,
    operation_summary: detail.operation_summary,
    requested_at: detail.requested_at,
    responded_at: detail.responded_at,
    decision: detail.decision,
    decision_options: {
      policy_scope_supported: false as const,
      default_policy_scope: "once" as const,
    },
    context: detail.context ?? null,
  };
}

export function mapSession(session: RuntimeSessionSummary, activeSessionId: string | null) {
  return {
    session_id: session.session_id,
    workspace_id: session.workspace_id,
    title: session.title,
    status: session.status,
    created_at: session.created_at,
    updated_at: session.updated_at,
    started_at: session.started_at,
    last_message_at: session.last_message_at,
    active_approval_id: session.active_approval_id,
    can_send_message: session.status === "waiting_input",
    can_start: deriveCanStart(session, activeSessionId),
    can_stop:
      session.status === "running" ||
      session.status === "waiting_input" ||
      session.status === "waiting_approval",
  };
}

export function mapSessionList(
  response: ListResponse<RuntimeSessionSummary>,
  activeSessionId: string | null,
) {
  return {
    items: response.items.map((item) => mapSession(item, activeSessionId)),
    next_cursor: response.next_cursor,
    has_more: response.has_more,
  };
}

export function mapMessage(message: RuntimeMessageProjection) {
  return {
    message_id: message.message_id,
    session_id: message.session_id,
    role: message.role,
    content: message.content,
    created_at: message.created_at,
  };
}

export function mapMessageList(response: ListResponse<RuntimeMessageProjection>) {
  return {
    items: response.items.map(mapMessage),
    next_cursor: response.next_cursor,
    has_more: response.has_more,
  };
}

export function mapEvent(event: RuntimeSessionEventProjection) {
  return {
    event_id: event.event_id,
    session_id: event.session_id,
    event_type: event.event_type,
    sequence: event.sequence,
    occurred_at: event.occurred_at,
    payload: event.payload,
  };
}

export function mapEventList(response: ListResponse<RuntimeSessionEventProjection>) {
  return {
    items: response.items.map(mapEvent),
    next_cursor: response.next_cursor,
    has_more: response.has_more,
  };
}

export function mapApprovalSummary(approval: RuntimeApprovalProjection) {
  return {
    approval_id: approval.approval_id,
    session_id: approval.session_id,
    workspace_id: approval.workspace_id,
    status: approval.status,
    resolution: approval.resolution,
    approval_category: approval.approval_category,
    title: approval.summary,
    description: approval.reason,
    requested_at: approval.created_at,
    resolved_at: approval.resolved_at,
  };
}

export function mapApprovalList(response: ListResponse<RuntimeApprovalProjection>) {
  return {
    items: response.items.map(mapApprovalSummary),
    next_cursor: response.next_cursor,
    has_more: response.has_more,
  };
}

export function mapApprovalDetail(approval: RuntimeApprovalProjection) {
  return {
    ...mapApprovalSummary(approval),
    operation_summary: approval.operation_summary,
    context: approval.context,
  };
}

export function mapApprovalStreamEvent(event: RuntimeApprovalStreamEventProjection) {
  const payload: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(event.payload)) {
    if (key === "summary" && typeof value === "string") {
      payload.title = value;
      continue;
    }

    payload[key] = value;
  }

  return {
    event_id: event.event_id,
    session_id: event.session_id,
    event_type: event.event_type,
    occurred_at: event.occurred_at,
    payload,
  };
}

export function mapStopResult(result: RuntimeStopResult, activeSessionId: string | null) {
  return {
    session: mapSession(result.session, activeSessionId),
    canceled_approval: result.canceled_approval
      ? mapApprovalSummary(result.canceled_approval)
      : null,
  };
}

export function mapApprovalResolveResult(
  result: RuntimeApprovalResolveResult,
  activeSessionId: string | null,
) {
  return {
    approval: mapApprovalSummary(result.approval),
    session: mapSession(result.session, activeSessionId),
  };
}
