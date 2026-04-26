# Issue 244 Gateway Event Translation

## Purpose

- Separate native app-server process/RPC mechanics from event translation helpers in the runtime gateway without changing gateway behavior.

## Primary issue

- Issue: https://github.com/tsukushibito/codex-webui/issues/244

## Source docs

- `docs/specs/codex_webui_app_server_contract_matrix_v0_9.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `apps/codex-runtime/README.md`

## Scope for this package

- Extract one cohesive pure event translation/convergence helper from `codex-app-server-gateway.ts`.
- Keep gateway public interface, process lifecycle, RPC transport, and runtime behavior unchanged.
- Add or preserve focused runtime coverage for the extracted helper where useful.

## Exit criteria

- One event translation responsibility has a named runtime home outside the process/RPC gateway body.
- Existing gateway/runtime validation passes.
- No app-server transport contract or runtime API behavior changes.

## Work plan

- Use sprint planning to select the smallest high-value extraction.
- Implement the extraction in the active worktree only.
- Run runtime validation and dedicated pre-push validation before archive/PR follow-through.

## Artifacts / evidence

- Sprint evaluator verdict: `approved`.
- Dedicated pre-push validation: passed.
- Validation:
  - `cd apps/codex-runtime && npm run check`
  - `cd apps/codex-runtime && npm test -- tests/app-server-event-translation.test.ts tests/thread-routes.test.ts`
  - `cd apps/codex-runtime && npm run build`
  - `git diff --check`

## Status / handoff notes

- Status: `locally complete`
- Active branch: `issue-244-gateway-event-translation`
- Active worktree: `.worktrees/issue-244-gateway-event-translation`
- Notes: Extracted native command approval event translation into a pure `app-server-event-translation` helper. Gateway process lifecycle, JSON-RPC transport, request sending, notification sending, approval resolution, and turn convergence remain unchanged. Completion retrospective found no durable skill/doc update needed. PR merge, parent sync, worktree cleanup, Issue close, and Project `Done` remain pending.

## Archive conditions

- Archive this package when the exit criteria are met, the dedicated pre-push validation gate has passed, and these handoff notes are updated with final evidence.
