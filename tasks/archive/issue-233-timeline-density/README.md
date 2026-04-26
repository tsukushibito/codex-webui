# Issue #233 Timeline Density

## Purpose

Improve Timeline density and local expand behavior so the thread work log remains the primary surface while verbose rows stay recoverable.

## Primary issue

- https://github.com/tsukushibito/codex-webui/issues/233

## Source docs

- `docs/notes/codex_webui_thread_view_information_architecture_note_v0_1.md`
- `apps/frontend-bff/src/timeline-display-model.ts`
- `apps/frontend-bff/src/chat-view.tsx`

## Scope for this package

- Fold long or noisy Timeline row content behind an inline expand control.
- Keep the first useful content visible in the Timeline.
- Tighten Timeline spacing without removing metadata or contextual details.
- Preserve latest-activity scroll and return-to-latest behavior.

## Exit criteria

- Long Timeline content can be expanded in place.
- Timeline rows use less vertical space for routine scanning.
- Existing Timeline detail buttons continue to work.
- Return-to-latest behavior remains covered.
- Focused tests and `apps/frontend-bff` checks pass.

## Work plan

1. Inspect the existing Timeline display model, scroll behavior, and row rendering.
2. Add local row expansion state and preview generation in `ChatView`.
3. Tighten Timeline CSS spacing and add folded-row affordance styles.
4. Add focused coverage for fold/expand behavior.
5. Run targeted validation, then the pre-push validation gate.

## Artifacts / evidence

- Local implementation validation passed:
  - `npm run check`: passed.
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`: passed.
  - `npm test -- tests/chat-view.test.tsx`: 16 tests passed.
  - `npm run test:e2e -- e2e/chat-flow.spec.ts --project=desktop-chromium --reporter=line`: 1 test passed.
  - `npm run test:e2e -- e2e/chat-flow.spec.ts --project=mobile-chromium --reporter=line`: 1 test passed.
- Playwright emitted the known `NO_COLOR` / `FORCE_COLOR` warning; it did not block tests.

## Status / handoff notes

- Active worktree: `.worktrees/issue-233-timeline-density`
- Active branch: `issue-233-timeline-density`
- Active PR: None yet.
- Completion boundary: package archive, PR, main merge, Issue close.
- Contract check:
  - Long Timeline rows preview the first useful lines and expand in place.
  - Routine Timeline spacing is tighter on desktop and mobile.
  - Existing Timeline detail buttons remain reachable from row actions.
  - Existing return-to-latest tests still pass.
- Retrospective:
  - What worked: local fold state kept the behavior isolated to `ChatView`; no data model contract change was needed.
  - Workflow problems: none beyond the known Playwright color warning.
  - Improvements to adopt: keep row action affordances grouped so future row-level actions do not add extra vertical scaffolding.
  - Skill candidates or skill updates: none.
