# Issue #64 Phase 3A Foundation

## Purpose

- Deliver one bounded Phase 3A execution slice that bootstraps `codex-runtime` with workspace registry, workspace/session mapping, and workspace creation and enumeration endpoints.

## Primary issue

- Issue: `#64` https://github.com/tsukushibito/codex-webui/issues/64

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_internal_api_v0_8.md`
- `docs/specs/codex_webui_technical_stack_decision_v0_1.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_8.md`

## Scope for this package

- Create the first `apps/codex-runtime` implementation scaffold
- Implement SQLite-backed workspace registry and `workspace_id <-> session_id` correspondence helpers
- Implement workspace root validation, workspace directory creation, and exclusion-aware directory enumeration helpers
- Expose internal workspace creation and listing endpoints required for follow-up session lifecycle work
- Add targeted automated coverage for the new foundation

## Exit criteria

- `apps/codex-runtime` exists with local setup documentation and runnable tests
- Workspace registry persistence, mapping helpers, and workspace API foundation are implemented and validated
- The slice remains limited to workspace foundations, leaving session lifecycle, active-session enforcement, SSE, approvals, recovery, and broader app-server supervision behavior for follow-up work

## Work plan

- Scaffold the runtime package, local README, TypeScript config, and test config
- Implement database schema, workspace filesystem helpers, and registry service
- Add Fastify routes and error handling for workspace endpoints
- Run targeted validation and capture the outcome in this package before archiving

## Artifacts / evidence

- Code under `apps/codex-runtime/`
- Test evidence from `npm test` in `apps/codex-runtime/`

## Status / handoff notes

- Status: `in progress`
- Notes: This package covers the first implementation slice only. Follow-up slices still need session lifecycle, active-session enforcement, approval handling, SSE, recovery, and broader app-server lifecycle behavior.

## Archive conditions

- Archive this package when the scoped runtime foundation is implemented, tests pass, and the handoff notes are updated for the next slice.
