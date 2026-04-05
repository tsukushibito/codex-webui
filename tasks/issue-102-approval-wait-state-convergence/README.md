# Issue 102 Approval Wait-State Convergence

## Purpose

- Restore browser-visible approval convergence so `waiting_approval` appears in Chat and Approval views without requiring a manual reload.

## Primary issue

- Issue: `#102 https://github.com/tsukushibito/codex-webui/issues/102`

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_8.md`
- `docs/specs/codex_webui_public_api_v0_8.md`
- `apps/frontend-bff/README.md`

## Scope for this package

- Identify why approval-requested state does not move the browser into `waiting_approval` until reload.
- Fix the live convergence path so Chat status and Approval UI reflect the same approval event without manual refresh.
- Add focused regression coverage for browser-visible approval-requested convergence.

## Exit criteria

- Approval-requested state is reflected in Chat without reload.
- Approval queue/detail and Chat status converge from the same live event path.
- Focused validation covers the approval-requested browser-visible path.

## Work plan

- Inspect the SSE relay, approval event handling, and browser state updates for `approval.requested`.
- Implement the smallest cross-layer fix that keeps Chat and Approval views in sync without reload.
- Add or update focused tests and rerun the touched validation commands.

## Artifacts / evidence

- Validation:
- `cd apps/frontend-bff && npm test`
- `cd apps/frontend-bff && npm test -- --run tests/chat-page-client.test.tsx tests/chat-view.test.tsx`
- `cd apps/frontend-bff && npm test -- --run tests/chat-page-client.test.tsx tests/approval-page-client.test.tsx tests/chat-view.test.tsx tests/approval-view.test.tsx`
- Current implementation candidate stays browser-side in `chat-page-client.tsx` with focused no-reload approval convergence coverage in `tests/chat-page-client.test.tsx`
- Approval-side no-reload convergence is now covered in `tests/approval-page-client.test.tsx`

## Status / handoff notes

- Status: `locally complete`
- Notes: `The current slice updates approval-requested handling to apply waiting_approval to both the selected session and the session list without reload. Focused browser-side coverage now exists for both Chat and Approval no-reload convergence, and frontend-bff unit tests are green.`

## Archive conditions

- Archive this package when the approval wait-state convergence slice is locally complete and the handoff notes are updated.
