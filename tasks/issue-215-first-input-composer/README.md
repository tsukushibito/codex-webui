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

- Planned: `artifacts/visual-inspection/issue-215-first-input-composer/`
- Planned: focused frontend test and validation command output in handoff notes.

## Status / handoff notes

- Status: `started`
- Active branch: `issue-215-first-input-composer`
- Active worktree: `.worktrees/issue-215-first-input-composer`
- Notes: Package created from #215 before implementation. Project status update to `In Progress` is handled through the GitHub Projects workflow.

## Archive conditions

- Archive this package after the exit criteria are met, the dedicated pre-push validation gate passes, completion retrospective is recorded, and package handoff notes are updated.
