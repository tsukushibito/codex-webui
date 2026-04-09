# Codex WebUI internal API specification v0.9

## 1. Purpose

This document defines the internal API contract used between `frontend-bff` and `codex-runtime` for Codex WebUI v0.9.

Its goals are:

- align the internal contract with the v0.9 native-first and thin-facade direction
- clarify responsibility boundaries among `frontend-bff`, `codex-runtime`, and Codex App Server
- define internal contracts for workspace operations, browser-serving helpers, ordering, idempotency, request flow handling, and recovery
- define the minimum internal shapes that later public API mappings can build on
- prevent v0.8 session-centric assumptions from remaining as the canonical internal model

This specification is written for MVP. It intentionally fixes cross-cutting internal contracts that are expensive to change later, while leaving public API shaping and UI-specific presentation details to later documents.

---

## 2. Document priority and scope

### 2.1 Priority order

When documents disagree, use this order:

1. `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
2. `docs/specs/codex_webui_common_spec_v0_9.md`
3. this specification
4. `docs/specs/codex_webui_internal_api_v0_8.md` as reference only

The v0.8 internal API document is not authoritative for v0.9 semantics.

### 2.2 Scope

This specification applies to:

- internal REST APIs from `frontend-bff` to `codex-runtime`
- internal thread-scoped SSE contracts from `codex-runtime` to `frontend-bff`
- internal resource, facade, projection, and read-model boundaries
- ordering, idempotency, partial-failure, and recovery contracts needed by `frontend-bff`
- internal-to-public mapping responsibilities

### 2.3 Out of scope

This specification does not define:

- browser-facing public API contracts
- a mirror of the full App Server native protocol
- database implementation details
- exact SSE transport `event:` names
- keepalive intervals or payload details
- final public timeline item shapes
- concrete App Server enum values for a target version
- multi-user authorization concerns

---

## 3. System boundaries and responsibilities

### 3.1 `frontend-bff`

`frontend-bff` is responsible for:

- serving public REST and SSE interfaces to browsers
- calling internal APIs
- synthesizing screen-oriented aggregates
- mapping internal schema to public schema
- deriving final display helpers such as grouping, badge, blocked cues, resume cues, and composer availability
- converting internal errors into public-facing errors

`frontend-bff` must not become the source of truth for thread, turn, item, or request lifecycle state.

### 3.2 `codex-runtime`

`codex-runtime` is responsible for:

- workspace management
- workspace-thread mapping
- App Server adapter and process management
- reading and operating on App Server native facts
- maintaining the thread-scoped ordering basis required by the WebUI
- constructing minimal internal projections and read models
- maintaining app-owned idempotency and recovery metadata
- detecting and converging partial failures

`codex-runtime` must not become an app-owned full-history source of truth.

### 3.3 App Server

App Server remains the source of truth for:

- `thread`
- `thread.status`
- `turn`
- `turn.status`
- `item`
- server-initiated request flow
- native streaming events

Internal APIs may reshape those facts, but must not redefine them as WebUI-owned canonical lifecycle state.

---

## 4. Design principles

### 4.1 Native-first

The main internal domain language is:

- `thread`
- `thread.status`
- `turn`
- `turn.status`
- `item`
- request flow

The internal API may add helpers, but it must not replace those native concepts with a separate canonical session state machine.

### 4.2 Thin facade

The internal layer is limited to:

- browser-serving helper contracts
- workspace operations
- minimal read models and helper aggregates
- ordering and convergence metadata
- idempotency contracts
- recovery support

It must not own:

- canonical approval state as a separate domain
- canonical turn lifecycle
- a duplicated full thread history
- a WebUI-only conversation engine

### 4.3 App-owned minimal retention

Allowed app-owned retained state includes:

- workspace registry
- workspace-thread mapping
- thread summary cache
- request badge metadata
- idempotency records
- thread-scoped sequence counters
- canonical feed entries and sequence metadata
- timeline helper cache
- reconnect and recovery markers
- request or event ID mappings when native stable IDs are insufficient

### 4.4 Display separation

Timeline grouping, current activity, badge hints, blocked cues, resume cues, and composer hints are helper layers.

The internal API may expose the materials needed to derive them, but those helpers must not be treated as canonical lifecycle state.

### 4.5 Public UX versus internal helper actions

The public canonical start remains the first accepted user input.

Internally, helper action slots may exist for future native parity:

- `create`
- `open`
- `resume`
- `fork`
- `archive`

For MVP, only `open` is required as an actual helper contract. The others remain reserved slots.

### 4.6 Non-inheritance from v0.8

The v0.9 internal canonical model does not adopt these v0.8 assumptions:

- `session` as the canonical conversation unit
- `session create/start/stop` as the primary internal state machine
- approval as a canonical standalone resource
- one active conversation per workspace as a core constraint
- `messages` and `events` as the only canonical internal display resources

The internal API may still provide compatibility-oriented helpers where useful, but those helpers must not become the primary model.

---

## 5. App Server dependency prerequisite

### 5.1 Required prerequisite

`App Server Contract Matrix v0.9` is a hard prerequisite before implementation begins.

Neither runtime implementation nor internal/public API implementation may silently add App Server dependencies beyond what that matrix fixes.

### 5.2 What the matrix must fix

At minimum, the matrix must fix:

- the target App Server version
- native thread status contracts
- native active-flag contracts
- native turn status contracts
- stable thread, turn, item, request, and event identity availability
- native ordering signal availability
- `notLoaded` thread open or resume availability
- request-detail availability for thread, turn, and item references
- native interrupt capability
- native stream event to internal event mapping assumptions
- native fork and archive availability

### 5.3 Missing-native behavior

If the target App Server version lacks a stable native request or event identifier, runtime may assign an internal stable identifier.

If a native lifecycle capability is missing, the internal API may degrade, but it must not compensate by inventing a new canonical conversation state machine.

---

## 6. Internal resource taxonomy

| Concept | Type | Source of truth | Purpose |
|---|---|---|---|
| `workspace` | app-owned resource | runtime | operational unit under `/workspaces` |
| `thread_ref` | native-backed facade | App Server | canonical conversation reference |
| `thread_status_snapshot` | native-backed facade | App Server | current native status plus derived helper hints |
| `turn_ref` | native-backed facade | App Server | turn identity and latest status reference |
| `item_ref` | native-backed facade or projection | App Server | item identity and kind reference |
| `request_ref` | native-backed facade | App Server | pending or resolved request-flow reference |
| `thread_summary` | read model | runtime reconstruction | list, badge, and resume helper summary |
| `thread_view_helper` | helper aggregate | runtime reconstruction | initial-view aggregate for `frontend-bff` |
| `feed_entry` | canonical internal projection | native facts plus runtime ordering | thread-scoped canonical ordering unit |
| `timeline_item` | helper projection | `feed_entry`-derived | display-oriented thread body projection |
| `pending_request_summary` | read model | native request flow derived | current pending request helper |
| `request_detail_view` | facade plus read model | native request flow derived | pre-response detail helper |
| `thread_stream_event` | transport projection | `feed_entry`-derived | thread-scoped SSE event |
| `notification_event` | optional transport projection | runtime aggregate | badge or resume trigger only |

### 6.1 Source-of-truth rule

The only sources of truth are:

- app-owned workspace metadata
- App Server native `thread`, `turn`, `item`, and request flow facts

Everything else in this specification is a facade, projection, helper aggregate, or recovery aid.

### 6.2 Helper boundary rule

`thread_view_helper`, `timeline_item`, `pending_request_summary`, and `request_detail_view` may exist as internal helpers, but they must remain replaceable and rebuildable from native facts plus minimal app-owned metadata.

---

## 7. Shared schema and representation rules

The internal API follows the common v0.9 rules for:

- `/api/v1` as the default versioned base
- JSON payloads
- `snake_case` for facade-defined fields, enums, and query parameters
- UTC RFC 3339 timestamps ending in `Z`
- opaque IDs
- no mandatory outer `data` envelope
- `items`, `next_cursor`, and `has_more` for list contracts

Native pass-through fields may preserve native naming for native values or native event names when needed for tracing.

---

## 8. Native enums, IDs, and ordering

### 8.1 Native enum handling

App Server-dependent enums must be separated into:

- pass-through native fields
- derived helper fields

Pass-through native fields preserve native semantics. Derived helper fields exist only as convenience hints and are not canonical state.

### 8.2 Thread status snapshot

An internal thread status snapshot may include:

```json
{
  "thread_id": "thread_123",
  "workspace_id": "ws_alpha",
  "native_status": {
    "thread_status": "active",
    "active_flags": ["waitingOnUserInput"],
    "latest_turn_status": "completed"
  },
  "derived_hints": {
    "accepting_user_input": true,
    "has_pending_request": false,
    "blocked_reason": null
  },
  "updated_at": "2026-04-07T08:30:00Z"
}
```

Rules:

- `native_status` value sets come from `App Server Contract Matrix v0.9`
- `derived_hints` are helper values only
- `derived_hints` must not be treated as the final acceptance authority for write operations

### 8.3 ID policy

- `workspace_id` is runtime-owned and opaque
- `thread_id` should reuse the native thread ID
- `turn_id` may be exposed when the native ID is stable enough
- `item_id` should prefer native item IDs
- `request_id` should prefer native request IDs, with runtime fallback when native stability is missing
- `event_id` may reuse a native ID or a runtime-stable identifier
- `feed_entry_id` identifies a canonical internal feed element

### 8.4 Sequence policy

`sequence` is the thread-scoped canonical ordering key.

Rules:

- runtime assigns `sequence`
- `sequence` applies to canonical `feed_entry` units rather than every raw native event
- `sequence` is monotonically increasing within one thread
- once materialized, a `sequence` value is stable

---

## 9. Ordering, feed, and timeline boundaries

### 9.1 Canonical ordering basis

The canonical internal ordering basis is `thread_id + sequence`.

This supports:

- deduplication
- gap detection
- REST and SSE convergence
- rebuildable timeline helpers

### 9.2 `feed_entry`

`feed_entry` is the canonical internal projection for thread-scoped ordering.

It may represent at least:

- thread events
- turn events
- item events
- request events
- error events

It is canonical only as an ordering and convergence basis. It is not a replacement source of truth for full App Server history.

### 9.3 `timeline_item`

`timeline_item` is a display helper projection derived from `feed_entry` and related native facts.

It is rebuildable cache. If it conflicts with native history or canonical feed semantics, native history and canonical ordering win.

### 9.4 Rebuildability rule

The following should be rebuildable from native facts plus minimal app-owned metadata:

- `thread_summary`
- `pending_request_summary`
- `request_detail_view`
- `feed_entry`
- `timeline_item`
- current-activity helper materials
- badge materials

### 9.5 Gap detection and reacquisition

`frontend-bff` must be able to dedupe thread-scoped events by `(thread_id, sequence)`.

If it detects:

- a sequence gap
- duplicate sequence with incompatible payload
- request-started and request-resolved mismatch
- item delta that does not converge to a completed item
- inconsistent `occurred_at` and `sequence` order

then REST reacquisition is the recovery authority.

### 9.6 Global notifications

A global notification stream may exist as a trigger for badge or resume refresh, but it must not become:

- the canonical ordering source
- the authoritative source of thread state

---

## 10. Thread and helper-action contracts

### 10.1 Canonical internal unit

The canonical conversation unit in the internal API is `thread`.

### 10.2 `notLoaded` thread

A `notLoaded` thread is persisted but not currently loaded into runtime memory or active runtime state.

### 10.3 `open` helper

`POST /api/v1/threads/{thread_id}/open` is an internal helper action used to make a `notLoaded` thread viewable.

It is not the canonical conversation start action and does not redefine resume semantics.

Example response:

```json
{
  "thread_id": "thread_123",
  "open_result": "opened",
  "native_status": {
    "thread_status": "idle",
    "active_flags": [],
    "latest_turn_status": "completed"
  },
  "updated_at": "2026-04-07T08:36:00Z"
}
```

Rules:

- re-sending `open` for an already loaded thread may succeed idempotently
- open or load progress must not become a WebUI-owned canonical state
- failure may use a dedicated internal error such as `thread_open_failed`

### 10.4 View helper relationship

`GET /api/v1/threads/{thread_id}/view` is a read helper and must not silently perform a mutation.

If a view requires a prior `open`, runtime may return `409 thread_open_required`, leaving `frontend-bff` to call `open` first.

This keeps public and internal contracts aligned without exposing internal helper concerns directly to browsers.

### 10.5 Reserved helper slots

The internal API may reserve helper slots for:

- `resume`
- `fork`
- `archive`

These remain reserved for MVP unless future contract-matrix work makes them concrete.

---

## 11. Input and interrupt contracts

### 11.1 First input starts a thread

`POST /api/v1/workspaces/{workspace_id}/inputs` is the canonical internal action for starting a thread from the first user input.

The success boundary requires:

1. the native thread is determined
2. the native turn is started
3. the input is accepted by App Server
4. the `client_request_id -> thread_id` mapping is persisted

Summary and projection updates may follow after that success boundary.

### 11.2 Existing-thread input

`POST /api/v1/threads/{thread_id}/inputs` accepts input only when:

- the native thread snapshot allows user input
- no pending request blocks input
- runtime is not in recovery-pending state for the thread

The final acceptance decision is based on request-time native facts and recovery state, not on a previously emitted helper hint alone.

### 11.3 Interrupt

`POST /api/v1/threads/{thread_id}/interrupt` targets the latest active turn.

Rules:

- interrupt is not a terminal thread operation
- on success, the latest turn should reflect `interrupted`
- the thread remains a durable conversation container
- subsequent input acceptance is derived from the latest native snapshot
- already interrupted or terminal latest turns may return the latest snapshot as idempotent success

---

## 12. Request-helper contracts

### 12.1 Positioning

Request flow is not a canonical standalone WebUI domain resource.

However, runtime may expose helper read models so `frontend-bff` can construct safe response UIs and recovery paths.

### 12.2 MVP support

MVP requires support for approval-kind request flow. Future request kinds may be added compatibly later.

### 12.3 Lifecycle

For MVP, request lifecycle status is:

- `pending`
- `resolved`

Approval-kind outcomes such as `approved` or `denied` belong in decision fields rather than as separate canonical resource states.

### 12.4 `pending_request_summary`

`pending_request_summary` is the current helper view of a thread's pending request.

It should include at least:

- `request_id`
- `thread_id`
- `turn_id`
- `item_id`
- `request_kind`
- `status`
- risk classification
- a short summary
- request time

### 12.5 `request_detail_view`

`request_detail_view` is the internal helper used to render pre-response detail.

It must include at least:

- risk level or classification
- operation summary
- reason for response
- request time
- thread reference
- turn or item reference
- current lifecycle status
- response decision when already resolved and still retained

### 12.6 Lifetime and reachability

At minimum:

- pending requests must be reachable from thread context
- just-resolved requests may remain reachable long enough for reconnect and re-response safety
- after helper retention expires, endpoint-specific not-found behavior may apply

### 12.7 Absence versus missing resource

Internal contracts must keep a clear distinction between:

- valid thread context with no current pending request helper
- missing request detail resource

`GET /api/v1/threads/{thread_id}/pending_request` must always return `200 OK`.

Example no-pending response:

```json
{
  "thread_id": "thread_123",
  "pending_request": null,
  "checked_at": "2026-04-07T08:37:00Z"
}
```

This must not be overloaded to mean that the request namespace or thread is missing.

### 12.8 Response action

`POST /api/v1/requests/{request_id}/response` submits request decisions.

MVP requires `"once"`-like one-shot policy handling only. Broader policy-scope options remain reserved.

`canceled` is not defined as a direct response action. Cancellation-like outcomes are interpreted from native request disappearance or thread lifecycle changes.

---

## 13. Recovery and partial-failure contracts

### 13.1 Assumption

Native operations may succeed while runtime-owned metadata or helper projections fail to update.

Internal contracts must therefore define:

- success boundaries
- detection rules
- retry or reacquisition behavior

### 13.2 Orphan detection

If native thread creation succeeds but runtime mapping persistence fails, runtime must be able to detect an orphan native thread during restart or reconciliation and either remap it or isolate the anomaly explicitly.

### 13.3 Request-response convergence

If a native request response succeeds but app-owned updates fail, runtime must reload native request flow and thread snapshots and converge:

- `pending_request_summary`
- `request_detail_view`
- thread helper materials

### 13.4 Projection reconstruction

Projection rebuild is expected for:

- thread summaries
- pending request summaries
- request detail views
- feed entries
- timeline items
- current-activity materials
- badge materials

### 13.5 Recovery-pending state

Runtime may keep recovery-pending markers as app-owned metadata, but those markers remain operational metadata, not a replacement conversation source of truth.

### 13.6 Full-history non-duplication

Runtime must not maintain a duplicated full App Server thread history as an app-owned canonical store.

---

## 14. Internal API inventory

### 14.1 Workspace endpoints

The internal API may include:

- `GET /api/v1/workspaces`
- `POST /api/v1/workspaces`
- `GET /api/v1/workspaces/{workspace_id}`
- `GET /api/v1/workspaces/{workspace_id}/threads`
- `POST /api/v1/workspaces/{workspace_id}/threads` as a reserved optional helper
- `POST /api/v1/workspaces/{workspace_id}/inputs` as the canonical first-input action

### 14.2 Thread endpoints

The internal API may include:

- `GET /api/v1/threads/{thread_id}`
- `POST /api/v1/threads/{thread_id}/open`
- `GET /api/v1/threads/{thread_id}/view`
- `POST /api/v1/threads/{thread_id}/inputs`
- `POST /api/v1/threads/{thread_id}/turns` as a reserved helper slot
- `POST /api/v1/threads/{thread_id}/interrupt`

### 14.3 Feed and timeline endpoints

The internal API may include:

- `GET /api/v1/threads/{thread_id}/feed`
- `GET /api/v1/threads/{thread_id}/timeline`
- `GET /api/v1/threads/{thread_id}/stream`

### 14.4 Request endpoints

The internal API may include:

- `GET /api/v1/threads/{thread_id}/pending_request`
- `GET /api/v1/requests/{request_id}`
- `POST /api/v1/requests/{request_id}/response`

Exact payload shapes belong to this specification and later implementation, but public-facing final shapes remain out of scope here.

---

## 15. Internal-to-public mapping responsibilities

### 15.1 Runtime responsibilities

Runtime is responsible for:

- returning domain-faithful internal shapes
- preserving ordering, idempotency, and recovery semantics
- maintaining traceability between native facts and internal projections

### 15.2 `frontend-bff` responsibilities

`frontend-bff` is responsible for:

- public naming
- public aggregate endpoints
- display grouping and collapse behavior
- final blocked, badge, resume, and composer derivation
- masking internal-only fields
- converting internal errors to public errors

### 15.3 What `frontend-bff` must not do

`frontend-bff` must not:

- invent lifecycle state that conflicts with native facts
- redefine thread-scoped ordering
- hide recovery requirements in a way that changes semantics
- redefine request flow as a canonical approval resource

---

## 16. Error and HTTP status contracts

### 16.1 Shared envelope

Internal errors use the common error envelope:

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

### 16.2 Main internal error domains

Likely internal error families include:

- workspace errors
- thread errors
- input and idempotency errors
- request errors
- recovery and runtime errors

### 16.3 Canonical examples

Canonical v0.9-style internal errors may include:

- `workspace_not_found`
- `workspace_name_invalid`
- `thread_not_found`
- `thread_not_accepting_input`
- `thread_open_required`
- `thread_open_failed`
- `thread_not_interruptible`
- `thread_recovery_pending`
- `thread_runtime_error`
- `idempotency_conflict`
- `request_not_found`
- `request_not_pending`
- `request_decision_invalid`

### 16.4 Retired v0.8-oriented canonical names

The internal API should not treat v0.8-style names such as `session_invalid_state`, `session_conflict_active_exists`, or `approval_not_pending` as the canonical v0.9 internal vocabulary.

Compatibility mapping may exist later in public-facing layers if needed.

---

## 17. What this specification leaves to later work

This document does not fix:

- final public resource names
- final public timeline shape
- final public current-activity, badge, or blocked-cue shapes
- final public aggregate endpoint structure
- public SSE transport names
- public default sort policy
- exact App Server enum values for the chosen target version
- long-term request-kind expansion shapes
- activation timing for reserved helper actions

---

## 18. Follow-on boundary for `#108`

The later public API spec must build on this document without changing its internal semantics.

In particular, `#108` must inherit:

- the hard dependency on `App Server Contract Matrix v0.9`
- the distinction between helper absence and missing request resource
- the rule that `feed_entry` is canonical only as an ordering basis, not as full-history truth
- the rule that `timeline_item` and `thread_view_helper` are helper projections
- the rule that public thread-view behavior may absorb internal `open` helper behavior without exposing `thread_open_required` directly to browsers
- the rule that input acceptance is finally determined by request-time native state and recovery state

---

## 19. Summary

This specification fixes the internal v0.9 contract around:

- native-first internal modeling
- thin-facade boundaries
- `App Server Contract Matrix v0.9` as a prerequisite
- internal resource taxonomy
- thread-scoped ordering and sequence semantics
- `feed_entry` and `timeline_item` boundaries
- request-helper lifetime and absence semantics
- recovery and partial-failure responsibilities
- internal error responsibilities
- internal-to-public mapping boundaries

Everything else should remain in later implementation details or in the public API specification unless it must be fixed here to preserve those internal contracts.
