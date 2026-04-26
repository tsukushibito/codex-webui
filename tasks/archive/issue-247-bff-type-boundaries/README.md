# issue-247-bff-type-boundaries

## Purpose

Separate BFF runtime contract types from public browser read models so v0.9 code paths do not depend on session-centric UI aliases or retired legacy types.

## Primary issue

- GitHub Issue: #247

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Clarify the boundary between `runtime-types.ts`, public API/browser models, and UI-local view models.
- Keep route URLs, response bodies, and mapper behavior unchanged.
- Quarantine or split legacy session/approval types only where route/test references still need compatibility.

## Exit criteria

- Active v0.9 BFF code paths have a clear public model import boundary separate from runtime contract types.
- Legacy session/approval types are isolated or explicitly retained as compatibility-only.
- BFF check, TypeScript, targeted tests, and pre-push validation pass, allowing the known baseline UI test drift only when reproduced on `main`.

## Work plan

1. Map imports of `runtime-types.ts`, `thread-types.ts`, and `chat-types.ts`.
2. Let the sprint planner define one bounded type-boundary slice.
3. Implement the approved type/module split from this worktree.
4. Run BFF validation and evaluator review.
5. Run dedicated pre-push validation before archive/PR follow-through.

## Artifacts / evidence

- Sprint 1 public Home/list type boundary: evaluator verdict `approved`.
- Sprint 2 legacy session/approval type quarantine: evaluator verdict `approved`.
- Dedicated pre-push validation: `passed`.
- Validation evidence:
  - `cd apps/frontend-bff && npm run check` passed.
  - `cd apps/frontend-bff && node ./node_modules/typescript/bin/tsc --noEmit --pretty false` passed.
  - targeted BFF tests passed with 39 tests.
  - `cd apps/frontend-bff && npm run build` passed.
  - `git diff --check` passed.
  - full `cd apps/frontend-bff && npm test` still fails only the known baseline `tests/chat-page-client.test.tsx` `Selected` assertions reproduced on parent `main`.

## Status / handoff notes

- Status: locally complete.
- Active branch: `issue-247-bff-type-boundaries`.
- Active worktree: `.worktrees/issue-247-bff-type-boundaries`.
- `runtime-types.ts` no longer imports public thread models or exports `HomeResponse`.
- Public Home/list models now live in `public-types.ts`.
- Legacy session/approval public models now live in `legacy-types.ts`; `chat-types.ts` was removed.
- Completion retrospective found no durable skill or docs update needed. The known full-suite UI baseline drift remains outside this type-boundary package.
- Completion tracking, PR merge, worktree cleanup, Project `Done`, and Issue close remain pending.

## Archive conditions

- Sprint evaluator returns `approved`.
- Dedicated pre-push validation passes.
- Package evidence and handoff notes are updated.
- Package is moved to `tasks/archive/issue-247-bff-type-boundaries/` before PR completion tracking.
