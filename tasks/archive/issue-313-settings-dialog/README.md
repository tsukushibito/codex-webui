# Issue 313 Settings Dialog

## Purpose

- Consolidate lightweight UI preferences into a settings dialog opened from the Thread View header.

## Primary issue

- Issue: [#313 UI: move theme and Enter-send preferences into settings dialog](https://github.com/tsukushibito/codex-webui/issues/313)

## Source docs

- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `apps/frontend-bff/README.md`
- Related completed work: #305, #306

## Scope for this package

- Add a compact settings icon button in the Thread View top-right action area.
- Add an accessible settings dialog.
- Move theme switching into the dialog.
- Move the Enter-to-send preference into the dialog.
- Preserve persisted preference behavior and existing defaults unless implementation evidence requires a narrower adjustment.
- Remove or demote the standalone header theme switch after the dialog owns the preference.

## Exit criteria

- The Thread View top-right area exposes a clear settings icon button.
- Clicking the settings button opens a dialog containing theme and Enter-to-send controls.
- Theme selection applies immediately and persists across reload.
- Enter-to-send selection controls composer keyboard behavior and persists across reload.
- Closing the dialog preserves composer draft, selected thread, selected detail, and scroll state.
- Focused tests cover keyboard/screen-reader behavior and preference persistence.
- Desktop and mobile layouts do not overflow or obscure primary Thread View actions.

## Work plan

- Inspect current theme and Enter-to-send state ownership in `chat-view.tsx` and `chat-view-composer.tsx`.
- Add settings dialog state, markup, and accessible controls near the existing Thread View header actions.
- Move theme and Enter-to-send UI into the dialog while preserving storage keys and behavior.
- Update CSS for the icon button and dialog across desktop/mobile themes.
- Add focused unit and E2E coverage for dialog behavior, persistence, and layout.
- Run targeted validation before handing the slice to sprint evaluation.

## Artifacts / evidence

- Sprint evaluator: `approved` after focus containment was added to the modal settings dialog.
- Dedicated pre-push validation: passed.
- Validation:
  - `npm run check`
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  - `npm test` 15 files / 130 tests
  - `npm run build`
  - `npx playwright test e2e/issue-313-settings-dialog.spec.ts e2e/issue-305-composer-keybindings.spec.ts e2e/issue-306-theme-switching.spec.ts --project=desktop-chromium --project=mobile-chromium` 14 tests

## Status / handoff notes

- Status: `locally complete`
- Active branch: `issue-313-settings-dialog`
- Active worktree: `.worktrees/issue-313-settings-dialog`
- Notes: Implemented a Thread View settings icon button and accessible modal dialog that owns theme and Enter-to-send preferences. Existing storage keys and defaults are preserved, the old standalone header theme switch and composer preference radios were removed, focus is contained while the dialog is open, and desktop/mobile overflow coverage is in place. Completion retrospective: package archive boundary is satisfied; Issue close still requires commit, push, PR, merge to `main`, parent checkout sync, worktree cleanup, and final Issue/Project completion tracking. Workflow note: E2E validation that updates screenshots can dirty tracked visual artifacts outside the target scope; verify and restore generated artifact churn before archive or commit.

## Archive conditions

- Archive this package after the exit criteria are met, dedicated pre-push validation passes, completion retrospective is recorded, and handoff notes point to the final validation evidence.
