# Issue 297: Chat Column Simplify

## Purpose

Simplify the Thread View chat column so it contains only user/Codex messages, Streaming assistant progress, approval/request interactions, the composer, and a compact composer status line.

## Primary issue

- [Issue #297: UI: simplify chat column to messages approvals and composer status line](https://github.com/tsukushibito/codex-webui/issues/297)

## Source docs

- `README.md`
- `AGENTS.md`
- `apps/frontend-bff/README.md`
- `apps/frontend-bff/AGENTS.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`

## Scope for this package

- Remove the large chat topbar workspace header.
- Add a compact status line under the composer input, initially showing only the selected workspace name.
- Keep Streaming/live assistant rows visible.
- Keep approval/request rows and controls visible.
- Remove or hide non-approval thread feedback/status cards from the chat column.
- Remove Timeline loading and empty-state text from the chat column.
- Filter chat Timeline display rows to user messages, assistant messages, and approval/request rows.
- Remove running-oriented composer guidance from the visible chat column.
- Remove the latest-activity CTA from the chat column.

## Exit criteria

- Thread View no longer renders the large workspace topbar.
- The composer renders a compact workspace status line.
- User messages, Codex messages, Streaming live assistant rows, and approval/request controls still render.
- Chat column system status cards/text are absent.
- Focused frontend tests cover the changed display behavior.
- Validation passes for the touched frontend surface.

## Work plan

1. Update ChatView structure to remove topbar and non-approval feedback surfaces.
2. Update ChatViewComposer to render a compact status line below the input.
3. Update Timeline display filtering/loading/empty behavior.
4. Update CSS for the composer status line and remove stale topbar/status styling where appropriate.
5. Update tests for retained message/approval behavior and removed system status surfaces.
6. Run focused validation, then full frontend gates required for this slice.

## Artifacts / evidence

- Sprint evaluator verdict: approved.
- Dedicated pre-push validation: passed.
- Validation commands:
  - `npm run check`
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  - `node ./node_modules/vitest/vitest.mjs run tests/timeline-display-model.test.ts tests/chat-view-timeline.test.tsx tests/chat-view.test.tsx tests/chat-page-client.test.tsx`
  - `npm test`
  - `npm run build`
- Validation results:
  - Focused Vitest subset: 4 files passed, 69 tests passed.
  - Full Vitest suite: 15 files passed, 121 tests passed.
  - Production build completed successfully.
- Orchestration log: `artifacts/execution_orchestrator/runs/2026-04-27T16-54-09Z-issue-297-close/events.ndjson`

## Status / handoff notes

- Active branch: `issue-297-chat-column-simplify`
- Active worktree: `.worktrees/issue-297-chat-column-simplify`
- Implemented chat-column simplification:
  - Removed the large chat topbar workspace header.
  - Added compact composer status segments showing the selected workspace name.
  - Removed visible non-approval status surfaces from the chat column.
  - Removed Timeline loading and empty-state text.
  - Filtered chat Timeline rows to user messages, assistant messages, Streaming assistant progress, and approval/request rows.
  - Kept unfiltered Timeline data for Thread Details so artifact/detail inspection remains available.
- Completion retrospective:
  - Completion boundary: package archive after approved sprint and passed pre-push validation.
  - Contract check: package exit criteria satisfied by changed frontend UI and focused/full validation evidence.
  - What worked: evaluator caught a real filtering edge case before archive; dedicated validator gate then covered full tests and build.
  - Workflow problems: initial validator spawn hit the subagent thread limit; completed agents were closed and validation was retried cleanly.
  - Improvements to adopt: close completed subagents before starting the pre-push validator in long orchestration runs.
  - Skill candidates or updates: none required.
  - Follow-up updates: PR merge, parent checkout sync, worktree cleanup, Issue close, and Project Done remain for GitHub-projects completion flow.

## Archive conditions

- Dedicated pre-push validation has passed.
- Package evidence and handoff notes are updated.
- Package is moved to `tasks/archive/issue-297-chat-column-simplify/`.
- Issue execution metadata points to the archived package while PR/main completion proceeds.
