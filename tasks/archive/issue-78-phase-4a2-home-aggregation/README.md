# issue-78-phase-4a2-home-aggregation

## Purpose

Implement the Home aggregation slice under #78 by exposing `GET /api/v1/home` from `frontend-bff`.

## Primary issue

- #78 `Phase 4A-2: Implement Home aggregation and approval summary mapping`

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md` section 9.2
- `docs/specs/codex_webui_public_api_v0_8.md`
- `docs/specs/codex_webui_internal_api_v0_8.md`
- `docs/specs/codex_webui_technical_stack_decision_v0_1.md`
- `apps/README.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Add `GET /api/v1/home` to `apps/frontend-bff/`
- Combine internal `GET /api/v1/workspaces` and `GET /api/v1/approvals/summary`
- Return the documented Home aggregation shape
- Add focused tests for Home initialization and aggregation timestamp behavior

## Exit criteria

- `GET /api/v1/home` returns the maintained public response shape
- Home data combines workspace summaries and approval summary correctly
- Targeted tests pass for the Home aggregation slice

## Work plan

1. Inspect the Home aggregation contract in the maintained public/internal specs.
2. Reuse the existing `frontend-bff` runtime client and workspace mapping.
3. Add the Home route handler and aggregation logic.
4. Add focused route tests for the aggregated response.
5. Validate locally and update handoff notes.

## Artifacts / evidence

- Route and aggregation tests under `apps/frontend-bff/tests/`
- Command output for targeted validation runs

## Status / handoff notes

- Status: `locally_complete`
- Notes:
  - Active worktree created at `.worktrees/issue-78-phase-4a2-home-aggregation`
  - Package created after `origin/main` sync with the branch/worktree recorded on issue `#78`
  - Implemented `GET /api/v1/home` in `apps/frontend-bff/` by aggregating runtime workspace and approval summary data
  - Validation: `npm test`
  - Validation: `npm run build`
  - Retrospective:
    - What worked: the BFF runtime client and workspace mapping added in #79 were reusable as-is.
    - Workflow problem: none.
    - Improvement: keep Phase 4A split so Home aggregation stays independent from SSE relay and can land quickly.

## Archive conditions

- Archive this package after the current #78 slice is locally complete, handoff notes are updated, and the execution state is ready to hand off for PR/merge cleanup
