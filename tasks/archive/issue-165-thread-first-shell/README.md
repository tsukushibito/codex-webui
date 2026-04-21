# Issue 165 Thread-First Shell

## Purpose

- Recompose the main browser shell around the v0.9 thread-first layout model for Issue #165.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/165

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`, section 5.3
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Implement desktop `[Navigation] [Thread View]` as the base composition.
- Implement desktop `[Navigation] [Thread View] [Detail Surface]` only when secondary detail is open.
- Implement mobile single-column `thread_view` behavior.
- Provide mobile navigation drawer or sheet foundations.
- Provide request, error, or item detail sheet/full-screen foundations on mobile.
- Make `timeline` the dominant body of `thread_view`.
- Keep current activity as a pinned summary rather than a competing primary panel.
- Keep one dominant action path visible on mobile.

## Exit criteria

- Desktop follows the Navigation / Thread View / Detail Surface model from the v0.9 UI layout spec.
- Mobile works at 360 CSS px without horizontal scrolling.
- `thread_view` remains the primary context when detail opens.
- Detail opening is selection-driven and does not replace lightweight notification signals.
- Focused component tests cover desktop composition and mobile drawer/sheet behavior.

## Work plan

- Inspect the existing chat shell, thread view, and global CSS implementation in `apps/frontend-bff`.
- Add or adjust focused component tests for desktop composition and mobile drawer/sheet behavior before implementation where practical.
- Recompose the browser shell so navigation, thread view, and secondary detail surfaces match the v0.9 layout rules.
- Update CSS to support the responsive desktop/mobile layout without horizontal scrolling at 360 CSS px.
- Run targeted component tests, then the frontend validation sequence required by `apps/frontend-bff/README.md`.

## Artifacts / evidence

- Orchestration log: `artifacts/execution_orchestrator/runs/2026-04-21T06-06-34Z-issue-165-close/events.ndjson`
- Sprint evaluator verdict: `approved`
- Pre-push validation gate: `passed`
- Validation evidence:
  - `git diff --check`
  - `npm test -- tests/chat-view.test.tsx tests/chat-page-client.test.tsx`
  - `npm run check`
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  - `npm test`
  - `npm run build`

## Status / handoff notes

- Status: `locally complete`
- Active branch: `issue-165-thread-first-shell`
- Active worktree: `.worktrees/issue-165-thread-first-shell`
- Active PR: `None`
- Notes: Reworked the Chat UI into a v0.9 thread-first shell with desktop navigation/thread/detail composition, selection-driven request/timeline detail, mobile overlay foundations, and timeline as the dominant thread body. Pre-push validation passed; remaining completion work is PR publish, merge to `main`, parent sync, worktree cleanup, Issue close, and Project `Done`.

### Completion retrospective

- Completion boundary: package archive after evaluator approval and pre-push validation.
- Contract check: package exit criteria satisfied by `apps/frontend-bff/src/chat-view.tsx`, `apps/frontend-bff/app/globals.css`, and focused client coverage in `apps/frontend-bff/tests/chat-page-client.test.tsx`; Issue close remains blocked until the branch is merged to `main` and cleanup is complete.
- What worked: planner/worker/evaluator separation kept the UI composition slice bounded, and validator caught the previously missing build gate before publish.
- Workflow problems: worktree-local `node_modules` symlink needed correction from the initially created relative target before npm commands could run.
- Improvements to adopt: use the documented `../../../../apps/frontend-bff/node_modules` target when creating app-local `node_modules` symlinks from `.worktrees/<branch>/apps/frontend-bff`.
- Skill candidates or skill updates: consider tightening `codex-webui-work-packages` symlink examples for app-local paths under `.worktrees/`.
- Follow-up updates: none required before archiving; final tracking belongs to GitHub/PR completion after merge.

## Archive conditions

- Archive this package when the exit criteria are met, the dedicated pre-push validation gate passes, completion retrospective notes are captured, and the handoff notes are updated.
