# Issue 245 Request Helper Lifecycle

## Purpose

- Isolate request-helper lifecycle and just-resolved recovery rules from broad runtime thread/session services.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/245

## Source docs

- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `apps/codex-runtime/README.md`

## Scope for this package

- Extract one cohesive request-helper lifecycle responsibility from runtime thread/request code.
- Preserve current internal/public shapes and request response behavior.
- Add or preserve targeted pending/resolved/missing request coverage.

## Exit criteria

- One request-helper lifecycle rule has a named runtime home.
- Targeted runtime tests document pending/latest-resolved or missing/resolved behavior after extraction.
- Runtime validation passes.

## Work plan

- Use sprint planning to select the smallest high-value request-helper lifecycle slice.
- Implement the extraction in the active worktree only.
- Run runtime validation and dedicated pre-push validation before archive/PR follow-through.

## Artifacts / evidence

- Sprint evaluator verdict: `approved`.
- Dedicated pre-push validation: passed.
- Validation:
  - `cd apps/codex-runtime && npm run check`
  - `cd apps/codex-runtime && npm test -- thread-routes.test.ts`
  - `cd apps/codex-runtime && npm run build`
  - `git diff --check`

## Status / handoff notes

- Status: `locally complete`
- Active branch: `issue-245-request-helper-lifecycle`
- Active worktree: `.worktrees/issue-245-request-helper-lifecycle`
- Notes: Extracted pending/latest-resolved helper lifecycle selection into `thread-request-helper-lifecycle`. `ThreadService` still validates thread existence and sets `checked_at`, while the helper owns pending-wins and newest-resolved selection. Completion retrospective found no durable skill/doc update needed. PR merge, parent sync, worktree cleanup, Issue close, and Project `Done` remain pending.

## Archive conditions

- Archive this package when the exit criteria are met, the dedicated pre-push validation gate has passed, and these handoff notes are updated with final evidence.
