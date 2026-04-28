# Issue 316 Inline Status

## Purpose

- Redesign Thread View feedback placement so timeline content stays primary while transient, error, and recovery statuses remain discoverable inline.

## Primary issue

- Issue: [#316](https://github.com/tsukushibito/codex-webui/issues/316)

## Source docs

- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Move running, reconnecting, submit, accepted, error, and recovery feedback out of large Thread View cards and into compact status near the composer/timeline boundary.
- Remove always-visible keyboard shortcut copy above the composer input while preserving tooltip and accessible guidance.
- Add focused test coverage for placement, compact styling, and desktop/mobile layout behavior.

## Exit criteria

- Thread feedback no longer renders as large cards above the timeline for #316 states.
- Compact status appears between the latest timeline content and the composer.
- Error and recovery status stays compact while preserving short action affordances and access to longer detail.
- Visible keyboard shortcut copy is removed from the composer toolbar.
- Targeted unit and Playwright coverage passes, followed by the dedicated pre-push validation gate.

## Work plan

- Inspect current Thread View and composer feedback rendering.
- Plan and execute one bounded sprint for the inline status layout.
- Run targeted component and E2E validation.
- Run the dedicated pre-push validation gate before archive or publish-oriented handoff.
- Archive the package after local completion and validation evidence are recorded.

## Artifacts / evidence

- Orchestration log: `artifacts/execution_orchestrator/runs/2026-04-28T12-57-15Z-issue-316-close/events.ndjson`
- Sprint validation:
  - `npm run check` passed.
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false` passed.
  - `node ./node_modules/vitest/vitest.mjs run tests/chat-view.test.tsx tests/chat-page-client.test.tsx` passed.
  - `npm run test:e2e -- e2e/issue-316-inline-status.spec.ts --project=desktop-chromium --project=mobile-chromium` passed.
- Dedicated pre-push validation:
  - `npm run check` passed.
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false` passed.
  - `npm test` passed, 15 files / 136 tests.
  - `npm run build` passed.
  - `npm run test:e2e -- e2e/issue-316-inline-status.spec.ts --project=desktop-chromium --project=mobile-chromium` passed, 4 tests.

## Status / handoff notes

- Status: `locally complete`
- Notes: Inline Thread View status implementation is evaluator-approved and dedicated pre-push validation passed. Next handoff is publish-oriented PR creation/merge, parent checkout sync, worktree cleanup, Issue close, and Project `Done`.
- Completion retrospective:
  - Completion boundary: package archive only; Issue close remains blocked until the PR reaches `main` and local cleanup is complete.
  - Contract check: package exit criteria satisfied by the inline status implementation, focused tests, full app validation, and focused desktop/mobile E2E coverage.
  - What worked: using the existing #312 feedback tests as anchors kept the UI regression focused.
  - Workflow problems: the initial worktree dependency symlink was unusable for validation and had to be corrected locally.
  - Improvements to adopt: for worktree-local Node dependency reuse, verify symlink targets before handing the worktree to worker/validator agents.
  - Skill candidates or skill updates: consider clarifying the work-package symlink example for nested app `node_modules`.
  - Follow-up updates: none required before archive.

## Archive conditions

- Archive this package when the implementation is evaluator-approved, dedicated pre-push validation passes, and handoff notes summarize the validation evidence.
