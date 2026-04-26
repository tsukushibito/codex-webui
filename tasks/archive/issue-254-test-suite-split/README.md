# issue-254-test-suite-split

## Purpose

Split oversized frontend BFF UI and route tests into focused scenario suites without reducing behavior coverage.

## Primary issue

- GitHub Issue: #254

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `apps/frontend-bff/README.md`
- `tasks/README.md`

## Scope for this package

- Identify the safest first split among `chat-page-client.test.tsx`, `chat-view.test.tsx`, and `routes.test.ts`.
- Move scenario-focused tests into smaller files while preserving test behavior and assertions.
- Extract shared builders only where they remove real duplication and match existing local test patterns.
- Preserve the app README validation commands.

## Exit criteria

- At least one oversized suite is materially smaller and scenario-focused.
- Existing behavior coverage is retained, with targeted and full BFF tests passing.
- Evaluator review and dedicated pre-push validation pass before archive/PR follow-through.

## Work plan

1. Map the oversized suites and existing helper patterns.
2. Let the sprint planner choose one bounded test-splitting slice.
3. Implement the approved split and any minimal shared builders.
4. Run targeted tests, full BFF validation, and evaluator review.
5. Run dedicated pre-push validation before archive/PR follow-through.

## Artifacts / evidence

- Sprint 1 planner chose a bounded route split: move workspace/home route-handler scenarios from `routes.test.ts` into `routes-workspace-home.test.ts`.
- Sprint 1 implementation moved these tests without changing their assertions or response expectations:
  - `maps workspace list responses to the public shape`
  - `combines workspace summaries and per-workspace threads for the Home response`
  - `returns the first runtime error encountered during workspace thread fan-out for Home`
  - `maps workspace thread list responses to v0.9 thread_list_item`
- Sprint 1 validation passed:
  - `cd apps/frontend-bff && npm test -- tests/routes-workspace-home.test.ts tests/routes.test.ts`
  - `cd apps/frontend-bff && npm run check`
  - `cd apps/frontend-bff && node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  - `cd apps/frontend-bff && npm test`
  - `cd apps/frontend-bff && npm run build`
- Sprint 1 evaluator verdict: approved.
- Sprint 2 planner chose a bounded UI split: move ChatView Navigation scenarios from `chat-view.test.tsx` into `chat-view-navigation.test.tsx`.
- Sprint 2 implementation moved these tests without changing their assertions or behavior:
  - `renders Navigation workspace switching, creation, and grouped thread cues`
  - `switches desktop Navigation into a recoverable minibar`
  - `filters visible rows without changing thread selection behavior`
  - `treats a normal waiting-input thread with no resume cue as Recent`
- Sprint 2 validation passed:
  - `cd apps/frontend-bff && npm test -- tests/chat-view.test.tsx tests/chat-view-navigation.test.tsx`
  - `cd apps/frontend-bff && npm test`
  - `cd apps/frontend-bff && npm run check`
  - `cd apps/frontend-bff && node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
- Final evaluator verdict: approved. The evaluator confirmed the route and UI splits retained coverage and made major suites easier to run selectively.
- Dedicated pre-push validation passed:
  - `git diff --check`
  - moved-test marker checks for both new suites
  - `wc -l` recorded `routes.test.ts` at 1049 lines, `routes-workspace-home.test.ts` at 411 lines, `chat-view.test.tsx` at 1471 lines, `chat-view-navigation.test.tsx` at 578 lines, and `chat-page-client.test.tsx` at 2287 lines
  - `cd apps/frontend-bff && npm test -- tests/routes-workspace-home.test.ts tests/routes.test.ts tests/chat-view.test.tsx tests/chat-view-navigation.test.tsx`
  - `cd apps/frontend-bff && npm run check`
  - `cd apps/frontend-bff && node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  - `cd apps/frontend-bff && npm test`
  - `cd apps/frontend-bff && npm run build`

## Status / handoff notes

- Status: locally complete; archived after evaluator approval and dedicated pre-push validation.
- Active branch: `issue-254-test-suite-split`.
- Active worktree: `.worktrees/issue-254-test-suite-split`.
- PR merge, worktree cleanup, Project `Done`, and Issue close remain pending.

## Completion retrospective

### Completion boundary

Package archive boundary for #254. Issue close remains gated on PR merge to `main`, synced clean parent checkout, worktree cleanup, and GitHub Project update.

### Contract check

- Satisfied: one route suite and one UI suite were split by behavior scenario into focused files.
- Satisfied: existing coverage was retained; moved test bodies were verified as moved rather than weakened, and targeted plus full BFF validations passed.
- Satisfied: no broad shared builders were introduced because the moved groups did not need them.

### What worked

Two small mechanical move sprints were easier to evaluate than a single broad test refactor, and exact moved-test marker checks gave clear coverage-retention evidence.

### Workflow problems

Vitest and build continue to print the existing `--localstorage-file was provided without a valid path` warning. It is non-blocking here but should not be confused with a failure.

### Improvements to adopt

For future test-suite splits, prefer exact moved-test name checks and line-count evidence alongside targeted suite execution.

### Skill candidates or skill updates

None.

### Follow-up updates

Consider further splitting `chat-page-client.test.tsx` in a later issue if it remains a pain point, but #254's acceptance is met by the route and ChatView Navigation splits in this package.

## Archive conditions

- Sprint evaluator returns `approved`.
- Dedicated pre-push validation passes.
- Package evidence and handoff notes are updated.
- Completion retrospective is recorded.
- Package is moved to `tasks/archive/issue-254-test-suite-split/` before PR completion tracking.
