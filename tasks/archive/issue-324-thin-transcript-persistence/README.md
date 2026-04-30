# Issue 324 thin transcript persistence

## Purpose

- Execute the final child slice for Issue #321 by thinning DB-owned transcript and timeline persistence so `codex app-server` remains the source of truth for native conversation state.

## Primary issue

- Issue: [#324 Runtime: thin duplicate transcript and timeline persistence](https://github.com/tsukushibito/codex-webui/issues/324)

## Source docs

- [Runtime README SQLite persistence boundary](../../../apps/codex-runtime/README.md#sqlite-persistence-boundary)
- [Internal API spec v0.9](../../../docs/specs/codex_webui_internal_api_v0_9.md)
- [MVP roadmap v0.1](../../../docs/codex_webui_mvp_roadmap_v0_1.md)

## Scope for this package

- Constrain follow-up persistence so stale DB-only transcript rows cannot make a thread sendable.
- Stop treating persisted `messages` and `session_events` rows as authoritative native transcript or timeline truth on thread read surfaces.
- Keep bounded helper metadata, idempotency records, and compatibility cache behavior explicit.
- Extend runtime tests around missing native rollout behavior and DB transcript rows.

## Exit criteria

- Follow-up input for a missing native rollout is blocked before appending new DB transcript data.
- Thread feed and timeline behavior does not use DB-only transcript rows as proof of valid native history.
- Runtime tests cover the missing-rollout path with pre-existing DB `messages` / `session_events` rows.
- `apps/codex-runtime` validation passes for `npm run check`, targeted runtime tests, and `npm run build`.

## Work plan

- Inspect the current #323 reachability helper and thread feed/timeline read paths.
- Plan a bounded implementation slice with `codex-webui-sprint-cycle`.
- Apply the implementation in this worktree only.
- Run targeted and standard runtime validations.
- Use the pre-push validation gate before archive, push, PR, and merge handoff.

## Artifacts / evidence

- Orchestration log: `artifacts/execution_orchestrator/runs/2026-04-30T13-42-56Z-issue-321-close/events.ndjson`
- Sprint validation: `npm run check`, `npm test -- tests/thread-routes.test.ts`, and `npm run build` passed in `apps/codex-runtime`.
- Pre-push validation: `npm run check`, `npm test -- tests/thread-routes.test.ts`, `npm run build`, and `git diff --check` passed.

## Status / handoff notes

- Status: `archived`
- Notes: Implemented DB transcript cache quarantine for recovery-pending native threads. Follow-up input now checks recovery state before replaying cached `messages.client_message_id` rows, thread feed/timeline return empty pages for `thread_recovery_pending`, and session message/event list helpers return empty pages for `app_session_overlay_state=recovery_pending`.
- Completion retrospective: package archive boundary is satisfied. The Issue remains open until the branch is committed, published, merged to `main`, the worktree is removed, and GitHub tracking is finalized. No new repo skill is needed; the only workflow issue was temporary GitHub GraphQL rate limiting for Project field updates, already logged in the orchestration run.

## Archive conditions

- Archived after the exit criteria were met, pre-push validation passed, and retrospective notes were recorded.
