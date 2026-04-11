# Issue #136 Home Resume Cutover

## Purpose

- Cut over the Home aggregation path to v0.9 `resume_candidates` and thread-centric helper summaries.

## Primary issue

- Issue: `#136` `Phase 4A-2: Cut over frontend-bff home aggregation and resume candidate shaping`

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- replace approval-counter-first Home shaping with v0.9 `resume_candidates`
- align Home and thread-list summaries with `thread_list_item` and helper semantics
- preserve the documented resume priority ordering in BFF shaping
- keep stream relays and broader legacy route retirement out of scope for this package

## Exit criteria

- `GET /api/v1/home` emits `resume_candidates` instead of using approval counters as the primary browser signal
- Home aggregation and related tests align with the maintained v0.9 public API shapes
- the remaining stream-relay and legacy-surface retirement work stays isolated to `#137` and `#138`

## Work plan

- inspect the maintained v0.9 Home and thread-list shapes against the current `frontend-bff` handlers and mappings
- update BFF runtime/public mappings and Home aggregation helpers for `resume_candidates`
- update Home-facing types, tests, and any browser code that still assumes approval-centric Home data
- validate with focused `frontend-bff` checks before handing off to implementation execution

## Artifacts / evidence

- Verified in `apps/frontend-bff`:
- `npm run check`
- `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
- `npm test -- tests/routes.test.ts tests/home-data.test.ts tests/home-view.test.tsx`
- `npm run build`
- Sprint evaluator verdict: `approved`
- Pre-push validation gate: `passed`

## Status / handoff notes

- Status: `locally complete`
- Notes: `GET /api/v1/home` now aggregates workspace thread summaries into v0.9 `resume_candidates` and no longer depends on `/api/v1/approvals/summary`.
- Retrospective:
  - Completion boundary: package archive, not Issue close
  - Contract check:
    - Satisfied: home aggregation no longer uses approval-counter-first shaping
    - Satisfied: `resume_candidates` shape and ordering align with the maintained v0.9 helper model
    - Satisfied: stream relay and broader legacy-surface retirement remained out of scope for this package
    - Not applicable: Issue close; branch is not yet on `main`
  - What worked: the slice stayed bounded to `frontend-bff` home aggregation, focused tests were enough to prove the cutover, and the dedicated pre-push gate passed cleanly
  - Workflow problems: the orchestration run originally stopped after `work-packages` without the required post-handoff intake; the worker also corrected a local `node_modules` symlink outside the planned write scope
  - Improvements to adopt: keep the orchestration loop strict about fresh post-handoff intake before any terminal run event; preserve worktree-local dependency plumbing before validation starts
  - Skill candidates or skill updates: none beyond the already recorded orchestration anomaly
  - Follow-up updates: archive this package, keep Issue `#136` and Project item `In Progress`, and continue with publish-oriented follow-through from the existing worktree/branch

## Archive conditions

- Archive this package after the `#136` slice is locally complete, the dedicated pre-push validation gate passes, and the handoff notes are updated.
