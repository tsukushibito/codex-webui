# Issue #43 Design

## Overview
Add a typed frontend contract layer under `codexbox/frontend/src/types/`. Split it into `contracts.ts` for backend-facing payloads and `state.ts` for frontend state models. Export reusable aliases for later components and controller code.

## Module Design
- `types/contracts.ts`
  - API response and payload types for session, thread, workspace, Git diff, approvals, user input, and health endpoints.
  - SSE event payload types for the events consumed by the frontend.
  - Notification item shapes needed for transcript rebuild and live updates.
- `types/state.ts`
  - Typed session, transcript, workspace, inspector, and pending-action state.
  - UI-facing message and pane identifiers.
- `types/index.ts`
  - Barrel export for later imports.

## Modeling Choices
- Model only the fields currently consumed by the frontend, not the full backend surface.
- Keep unions shallow and practical so later code can narrow them with ordinary property checks.
- Use frontend-oriented aliases such as `TranscriptMessage` and `WorkspaceSelectionState` to avoid leaking raw backend payload shapes everywhere.

## Validation
- Compile with `npm run check`.
- Ensure `npm run build` still works with the new type modules present.

## Risks
- The backend contracts are still unvalidated at runtime; this issue improves compile-time clarity only.
- If later issues need more payload fields, they must extend the shared contract files instead of creating local ad hoc interfaces.
