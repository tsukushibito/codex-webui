# Codex WebUI common specification v0.9

## 1. Purpose

This document defines the cross-cutting common rules for Codex WebUI v0.9.

It fixes only the shared contracts that are difficult to change later across:

- public API
- internal API
- SSE delivery
- browser/backend shared representations

This document does not freeze resource-specific schemas, UI-specific read models, or transport details that are better fixed in later public and internal API specifications.

---

## 2. Relationship to higher-level documents

### 2.1 Source-of-truth hierarchy

This specification is subordinate to:

- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`

It must stay aligned with the v0.9 requirements, especially these principles:

- App Server native-first
- thin facade
- no WebUI-owned conversation state machine
- approval as request flow
- thread-scoped ordering plus REST reacquisition convergence

### 2.2 Scope of application

This specification applies to:

- browser-facing facade APIs
- facade-to-runtime APIs
- SSE event contracts
- shared representation rules used across those contracts

### 2.3 Out of scope

This specification does not define:

- public resource-specific schemas
- internal resource-specific schemas
- exact App Server enum values for a target version
- detailed timeline item shapes
- detailed thread summary, badge, or activity read models
- specific SSE `event:` names or keepalive intervals
- screen layout or UI interaction design

---

## 3. Dependency prerequisites

### 3.1 Native contract dependency

Codex WebUI depends on App Server public contracts for thread, turn, item, and request flow behavior.

The WebUI backend and frontend must treat those App Server contracts as the primary source of truth for conversation state. This specification does not redefine those native contracts as WebUI-owned canonical state.

### 3.2 App Server Contract Matrix v0.9

`App Server Contract Matrix v0.9` is a required prerequisite before implementation starts.

It must fix at least:

- the target App Server version
- the allowed native dependency contracts for that version
- the available native thread and turn status contracts
- the available active-flag contracts
- the stable identity and ordering signals that WebUI may depend on
- any open/load/resume semantics relevant to `notLoaded` threads

Public API, internal API, and runtime implementation must not add new implicit App Server dependencies that are not fixed in that matrix.

### 3.3 Degrade policy

If a required App Server public contract is unavailable, renamed, or found unstable in the target version:

- WebUI must not replace App Server source of truth with a new canonical state machine
- display and navigation may degrade only within the limits of available native facts
- state that cannot be derived must not be backfilled as WebUI-owned canonical state
- any fallback derivation must be stated explicitly in later public or internal API specifications

---

## 4. Common design principles

### 4.1 Native-first

WebUI must reason from native `thread`, `thread.status`, `turn`, `turn.status`, `item`, and request flow facts.

The WebUI backend may reshape, aggregate, and transport those facts, but it must not become the canonical owner of conversation lifecycle state.

### 4.2 Thin facade

The facade backend is limited to:

- browser-facing transport
- workspace operations
- workspace-thread mapping
- minimal helper read models
- idempotency metadata
- ordering and reconnect helper metadata
- partial-failure detection and convergence support

It must not own:

- canonical approval state
- canonical turn lifecycle state
- a duplicated full thread history
- a WebUI-only conversation lifecycle engine

### 4.3 App-owned minimal retention

App-owned retention must stay minimal and operational.

Allowed retained state includes:

- workspace registry
- workspace-thread mapping
- thread list summaries
- request badge metadata
- request idempotency metadata
- transport and reconnect helper metadata
- thread-scoped ordering and convergence helper metadata

### 4.4 Thread-scoped convergence

Timeline-like representations, event delivery, and request-flow display must assume a thread-scoped stable ordering basis.

The convergence model is:

- initial load by REST
- incremental update by SSE
- recovery from gaps or inconsistency by REST reacquisition

Full replay is not a common-spec requirement for MVP.

### 4.5 Helper layers are not source of truth

Helper layers may exist for usability and convergence, but they are not replacement sources of truth.

This includes:

- canonical-feed-like helper projections
- timeline projections
- current-activity summaries
- request badges
- composer availability helpers
- derived hints and resume helpers

If a helper layer conflicts with native facts, native facts take precedence.

---

## 5. Common representation rules

### 5.1 API version policy

Document version `v0.9` and API versioning are separate concerns.

Versioned HTTP APIs should use `/api/v1` as the default base path. This common rule does not force every internal transport detail to share that exact path shape.

### 5.2 Data formats

- REST uses JSON
- incremental delivery uses SSE
- a shared outer `data` envelope is not required

### 5.3 Naming

- JSON field names use `snake_case`
- query parameter names use `snake_case`
- enum values use `snake_case`
- `event_type` should use `domain.action` semantics

### 5.4 Time representation

- timestamps use UTC RFC 3339 strings
- timestamps end in `Z`
- milliseconds are optional unless a later spec requires them

### 5.5 ID policy

- IDs exposed through APIs are opaque strings
- clients must not depend on ID structure, prefixes, or ordering
- exact ID formats remain out of scope for this document

### 5.6 `null`, omission, and empties

- empty arrays must be returned as `[]`
- nullable fields may return `null`
- optional objects may be omitted when absent
- required fields must always be present

For the same field in the same contract, `null` and omission must not be mixed without a semantic reason.

Use:

- `null` when the field exists in the contract but currently has no value
- omission when the field itself is optional and legitimately absent in that scenario

---

## 6. Enum responsibility layers

### 6.1 Shared grammar enums

Enums that define only shared expression grammar, such as `event_type` naming style, may be fixed here.

### 6.2 App-owned minimal enums

Only truly cross-cutting app-owned concepts should be fixed in common specs, and only when later documents need a shared dependency.

### 6.3 App Server-dependent enums

App Server-dependent enums, such as native thread status, active flags, turn status, or request kinds, must not be duplicated here as if they were WebUI-owned contracts.

Their concrete value sets belong in `App Server Contract Matrix v0.9` and in later resource-specific specifications.

---

## 7. Error expression and HTTP status

### 7.1 Common error envelope

Errors use this common envelope shape:

```json
{
  "error": {
    "code": "example_error_code",
    "message": "human readable summary",
    "details": {}
  }
}
```

### 7.2 Error field roles

- `code`: machine-readable cause identifier
- `message`: concise human-readable summary
- `details`: optional supplemental information

### 7.3 Error code naming

- use `snake_case`
- prefer domain-plus-cause naming
- avoid excessive fragmentation when `details` can carry current-state context

### 7.4 Recommended HTTP status mapping

- `400 Bad Request` for malformed requests
- `404 Not Found` for missing target resources
- `409 Conflict` for state conflicts
- `422 Unprocessable Entity` for semantically invalid requests
- `500 Internal Server Error` for unexpected internal failures
- `503 Service Unavailable` for temporary unavailability

Specific endpoints may refine this mapping later, but they must not contradict these common roles.

---

## 8. List API rules

### 8.1 Common query parameters

List APIs may use:

- `limit`
- `cursor`
- `sort`

### 8.2 Common list response helpers

List APIs may use:

- `items`
- `next_cursor`
- `has_more`

### 8.3 Stable pagination requirement

Cursor-based pagination must depend on a stable ordering. If the primary sort key is not unique, a tie-break must exist so the cursor can replay the same ordering basis.

This document does not freeze the default sort for each resource.

---

## 9. Ordering and convergence rules

### 9.1 Thread-scoped stable ordering

Thread-scoped event, timeline, and request-flow representations must have a stable ordering basis that supports deduplication and reacquisition convergence.

Implementations must provide at least one of:

- a monotonic thread-comparable ordering key
- a stable identifier set sufficient to reconstruct ordering and dedupe semantics

### 9.2 Canonical ordering vs display reconstruction

The backend provides a canonical ordering basis, not the final visual grouping.

Frontend behaviors such as:

- turn grouping
- delta merge
- collapse/expand
- timeline reconstruction

are display-layer reconstitution, not backend canonical state.

### 9.3 REST and SSE consistency

REST and thread-scoped SSE must represent the same underlying thread event progression through different transports.

When missing delivery, duplication, or ordering inconsistency is detected, REST reacquisition is the recovery authority.

### 9.4 Global streams are auxiliary only

If a global stream exists, it may support:

- badge refresh
- resume cues
- lightweight notifications
- reacquisition triggers

It must not become:

- the authoritative ordering source
- the strict source of truth for thread state

---

## 10. Request-helper visibility and lifetime

### 10.1 Request flow remains non-canonical

Request flow is not an independent canonical domain resource for WebUI.

However, request helpers may exist to make pending and just-resolved requests understandable and actionable from thread context.

### 10.2 Minimum shared rule

Later public and internal API specs must make request-helper lifetime and absence semantics explicit.

At minimum, the shared rules are:

- pending requests must remain reachable from thread context to the minimum confirmation information needed for response
- just-resolved requests must remain reachable long enough to support reconnect, revisit, and response-path recovery
- after helper retention ends, the contract may transition to not-found according to resource-specific rules

### 10.3 Absence vs missing resource

Resource-specific specs must preserve a clear distinction between:

- helper absence within a valid thread context
- missing request detail resource

The common rule is that "there is currently no pending request helper for this thread" must be representable without pretending that the thread or request namespace itself is missing.

### 10.4 Minimum confirmation information

Before the user responds to a request flow, the system must make the following information reachable:

- risk level or equivalent danger classification
- a short summary of the operation
- why response is required
- a concise summary of the consequence
- request time or equivalent
- target thread reference
- target turn, item, or equivalent contextual reference

This specification fixes the information requirement, not the final endpoint shape.

---

## 11. Helper projection boundaries

### 11.1 Canonical-feed-like helper projection

A canonical-feed-like helper projection may be retained as part of the thread-scoped ordering foundation.

It is allowed only as:

- an ordering basis
- a dedupe basis
- a convergence aid

It must not become a substitute source of truth for full App Server history.

### 11.2 Timeline projection

Timeline projection is a display helper layer.

It must be treated as rebuildable cache derived from native facts plus minimal app-owned metadata. If the projection conflicts with native history, native history wins.

### 11.3 Composer and derived availability helpers

Composer availability and similar helper fields are convenience signals. They may support UI responsiveness and reduce repeated client derivation, but they are not final authority for acceptance decisions.

Server-side acceptance remains determined by request-time native state and pending-request conditions.

---

## 12. Idempotency and partial-failure recovery

### 12.1 Idempotency principle

Write operations that may be retried in normal operation should allow idempotent success where practical.

The exact mechanism may be:

- a request-body key such as a client-provided message identifier
- an idempotency header
- an equivalent request identity mechanism

### 12.2 First-input thread creation

Starting a new thread from the first user input in workspace context must be protected against accidental duplicate creation by an idempotency mechanism or equivalent.

### 12.3 Partial failure assumption

The system must assume that native actions may succeed while app-owned metadata or helper projections fail to update.

The backend must therefore support:

- inconsistency detection
- retry or reacquisition-based convergence
- recovery without maintaining a duplicated canonical full history

---

## 13. What this specification does not fix

This document does not fix:

- public or internal resource-specific schemas
- exact App Server enum values
- exact request or thread helper field names
- timeline item shapes
- concrete error code catalogs
- exact action endpoint URLs
- concrete SSE `event:` names
- keepalive payload details
- UI-specific helper field inventories

Those belong in later public and internal API specifications, constrained by the common rules in this document.

---

## 14. Follow-on requirements for later specs

Later specifications must at least fix:

1. the concrete `App Server Contract Matrix v0.9`
2. public and internal resource schemas
3. the concrete thread-scoped ordering field set
4. request-helper retention and absence representation per endpoint
5. detailed public/internal mapping for helper projections
6. concrete SSE transport field naming
7. concrete endpoint-level error code sets

---

## 15. Summary of fixed common rules

This specification fixes the following common rules for v0.9:

- App Server native-first
- thin facade
- `App Server Contract Matrix v0.9` as an implementation prerequisite
- degrade without inventing a new canonical state machine
- minimal app-owned retention
- JSON, SSE, `snake_case`, UTC RFC 3339, and opaque IDs
- disciplined `null` vs omission usage
- layered enum responsibility
- shared error envelope and HTTP status roles
- stable list pagination requirements
- thread-scoped ordering and REST reacquisition convergence
- request-helper lifetime and absence as required shared rules
- canonical-feed, timeline, and composer helpers as non-authoritative helper layers
- idempotency and partial-failure convergence principles

Everything else should remain in later public and internal API specifications unless it must be fixed here to preserve those common rules.
