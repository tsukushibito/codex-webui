# issue-251-chat-view-components

## Purpose

Decompose `apps/frontend-bff/src/chat-view.tsx` into focused presentational components while preserving the current thread-first UI behavior.

## Primary issue

- GitHub Issue: #251

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Extract bounded presentational component modules from `chat-view.tsx`.
- Keep accessibility labels, class names, copy, and behavior stable unless a local cleanup is explicitly required.
- Validate with focused UI tests and build.

## Exit criteria

- Navigation, timeline, composer, or details surfaces are separated enough for this Issue's accepted slice.
- Targeted UI tests and build show no visible behavior regression.
- Pre-push validation passes before archive/PR follow-through.

## Work plan

1. Map high-cohesion regions in `chat-view.tsx`.
2. Let the sprint planner choose one safe extraction slice.
3. Implement the approved component extraction from this worktree.
4. Run UI validation and evaluator review.
5. Run dedicated pre-push validation before archive/PR follow-through.

## Artifacts / evidence

- Sprint 1 extracted `ChatViewComposer` into `apps/frontend-bff/src/chat-view-composer.tsx`.
- Sprint 1 evaluator verdict: approved. Composer markup and callback behavior preserved.
- Sprint 2 extracted `ChatViewTimeline` into `apps/frontend-bff/src/chat-view-timeline.tsx` and added `apps/frontend-bff/tests/chat-view-timeline.test.tsx`.
- Sprint 2 evaluator verdict: approved. Timeline rendering, folding, and detail callbacks preserved.
- Sprint 3 extracted `ChatViewDetails` into `apps/frontend-bff/src/chat-view-details.tsx` and added `apps/frontend-bff/tests/chat-view-details.test.tsx`.
- Sprint 3 evaluator verdict: approved. Thread, request, and timeline item details remain user-selected and presentational.
- Sprint 4 extracted `ChatViewNavigation` into `apps/frontend-bff/src/chat-view-navigation.tsx`.
- Sprint 4 evaluator verdict: approved. Cumulative Issue scope is locally complete.
- Validation evidence before pre-push:
  - `cd apps/frontend-bff && npm run check`: pass.
  - `cd apps/frontend-bff && node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: pass.
  - `cd apps/frontend-bff && npm test`: pass, 105 tests.
  - `cd apps/frontend-bff && npm run build`: pass.
  - `cd apps/frontend-bff && npm run test:e2e -- e2e/issue-235-timeline-first-ia.spec.ts`: pass when rerun against current worktree on ports 3002/3003 with `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3003` after the default 3000/3001 ports were already occupied by existing dev servers.
  - `git diff --check`: pass.
- Dedicated pre-push validation evidence:
  - `cd apps/frontend-bff && npm run check`: pass.
  - `cd apps/frontend-bff && node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: pass.
  - `cd apps/frontend-bff && npm test -- tests/chat-view.test.tsx tests/chat-view-timeline.test.tsx tests/chat-view-details.test.tsx tests/chat-page-client.test.tsx`: pass, 42 tests.
  - `cd apps/frontend-bff && npm test`: pass, 105 tests across 13 files.
  - `cd apps/frontend-bff && npm run build`: pass.
  - Structural `rg` checks confirm navigation markup moved out of `chat-view.tsx` and the decomposed components export `ChatViewNavigation`, `ChatViewTimeline`, `ChatViewComposer`, and `ChatViewDetails`.
  - `git diff --check`: pass.

## Status / handoff notes

- Status: locally complete; ready for archive and PR follow-through.
- Active branch: `issue-251-chat-view-components`.
- Active worktree: `.worktrees/issue-251-chat-view-components`.
- Completion tracking, PR merge, worktree cleanup, Project `Done`, and Issue close remain pending.
- Completion retrospective:
  - Completion boundary: package archive before PR publication.
  - Contract check: navigation, timeline, composer, and details surfaces are separate modules; targeted component tests, integrated chat tests, full BFF tests, build, and E2E evidence show no visible behavior regression.
  - What worked: four small extraction slices kept a 1.9k-line component refactor reviewable and caught scope drift early.
  - Workflow problems: E2E default ports conflicted with existing dev servers; rerunning against an explicit external stack on 3002/3003 resolved it without disturbing existing processes.
  - Improvements to adopt: for E2E validation in active dev containers, prefer explicit alternate ports or `PLAYWRIGHT_BASE_URL` when default ports are already occupied.
  - Skill candidates or skill updates: none.
  - Follow-up updates: publish PR, merge to `main`, remove the worktree, clear Issue execution links, set Project status to `Done`, and close #251.

## Archive conditions

- Sprint evaluator returns `approved`.
- Dedicated pre-push validation passes.
- Package evidence and handoff notes are updated.
- Package is moved to `tasks/archive/issue-251-chat-view-components/` before PR completion tracking.
