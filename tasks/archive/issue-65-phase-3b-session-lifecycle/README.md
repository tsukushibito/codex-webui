# Issue #65 Phase 3B Session Lifecycle

## Purpose

- Deliver the first bounded Phase 3B execution slice for `codex-runtime` session lifecycle, overlay persistence, and active-session enforcement.

## Primary issue

- Issue: `#65` https://github.com/tsukushibito/codex-webui/issues/65

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_internal_api_v0_8.md`
- `docs/specs/codex_webui_technical_stack_decision_v0_1.md`
- `apps/codex-runtime/README.md`

## Scope for this package

- Add persisted session overlay storage under `apps/codex-runtime`
- Implement internal session create, list, get, start, and stop foundations
- Enforce the workspace active-session constraint at runtime boundaries required by Phase 3B
- Add targeted automated coverage for session lifecycle and overlay behavior

## Exit criteria

- Session lifecycle endpoints required by Phase 3B are implemented and validated against the maintained internal contract
- Active-session enforcement blocks invalid start transitions in the same workspace
- Session overlay state is persisted and exposed for follow-up message and approval work

## Work plan

- Extend the runtime database schema and domain services for session overlays
- Add session routes and runtime actions for create, list, get, start, and stop
- Add focused tests for lifecycle state transitions and active-session conflicts
- Record validation results and handoff notes before archiving this package

## Artifacts / evidence

- Code under `apps/codex-runtime/`
- Validation evidence from `npm run build` and `npm test` in `apps/codex-runtime`

## Status / handoff notes

- Status: `complete`
- Notes: Added persisted session overlays, workspace-scoped session lifecycle routes, and runtime enforcement for one active started session per workspace. This slice intentionally leaves real app-server RPC integration, message-driven transitions to `waiting_input`, and approval-driven transitions to later Phase 3 issues.
- Validation:
  - `npm run build`
  - `npm test`

## Archive conditions

- Archive this package when the scoped Phase 3B session lifecycle slice is implemented, validations pass, and the GitHub tracking has been updated.
