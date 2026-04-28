# Issue 305 Composer Keybindings

## Purpose

- Add a locally persisted composer keybinding preference so users can choose chat-style send behavior or editor-style newline behavior.

## Primary issue

- Issue: [#305 UI: add composer keybinding preference for send and newline](https://github.com/tsukushibito/codex-webui/issues/305)

## Source docs

- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Add Chat mode and Editor mode composer keybindings.
- Persist the selected mode in browser local storage.
- Surface the active shortcut in the composer control/help text.
- Guard IME composition and disabled/submitting/input-unavailable states.
- Add focused unit and Playwright coverage.

## Exit criteria

- Users can switch modes without leaving Thread View.
- Preference persists across reloads.
- Chat mode sends on Enter and inserts newline on Shift+Enter.
- Editor mode inserts newline on Enter and sends on Cmd/Ctrl+Enter.
- IME composition Enter never submits.
- Disabled and unavailable states do not submit from keyboard shortcuts.
- Visible or accessible help reflects the active shortcut.
- Focused validation and visual evidence are recorded.

## Work plan

- Inspect composer ownership and current submit path.
- Implement bounded keybinding preference state and local storage helpers.
- Add compact mode control near the composer.
- Add keyboard/IME handling and focused tests.
- Run frontend validation and capture desktop/mobile evidence.

## Artifacts / evidence

- Visual evidence:
  - `artifacts/visual-inspection/issue-305-composer-keybindings/desktop-chromium-chat-mode.png`
  - `artifacts/visual-inspection/issue-305-composer-keybindings/desktop-chromium-editor-mode.png`
  - `artifacts/visual-inspection/issue-305-composer-keybindings/mobile-chromium-chat-mode.png`
  - `artifacts/visual-inspection/issue-305-composer-keybindings/mobile-chromium-editor-mode.png`
- Sprint validation:
  - `npm run check` passed.
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false` passed.
  - `npm test` passed: 15 files / 125 tests.
  - `npm run build` passed.
  - `npx playwright test e2e/issue-305-composer-keybindings.spec.ts --project=desktop-chromium --project=mobile-chromium` passed: 4 tests.
- Dedicated pre-push validation repeated the same command set and passed after stale ignored Next/Playwright outputs were cleaned.

## Status / handoff notes

- Status: `locally complete`
- Active branch: `issue-305-composer-keybindings`
- Active worktree: `.worktrees/issue-305-composer-keybindings`
- Notes:
  - Implemented Chat and Editor composer keybinding modes with localStorage persistence.
  - Added keyboard handling for Enter, Shift+Enter, Ctrl/Meta+Enter, IME composition, and disabled/unavailable states.
  - Completion retrospective: package boundary is satisfied locally; stale ignored `.next` / Playwright outputs can create misleading build and dev-overlay failures, so cleaning ignored validation artifacts before reruns is worth making explicit in handoff notes.

## Archive conditions

- Archive this package after exit criteria are met, pre-push validation passes, retrospective is recorded, and evidence is linked.
- Archive-ready as of 2026-04-28; keep Issue #305 open until PR merge, parent checkout sync, active worktree cleanup, and Project `Done` verification.
