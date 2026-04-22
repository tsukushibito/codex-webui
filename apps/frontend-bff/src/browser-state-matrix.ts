export type BrowserCriticalStateId =
  | "home_overview"
  | "workspace_thread_navigation"
  | "thread_list_item"
  | "thread_view"
  | "timeline"
  | "pending_request"
  | "request_detail"
  | "request_response"
  | "thread_stream"
  | "global_notifications";

export type BrowserStateProjectionKind = "canonical" | "display" | "helper" | "transport";

export type BrowserStateOrderingBasis =
  | "none"
  | "updated_at"
  | "requested_at"
  | "responded_at"
  | "thread_id+sequence"
  | "refresh_trigger_only";

export interface BrowserCriticalStateMatrixEntry {
  state_id: BrowserCriticalStateId;
  public_source: string;
  public_read_model_type: string;
  canonical: boolean;
  ordering_basis: BrowserStateOrderingBasis;
  projection_kind: BrowserStateProjectionKind;
  canonical_model: "thread" | null;
  notes: readonly string[];
  request_kind_values?: readonly string[];
}

export interface BrowserAdjacentCompatibilityBehavior {
  route_family: string;
  classification: "retired_non_browser_critical_compatibility";
  follow_up_issue: 168;
  reason: string;
}

export const browserCriticalStateMatrix = [
  {
    state_id: "home_overview",
    public_source: "GET /api/v1/home",
    public_read_model_type: "HomeResponse",
    canonical: false,
    ordering_basis: "updated_at",
    projection_kind: "display",
    canonical_model: "thread",
    notes: [
      "Overview state is assembled for browser resume choices from workspace summaries and thread list items.",
    ],
  },
  {
    state_id: "workspace_thread_navigation",
    public_source: "GET /api/v1/threads/{thread_id}",
    public_read_model_type: "PublicThread",
    canonical: true,
    ordering_basis: "updated_at",
    projection_kind: "canonical",
    canonical_model: "thread",
    notes: [
      "Workspace navigation resolves the selected thread snapshot as canonical thread state.",
    ],
  },
  {
    state_id: "thread_list_item",
    public_source: "GET /api/v1/workspaces/{workspace_id}/threads",
    public_read_model_type: "PublicThreadListItem",
    canonical: false,
    ordering_basis: "updated_at",
    projection_kind: "display",
    canonical_model: "thread",
    notes: [
      "current_activity, badge, blocked_cue, and resume_cue are non-canonical display cues derived from thread state.",
    ],
  },
  {
    state_id: "thread_view",
    public_source: "GET /api/v1/threads/{thread_id}/view",
    public_read_model_type: "PublicThreadView",
    canonical: false,
    ordering_basis: "thread_id+sequence",
    projection_kind: "helper",
    canonical_model: "thread",
    notes: [
      "thread_view is an aggregate helper; thread is canonical while current_activity, composer, request helpers, and timeline are projections.",
      "composer.accepting_user_input is a display hint only and is not final input authority.",
    ],
  },
  {
    state_id: "timeline",
    public_source: "GET /api/v1/threads/{thread_id}/timeline",
    public_read_model_type: "PublicTimeline",
    canonical: false,
    ordering_basis: "thread_id+sequence",
    projection_kind: "transport",
    canonical_model: "thread",
    notes: [
      "Timeline convergence with the stream is keyed by thread_id plus sequence.",
      "Timeline items are not a replacement for the canonical thread snapshot.",
    ],
  },
  {
    state_id: "pending_request",
    public_source: "GET /api/v1/threads/{thread_id}/pending-request",
    public_read_model_type: "PublicPendingRequestView",
    canonical: false,
    ordering_basis: "requested_at",
    projection_kind: "helper",
    canonical_model: "thread",
    request_kind_values: ["approval"],
    notes: ["Pending request state is a helper view anchored to a thread."],
  },
  {
    state_id: "request_detail",
    public_source: "GET /api/v1/requests/{request_id}",
    public_read_model_type: "PublicRequestDetail",
    canonical: false,
    ordering_basis: "requested_at",
    projection_kind: "helper",
    canonical_model: "thread",
    request_kind_values: ["approval"],
    notes: ["Request detail is a helper view for the thread-context response surface."],
  },
  {
    state_id: "request_response",
    public_source: "POST /api/v1/requests/{request_id}/response",
    public_read_model_type: "PublicRequestResponseResult",
    canonical: false,
    ordering_basis: "responded_at",
    projection_kind: "helper",
    canonical_model: "thread",
    request_kind_values: ["approval"],
    notes: ["Request responses return a helper summary plus the canonical thread snapshot."],
  },
  {
    state_id: "thread_stream",
    public_source: "GET /api/v1/threads/{thread_id}/stream",
    public_read_model_type: "PublicThreadStreamEvent",
    canonical: false,
    ordering_basis: "thread_id+sequence",
    projection_kind: "transport",
    canonical_model: "thread",
    notes: [
      "Thread stream events converge with timeline items by thread_id plus sequence.",
      "Stream events trigger refresh and incremental display; they do not supersede the canonical thread snapshot.",
    ],
  },
  {
    state_id: "global_notifications",
    public_source: "GET /api/v1/notifications/stream",
    public_read_model_type: "PublicNotificationEvent",
    canonical: false,
    ordering_basis: "refresh_trigger_only",
    projection_kind: "transport",
    canonical_model: null,
    notes: [
      "notification_event is a non-authoritative refresh trigger.",
      "notification_event is not a strict ordering source and carries no sequence semantics.",
    ],
  },
] as const satisfies readonly BrowserCriticalStateMatrixEntry[];

export const browserAdjacentCompatibilityBehaviors = [
  {
    route_family: "/api/v1/workspaces/{workspace_id}/sessions and /api/v1/sessions/{session_id}/*",
    classification: "retired_non_browser_critical_compatibility",
    follow_up_issue: 168,
    reason:
      "Legacy session route behavior is retired and quarantined outside the browser-critical v0.9 matrix.",
  },
  {
    route_family: "/api/v1/approvals*",
    classification: "retired_non_browser_critical_compatibility",
    follow_up_issue: 168,
    reason:
      "Standalone approval route behavior is retired and quarantined; request helpers are the browser-critical v0.9 surface.",
  },
] as const satisfies readonly BrowserAdjacentCompatibilityBehavior[];
