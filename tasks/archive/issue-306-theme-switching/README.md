# Issue 306 Theme Switching

## Purpose

- Add locally persisted dark and light UI theme switching, with dark theme as the default.

## Primary issue

- Issue: [#306 UI: add dark and light theme switching](https://github.com/tsukushibito/codex-webui/issues/306)

## Source docs

- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Add a dark/light theme preference with local storage persistence.
- Apply the theme at the app shell/root level through shared CSS tokens.
- Refactor visible light-only colors where needed for main surfaces.
- Add a compact accessible theme switch control.
- Add focused tests and desktop/mobile visual evidence for both themes.

## Exit criteria

- First-time load uses dark theme by default.
- Users can switch between dark and light themes without leaving Thread View.
- The selected theme persists across reloads.
- Navigation, Thread View, timeline rows, composer, request controls, Detail Surface, feedback states, and form controls remain legible in both themes.
- `color-scheme` matches the active theme.
- Theme switching does not reset selected workspace/thread, composer draft, scroll position, or open Detail Surface state.
- Focused validation and visual evidence are recorded.

## Work plan

- Inspect current CSS token usage and visible hard-coded light colors.
- Implement theme preference state and root theme application.
- Add a compact theme switch control in an existing Thread View/Navigation location.
- Add focused tests for persistence and state preservation.
- Run frontend validation and capture dark/light desktop/mobile evidence.

## Artifacts / evidence

- Visual evidence:
  - `artifacts/visual-inspection/issue-306-theme-switching/desktop-dark.png`
  - `artifacts/visual-inspection/issue-306-theme-switching/desktop-light.png`
  - `artifacts/visual-inspection/issue-306-theme-switching/mobile-dark.png`
  - `artifacts/visual-inspection/issue-306-theme-switching/mobile-light.png`
  - `artifacts/visual-inspection/issue-306-theme-switching/desktop-pending-request-dark.png`
  - `artifacts/visual-inspection/issue-306-theme-switching/desktop-pending-request-light.png`
  - `artifacts/visual-inspection/issue-306-theme-switching/mobile-pending-request-dark.png`
  - `artifacts/visual-inspection/issue-306-theme-switching/mobile-pending-request-light.png`
  - `artifacts/visual-inspection/issue-306-theme-switching/desktop-detail-dark.png`
  - `artifacts/visual-inspection/issue-306-theme-switching/desktop-detail-light.png`
  - `artifacts/visual-inspection/issue-306-theme-switching/mobile-detail-dark.png`
  - `artifacts/visual-inspection/issue-306-theme-switching/mobile-detail-light.png`
  - `artifacts/visual-inspection/issue-306-theme-switching/desktop-feedback-info-dark.png`
  - `artifacts/visual-inspection/issue-306-theme-switching/desktop-feedback-success-dark.png`
  - `artifacts/visual-inspection/issue-306-theme-switching/desktop-feedback-error-light.png`
  - `artifacts/visual-inspection/issue-306-theme-switching/mobile-feedback-info-dark.png`
  - `artifacts/visual-inspection/issue-306-theme-switching/mobile-feedback-success-dark.png`
  - `artifacts/visual-inspection/issue-306-theme-switching/mobile-feedback-error-light.png`
- Sprint validation:
  - `npm run check` passed.
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false` passed.
  - `npm test` passed: 15 files / 128 tests.
  - `npm run build` passed.
  - `npx playwright test e2e/issue-306-theme-switching.spec.ts` passed: 8 tests.
- Dedicated pre-push validation repeated the required command set with explicit desktop/mobile Playwright projects and passed.

## Status / handoff notes

- Status: `locally complete`
- Active branch: `issue-306-theme-switching`
- Active worktree: `.worktrees/issue-306-theme-switching`
- Notes:
  - Implemented dark-first theme bootstrapping, a compact accessible switch, localStorage persistence, invalid/inaccessible storage fallback, root `data-theme`, and synchronized `color-scheme`.
  - Converted visible Chat View shell and control colors toward theme tokens for dark/light rendering.
  - Added focused unit and Playwright coverage for default theme, switching, persistence, invalid fallback, state preservation, and desktop/mobile screenshots.
  - Completion retrospective: package boundary is satisfied locally; the first evaluator pass caught missing visual evidence for request controls, Detail Surface, and feedback states, so future theme/visual slices should enumerate required screenshot surfaces before the first worker handoff.

## Archive conditions

- Archive this package after exit criteria are met, pre-push validation passes, retrospective is recorded, and evidence is linked.
- Archive-ready as of 2026-04-28; keep Issue #306 open until PR merge, parent checkout sync, active worktree cleanup, and Project `Done` verification.
