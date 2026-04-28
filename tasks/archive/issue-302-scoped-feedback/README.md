# Issue 302 Scoped Feedback

## Purpose

- Route UI error and status feedback to stable surfaces near the operation that produced it, without shifting the main Thread View layout.

## Primary issue

- Issue: [#302 UI: show scoped error feedback without layout shift](https://github.com/tsukushibito/codex-webui/issues/302)

## Source docs

- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/notes/codex_webui_timeline_contextual_request_and_expansion_note_v0_1.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Replace the current top-of-layout global error banner path for operation-scoped failures.
- Map existing `errorMessage` and `statusMessage` producers to stable composer, Thread View, Navigation/workspace, request, or notification-adjacent feedback surfaces.
- Preserve drafts, selected workspace/thread, and layout dimensions when feedback changes.
- Add focused tests and visual evidence for representative desktop and mobile feedback states.

## Exit criteria

- No operation-scoped failure uses the top-of-chat-layout global banner.
- Composer/start/send/input-unavailable feedback appears in a stable composer-adjacent rail.
- Thread load/open/recovery feedback appears in a stable Thread View body or feedback slot.
- Workspace/thread-list/create feedback appears near Navigation/workspace controls.
- Request response feedback appears near request controls or request detail context.
- Existing feedback producers are covered by focused tests and representative visual evidence.

## Work plan

- Inspect current `setErrorMessage` and `setStatusMessage` producers and existing feedback slots.
- Introduce a small typed feedback routing model if needed to avoid stringly global state.
- Update Chat Page and Chat View components so scoped feedback renders near its owner surface.
- Add focused tests for routing and no global scoped banner usage.
- Run frontend validation and capture representative visual evidence.

## Artifacts / evidence

- Visual evidence:
  - `artifacts/visual-inspection/issue-302-scoped-feedback/issue-302-background-priority-before-desktop-chromium.png`
  - `artifacts/visual-inspection/issue-302-scoped-feedback/issue-302-background-priority-after-desktop-chromium.png`
  - `artifacts/visual-inspection/issue-302-scoped-feedback/issue-302-background-priority-before-mobile-chromium.png`
  - `artifacts/visual-inspection/issue-302-scoped-feedback/issue-302-background-priority-after-mobile-chromium.png`
- Validation:
  - `npm run check`
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  - `node ./node_modules/vitest/vitest.mjs run tests/chat-view.test.tsx tests/chat-view-navigation.test.tsx tests/chat-page-client.test.tsx`
  - `npm test`
  - `node ./node_modules/@playwright/test/cli.js test e2e/background-priority.spec.ts e2e/approval-flow.spec.ts --project=desktop-chromium --project=mobile-chromium`

## Status / handoff notes

- Status: `locally complete`
- Active branch: `issue-302-scoped-feedback`
- Active worktree: `.worktrees/issue-302-scoped-feedback`
- Notes: Implemented scoped feedback routing for composer, thread view, navigation/workspace, request actions, and notifications. Removed the top-of-layout operation feedback banner path and added focused tests plus desktop/mobile evidence. Completion retrospective: package archive boundary is satisfied; Issue close still requires commit, push, PR, merge to `main`, parent sync, worktree cleanup, and final Issue/Project tracking cleanup.

## Archive conditions

- Archive this package after the exit criteria are met, dedicated pre-push validation passes, completion retrospective is recorded, and handoff notes point to the final validation evidence.
