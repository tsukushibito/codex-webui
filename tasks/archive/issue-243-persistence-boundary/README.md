# Issue 243 Persistence Boundary

## Purpose

- Introduce a small v0.9 persistence naming boundary so runtime thread/request domain code can reason in thread/request terms while legacy SQLite table names remain an implementation detail.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/243

## Source docs

- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `apps/codex-runtime/README.md`

## Scope for this package

- Decide and document a bounded adapter-boundary approach instead of a broad schema rename.
- Pilot that boundary on one narrow runtime thread/request resource family.
- Keep SQLite schema, migrations, and public/internal API behavior unchanged.

## Exit criteria

- The chosen adapter-vs-migration decision is documented in the package notes.
- One narrow runtime domain path uses a named thread/request persistence boundary instead of scattering table names through service logic.
- Runtime validation passes.

## Work plan

- Use sprint planning to select the smallest high-value persistence boundary slice.
- Implement the boundary in the active worktree only.
- Run runtime validation and dedicated pre-push validation before archive/PR follow-through.

## Artifacts / evidence

- Sprint evaluator verdict: `approved`.
- Dedicated pre-push validation: passed.
- Validation:
  - `cd apps/codex-runtime && npm run check`
  - `cd apps/codex-runtime && npm test`
  - `cd apps/codex-runtime && npm run build`
  - `rg -n "\bapprovals\b|ApprovalRow|\.from\(approvals\)|\.update\(approvals\)" apps/codex-runtime/src/domain/threads/thread-service.ts`
  - `git diff --check`

## Status / handoff notes

- Status: `locally complete`
- Active branch: `issue-243-persistence-boundary`
- Active worktree: `.worktrees/issue-243-persistence-boundary`
- Notes: Decision for this slice is explicit adapter-over-migration. Keep legacy SQLite table/schema names such as `approvals` unchanged for now, and isolate the runtime request-helper resource family behind a thread/request persistence projection boundary instead of renaming tables, columns, or Drizzle exports in this sprint. Implemented `ThreadRequestPersistence`; `ThreadService` no longer imports or queries `approvals` directly for request-helper reads and resolution updates. Completion retrospective found the adapter-over-migration choice kept the slice bounded with no durable skill/doc update needed. Other legacy table usage remains outside this package. PR merge, parent sync, worktree cleanup, Issue close, and Project `Done` remain pending.

## Archive conditions

- Archive this package when the exit criteria are met, the dedicated pre-push validation gate has passed, and these handoff notes are updated with final evidence.
