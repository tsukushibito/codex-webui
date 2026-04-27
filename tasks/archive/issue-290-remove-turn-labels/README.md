# Issue 290 Remove Turn Labels

## Purpose

- Remove implementation-oriented turn labels from normal Timeline display and prevent streaming/completed Codex card layout shifts.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/290

## Source docs

- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/notes/codex_webui_timeline_contextual_request_and_expansion_note_v0_1.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Hide visible `Turn` / raw turn-id labels in normal Timeline rendering.
- Preserve turn metadata in Details/debug surfaces where available.
- Keep streaming and completed assistant rows on the same outer Timeline structure.
- Add focused regression coverage for visible label removal and streaming-to-completed geometry stability.

## Exit criteria

- Normal Timeline display does not show raw turn labels.
- Streaming and completed Codex rows do not shift because a turn label appears or disappears.
- Internal grouping and request matching behavior continue to work.
- Focused frontend tests and pre-push validation pass.
- Visual evidence is captured if needed for layout-stability acceptance.

## Work plan

- Inspect Timeline grouping and turn-label rendering.
- Remove or visually hide normal turn labels without changing internal group data.
- Add tests for grouped rows, live assistant rows, completed assistant rows, and request matching.
- Run targeted frontend validation and visual inspection if the change affects rendered geometry.

## Artifacts / evidence

- Local frontend validation:
  - `npm run check` passed.
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false` passed.
  - `npm test -- chat-view-timeline.test.tsx timeline-display-model.test.ts chat-view.test.tsx` passed with 47 tests.
- Sprint evaluator: approved.
- Visual evidence:
  - `artifacts/visual-inspection/issue-290-remove-turn-labels/desktop-chromium-live-timeline.png`
  - `artifacts/visual-inspection/issue-290-remove-turn-labels/desktop-chromium-completed-timeline.png`
  - `artifacts/visual-inspection/issue-290-remove-turn-labels/mobile-chromium-live-timeline.png`
  - `artifacts/visual-inspection/issue-290-remove-turn-labels/mobile-chromium-completed-timeline.png`
- Pre-push validation:
  - `npm run check` passed.
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false` passed.
  - `npm test -- chat-view-timeline.test.tsx timeline-display-model.test.ts chat-view.test.tsx` passed with 47 tests.

## Status / handoff notes

- Status: `merged`
- Notes: Normal Timeline rendering no longer emits visible turn-label rows. Internal turn grouping remains on `.timeline-turn-group` and `data-turn-id`, so request matching and metadata recovery continue to work. Focused tests cover hidden visible labels and identical outer structure for live and completed assistant groups. Desktop and mobile screenshots confirm live/completed Timeline rows render without visible turn IDs. Sprint evaluator and pre-push validation passed in the worktree. PR #295 merged to `main` as `8efa637` and closed Issue #290.

## Completion retrospective

- Completion boundary: Issue #290 and this package reached `main` through PR #295.
- Contract check: satisfied by hidden visible turn labels, preserved `data-turn-id`, unchanged grouping/request matching paths, focused unit tests, and desktop/mobile visual evidence for live and completed Timeline states.
- What worked: the narrow render-layer change preserved the display model and request matching behavior while removing the layout-shifting header.
- Workflow problems: the first Playwright capture run hit an existing runtime port and the live assertion needed an exact text locator; both were local capture issues, not product defects.
- Improvements to adopt: use external `PLAYWRIGHT_BASE_URL` with mocked route specs for visual-only captures when the full Playwright runtime stack is unnecessary.
- Skill candidates or skill updates: none.
- Follow-up updates: none.

## Archive conditions

- Archive this package when the exit criteria are met, pre-push validation has passed, handoff notes include evidence, and the work is reachable on `main`.
