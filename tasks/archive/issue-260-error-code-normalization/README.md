# Issue 260 Error Code Normalization

## Purpose

- Normalize active v0.9 thread/request error envelopes so public and internal endpoints no longer expose session-era error codes where the browser-facing operation is thread or request scoped.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/260

## Source docs

- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `apps/codex-runtime/README.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Audit active v0.9 runtime and BFF thread/request endpoints for session-era error names in returned envelopes.
- Rename or map representative thread/request errors at the correct boundary without changing retired legacy route behavior.
- Update focused runtime and BFF tests for the normalized error behavior.
- Keep compatibility with internal persistence and legacy implementation names where they are not exposed through active v0.9 contracts.

## Exit criteria

- Active v0.9 thread/request endpoints expose v0.9-aligned error names or an explicitly tested compatibility mapping.
- Representative missing-thread, invalid-state, and runtime-unavailable cases are covered by focused tests.
- Retired `/sessions` and `/approvals` route behavior remains out of scope and unchanged.
- Touched app validation passes.

## Work plan

- Identify active route handlers and service boundaries that currently emit `session_not_found`, `session_invalid_state`, `session_runtime_error`, or `session_id` details for thread/request operations.
- Introduce the smallest boundary helpers needed to translate active v0.9 endpoint errors to thread/request terminology.
- Update route/service tests that assert active endpoint error envelopes.
- Run targeted runtime and BFF validation before the dedicated pre-push gate.

## Artifacts / evidence

- Sprint evaluator verdict: `approved`.
- Dedicated pre-push validation: passed.
- Validation:
  - `cd apps/codex-runtime && npm run check`
  - `cd apps/codex-runtime && npm test -- tests/thread-routes.test.ts`
  - `cd apps/frontend-bff && npm run check`
  - `cd apps/frontend-bff && node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  - `cd apps/frontend-bff && npm test -- tests/routes.test.ts`
  - `git diff --check`

## Status / handoff notes

- Status: `locally complete`
- Active branch: `issue-260-error-code-normalization`
- Active worktree: `.worktrees/issue-260-error-code-normalization`
- Notes: Active v0.9 runtime and BFF thread/request error envelopes now normalize representative session-era codes and details at the thread/request boundary. Retired `/sessions` and `/approvals` route behavior remains out of scope and unchanged. Completion retrospective found no durable skill/doc update needed; the only workflow anomaly was a recoverable validator spawn retry after completed agent slots were still open. PR merge, parent sync, worktree cleanup, Issue close, and Project `Done` remain pending.

## Archive conditions

- Archive this package when the exit criteria are met, the dedicated pre-push validation gate has passed, and these handoff notes are updated with final evidence.
