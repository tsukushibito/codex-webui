# issue-246-bff-resource-handlers

## Purpose

Split the monolithic `apps/frontend-bff/src/handlers.ts` into resource-focused handler modules so BFF thread, request, workspace, stream, and retired legacy behavior can be changed and validated independently.

## Primary issue

- GitHub Issue: #246

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Extract active v0.9 REST handler groups from `handlers.ts` into focused modules under `apps/frontend-bff/src/`.
- Keep route URLs, exported handler names, response bodies, and error passthrough behavior unchanged.
- Keep SSE relay behavior covered while separating it from REST resource handlers where practical.
- Remove or clearly isolate retired legacy approval/session handler behavior only after verifying route references.

## Exit criteria

- Route handlers still import stable public handler exports.
- `handlers.ts` is reduced to an explicit compatibility barrel or thin composition layer.
- Active BFF resource behavior is organized by resource family.
- BFF checks and route tests pass.

## Work plan

1. Map current `handlers.ts` exports to route files and tests.
2. Let the sprint planner define one bounded extraction slice.
3. Implement the approved extraction from this worktree.
4. Run BFF targeted validation.
5. Run evaluator, then dedicated pre-push validation before archive/PR.

## Artifacts / evidence

- Sprint 1 request-helper extraction: evaluator verdict `approved`.
- Sprint 2 stream handler extraction: evaluator verdict `approved`.
- Sprint 3 workspace/home and thread REST extraction: evaluator verdict `approved`.
- Sprint 4 legacy session/approval compatibility extraction: evaluator verdict `approved`.
- Dedicated pre-push validation: `passed`.
- Validation evidence:
  - `cd apps/frontend-bff && npm run check` passed.
  - `cd apps/frontend-bff && node ./node_modules/typescript/bin/tsc --noEmit --pretty false` passed.
  - `cd apps/frontend-bff && npm test -- tests/routes.test.ts` passed with 22 tests.
  - `git diff --check` passed.
  - `cd apps/frontend-bff && npm test` still fails only the known baseline `tests/chat-page-client.test.tsx` `Selected` assertions reproduced on parent `main`.

## Status / handoff notes

- Status: locally complete.
- Active branch: `issue-246-bff-resource-handlers`.
- Active worktree: `.worktrees/issue-246-bff-resource-handlers`.
- `apps/frontend-bff/src/handlers.ts` is now a thin explicit re-export barrel.
- Resource-focused handler modules now separate shared helpers, request helpers, streams, workspace/home, threads, and legacy session/approval compatibility behavior.
- Completion retrospective:
  - Completion boundary: package archive before PR follow-through.
  - Contract check: package exit criteria satisfied by resource module extraction, preserved stable `src/handlers` route import surface, passing BFF check/TypeScript/route tests, and pre-push validation.
  - What worked: repeated small sprint slices kept behavior-preserving moves reviewable.
  - Workflow problems: full `npm test` has known UI baseline failures unrelated to this package; recorded as validation drift.
  - Improvements to adopt: none beyond tracking the existing UI test drift separately if it is not already covered.
  - Skill candidates or skill updates: none.
  - Follow-up updates: PR merge, parent sync, worktree cleanup, Project `Done`, and Issue close remain pending.

## Archive conditions

- Sprint evaluator returns `approved`.
- Dedicated pre-push validation passes.
- Package evidence and handoff notes are updated.
- Package is moved to `tasks/archive/issue-246-bff-resource-handlers/` before PR completion tracking.
