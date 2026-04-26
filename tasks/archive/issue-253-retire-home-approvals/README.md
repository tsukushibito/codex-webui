# issue-253-retire-home-approvals

## Purpose

Retire or align Home and Approvals browser surfaces with the v0.9 thread-first navigation model.

## Primary issue

- GitHub Issue: #253

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Decide which remaining Home/Approvals pages should redirect, remain compatibility shells, or be removed.
- Keep direct entry and recovery flows usable.
- Update focused tests/E2E where the v0.9 behavior changes.

## Exit criteria

- Browser primary flow no longer depends on standalone Home or Approval screens.
- Any remaining route is explicit redirect, recovery, or compatibility behavior.
- Targeted tests, full BFF validation, and pre-push validation pass.

## Work plan

1. Map current Home/Approvals pages, route behavior, and tests.
2. Let the sprint planner choose a bounded alignment slice.
3. Implement the approved redirect/compatibility behavior.
4. Run validation and evaluator review.
5. Run dedicated pre-push validation before archive/PR follow-through.

## Artifacts / evidence

- Sprint implementation retired the browser Home screen, changed `/` and `/approvals` into direct compatibility redirects to `/chat`, removed Home-only CSS and tests, and added route redirect coverage.
- Worker validation passed:
  - `cd apps/frontend-bff && npm run check`
  - `cd apps/frontend-bff && ./node_modules/.bin/tsc --noEmit --pretty false`
  - `cd apps/frontend-bff && npm test`
  - `cd apps/frontend-bff && npm run build`
  - Home UI symbol search returned no matches.
  - Legacy entry route E2E passed on `127.0.0.1:3100` for desktop and mobile because unrelated local processes occupied the default dev ports.
- Evaluator verdict: approved. No findings.
- Dedicated pre-push validation passed:
  - `git status --short --branch`
  - `cd apps/frontend-bff && npm run check`
  - `cd apps/frontend-bff && ./node_modules/.bin/tsc --noEmit --pretty false`
  - `cd apps/frontend-bff && npm test`
  - `cd apps/frontend-bff && npm run build`
  - Home UI symbol search returned no matches.
  - `GET /api/v1/home` references remained in route tests and browser state matrix.
  - `git diff --check`

## Completion retrospective

### Completion boundary

Package archive boundary for #253. Issue close remains gated on PR merge to `main`, synced clean parent checkout, worktree cleanup, and GitHub Project update.

### Contract check

- Satisfied: browser primary flow no longer depends on standalone Home or Approval screens; `/` and `/approvals` now redirect directly to `/chat`.
- Satisfied: remaining compatibility route behavior is documented in `apps/frontend-bff/README.md` and the UX validation gates.
- Satisfied: public `GET /api/v1/home` compatibility API remained intact and covered by existing route tests.

### What worked

The route-alignment slice was small enough for focused tests, full BFF validation, E2E coverage of compatibility entry routes, evaluator review, and pre-push validation to agree.

### Workflow problems

Default local E2E ports were occupied by unrelated processes, so E2E validation had to use an alternate frontend port and record that explicitly.

### Improvements to adopt

Keep noting alternate-port E2E evidence in task packages when default dev ports are blocked, including which process ownership was not touched.

### Skill candidates or skill updates

None.

### Follow-up updates

After PR merge, clear the Issue execution fields, remove the worktree, move Project status to `Done`, and close #253 only after confirming `main` is clean and synced.

## Status / handoff notes

- Status: locally complete; archived after evaluator approval and dedicated pre-push validation.
- Active branch: `issue-253-retire-home-approvals`.
- Active worktree: `.worktrees/issue-253-retire-home-approvals`.
- PR merge, worktree cleanup, Project `Done`, and Issue close remain pending.

## Archive conditions

- Sprint evaluator returns `approved`.
- Dedicated pre-push validation passes.
- Package evidence and handoff notes are updated.
- Package is moved to `tasks/archive/issue-253-retire-home-approvals/` before PR completion tracking.
