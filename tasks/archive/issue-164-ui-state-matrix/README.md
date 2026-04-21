# Issue 164 UI State Matrix

## Purpose

- Freeze the browser UI state matrix and browser-critical contract vocabulary before the broader Phase 4B thread-first UI refresh.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/164

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Confirm the browser-facing state matrix for the v0.9 UI across home, navigation, thread view, timeline, request helpers, detail surfaces, and global notifications.
- Align browser-critical frontend/BFF vocabulary around `thread`, `thread_view`, `timeline`, `request`, `request_detail`, `notification_event`, and helper display models.
- Quarantine remaining legacy `session` and standalone `approval` terminology from browser-critical paths when it affects Phase 4B execution.
- Recheck `current_activity`, `badge`, `blocked_cue`, `resume_cue`, and `composer` derivation against the maintained v0.9 docs.
- Preserve `thread_id + sequence` as the ordering basis for stream and timeline convergence.

## Exit criteria

- Major browser states have explicit supporting v0.9 read models and endpoints in implementation-facing types, mappings, handlers, tests, or maintained package notes.
- `composer` remains a display hint and is not treated as final input authority.
- Global notifications are represented as refresh triggers rather than canonical state.
- Browser-critical types and tests no longer require the v0.8 session/approval worldview as the primary path.
- Any remaining legacy route or handler behavior is either non-browser-critical or clearly tracked for retirement in follow-up issue #168.

## Work plan

- Inspect frontend-bff runtime/public types, mapping helpers, handlers, and UI tests for browser-critical legacy vocabulary.
- Add or refine a compact browser state matrix in the implementation surface that future Phase 4B slices can test against.
- Adjust type names, fixtures, and route/UI tests where they pull the UI back to session-first or standalone approval-first behavior.
- Run focused frontend-bff validation, then broaden to the app's recommended checks if the slice touches shared surfaces.
- Update this package with evidence, run pre-push validation, archive the package, publish through PR, and close #164 only after the work reaches `main`.

## Artifacts / evidence

- Orchestration log: `artifacts/execution_orchestrator/runs/2026-04-21T04-52-59Z-issue-164-close/events.ndjson`
- Local validation evidence from `apps/frontend-bff`:
  - `node ./node_modules/vitest/vitest.mjs run tests/browser-state-matrix.test.ts` passed: 1 file, 7 tests.
  - Evaluator ran `node ./node_modules/vitest/vitest.mjs run tests/browser-state-matrix.test.ts tests/routes.test.ts tests/chat-page-client.test.tsx` and it passed: 3 files, 38 tests.
  - `npm run check` passed: Biome checked 67 files.
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false` passed.
  - `npm test` passed: 9 files, 53 tests.
  - `npm run build` passed: Next.js production build completed.
- Dedicated pre-push validation passed with the same targeted Vitest, Biome, TypeScript, full test, and production build command set.

## Status / handoff notes

- Status: `ready for archive`
- Active branch: `issue-164-ui-state-matrix`
- Active worktree: `.worktrees/issue-164-ui-state-matrix`
- Notes: Added a typed `frontend-bff` browser-critical state matrix and focused guard tests. Legacy `/sessions` and `/approvals` route families remain compatibility behavior tracked for follow-up #168. Sprint evaluator approved the slice and dedicated pre-push validation passed.
- Completion retrospective:
  - Completion boundary: package archive only; Issue close is blocked until PR merge, parent checkout sync, worktree cleanup, and final Project/Issue tracking.
  - Contract check: package exit criteria satisfied by the matrix module, notification event type, focused tests, evaluator approval, and pre-push validation.
  - Workflow problems: planner spawn required one corrected retry because full-history fork cannot be combined with agent override in this environment.
  - Improvements to adopt: keep the corrected spawn pattern in mind for future orchestrator runs; no repo doc or skill update is needed from this one-off retry.

## Archive conditions

- Archive this package under `tasks/archive/issue-164-ui-state-matrix/` after the exit criteria are met, dedicated pre-push validation passes, completion retrospective is recorded, and issue execution notes are updated.
