# Issue 166 Request Detail Recovery

## Purpose

- Execute Issue #166: connect request detail, just-resolved recovery visibility, and background priority promotion from thread context in the v0.9 thread-first UI.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/166

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`, section 5.3
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Open pending request detail from the thread-context detail path on desktop and mobile.
- Support request response actions from the thread-context detail path while keeping minimum confirmation information visible.
- Surface `latest_resolved_request` enough to support recovery-oriented reopening during the retained visibility window.
- Reacquire `thread_view`, `timeline`, and request helper state through REST after reconnect or sequence inconsistency.
- Subscribe to the global notifications stream from the app shell where appropriate.
- Treat notification events as lightweight refresh triggers and priority signals, not authoritative state.
- Surface background `waitingOnApproval`, `systemError`, and latest-turn failure conditions without rebuilding a dedicated approval screen.

## Exit criteria

- Pending request response is reachable from thread context without a dedicated approval screen.
- Mobile request response can be completed from an open relevant thread within the v0.9 usability target.
- Just-resolved request visibility supports recovery rather than disappearing immediately from the user model.
- High-priority background threads are noticeable through lightweight UI signals.
- Notification handling refreshes authoritative REST state instead of treating notification payloads as final state.
- Focused `apps/frontend-bff` validation covers the changed thread/request UI behavior.

## Work plan

- Inspect the current thread-first shell, request helper data flow, and notifications route.
- Plan one bounded sprint that connects request detail, recovery visibility, and notification promotion without expanding into the later Home/workspace-switcher slice.
- Implement the approved sprint in `apps/frontend-bff`.
- Run targeted frontend validation, including `npm run check` for touched frontend files.
- Run the dedicated pre-push validation gate before any push, archive, merge, or close-oriented handoff.

## Artifacts / evidence

- Orchestration log: `artifacts/execution_orchestrator/runs/2026-04-21T07-39-55Z-issue-166-close/events.ndjson`
- Sprint validation evidence:
  - `npm run check` passed.
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false` passed.
  - `npm test -- tests/chat-data.test.ts tests/chat-page-client.test.tsx tests/chat-view.test.tsx tests/home-page-client.test.tsx` passed with 19 tests.
  - `npm test` passed with 58 tests.
- Pre-push validation evidence:
  - Dedicated validator gate passed the same command set.
  - Validator observed `none_beyond_reads`.

## Status / handoff notes

- Status: `locally complete; archived after pre-push validation`
- Active branch: `issue-166-request-detail-recovery`
- Active worktree: `.worktrees/issue-166-request-detail-recovery`
- Notes:
  - Implemented request-detail loading for pending and latest-resolved request helpers.
  - Added thread-context pending/resolved request detail affordances without introducing a dedicated approval screen.
  - Added stream sequence inconsistency and notification-triggered REST refresh paths.
  - Completion retrospective:
    - Completion boundary: package archive after sprint approval and pre-push validation.
    - Contract check: package exit criteria satisfied by frontend implementation and focused/full validation evidence.
    - What worked: planner/worker/evaluator split kept implementation scoped to `apps/frontend-bff`.
    - Workflow problems: initial worktree-local `node_modules` symlink was broken and was corrected as ignored local environment plumbing.
    - Improvements to adopt: keep shared dependency symlink checks explicit when creating worktrees.
    - Skill candidates or skill updates: none.
    - Follow-up updates: PR merge, parent `main` sync, worktree cleanup, final Issue close, and Project `Done` remain pending.

## Archive conditions

- Archive this package after the issue scope is locally complete, sprint approval is recorded, the dedicated pre-push validation gate passes, and handoff notes are updated.
- Do not close Issue #166 or mark Project status `Done` until the work is reachable on `main`, the parent checkout is synced, and the active worktree is removed.
