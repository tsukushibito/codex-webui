# issue-248-bff-mapping-boundaries

## Purpose

Split BFF mapping logic by resource family and isolate legacy session/approval mappers from active v0.9 thread/request/home mapping behavior.

## Primary issue

- GitHub Issue: #248

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Split `apps/frontend-bff/src/mappings.ts` into resource-focused mapper modules.
- Preserve route URLs, response bodies, stream event mapping, and public JSON shapes.
- Remove or explicitly quarantine legacy session/approval mapper code only after verifying usage.

## Exit criteria

- Active mapper modules have clear resource-family responsibilities.
- Legacy session/approval mappers are isolated or removed when unused.
- BFF checks, TypeScript, targeted route/mapping tests, and pre-push validation pass, allowing the known baseline UI test drift only when reproduced on `main`.

## Work plan

1. Map current mapper exports to handler modules and tests.
2. Let the sprint planner define a bounded mapper split slice.
3. Implement the approved mapper boundary from this worktree.
4. Run BFF validation and evaluator review.
5. Run dedicated pre-push validation before archive/PR follow-through.

## Artifacts / evidence

- Sprint 1 extracted legacy session/message/event/approval mappers into `apps/frontend-bff/src/mappings/legacy.ts` and kept the public `../mappings` import surface intact.
- Sprint 2 split active mapper families into `apps/frontend-bff/src/mappings/thread.ts`, `workspace.ts`, and `notifications.ts`, reducing `apps/frontend-bff/src/mappings.ts` to a 28-line barrel.
- Sprint evaluator verdict: approved. Active thread/request/timeline, workspace, notification, and legacy mapper responsibilities are separated without handler import changes.
- Pre-push validation evidence:
  - `cd apps/frontend-bff && npm run check`: pass.
  - `cd apps/frontend-bff && node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: pass.
  - `cd apps/frontend-bff && npm test -- tests/routes.test.ts tests/browser-state-matrix.test.ts`: pass, 29 tests.
  - `cd apps/frontend-bff && npm test`: only known baseline drift remains in `tests/chat-page-client.test.tsx`, two assertions expecting `Selected`.
  - `test "$(wc -l < apps/frontend-bff/src/mappings.ts)" -le 60`: pass.
  - `rg -n "^export function|^function " apps/frontend-bff/src/mappings.ts`: no matches.
  - `git diff --check`: pass.

## Status / handoff notes

- Status: locally complete; ready for archive and PR follow-through.
- Active branch: `issue-248-bff-mapping-boundaries`.
- Active worktree: `.worktrees/issue-248-bff-mapping-boundaries`.
- Completion retrospective:
  - Completion boundary: package archive before PR publication.
  - Contract check: mapper-family split, legacy quarantine, stream mapping preservation, and route/mapping validation are satisfied by the split modules and validation evidence above.
  - What worked: splitting legacy and active mapper responsibilities into two sprint slices kept the review surface bounded.
  - Workflow problems: the second evaluator needed explicit cumulative-worktree scope framing because prior-sprint changes were already present.
  - Improvements to adopt: future multi-sprint packages should state cumulative worktree scope in evaluator prompts.
  - Skill candidates or skill updates: none.
  - Follow-up updates: publish PR, merge to `main`, remove the worktree, clear Issue execution links, set Project status to `Done`, and close #248.
- Completion tracking, PR merge, worktree cleanup, Project `Done`, and Issue close remain pending.

## Archive conditions

- Sprint evaluator returns `approved`.
- Dedicated pre-push validation passes.
- Package evidence and handoff notes are updated.
- Package is moved to `tasks/archive/issue-248-bff-mapping-boundaries/` before PR completion tracking.
