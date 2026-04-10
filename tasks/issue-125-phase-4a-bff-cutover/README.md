# Issue #125 Phase 4A BFF Cutover

## Purpose

- Recover the missing formal evaluator gate for the existing Issue `#125` frontend-bff thread/request REST cutover candidate without expanding into new Phase 4A work.

## Primary issue

- Issue: `#125` https://github.com/tsukushibito/codex-webui/issues/125

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- bounded gate-recovery slice only for the already-implemented v0.9 public REST routes and thread/request helper shaping in `apps/frontend-bff`
- allowed writes are limited to the approved evaluator scope for thread/request handlers, route files, focused tests, package metadata, `biome.json`, and this README
- legacy `sessions` / `approvals` routes may remain in place for this slice
- explicitly out of scope: home aggregation changes, SSE relay work, UI updates, and legacy route retirement

## Exit criteria

- in-scope v0.9 public REST routes and thread/request helper shaping remain present
- focused Biome passes for the exact in-scope file list
- `npm test -- tests/routes.test.ts` passes
- `npm run build` passes
- the active package records the dedicated pre-push gate outcome and does not resume push-oriented follow-through while `apps/frontend-bff` whole-app `npm run check` remains red

## Work plan

- inspect the existing candidate in the active worktree against the bounded evaluator scope
- prefer zero product-code changes unless an in-scope validation fails
- run the required focused checks plus whole-app `npm run check`
- record exact command lines and whether whole-app check failures are in scope or out of scope

## Artifacts / evidence

- Code under `apps/frontend-bff/`
- Validation evidence from focused BFF tests and build checks for the gate-recovery slice
- Working implementation currently staged in the active worktree across:
  - `apps/frontend-bff/src/handlers.ts`
  - `apps/frontend-bff/src/mappings.ts`
  - `apps/frontend-bff/src/runtime-types.ts`
  - `apps/frontend-bff/src/thread-types.ts`
  - `apps/frontend-bff/app/api/v1/workspaces/[workspaceId]/inputs/route.ts`
  - `apps/frontend-bff/app/api/v1/workspaces/[workspaceId]/threads/route.ts`
  - `apps/frontend-bff/app/api/v1/threads/[threadId]/route.ts`
  - `apps/frontend-bff/app/api/v1/threads/[threadId]/view/route.ts`
  - `apps/frontend-bff/app/api/v1/threads/[threadId]/timeline/route.ts`
  - `apps/frontend-bff/app/api/v1/threads/[threadId]/inputs/route.ts`
  - `apps/frontend-bff/app/api/v1/threads/[threadId]/interrupt/route.ts`
  - `apps/frontend-bff/app/api/v1/threads/[threadId]/pending_request/route.ts`
  - `apps/frontend-bff/app/api/v1/requests/[requestId]/route.ts`
  - `apps/frontend-bff/app/api/v1/requests/[requestId]/response/route.ts`
  - `apps/frontend-bff/tests/routes.test.ts`

## Validation commands

- `git -C /workspace/.worktrees/issue-125-phase-4a-bff-cutover status --short`
- `sed -n '1,260p' /workspace/.worktrees/issue-125-phase-4a-bff-cutover/tasks/issue-125-phase-4a-bff-cutover/README.md`
- `cd /workspace/.worktrees/issue-125-phase-4a-bff-cutover && node apps/frontend-bff/node_modules/@biomejs/biome/bin/biome check --config-path biome.json apps/frontend-bff/src/handlers.ts apps/frontend-bff/src/mappings.ts apps/frontend-bff/src/runtime-types.ts apps/frontend-bff/src/thread-types.ts apps/frontend-bff/app/api/v1/workspaces/[workspaceId]/inputs/route.ts apps/frontend-bff/app/api/v1/workspaces/[workspaceId]/threads/route.ts apps/frontend-bff/app/api/v1/threads/[threadId]/route.ts apps/frontend-bff/app/api/v1/threads/[threadId]/view/route.ts apps/frontend-bff/app/api/v1/threads/[threadId]/timeline/route.ts apps/frontend-bff/app/api/v1/threads/[threadId]/inputs/route.ts apps/frontend-bff/app/api/v1/threads/[threadId]/interrupt/route.ts apps/frontend-bff/app/api/v1/threads/[threadId]/pending_request/route.ts apps/frontend-bff/app/api/v1/requests/[requestId]/route.ts apps/frontend-bff/app/api/v1/requests/[requestId]/response/route.ts apps/frontend-bff/tests/routes.test.ts`
- `cd /workspace/.worktrees/issue-125-phase-4a-bff-cutover/apps/frontend-bff && npm test -- tests/routes.test.ts`
- `cd /workspace/.worktrees/issue-125-phase-4a-bff-cutover/apps/frontend-bff && NEXT_TELEMETRY_DISABLED=1 npm run build`
- `cd /workspace/.worktrees/issue-125-phase-4a-bff-cutover/apps/frontend-bff && npm run check`

## Whole-app check interpretation

- Treat `apps/frontend-bff` whole-app `npm run check` as a publish-path blocker for the current package while the dedicated pre-push validation gate is red.
- Use the reported diagnostics to decide the next tracked owner for the unblock slice; do not treat the result as permission to continue `#125` push-oriented follow-through.
- Current ownership recommendation from the blocked-state handoff: route the next bounded unblock slice to `#138` unless fresh evidence shows the gate is primarily owned by `#127` or `#93`.

## Status / handoff notes

- Status: `in_progress`
- Notes: Runtime issue `#126` is already merged to `main`, so this package continues from the v0.9 internal thread/request runtime surface. This recovery slice is limited to proving the existing frontend-bff cutover candidate is evaluator-ready within the approved write scope. Focused validation targets only the v0.9 REST routes and helpers listed above, and that bounded scope was evaluator-approved.
- Pre-push cleanup note: the attempted `#138` legacy-surface unblock found no failing state on a clean `#138` branch. Remaining format-only diagnostics existed in this `#125` integration worktree, so they were handled as `#125` pre-push cleanup.
- 2026-04-11 publish validation after rebasing onto `origin/main`: focused Biome passed from the repository root; `npm test -- tests/routes.test.ts` passed with 20 tests; `node ./node_modules/typescript/bin/tsc --noEmit --pretty false` passed after adding the missing `@types/react-dom` dev dependency required by existing React DOM tests; `NEXT_TELEMETRY_DISABLED=1 npm run build` passed; whole-app `npm run check` passed; `git diff --check` passed.

## Archive conditions

- Archive this package when the scoped BFF cutover work is locally complete, validations are recorded, and the active execution metadata no longer needs this package to remain live.
