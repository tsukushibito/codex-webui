# Issue #232 Thread Details

## Purpose

Add a recoverable Thread Details surface for lower-frequency thread status, metadata, requests, artifacts, and debug information without putting that information back into the primary Timeline viewport.

## Primary issue

- https://github.com/tsukushibito/codex-webui/issues/232

## Source docs

- `docs/notes/codex_webui_thread_view_information_architecture_note_v0_1.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/validation/codex_webui_ux_renewal_validation_gates_v0_1.md`

## Scope for this package

- Add an explicit Thread Details entry point near the compact Thread View context.
- Expose Overview, Status, Next action, Requests, Artifacts, and Debug information in a secondary details surface.
- Keep Debug collapsed by default.
- Preserve Timeline scroll position and primary thread workflows when details opens or closes.

## Exit criteria

- Thread metadata, current activity explanation, feedback summary, request state, artifacts, and debug data remain reachable from Thread Details.
- Details opens with Overview and any current required action visible first.
- Details does not become another always-visible dashboard.
- Existing thread selection, message sending, approval, refresh, and interruption workflows continue to work.
- Focused tests and `apps/frontend-bff` checks pass.

## Work plan

1. Inspect the existing detail surface and selected item detail behavior.
2. Add a Thread Details trigger and surface using existing component patterns.
3. Populate Overview, Status, Next action, Requests, Artifacts, and Debug sections from existing `thread_view` data.
4. Add focused tests for details reachability and default debug collapse.
5. Run targeted validation and prepare for pre-push validation.

## Artifacts / evidence

- Sprint evaluator verdict: approved.
- Dedicated pre-push validation: passed.
- Validation evidence:
  - `npm run check`: passed.
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: passed.
  - `npm test -- tests/chat-view.test.tsx`: 15 tests passed.
  - `npm run test:e2e -- e2e/chat-flow.spec.ts e2e/issue-222-approval-resolution-followup.spec.ts --project=desktop-chromium --reporter=line`: 3 tests passed.
  - `npm run test:e2e -- e2e/chat-flow.spec.ts --project=mobile-chromium --reporter=line`: 1 test passed.

## Status / handoff notes

- Active worktree: `.worktrees/issue-232-thread-details`
- Active branch: `issue-232-thread-details`
- Active PR: None yet.
- Completion boundary: package archive and PR handoff.
- Contract check:
  - Thread Details exposes Overview, Status, Next action, Requests, Artifacts, and collapsed Debug sections.
  - Detail surface opens only after an explicit Details/request/artifact action.
  - Artifacts list contextual timeline rows and can open their detail item.
  - Mobile CSS does not hide the Thread Details sections.
- Retrospective:
  - What worked: evaluator found both artifact reachability and mobile CSS hiding gaps before publish.
  - Workflow problems: a parallel desktop/mobile E2E run contended on the Playwright runtime SQLite DB; sequential E2E avoids this.
  - Improvements to adopt: run Playwright projects that share the same configured runtime DB sequentially unless the config isolates DB paths.
  - Skill candidates or skill updates: consider adding a note to pre-push validation prompts when multiple E2E commands use the same Playwright webServer database.
  - Follow-up updates: none required for this package.

## Archive conditions

- Sprint implementation is approved.
- Dedicated pre-push validation passes.
- Package notes include validation evidence.
- Package is moved to `tasks/archive/issue-232-thread-details/` before final Project completion tracking.
