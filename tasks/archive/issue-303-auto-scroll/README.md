# Issue 303 Auto Scroll

## Purpose

- Keep newly sent user messages and live assistant responses visible in long Thread View timelines without stealing scroll from users reading older content.

## Primary issue

- Issue: [#303 UI: auto-scroll Thread View to newly sent and live messages](https://github.com/tsukushibito/codex-webui/issues/303)

## Source docs

- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Add auto-follow behavior for just-submitted user input and first live/assistant response.
- Preserve manual scroll-away intent and provide a jump-to-latest affordance when auto-follow is suspended.
- Account for composer/footer overlap on desktop and mobile.
- Add focused tests and visual evidence for long-thread send flows.

## Exit criteria

- Sending in a long thread brings the new user message into view.
- Assistant live/response row for that send becomes or remains visible.
- Manual scroll-away suspends auto-follow until the user jumps back/latest.
- Mobile latest content remains readable above composer/footer controls.
- Focused validation and visual evidence are recorded.

## Work plan

- Inspect Thread View timeline scroll container and send/stream update paths.
- Implement bounded auto-follow state and jump-to-latest affordance.
- Add focused unit/e2e coverage for long thread send behavior.
- Run frontend validation and capture visual evidence.

## Artifacts / evidence

- Visual evidence:
  - `artifacts/visual-inspection/issue-303-auto-scroll/desktop-chromium-long-thread-follow.png`
  - `artifacts/visual-inspection/issue-303-auto-scroll/mobile-chromium-long-thread-follow.png`
  - `artifacts/visual-inspection/issue-303-auto-scroll/desktop-chromium-long-thread-follow-viewport.png`
  - `artifacts/visual-inspection/issue-303-auto-scroll/mobile-chromium-long-thread-follow-viewport.png`
- Sprint validation:
  - `npm run check` passed.
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false` passed.
  - `npm test` passed: 15 files / 122 tests.
  - `npm run build` passed.
  - `npx playwright test e2e/issue-303-auto-scroll.spec.ts --project=desktop-chromium --project=mobile-chromium` passed: 2 tests.
- Dedicated pre-push validation repeated the same command set and passed.

## Status / handoff notes

- Status: `locally complete`
- Active branch: `issue-303-auto-scroll`
- Active worktree: `.worktrees/issue-303-auto-scroll`
- Notes:
  - Implemented Thread View scroll-follow state, manual scroll-away suspension, and `Jump to latest activity` recovery.
  - Added focused unit and Playwright coverage for long-thread send/follow behavior.
  - Completion retrospective: package boundary is satisfied locally; durable workflow improvement is to capture viewport screenshots for sticky/mobile UI evidence because full-page mobile captures can make clipped scroll-region content look like overlap.

## Archive conditions

- Archive this package after exit criteria are met, pre-push validation passes, retrospective is recorded, and evidence is linked.
- Archive-ready as of 2026-04-28; keep Issue #303 open until PR merge, parent checkout sync, active worktree cleanup, and Project `Done` verification.
