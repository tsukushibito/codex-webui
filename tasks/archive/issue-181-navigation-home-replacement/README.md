# Issue 181 Navigation Home Replacement

## Purpose

- Implement Navigation as the primary replacement for old Home responsibilities in the renewed v0.9 browser shell.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/181

## Source docs

- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Implement workspace switching and new-workspace entry points in Navigation.
- Implement current-workspace thread discovery sections for attention-needed, active, and recent threads.
- Add badges, blocked cues, resume cues, selected-thread state, and deep-link return behavior where supported by current public data.
- Remove Home-dependent primary interactions from the desktop-first browser path.

## Exit criteria

- Users can switch workspace, start a thread, resume a thread, and find attention-needed threads from Navigation or contextual empty states without a primary Home screen.
- Approval, error, failed, active, and recent threads are distinguishable in the thread list.
- Reconnect return cues are visible from Navigation.
- Focused frontend validation passes for the changed Navigation and app-shell behavior.

## Work plan

- Inspect the current `apps/frontend-bff` UI structure, public data hooks, and tests for Home, Navigation, workspace, and thread-list behavior.
- Plan one bounded implementation slice around existing component and route patterns.
- Update the Navigation/app-shell UI and any required client-side view model helpers.
- Add or update focused tests for workspace switching, thread-list priority sections, cues, selection, and Home-independent desktop entry behavior.
- Run targeted validation first, then the app-level validation commands required by `apps/frontend-bff/README.md` as scope permits.

## Artifacts / evidence

- Orchestration log: `artifacts/execution_orchestrator/runs/2026-04-23T03-29-35Z-issue-181-close/events.ndjson`
- Validation evidence:
  - 2026-04-23: `npm test -- chat-view.test.tsx chat-page-client.test.tsx` passed, 2 files / 16 tests.
  - 2026-04-23: `npm run check` passed, 69 files checked.
  - 2026-04-23: `node ./node_modules/typescript/bin/tsc --noEmit --pretty false` passed.
  - 2026-04-23: `npm test` passed, 10 files / 59 tests.

## Status / handoff notes

- Status: `completed; archived after pre-push validation`
- Active branch: `issue-181-navigation-home-replacement`
- Active worktree: `.worktrees/issue-181-navigation-home-replacement`
- Notes: Root `/` now renders the thread-first chat shell. Navigation owns workspace switching, workspace creation, current-workspace thread grouping/cues, and Home-independent first input entry.
- Completion retrospective:
  - Completion boundary: package archive; Issue close still requires PR merge, parent checkout sync, worktree cleanup, and final GitHub tracking.
  - Contract check: package exit criteria satisfied by changed UI/tests plus sprint evaluator approval and dedicated pre-push validation.
  - What worked: reusing `ChatPageClient`/`ChatView` avoided a parallel shell and kept public API contracts unchanged.
  - Workflow problems: the first worker disconnected after in-scope edits; rerunning a replacement worker against verified worktree state recovered cleanly.
  - Improvements to adopt: keep replacement-worker prompts focused on existing candidate validation/fix when an allowed writer disconnects mid-sprint.
  - Skill candidates or skill updates: none.
  - Follow-up updates: publish through PR, merge to `main`, remove the active worktree, then close Issue #181 and set Project `Done`.

## Archive conditions

- Archive complete after exit criteria were met, dedicated pre-push validation passed, completion retrospective was recorded, and handoff notes were updated.
