# Codex WebUI public API specification v0.9

## 1. Purpose

This document defines the public API contract exposed to browsers and mobile clients for Codex WebUI v0.9.

Its goals are:

- define a browser-facing contract that stays aligned with the v0.9 native-first direction
- make `thread`, `turn`, `item`, and request flow the primary public domain language
- define `thread_view`, `timeline`, `current_activity`, `badge`, `blocked_cue`, `resume_cue`, and `composer` as helper aggregates or display models rather than canonical resources
- define the first accepted user input as the public canonical start of a new thread
- fix the public contracts for ordering, reconnect, idempotency, and partial-failure convergence
- keep the internal/public boundary explicit so browsers do not need to know about internal helper flows

This specification is written for MVP. It intentionally fixes the public contract boundaries that are expensive to change later while leaving implementation details and final UI rendering details out of scope.

---

## 2. Document priority and scope

### 2.1 Priority order

When documents disagree, use this order:

1. `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
2. `docs/specs/codex_webui_common_spec_v0_9.md`
3. this specification
4. `docs/specs/codex_webui_internal_api_v0_9.md` for implementation mapping constraints only
5. `docs/specs/codex_webui_public_api_v0_8.md` as reference only

The v0.8 public API document is not authoritative for v0.9 semantics.

### 2.2 Scope

This specification applies to:

- browser-facing REST APIs under `/api/v1`
- browser-facing SSE contracts
- public read models, helper aggregates, and display-oriented projections
- public action request and response shapes
- public ordering, reconnect, idempotency, and degrade behavior
- internal-to-public mapping expectations at the `frontend-bff` boundary

### 2.3 Out of scope

This specification does not define:

- the internal API contract itself
- a mirror of the full App Server native protocol
- database implementation details
- exact SSE transport `event:` names
- keepalive intervals or payload details
- final UI component layout or rendering rules
- multi-user authentication or authorization
- exhaustive enum lists for all timeline payload kinds

---

## 3. Design principles

### 3.1 Native-first

The public API must treat the native conversation model as:

- `thread`
- `thread.status`
- `turn`
- `turn.status`
- `item`
- request flow

The public API may add helper shapes for browser usability, but it must not reintroduce a WebUI-only canonical conversation state machine.

### 3.2 Thin facade

The public layer is limited to:

- browser transport
- workspace operations
- public helper aggregates and read models
- ordering, reconnect, and idempotency helpers
- public-friendly error and degrade behavior

It must not own:

- a canonical approval resource
- a WebUI-only turn lifecycle
- a duplicated full-history source of truth
- a browser-specific conversation engine

### 3.3 Public canonical conversation unit

The public canonical conversation unit is `thread`.

`thread_view` is a convenience aggregate for browser initialization and refresh. It is not a canonical domain resource.

### 3.4 First-input canonical start

The public canonical action that starts a new thread is the first accepted user input in a workspace context.

Public APIs must not make empty `create` or `start` actions the primary conversation start concept for MVP.

### 3.5 Request flow remains request flow

Approval is not restored as a standalone canonical public resource.

The public layer may expose request helpers for reading and responding safely, but those helpers remain access paths into thread-scoped request flow rather than an independent request domain.

### 3.6 Thread-scoped convergence

Public display convergence must use:

- REST for initial state
- thread-scoped SSE for live deltas
- REST reacquisition after reconnect or inconsistency

Public clients must not treat SSE alone as the authoritative recovery mechanism.

### 3.7 Display model separation

The following are display-oriented helper concepts, not canonical state:

- `timeline`
- `current_activity`
- `badge`
- `blocked_cue`
- `resume_cue`
- `composer`

The public API may expose them, but their lifecycle is derived from native facts and internal helper materials rather than independently authored state.

### 3.8 Internal helper absorption

Public consumers must not need to know about internal helper actions such as `open`.

If `frontend-bff` must call internal helper endpoints to satisfy a public read, that helper flow is absorbed within the same server-side request chain.

### 3.9 Contract-matrix dependency

This specification depends on the same `App Server Contract Matrix v0.9` prerequisite defined by the requirements and common/internal specifications.

The public API must not silently assume native enum values, native request capabilities, or native lifecycle behaviors beyond what that matrix fixes.

---

## 4. Public concept taxonomy

| Concept | Type | Canonical | Purpose |
|---|---|---:|---|
| `workspace` | app-owned resource | yes | public operating unit under `/workspaces` |
| `thread` | native-backed facade | yes | public canonical conversation unit |
| `thread_view` | helper aggregate | no | thread initialization and refresh aggregate |
| `thread_list_item` | projection | no | lightweight list view projection |
| `timeline_item` | projection and display model | no | main body chronology item |
| `pending_request` | helper projection | no | current pending request summary embedded in thread context |
| `latest_resolved_request` | helper projection | no | just-resolved request summary retained in thread context during recovery |
| `request_detail` | helper facade | no | minimum confirmation data before response |
| `current_activity` | display model | no | pinned current progress summary |
| `badge` | display model | no | lightweight identification hint |
| `blocked_cue` | display model | no | indicates user intervention is likely needed |
| `resume_cue` | display model | no | indicates return priority and reason |
| `composer` | display model | no | input availability hints |
| `home_overview` | helper aggregate | no | app-shell and home initialization aggregate |
| `thread_stream_event` | transport projection | no | thread-scoped SSE delta event |
| `notification_event` | transport projection | no | non-authoritative refresh trigger for the global notifications stream |

### 4.1 `thread` and `thread_view`

- `thread` is the canonical public conversation resource
- `thread_view` is a helper aggregate composed from `thread` plus helper display materials
- `thread_view` is allowed to optimize initial render and refresh, but it must not redefine the canonical resource

### 4.2 `request` in the public layer

- request flow is part of thread activity rather than a separate canonical resource family
- public request endpoints are helper access points to read or answer a request safely
- approval remains the required MVP request kind, but the public API must not rebuild approval as an independent canonical resource

### 4.3 `timeline_item`

`timeline_item` is the public main-body chronology projection.

It is derived and rebuildable. It is not the source of truth for thread or turn lifecycle state.

### 4.4 `composer`

`composer` is a display-oriented availability hint block.

Its fields must help the browser decide what UI to render, but they are not the final acceptance authority for input operations.

---

## 5. Common representation rules

### 5.1 Base path and format

- the API base path is `/api/v1`
- normal responses use JSON
- SSE uses `text/event-stream`
- field names and query parameters use `snake_case`
- timestamps use UTC RFC 3339 strings ending in `Z`
- identifiers are opaque strings

### 5.2 Normal response envelope

Normal responses do not use a mandatory outer `data` envelope.

- single-resource reads return the resource object directly
- list reads return `items`, `next_cursor`, and `has_more`
- aggregate endpoints return named fields directly

### 5.3 Error envelope

Errors use the common envelope below:

```json
{
  "error": {
    "code": "thread_not_accepting_input",
    "message": "thread is not accepting user input",
    "details": {
      "thread_id": "thread_123"
    }
  }
}
```

### 5.4 Native enums in examples

Native status or active-flag values shown in examples are illustrative only.

The exact native enum values are fixed by `App Server Contract Matrix v0.9`, not by example snippets in this document.

---

## 6. Identity, ordering, and helper priority rules

### 6.1 Workspace identity

`workspace_id` is an app-owned opaque identifier.

### 6.2 Thread identity

`thread_id` must use the native thread identifier.

The public and internal layers should keep `thread_id` aligned.

### 6.3 Turn identity

`turn_id` may be exposed when available, but it is not required in every public shape.

### 6.4 Item identity

`item_id` should use the native item identifier when it exists.

`timeline_item_id` does not need to equal `item_id`.

### 6.5 Request identity

`request_id` should use the native request identifier when stable native identity exists.

If native request identity is unavailable, the runtime-assigned stable request identifier may be exposed publicly.

### 6.6 Event identity

`event_id` must uniquely identify a public SSE event for dedupe and diagnostics.

### 6.7 Canonical ordering basis

The public canonical ordering basis is `thread_id + sequence`.

Rules:

- `sequence` is monotonically increasing within a thread
- `timeline` and thread-scoped stream events share the same thread-scoped ordering semantics
- ordering helpers do not become a second source of truth for full history

### 6.8 Resume priority

`resume_candidates` and `resume_cue` must preserve the minimum resume priority defined by the requirements:

1. thread with `waitingOnApproval`
2. thread with `systemError`
3. thread whose latest turn is `failed`
4. currently active thread
5. last viewed thread
6. most recently updated thread

This rule defines relative priority bands, not a fixed numeric score contract.

---

## 7. Public read models

### 7.1 Workspace

```json
{
  "workspace_id": "ws_alpha",
  "workspace_name": "alpha",
  "created_at": "2026-04-07T08:00:00Z",
  "updated_at": "2026-04-07T08:35:00Z"
}
```

Rules:

- `workspace` is an app-owned canonical resource
- `updated_at` may be an aggregate update time that includes subordinate thread activity

### 7.2 Thread

```json
{
  "thread_id": "thread_123",
  "workspace_id": "ws_alpha",
  "native_status": {
    "thread_status": "idle",
    "active_flags": [],
    "latest_turn_status": "completed"
  },
  "updated_at": "2026-04-07T08:35:00Z"
}
```

Rules:

- `thread` is a native-backed facade
- `native_status` exposes a stable subset of native status information
- public APIs must not restore v0.8-style canonical WebUI statuses such as `waiting_input` or `waiting_approval`

### 7.3 ThreadListItem

```json
{
  "thread_id": "thread_123",
  "workspace_id": "ws_alpha",
  "native_status": {
    "thread_status": "active",
    "active_flags": ["waitingOnApproval"],
    "latest_turn_status": "inProgress"
  },
  "updated_at": "2026-04-07T08:35:00Z",
  "current_activity": {
    "kind": "waiting_on_approval",
    "label": "Approval required"
  },
  "badge": {
    "kind": "approval_required",
    "label": "Approval required"
  },
  "blocked_cue": {
    "kind": "approval_required",
    "label": "Needs your response"
  },
  "resume_cue": {
    "reason_kind": "waiting_on_approval",
    "priority_band": "highest",
    "label": "Resume here first"
  }
}
```

Rules:

- `thread_list_item` is a projection and display helper, not a canonical resource
- `badge`, `blocked_cue`, and `resume_cue` may be embedded
- `resume_cue.priority_band` is a hint band, not a fixed total-order score

### 7.4 ThreadView

```json
{
  "thread": {
    "thread_id": "thread_123",
    "workspace_id": "ws_alpha",
    "native_status": {
      "thread_status": "idle",
      "active_flags": [],
      "latest_turn_status": "completed"
    },
    "updated_at": "2026-04-07T08:35:00Z"
  },
  "current_activity": {
    "kind": "waiting_on_user_input",
    "label": "Waiting for your input"
  },
  "pending_request": null,
  "latest_resolved_request": null,
  "composer": {
    "accepting_user_input": true,
    "interrupt_available": false,
    "blocked_by_request": false
  },
  "timeline": {
    "items": [],
    "next_cursor": null,
    "has_more": false
  }
}
```

Rules:

- `thread_view` is a helper aggregate rather than a canonical resource
- `timeline` is a helper projection
- `current_activity` is a display model
- `pending_request` and `latest_resolved_request` are thread-context helpers rather than standalone resources
- `composer` is a display model
- `composer.accepting_user_input` is an availability hint, not the final server-side admission source
- final input acceptance is determined at request time from native facts and request/recovery state

### 7.5 TimelineItem

```json
{
  "timeline_item_id": "tl_001",
  "thread_id": "thread_123",
  "turn_id": "turn_456",
  "item_id": "item_777",
  "sequence": 42,
  "occurred_at": "2026-04-07T08:35:10Z",
  "kind": "assistant_message",
  "payload": {}
}
```

Rules:

- `timeline_item` is the public main-body projection for thread chronology
- `sequence` inherits the canonical thread-scoped ordering basis
- this specification does not fix an exhaustive `kind` enum list
- MVP must support at least user message, assistant message, request started, request resolved, status change, and error visibility
- request-related timeline items should carry `request_id` in `payload` while the referenced helper remains reachable, so thread-context navigation can reopen request detail safely

### 7.6 PendingRequest and LatestResolvedRequest

```json
{
  "request_id": "req_001",
  "thread_id": "thread_123",
  "turn_id": "turn_456",
  "item_id": "item_789",
  "request_kind": "approval",
  "status": "pending",
  "risk_category": "external_side_effect",
  "summary": "Run git push",
  "requested_at": "2026-04-07T08:32:00Z"
}
```

Rules:

- pending request information is embedded in thread context
- approval is not restored as a standalone canonical resource
- `latest_resolved_request` may reuse the same identity fields plus `decision` and `responded_at` while the immediate recovery window remains open
- thread-context request helpers must let the browser navigate to `request_detail` for both pending and just-resolved requests during the retention window

### 7.7 RequestDetail

```json
{
  "request_id": "req_001",
  "thread_id": "thread_123",
  "turn_id": "turn_456",
  "item_id": "item_789",
  "request_kind": "approval",
  "status": "pending",
  "risk_category": "external_side_effect",
  "summary": "Run git push",
  "reason": "Remote repository will be updated.",
  "operation_summary": "git push origin main",
  "requested_at": "2026-04-07T08:32:00Z",
  "responded_at": null,
  "decision": null,
  "decision_options": {
    "policy_scope_supported": false,
    "default_policy_scope": "once"
  },
  "context": {
    "command": "git push origin main"
  }
}
```

Rules:

- `request_detail` is a helper facade rather than a canonical resource
- the public contract must preserve the minimum confirmation information needed before response
- `request_detail` must remain readable while the request is pending
- `request_detail` should remain readable for at least the post-resolution recovery window while the thread context still supports safe reacquisition
- `404 request_not_found` should be reserved for request identifiers that are no longer reachable, retained, or valid

### 7.8 HomeOverview

```json
{
  "workspaces": [],
  "resume_candidates": [],
  "updated_at": "2026-04-07T08:35:00Z"
}
```

Rules:

- `home_overview` is an app-shell helper aggregate
- it is not a canonical domain resource
- `resume_candidates` is a resume-oriented helper path, not a replacement for thread lists
- `resume_candidates` must reflect the minimum resume priority defined in section 6.8

---

## 8. REST API contracts

### 8.1 Home and workspace endpoints

#### `GET /api/v1/home`

Returns the app-shell and home initialization aggregate.

Rules:

- this endpoint is a helper aggregate, not a canonical domain resource
- it may return `workspaces` and `resume_candidates` together
- the shape may be extended compatibly over time

#### `GET /api/v1/workspaces`

Returns the workspace list.

Query parameters:

- `limit`
- `cursor`
- `sort`, default `-updated_at`

#### `POST /api/v1/workspaces`

Creates a workspace.

Request:

```json
{
  "workspace_name": "alpha"
}
```

Response `201 Created`:

```json
{
  "workspace_id": "ws_alpha",
  "workspace_name": "alpha",
  "created_at": "2026-04-07T08:00:00Z",
  "updated_at": "2026-04-07T08:00:00Z"
}
```

#### `GET /api/v1/workspaces/{workspace_id}`

Returns workspace detail.

#### `GET /api/v1/workspaces/{workspace_id}/threads`

Returns the thread list for the workspace.

Returned items use `thread_list_item`.

Query parameters:

- `limit`
- `cursor`
- `sort`, default `-updated_at`

Allowed `sort` values:

- `updated_at`
- `-updated_at`

Paging and sort rules:

- `sort=updated_at` uses stable ordering `updated_at asc, thread_id asc`
- `sort=-updated_at` uses stable ordering `updated_at desc, thread_id desc`
- cursor paging must respect the chosen stable ordering

### 8.2 Thread endpoints

#### `POST /api/v1/workspaces/{workspace_id}/inputs`

Accepts the first user input in a workspace context and canonically starts a new thread.

Request:

```json
{
  "client_request_id": "input_001",
  "content": "Please investigate the build failure."
}
```

Response `202 Accepted`:

```json
{
  "accepted": {
    "thread_id": "thread_123",
    "turn_id": "turn_456",
    "input_item_id": "item_001"
  },
  "thread": {
    "thread_id": "thread_123",
    "workspace_id": "ws_alpha",
    "native_status": {
      "thread_status": "active",
      "active_flags": [],
      "latest_turn_status": "inProgress"
    },
    "updated_at": "2026-04-07T08:34:00Z"
  }
}
```

Idempotency rules:

- the same `client_request_id` with the same request body may return the prior accepted result
- the same `client_request_id` with a different body must return `409 idempotency_conflict`

#### `GET /api/v1/threads/{thread_id}`

Returns a thread facade snapshot.

#### `GET /api/v1/threads/{thread_id}/view`

Returns the helper aggregate used for thread initialization and refresh.

Rules:

- this endpoint returns a helper aggregate, not a canonical resource
- if the target thread is `notLoaded`, `frontend-bff` may internally absorb the internal `open` helper
- when that internal helper succeeds, the public endpoint returns the normal `thread_view`
- if open or load cannot be completed, the public endpoint may return `503 thread_temporarily_unavailable`
- the public contract must not expose internal `thread_open_required`

#### `GET /api/v1/threads/{thread_id}/timeline`

Returns the public main-body timeline projection.

Query parameters:

- `limit`
- `cursor`
- `sort`

Allowed `sort` values:

- `sequence`
- `-sequence`

Rules:

- ordering follows the canonical thread ordering basis
- this endpoint shares ordering semantics with `thread_view.timeline`

#### `POST /api/v1/threads/{thread_id}/inputs`

Accepts user input for an existing thread.

Request:

```json
{
  "client_request_id": "input_002",
  "content": "Show me the root cause."
}
```

Response `202 Accepted`:

```json
{
  "accepted": {
    "thread_id": "thread_123",
    "turn_id": "turn_457",
    "input_item_id": "item_002"
  },
  "thread": {
    "thread_id": "thread_123",
    "workspace_id": "ws_alpha",
    "native_status": {
      "thread_status": "active",
      "active_flags": [],
      "latest_turn_status": "inProgress"
    },
    "updated_at": "2026-04-07T08:40:00Z"
  }
}
```

Acceptance rules:

- the thread must be accepting user input according to request-time native facts
- no pending request response flow may currently block input acceptance
- no recovery-pending condition may currently block acceptance
- `composer.accepting_user_input` does not override request-time admission failure

Idempotency rules:

- the same `client_request_id` with the same body may return the prior accepted result
- the same `client_request_id` with a different body must return `409 idempotency_conflict`

#### `POST /api/v1/threads/{thread_id}/interrupt`

Interrupts the latest active turn.

Request:

```json
{}
```

Response:

```json
{
  "thread_id": "thread_123",
  "native_status": {
    "thread_status": "active",
    "active_flags": [],
    "latest_turn_status": "interrupted"
  },
  "updated_at": "2026-04-07T08:38:00Z"
}
```

Rules:

- interrupt is not a thread terminal action
- the thread remains a usable conversation container after interruption when native behavior allows it

### 8.3 Request endpoints

#### `GET /api/v1/threads/{thread_id}/pending_request`

Returns the thread-context request-helper state for the current pending request and, when retained, the latest just-resolved request.

This endpoint always returns `200 OK`.

No pending request:

```json
{
  "thread_id": "thread_123",
  "pending_request": null,
  "latest_resolved_request": null,
  "checked_at": "2026-04-07T08:37:00Z"
}
```

Pending request exists:

```json
{
  "thread_id": "thread_123",
  "pending_request": {
    "request_id": "req_001",
    "request_kind": "approval",
    "status": "pending",
    "risk_category": "external_side_effect",
    "summary": "Run git push",
    "requested_at": "2026-04-07T08:32:00Z"
  },
  "latest_resolved_request": null,
  "checked_at": "2026-04-07T08:37:00Z"
}
```

Just-resolved request retained in thread context:

```json
{
  "thread_id": "thread_123",
  "pending_request": null,
  "latest_resolved_request": {
    "request_id": "req_001",
    "thread_id": "thread_123",
    "turn_id": "turn_456",
    "item_id": "item_789",
    "request_kind": "approval",
    "status": "resolved",
    "decision": "approved",
    "requested_at": "2026-04-07T08:32:00Z",
    "responded_at": "2026-04-07T08:33:00Z"
  },
  "checked_at": "2026-04-07T08:37:00Z"
}
```

Rules:

- absence must be represented unambiguously as `pending_request: null`
- request absence within thread context must not use `404`
- `latest_resolved_request` is optional and may be present only during the immediate recovery window
- a thread-context helper path for just-resolved requests is required while the recovery window remains open
- when `pending_request` is non-null, `latest_resolved_request` must be `null`
- when `latest_resolved_request` is non-null, `pending_request` must be `null`

#### `GET /api/v1/requests/{request_id}`

Returns request detail.

Rules:

- this endpoint is a helper facade for safe request reading
- it does not define a standalone canonical request resource
- it should remain readable for the pending period and the immediate resolved recovery window while the request is still retained and reachable
- once retention or reachability no longer applies, it may return `404 request_not_found`

#### `POST /api/v1/requests/{request_id}/response`

Submits a request response.

Request:

```json
{
  "client_response_id": "resp_001",
  "decision": "approved"
}
```

or:

```json
{
  "client_response_id": "resp_002",
  "decision": "denied"
}
```

Response:

```json
{
  "request": {
    "request_id": "req_001",
    "status": "resolved",
    "decision": "approved",
    "responded_at": "2026-04-07T08:33:00Z"
  },
  "thread": {
    "thread_id": "thread_123",
    "native_status": {
      "thread_status": "active",
      "active_flags": [],
      "latest_turn_status": "inProgress"
    },
    "updated_at": "2026-04-07T08:33:00Z"
  }
}
```

Rules:

- `request_kind=approval` is the required MVP-supported request kind
- request cancellation is not defined as an independent response action in this public contract
- request disappearance or request invalidation is inferred from native facts and retained helper state rather than a separate public request lifecycle
- if `decision_options` is omitted, the server must treat the response as `"policy_scope": "once"`
- if `decision_options.policy_scope` is provided in MVP, only `"once"` is valid
- the same `client_response_id` with the same body may return the existing result or latest compatible resolved state
- the same `client_response_id` with a different body must return `409 idempotency_conflict`

---

## 9. SSE contracts

### 9.1 Core rules

- initial render is REST-driven
- live updates are delivered through SSE
- reconnect convergence is achieved by REST reacquisition
- full replay is not a required contract
- `Last-Event-ID` is optional rather than mandatory

### 9.2 Thread-scoped stream

#### `GET /api/v1/threads/{thread_id}/stream`

Returns the thread-scoped SSE stream.

Logical event envelope:

```json
{
  "event_id": "evt_001",
  "thread_id": "thread_123",
  "sequence": 42,
  "event_type": "item.delta",
  "occurred_at": "2026-04-07T08:31:00Z",
  "payload": {
    "turn_id": "turn_456",
    "item_id": "item_777",
    "delta": "Updated the config"
  }
}
```

Rules:

- `thread_id + sequence` is the canonical public dedupe and ordering basis
- if the client detects a gap, incompatible duplicate, or ambiguous state, it must reacquire via REST
- public SSE event names are facade event names for browsers and do not guarantee a one-to-one mapping with native App Server event names

### 9.3 Global notifications stream

#### `GET /api/v1/notifications/stream`

This lightweight helper stream is the required MVP path for:

- badge refresh triggers
- resume-cue refresh triggers
- lightweight notification that a background thread became high priority
- refresh triggers for related REST resources

Rules:

- it is not authoritative
- it is not a strict ordering source
- missing events must be recoverable through REST reacquisition
- it must not replace thread-scoped ordering semantics
- it exists to support the MVP requirement that background high-priority thread promotion remains noticeable without subscribing to every thread stream continuously

---

## 10. Public recovery and convergence rules

### 10.1 Canonical ordering basis

Public clients must use `thread_id + sequence` as the thread-scoped ordering basis for stream and timeline convergence.

### 10.2 Timeline and stream relationship

- `timeline` is the public main-body chronology resource
- thread stream events carry the same thread-scoped ordering semantics
- the browser should use `sequence` as the strict ordering and dedupe key

### 10.3 Public versus internal responsibility

- the internal layer owns the domain-faithful ordering basis
- the public layer exposes browser-friendly projections that preserve those ordering semantics
- the public API must not expose internal `feed_entry` as a first-class browser resource

### 10.4 Recovery triggers

The client should reacquire `thread_view` or `timeline` when it detects:

- a sequence gap
- a duplicate sequence with incompatible payload
- a mismatch between pending-request transitions and the visible thread state
- a timeline convergence inconsistency
- reconnect followed by ambiguous state

### 10.5 Partial-failure degrade rule

If internal helper refresh, projection refresh, or open/load convergence cannot complete safely, the public layer may degrade to a temporary unavailability response rather than surfacing internal helper errors directly.

The browser-facing contract must prefer explicit REST retryable unavailability over leaking internal helper concerns.

---

## 11. Idempotency rules

### 11.1 First-input start

`POST /api/v1/workspaces/{workspace_id}/inputs` uses `client_request_id` for idempotency.

### 11.2 Existing-thread input

`POST /api/v1/threads/{thread_id}/inputs` uses `client_request_id` for idempotency.

### 11.3 Request response

`POST /api/v1/requests/{request_id}/response` uses `client_response_id` for idempotency.

### 11.4 Conflict rule

If the same idempotency key is reused with a different request body, the server must return `409 idempotency_conflict`.

---

## 12. Error contracts

### 12.1 Core HTTP status set

The public layer may use:

- `400 Bad Request`
- `404 Not Found`
- `409 Conflict`
- `422 Unprocessable Entity`
- `500 Internal Server Error`
- `503 Service Unavailable`

### 12.2 Primary public `error.code` values

#### Workspace

- `workspace_not_found`
- `workspace_root_not_found`
- `workspace_name_invalid`
- `workspace_name_reserved`
- `workspace_name_conflict`
- `workspace_name_normalized_conflict`

#### Thread

- `thread_not_found`
- `thread_not_accepting_input`
- `thread_not_interruptible`
- `thread_recovery_pending`
- `thread_runtime_error`
- `thread_temporarily_unavailable`

#### Input and idempotency

- `input_content_invalid`
- `idempotency_conflict`

#### Request

- `request_not_found`
- `request_not_pending`
- `request_decision_invalid`

### 12.3 Internal-to-public error mapping

Rules:

- internal `thread_open_required` must not be exposed publicly
- `frontend-bff` may absorb internal `open` helper retries inside the same public request chain
- internal `thread_open_failed` may be mapped to `503 thread_temporarily_unavailable`
- v0.8-style canonical `session_*` and `approval_*` error families must not be restored as v0.9 primary public error names
- `request_not_pending` means the request exists or recently existed but no longer accepts a decision
- `request_not_found` means the public request reference is no longer reachable or valid

---

## 13. Responsibility split between internal and public layers

### 13.1 What runtime and internal APIs must provide

- domain-faithful shapes for thread, turn, item, request, and ordering materials
- stable ordering, idempotency, and recovery semantics
- helper materials that let `frontend-bff` render safe public responses
- request helper retention behavior that distinguishes absence from missing-resource cases

### 13.2 What `frontend-bff` must provide

- public resource naming
- public aggregate endpoint composition
- timeline payload shaping
- final derivation of `current_activity`, `badge`, `blocked_cue`, `resume_cue`, and `composer`
- absorption of internal helper actions when public reads need them
- mapping internal errors to public errors
- masking of internal-only fields

### 13.3 Representative mapping table

| Internal | Public | Notes |
|---|---|---|
| `workspace` | `workspace` | canonical pass-through with public shape |
| `thread_summary` | `thread_list_item` | public display fields are added or derived |
| `thread_status_snapshot.native_status` | `thread.native_status` | stable pass-through subset |
| `thread_status_snapshot.derived_hints` | `composer`, `blocked_cue`, availability hints | not exposed verbatim |
| `thread_view_helper` | `thread_view` | helper aggregate |
| `timeline_item` | `timeline_item` | public main-body projection |
| `feed_entry` | thread stream event | ordering semantics preserved without exposing feed as a public resource |
| `pending_request_summary` | embedded `pending_request` | thread-context helper shape |
| `request_detail_view` | `request_detail` | helper facade |

---

## 14. Main differences from v0.8

- `thread` replaces `session` as the canonical public conversation unit
- empty `create` and `start` are removed from the primary public conversation model
- approval is no longer a canonical standalone public resource
- the main body of thread view is `timeline`, not separate `messages` and `events` primary surfaces
- a dedicated global approval list and stream are not treated as the canonical MVP flow
- the public layer derives from native status rather than restoring a WebUI-only canonical status machine
- first input is the canonical public start of a new thread

---

## 15. Non-goals

This specification does not aim to:

- expose a mirror of the full App Server native protocol
- reintroduce approval as a canonical standalone resource
- define a WebUI-only conversation lifecycle
- create a second source of truth for thread history
- make Home, Chat, and Approval screens the canonical API worldview
- impose an app-specific active-thread limit when the native system allows otherwise
- fix exhaustive timeline item payload enums
- fix exact SSE transport `event:` names

---

## 16. Follow-on constraints

Any implementation that claims conformance to this specification must preserve:

- the rule that public thread-view reads may absorb internal `open` helper behavior without exposing `thread_open_required`
- the rule that pending request absence is represented as `200 OK` with `pending_request: null`
- the rule that `request_detail` remains readable through the pending period and immediate recovery window before eventual `request_not_found`
- the rule that `resume_candidates` preserves the requirements-level resume priority
- the rule that `composer.accepting_user_input` is non-authoritative
- the rule that `timeline_item` and other helper aggregates remain derived display-oriented public shapes rather than canonical lifecycle state
