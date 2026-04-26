import type {
  ListResponse,
  RuntimeApprovalProjection,
  RuntimeApprovalResolveResult,
  RuntimeApprovalStreamEventProjection,
  RuntimeMessageProjection,
  RuntimeSessionEventProjection,
  RuntimeSessionSummary,
  RuntimeStopResult,
} from "../runtime-types";

function deriveCanStart(session: RuntimeSessionSummary, activeSessionId: string | null) {
  if (session.status !== "created") {
    return false;
  }

  return activeSessionId === null || activeSessionId === session.session_id;
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
