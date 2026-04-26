# Issue #234 Navigation Minibar

## Purpose

Simplify Navigation thread cards and add a desktop sidebar minibar mode so Navigation supports selection and triage without competing with the Timeline.

## Primary issue

- https://github.com/tsukushibito/codex-webui/issues/234

## Source docs

- `docs/notes/codex_webui_thread_view_information_architecture_note_v0_1.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `apps/frontend-bff/src/chat-view.tsx`

## Scope for this package

- Remove long repeated status prose from routine Navigation cards.
- Replace the selected text badge with structural selected state and an icon-like status mark.
- Add a desktop sidebar minibar mode with local preference persistence.
- Keep recovery paths from minibar to full Navigation, new thread, current workspace, current thread, and attention threads.

## Exit criteria

- Navigation cards show title, compact updated time, status mark, selected state, and attention cues only when meaningful.
- Full Navigation can collapse to a minibar and expand back via keyboard-accessible buttons.
- The minibar keeps current workspace/thread orientation and attention-thread affordances.
- Existing mobile Navigation and thread selection behavior continue to work.

## Artifacts / evidence

- Local implementation validation passed:
  - `npm run check`: passed.
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: passed.
  - `npm test -- tests/chat-view.test.tsx`: 17 tests passed.
  - `npm run test:e2e -- e2e/chat-flow.spec.ts --project=desktop-chromium --reporter=line`: 1 test passed.
  - `npm run test:e2e -- e2e/chat-flow.spec.ts --project=mobile-chromium --reporter=line`: 1 test passed.
- Playwright emitted the known `NO_COLOR` / `FORCE_COLOR` warning; it did not block tests.

## Status / handoff notes

- Active worktree: `.worktrees/issue-234-navigation-minibar`
- Active branch: `issue-234-navigation-minibar`
- Active PR: None yet.
- Completion boundary: package archive, PR, main merge, Issue close.
- Contract check:
  - Selected Navigation card uses `aria-current="page"` and the active style, not a visible `Selected` badge.
  - Routine idle cards no longer repeat long current-activity prose.
  - Minibar exposes Expand Navigation, New, current workspace, current thread, and attention-thread buttons.
  - Sidebar mode writes to `localStorage` when available and degrades without blocking controls.
- Retrospective:
  - What worked: keeping the minibar inside the existing Navigation landmark preserved recovery paths without adding a second navigation system.
  - Workflow problems: jsdom's localStorage shape in this test environment required defensive storage access.
  - Improvements to adopt: preference-backed UI state should tolerate unavailable or nonstandard storage APIs.
  - Skill candidates or skill updates: none.
