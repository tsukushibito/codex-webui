# Codex WebUI MVP implementation roadmap v0.1

Last updated: 2026-04-09

## 1. Purpose

This document is the maintained execution roadmap for delivering the Codex WebUI MVP against the published v0.9 requirements and API specifications.

The goal is no longer to refine the earlier v0.8-oriented implementation. The goal is to cut over the existing runtime, BFF, and UI to the v0.9 `thread` / `request` / `timeline` model in a controlled order, while reusing infrastructure that still fits the maintained contracts.

## 2. Source of Truth Inputs

This roadmap depends on the following maintained documents:

- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/specs/codex_webui_app_server_contract_matrix_v0_9.md`
- `docs/validation/app_server_behavior_validation_plan_checklist.md`

GitHub Issues and Projects track execution state. This roadmap remains the maintained source of truth for sequencing, scope boundaries, and completion conditions.

## 3. Current State

### 3.1 What is already complete

- Phase 0 experimental infrastructure and observation work completed.
- Phase 1 app-server behavior confirmation completed.
- Phase 2 v0.9 requirements and specifications completed and published.
- A working implementation exists in `apps/codex-runtime` and `apps/frontend-bff`.

### 3.2 What is no longer aligned

The current implementation is coherent but still centered on the earlier `session / approval / message / event` model.

The main mismatches against v0.9 are:

- runtime routes and persistence still expose `sessions` and standalone `approvals`
- public BFF routes still expose `sessions`, `messages`, `events`, and standalone approval endpoints
- UI still assumes separate Home / Chat / Approval screens with session-first interaction
- first-input canonical thread start is not yet the main browser flow
- `thread_view`, `timeline`, `pending_request`, `request_detail`, and `notifications/stream` are not yet the execution center

### 3.3 Cutover decision

The implementation strategy is:

- reuse the existing repository structure, workspaces foundation, app-server bridge, SQLite foundation, Next.js app shell, and generic relay/error plumbing
- replace the v0.8-oriented runtime conversation model with a v0.9 `thread` / `request` internal model
- replace the public BFF contract with the v0.9 public API surface
- replace the session/approval-centric UI flow with a thread-first UI flow
- validate only against the v0.9 maintained documents after the cutover

This is a staged reimplementation inside the existing apps, not a greenfield repository rewrite and not a compatibility-led incremental patch-up.

## 4. Cutover Principles

### 4.1 Native-first

- `thread` is the canonical conversation unit.
- request flow remains native-backed helper state, not a standalone WebUI-owned canonical domain.
- browser-visible helper models must be rebuildable from native facts plus minimal app-owned metadata.

### 4.2 Thin facade

- `codex-runtime` owns internal projections, ordering, idempotency, and recovery semantics.
- `frontend-bff` owns public naming, aggregate helpers, and browser-facing transport only.
- the frontend owns display grouping, current-activity display, resume cues, blocked cues, and mobile interaction polish.

### 4.3 Cutover over compatibility

- do not preserve `session start`, standalone approval queues, or `waiting_input`-style public state as first-class v0.9 concepts
- do not keep parallel long-lived v0.8 and v0.9 browser contracts in the maintained implementation
- only keep temporary migration shims when they directly reduce cutover risk inside a bounded implementation slice

### 4.4 Validation gate

- Phase 5 validation must target the v0.9 contracts
- no issue or Project item should be marked `Done` until the new behavior is reachable on `main`

## 5. Execution Phases

### 5.1 Phase 3: Runtime v0.9 cutover

#### Purpose

Replace the session-centric runtime model with the v0.9 internal `thread` / `request` / `feed` / `timeline` model while keeping the reusable infrastructure in place.

#### Main workstreams

1. Replace runtime schema and services that currently center on `sessions`, standalone `approvals`, and session events.
2. Implement `POST /api/v1/workspaces/{workspace_id}/inputs` as the canonical first-input thread start.
3. Implement v0.9 internal thread routes:
   - `GET /api/v1/workspaces/{workspace_id}/threads`
   - `GET /api/v1/threads/{thread_id}`
   - `POST /api/v1/threads/{thread_id}/open`
   - `GET /api/v1/threads/{thread_id}/view`
   - `POST /api/v1/threads/{thread_id}/inputs`
   - `POST /api/v1/threads/{thread_id}/interrupt`
4. Implement internal helper routes:
   - `GET /api/v1/threads/{thread_id}/timeline`
   - `GET /api/v1/threads/{thread_id}/pending_request`
   - `GET /api/v1/requests/{request_id}`
   - `POST /api/v1/requests/{request_id}/response`
5. Replace session-scoped event projection with thread-scoped ordering and stream projection.
6. Implement `GET /api/v1/threads/{thread_id}/stream` and `GET /api/v1/notifications/stream`.
7. Converge request-helper retention, just-resolved recovery, and partial-failure reconstruction around the v0.9 internal rules.

#### Exit criteria

- runtime internal API is aligned with `docs/specs/codex_webui_internal_api_v0_9.md`
- thread-scoped ordering, idempotency, and request-helper behavior are implemented
- the BFF can build the v0.9 public surface without depending on the old session/approval contract

### 5.2 Phase 4A: BFF v0.9 public API cutover

#### Purpose

Replace the current public `session` / `approval` facade with the v0.9 public `thread` / `thread_view` / `request` contract.

#### Main workstreams

1. Replace public REST routes with:
   - `GET /api/v1/home`
   - `GET /api/v1/workspaces`
   - `POST /api/v1/workspaces`
   - `GET /api/v1/workspaces/{workspace_id}`
   - `GET /api/v1/workspaces/{workspace_id}/threads`
   - `POST /api/v1/workspaces/{workspace_id}/inputs`
   - `GET /api/v1/threads/{thread_id}`
   - `GET /api/v1/threads/{thread_id}/view`
   - `GET /api/v1/threads/{thread_id}/timeline`
   - `POST /api/v1/threads/{thread_id}/inputs`
   - `POST /api/v1/threads/{thread_id}/interrupt`
   - `GET /api/v1/threads/{thread_id}/pending_request`
   - `GET /api/v1/requests/{request_id}`
   - `POST /api/v1/requests/{request_id}/response`
2. Implement public shaping for `thread`, `thread_list_item`, `thread_view`, `timeline_item`, `pending_request`, `latest_resolved_request`, and `request_detail`.
3. Implement public absorption of the internal `open` helper so browsers do not see `thread_open_required`.
4. Replace session and approval stream relays with:
   - `GET /api/v1/threads/{thread_id}/stream`
   - `GET /api/v1/notifications/stream`
5. Update home aggregation to emit `resume_candidates` and v0.9 helper summaries rather than old approval counters as the primary interaction signal.
6. Preserve the requirements-level resume priority in public shaping and home/thread-list aggregation:
   - `waitingOnApproval`
   - `systemError`
   - latest turn `failed`
   - currently active thread
   - last viewed thread
   - most recently updated thread

#### Exit criteria

- public API is aligned with `docs/specs/codex_webui_public_api_v0_9.md`
- no public browser path depends on the old session/approval REST or SSE contract
- frontend can initialize, refresh, and recover from the v0.9 public helper endpoints alone

### 5.3 Phase 4B: UI v0.9 thread-first cutover

#### Purpose

Replace the current session-first Chat and standalone Approval UI with a v0.9 thread-first browser UX.

#### Main workstreams

1. Rework Home to emphasize workspace selection, resume candidates, and thread list cues.
2. Rework the main interaction surface around `thread_view`, `timeline`, `current_activity`, `composer`, and thread-context request helpers.
3. Make first user input the canonical new-thread start path from the browser.
4. Present pending and just-resolved request information from thread context instead of a standalone approval domain flow.
5. Keep smartphone usability as a first-class constraint while removing assumptions that MVP requires a dedicated Approval screen.
6. Converge reconnect behavior on REST reacquisition of `thread_view`, `timeline`, and request helper state.
7. Consume the global notifications path to surface background high-priority thread promotion without requiring a dedicated approval screen or continuous subscription to every thread stream.

#### Exit criteria

- browser interaction follows the v0.9 thread-first model
- request response actions are reachable from thread context with minimum confirmation information
- background high-priority thread promotion is noticeable from the browser UI
- desktop and smartphone layouts work without depending on the old session/approval UI model

### 5.4 Phase 5: v0.9 validation, convergence, and MVP judgment

#### Purpose

Validate the cutover implementation against the maintained v0.9 documents and decide MVP completion.

#### Main workstreams

1. Publish and maintain v0.9 validation source-of-truth documents for contract, recovery, end-to-end browser flows, and smartphone acceptance; do not rely on the app-server observation plan alone for final MVP judgment.
2. Contract validation for runtime and public APIs.
3. Recovery validation for disconnect, reload, partial failure, and just-resolved request retention.
4. End-to-end browser validation for first-input thread start, existing-thread input, request response, interrupt, and reconnect.
5. UI acceptance validation for PC and smartphone widths, including the requirements-level `360 CSS px`, `two taps`, and `two actions` checks.
6. Validation of background high-priority promotion signaling, including `waitingOnApproval`, `systemError`, and latest-turn-`failed` cases.
7. Final MVP judgment against the v0.9 requirements.

#### Exit criteria

- maintained validation sources exist for contract, recovery, E2E, and smartphone acceptance judgments
- contract behavior matches the maintained v0.9 docs
- thread-scoped recovery converges through REST reacquisition after SSE problems
- request response flow is safe and usable on browser and smartphone paths
- no major v0.9 responsibility ambiguity remains between runtime, BFF, and frontend

## 6. Recommended Issue Breakdown

The GitHub Project should track at least the following active items for the cutover:

1. `#124` `Phase 3-5: Execute the v0.9 implementation cutover`
2. `#126` `Phase 3: Cut over runtime to the v0.9 thread/request internal model`
3. `#125` `Phase 4A: Cut over frontend-bff to the v0.9 public API and stream model`
4. `#127` `Phase 4B: Cut over the browser UI to the v0.9 thread-first interaction model`
5. `#63` `Phase 5: Validate v0.9 contracts, recovery, UX, and MVP completion`
6. `#93` `Phase 5: Validate v0.9 E2E flows and UI acceptance`

The first item is the cross-phase parent tracker. The remaining items are the main execution units.

For implementation-line clarity, keep the earlier v0.8 parent tracker `#60` as the closed legacy parent and treat `#124` as the active v0.9 cutover parent. Do not reopen `#60` for new work.

Recommended Project field defaults:

- parent cutover tracker: `Priority=P0`
- runtime cutover: `Phase=Phase 3 Runtime`, `Area=Runtime`, `Priority=P0`
- BFF cutover: `Phase=Phase 4 BFF/UI`, `Area=BFF`, `Priority=P0`
- UI cutover: `Phase=Phase 4 BFF/UI`, `Area=UI`, `Priority=P0`
- validation parent: `Phase=Phase 5 Test`, `Area=Validation`, `Priority=P1`
- E2E validation child: `Phase=Phase 5 Test`, `Area=Validation`, `Priority=P1`

Recommended lineage tracking:

- `#60` and any historical v0.8 implementation issues: `Implementation Line=v0.8 legacy`
- `#124`, `#125`, `#126`, `#127`, `#63`, and `#93`: `Implementation Line=v0.9 cutover`
- if the current Project does not yet have an `Implementation Line` field, prefer adding that field to the existing Project; if that is not practical, use a consistent label family such as `impl:v0.8-legacy` and `impl:v0.9-cutover`

## 7. Sequencing Rules

### 7.1 Strong dependencies

- runtime cutover before final BFF public cutover
- BFF public cutover before final UI cutover
- UI and BFF cutover before final E2E acceptance
- all implementation cutover slices before final MVP judgment

### 7.2 Allowed overlap

- UI shell work may begin once the public v0.9 route and shape inventory is stable enough
- validation harness preparation may begin while implementation cutover is still in progress

### 7.3 Guardrails

- do not reopen the old v0.8-oriented design assumptions inside maintained docs
- do not treat the old implementation as the source of truth when it conflicts with v0.9 docs
- do not mark the cutover complete while the Project still depends on open compatibility defects from the old session/approval model

## 8. MVP Cutover Completion Criteria

The v0.9 implementation cutover is complete when:

- runtime, BFF, and UI all operate on the maintained v0.9 thread/request model
- the browser no longer depends on the old session/approval contract as its primary path
- recovery, idempotency, and request-response behavior are validated against the v0.9 docs
- Project tracking and maintained docs agree on the active execution state
- the resulting work is reachable on `main`
