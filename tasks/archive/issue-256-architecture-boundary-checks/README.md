# issue-256-architecture-boundary-checks

## Purpose

Add lightweight validation that catches accidental active v0.9 dependencies on retired session/approval routes or legacy public path assumptions.

## Primary issue

- GitHub Issue: #256

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/validation/codex_webui_ux_renewal_validation_gates_v0_1.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Add maintainable static checks or tests in the existing frontend BFF validation toolchain.
- Guard active app/source/test surfaces from importing retired session/approval route modules.
- Keep explicit compatibility/retired route tests allowed where they intentionally cover legacy paths.

## Exit criteria

- Existing validation fails if active v0.9 code unintentionally imports retired session/approval route modules.
- The check is discoverable through normal BFF validation commands.
- Evaluator review and dedicated pre-push validation pass before archive/PR follow-through.

## Work plan

1. Map retired route modules and active v0.9 source/test surfaces.
2. Let the sprint planner choose a bounded static guard slice.
3. Implement the approved check.
4. Run targeted and full BFF validation.
5. Run evaluator review and dedicated pre-push validation before archive/PR follow-through.

## Artifacts / evidence

- Implemented `apps/frontend-bff/tests/architecture-boundaries.test.ts`.
- Added demand-aware coverage for shared `src/handlers.ts` and `src/mappings.ts` barrels so active exports pass while legacy export demand fails.
- Split retired session/approval stream handlers into `apps/frontend-bff/src/handlers/legacy-streams.ts`; active stream handlers no longer import legacy mapping names.
- Worker validation:
  - `cd apps/frontend-bff && npm test -- tests/architecture-boundaries.test.ts` passed, 2 tests.
  - `cd apps/frontend-bff && npm test` passed, 14 files / 102 tests.
  - `cd apps/frontend-bff && npm run check` passed.
  - `cd apps/frontend-bff && node ./node_modules/typescript/bin/tsc --noEmit --pretty false` passed.
- Evaluator verdict: `approved`.
- Dedicated pre-push validation: passed `git diff --check`, targeted architecture test, full BFF test, BFF check, BFF tsc, and BFF build.

## Status / handoff notes

- Status: locally complete; ready for PR and merge follow-through.
- Active branch: `issue-256-architecture-boundary-checks`.
- Active worktree: `.worktrees/issue-256-architecture-boundary-checks`.
- Completion tracking, PR merge, worktree cleanup, Project `Done`, and Issue close remain pending.

## Completion retrospective

### Completion boundary

Package archive before PR follow-through for Issue #256.

### Contract check

- Satisfied: active v0.9 route/browser surfaces are guarded by `architecture-boundaries.test.ts` against retired session/approval modules and public path assumptions.
- Satisfied: the guard runs through existing BFF `npm test` and was included in dedicated pre-push validation.
- Satisfied: intentionally retired compatibility routes and legacy-specific tests remain quarantined through explicit allowlist entries.

### What worked

- The evaluator caught an important guard weakness where shared barrels were allowlisted wholesale.
- A narrow regression test now proves requested-export traversal detects legacy barrel demand.

### Workflow problems

- The first implementation missed that retired and active stream handlers shared one module, which pulled legacy mappings into active traversal.

### Improvements to adopt

- For future boundary tests, treat shared barrels and mixed active/legacy modules as first-class risk areas during planning and evaluation.

### Skill candidates or skill updates

None.

### Follow-up updates

None.

## Archive conditions

- Sprint evaluator returns `approved`.
- Dedicated pre-push validation passes.
- Package evidence and handoff notes are updated.
- Completion retrospective is recorded.
- Package is moved to `tasks/archive/issue-256-architecture-boundary-checks/` before PR completion tracking.
