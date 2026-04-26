# Issue 215 First Input Composer

## Purpose

- Execute Issue #215 by making new-thread first input and selected-thread continuation obvious and reachable in the thread-first UI.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/215

## Source docs

- `docs/notes/codex_webui_current_ui_gap_analysis_note_v0_1.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/notes/codex_webui_target_ui_design_note_v0_1.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Add a first-class `Ask Codex` / first-input action in Navigation and mobile thread reachability.
- Ensure the action returns the UI to workspace-scoped first-input state without URL manipulation.
- Make the composer persistently reachable for both first input and selected-thread continuation.
- Keep one coherent composer model for start and continuation rather than introducing a separate empty-thread product concept.

## Exit criteria

- A user with an existing selected thread can start a new workspace-scoped input from visible UI on desktop and mobile.
- Composer reachability does not require scrolling through a long timeline.
- Start and continuation modes are visually distinct while sharing one composer model.
- Focused frontend validation passes for the changed UI and interaction surfaces.
- Visual inspection evidence is captured for desktop and mobile target states.

## Work plan

- Inspect current `chat-page-client`, `chat-view`, and CSS implementation around selected-thread state, navigation, and composer layout.
- Implement the first-input navigation action and selected-thread clearing flow.
- Refactor composer placement so it remains reachable in selected-thread and first-input states.
- Tune responsive behavior for desktop and mobile reachability without expanding Issue #220 scope.
- Add or update focused tests for the new navigation/composer behavior.
- Run targeted validation and capture visual evidence.

## Artifacts / evidence

- Visual evidence: `artifacts/visual-inspection/issue-215-first-input-composer/`
- Sprint validation:
  - `npm run check`
  - `node ./node_modules/vitest/vitest.mjs run tests/chat-view.test.tsx tests/chat-page-client.test.tsx`
  - `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npm run test:e2e -- e2e/issue-215-first-input-composer.spec.ts --project=mobile-chromium --reporter=line`
  - `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npm run test:e2e -- e2e/issue-215-first-input-composer.spec.ts --project=desktop-chromium --reporter=line`
- Dedicated pre-push validation:
  - `npm run check`: passed
  - focused Vitest: 2 files passed, 23 tests passed
  - mobile Playwright issue spec: 2 passed
  - desktop Playwright issue spec: 2 passed

## Status / handoff notes

- Status: `locally complete`
- Active branch: `issue-215-first-input-composer`
- Active worktree: `.worktrees/issue-215-first-input-composer`
- Notes: Implemented Navigation `Ask Codex` reset to workspace-scoped first-input mode, single composer start/continuation behavior, bounded Thread View body/composer layout, focused tests, and desktop/mobile Playwright coverage. Evaluator approved the sprint after the mobile pending-request composer reachability blocker was fixed and proven with viewport-based assertions.
- Completion retrospective:
  - Completion boundary: package archive after local completion and pre-push validation.
  - Contract check: Issue #215 acceptance criteria are satisfied locally; Issue close still requires PR merge to `main`, parent checkout sync, worktree cleanup, and GitHub tracking update.
  - What worked: evaluator caught a real mobile layout proof gap before publication; the narrowed replan kept the fix scoped to #215.
  - Workflow problems: the first pre-push validation prompt used the wrong Vitest cwd and did not allow a temporary e2e server, causing a recoverable validation framing failure.
  - Improvements to adopt: pre-push validation prompts for frontend e2e slices should explicitly run from the app directory and state whether a temporary dev server may be started for read-only browser validation.
  - Skill candidates or skill updates: consider updating `codex-webui-pre-push-validation` examples with app-local cwd and temporary server wording for Playwright-backed slices.
  - Follow-up updates: none required before archive; publish-oriented GitHub handoff remains required.

## Archive conditions

- Archive this package after the exit criteria are met, the dedicated pre-push validation gate passes, completion retrospective is recorded, and package handoff notes are updated.
