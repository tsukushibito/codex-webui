# Issue 242 Thread Orchestration Boundary

## Purpose

- Extract a clearer runtime thread/request orchestration boundary so active v0.9 thread entrypoints are understandable without reading the full legacy session service implementation.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/242

## Source docs

- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `apps/codex-runtime/README.md`

## Scope for this package

- Identify one cohesive extraction from `apps/codex-runtime/src/domain/threads/thread-service.ts` or its immediate runtime collaborators.
- Prefer behavior-preserving helper/service extraction for thread lifecycle, input submission, request response, or projection reads.
- Keep public/internal API behavior unchanged.
- Keep persistence/schema and broad session-service decomposition out of scope unless the bounded extraction requires a small local adapter.

## Exit criteria

- One active thread/request orchestration responsibility has a named runtime home outside the broad service method body.
- Targeted runtime tests cover unchanged behavior for the extracted responsibility.
- `apps/codex-runtime` validation passes.

## Work plan

- Use sprint planning to select the smallest high-value extraction.
- Implement the extraction in the active worktree only.
- Run runtime Biome, focused tests, and any required TypeScript/build checks before pre-push validation.

## Artifacts / evidence

- Sprint evaluator verdict: `approved`.
- Dedicated pre-push validation: passed.
- Validation:
  - `cd apps/codex-runtime && npm run check`
  - `cd apps/codex-runtime && npm test -- tests/thread-routes.test.ts`
  - `cd apps/codex-runtime && npm test`
  - `cd apps/codex-runtime && npm run build`
  - `git diff --check`

## Status / handoff notes

- Status: `locally complete`
- Active branch: `issue-242-thread-orchestration-boundary`
- Active worktree: `.worktrees/issue-242-thread-orchestration-boundary`
- Notes: Extracted existing-thread input submission orchestration into `ThreadInputOrchestrator`, keeping route behavior and the broader session-service decomposition out of scope. Completion retrospective found the slice boundary worked well: planner narrowed the large refactor to one cohesive behavior-preserving extraction, and no durable skill/doc update is needed. PR merge, parent sync, worktree cleanup, Issue close, and Project `Done` remain pending.

## Archive conditions

- Archive this package when the exit criteria are met, the dedicated pre-push validation gate has passed, and these handoff notes are updated with final evidence.
