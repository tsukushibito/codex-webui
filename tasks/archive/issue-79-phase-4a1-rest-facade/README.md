# issue-79-phase-4a1-rest-facade

## Purpose

Implement the first BFF execution slice under #79 by creating the `frontend-bff` app foundation and the public REST facade needed by the documented public API.

## Primary issue

- #79 `Phase 4A-1: Implement frontend-bff foundation, public REST facade, and error mapping`

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md` section 9.2
- `docs/specs/codex_webui_public_api_v0_8.md`
- `docs/specs/codex_webui_internal_api_v0_8.md`
- `apps/README.md`

## Scope for this package

- Create the `apps/frontend-bff/` Next.js 15 app foundation
- Implement runtime client wiring for the public REST facade
- Add the first public REST endpoints for workspace, session, message, and approval reads/actions required by the documented facade slice
- Implement public error mapping and `can_*` derivation in the BFF
- Add focused tests for the covered public REST routes and mapping behavior

## Exit criteria

- `frontend-bff` exists as a runnable app with documented setup and test commands
- Covered public REST endpoints return the documented public shapes
- `can_send_message`, `can_start`, and `can_stop` are derived in the BFF
- Public error responses are mapped from runtime/internal failures according to the maintained docs
- Targeted tests pass for the new public REST slice

## Work plan

1. Inspect the maintained public/internal API specs for the minimum endpoint slice.
2. Scaffold `frontend-bff` with Next.js 15 Route Handlers and TypeScript conventions consistent with the maintained stack decision.
3. Implement runtime client, response mapping, and error translation.
4. Add route tests for the covered public REST endpoints.
5. Validate locally and record results in handoff notes.

## Artifacts / evidence

- Route and mapping tests under `apps/frontend-bff/tests/`
- Command output for targeted validation runs

## Status / handoff notes

- Status: `locally_complete`
- Notes:
  - Active worktree created at `.worktrees/issue-79-phase-4a1-rest-facade`
  - Package created after `origin/main` sync with the branch/worktree recorded on issue `#79`
  - Implemented `apps/frontend-bff/` as a Next.js 15 Route Handler app for the public REST facade slice
  - Validation: `npm test`
  - Validation: `npm run build`
  - Retrospective:
    - What worked: existing runtime/internal contracts were already close to the public REST facade, so most BFF work stayed in field mapping and masking.
    - Workflow problem: an early Fastify-based implementation attempt conflicted with the maintained `frontend-bff` stack decision.
    - Improvement: check `docs/specs/codex_webui_technical_stack_decision_v0_1.md` before scaffolding a new app directory so the first implementation pass matches the maintained stack.

## Archive conditions

- Archive this package after the current #79 slice is locally complete, handoff notes are updated, and the execution state is ready to hand off for PR/merge cleanup
