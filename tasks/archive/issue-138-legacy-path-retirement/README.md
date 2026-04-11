# Issue #138 legacy path retirement

## Purpose

- Remove the remaining browser-facing dependence on the old public `session` and standalone `approval` surface in `frontend-bff`.

## Primary issue

- Issue: `#138` https://github.com/tsukushibito/codex-webui/issues/138

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Replace browser data-loading and reconnect paths that still call `/api/v1/sessions/*` or `/api/v1/approvals/*`.
- Remove or retire browser-only route handlers that keep the old public `session` and `approval` contract alive.
- Update focused tests so browser-critical flows validate against the maintained v0.9 thread/request endpoints only.

## Exit criteria

- No browser-critical page or client code in `apps/frontend-bff` depends on `/api/v1/sessions/*` or `/api/v1/approvals/*`.
- The browser can initialize, refresh, and reconnect from maintained v0.9 `thread`, `thread_view`, `timeline`, `pending_request`, `request`, and stream endpoints alone.
- Any residual legacy route left in the repo is explicitly outside browser-critical MVP scope.

## Work plan

- Audit `app/`, `src/`, and `tests/` for browser-facing `session` and `approval` path usage.
- Cut browser data access and SSE wiring over to v0.9 thread/request endpoints.
- Remove or quarantine obsolete route handlers that are no longer needed for browser-critical MVP flows.
- Run focused validation for `frontend-bff`, then archive the package after the pre-push gate passes.

## Artifacts / evidence

- Validation passed: `npm run check`
- Validation passed: `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
- Validation passed: `npm test`
- Validation passed: `npm run build`

## Status / handoff notes

- Status: `locally complete`
- Notes: Browser-facing `Home` and `Chat` now use `threads`, `thread_view`, `requests`, and thread/notifications stream endpoints only. `/approvals` now redirects to Home, and the unused browser approval client/data/view files were removed. Legacy session/approval route handlers remain in `app/api/` and `src/handlers.ts`, but no browser-critical page or client code depends on them.

## Archive conditions

- Archive this package when the exit criteria are met, the dedicated pre-push validation gate passes, and the handoff notes are updated.
