# Issue #126 Phase 3 Runtime Cutover

## Purpose

- Deliver the active runtime cutover package that replaces the v0.8-oriented `session` / `approval` model with the v0.9 `thread` / `request` internal model.

## Primary issue

- Issue: `#126` https://github.com/tsukushibito/codex-webui/issues/126

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/specs/codex_webui_app_server_contract_matrix_v0_9.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`

## Scope for this package

- replace runtime route and persistence entrypoints that currently expose `sessions` and standalone `approvals`
- introduce the v0.9 runtime `thread` / `request` / `timeline` domain and schema foundations
- implement canonical first-input thread start through workspace/thread input routes
- implement runtime stream surfaces required for thread-scoped SSE and global notifications
- add targeted automated coverage for the new runtime routes and helper behavior

## Exit criteria

- `apps/codex-runtime` exposes the v0.9 internal routes needed by the BFF cutover
- runtime persistence and service logic are centered on `thread` / `request` state rather than the old `session` / `approval` model
- targeted tests cover route contracts, helper retrieval, and stream-related behavior for the implemented slice
- the package contains enough handoff detail for follow-on BFF/UI work once the runtime cutover lands

## Work plan

- replace runtime schema and service wiring with v0.9 thread/request primitives
- rework Fastify route registration from `sessions` / `approvals` to the v0.9 internal route inventory
- implement helper projections for `timeline`, `pending_request`, `request_detail`, and notifications
- run focused runtime validation and record outcomes here

## Artifacts / evidence

- Code under `apps/codex-runtime/`
- Validation evidence from targeted runtime tests and type/build checks
- 2026-04-09:
  - `npm test -- thread-routes.test.ts`
  - `npm test -- workspace-routes.test.ts`
  - `npm test -- workspace-registry.test.ts`
  - `npm test`
  - `npm run build`
  - Runtime validation passed with `30` tests across `4` test files.

## Status / handoff notes

- Status: `archived_pending_main`
- Notes: The scoped runtime cutover is locally complete. Runtime HTTP entrypoints now expose only the v0.9 `workspaces`, `threads`, and notifications-compatible stream surfaces; legacy `sessions` / `approvals` routes and `session-routes.test.ts` were removed; workspace persistence no longer stores workspace-level single-session helpers; and `ThreadService` now handles read paths, write paths, request resolution, interrupt handling, and stream subscriptions without depending on `SessionService`. Completion retrospective for the package boundary found the package contract satisfied for local archive, with Issue close still blocked on the normal branch workflow steps: publish the branch, merge to `main`, sync the parent checkout, update Project/Issue completion state, and remove the active worktree. Workflow note: package and Issue execution notes drifted behind implementation progress during the final runtime sprints, so future completion passes should refresh tracking before reporting readiness.

## Archive conditions

- Archived on 2026-04-09 after the scoped runtime cutover became locally complete, validations were recorded, and the remaining work shifted to PR/main-sync/cleanup tracking outside the active package.
