# Issue #43 Requirements

## Goal
Define reusable TypeScript contracts for frontend-consumed API responses, SSE payloads, and shared UI state so later Preact component work does not re-derive ad hoc object shapes.

## Scope
- Add TypeScript types for the frontend-consumed HTTP API responses.
- Add TypeScript types for the session SSE event payloads used by the frontend.
- Add shared state types for session, transcript, approvals, user input, workspace tree, file preview, and diff preview.
- Organize the types for reuse by later issues.

## Out of Scope
- Backend API shape changes.
- Full Preact component migration.
- Server-side schema validation.

## Consumers and Workflows
- Session start and reconnect.
- Thread transcript resync.
- Turn send and live transcript updates.
- Approval and user input flows.
- Workspace tree, file preview, and diff preview.

## Constraints and Assumptions
- Existing backend contracts remain the source behavior; this issue only types the frontend side.
- Types should be broad enough to cover current payloads but narrow enough to prevent new ad hoc shapes.
- The new types must work with strict TypeScript compilation.

## Acceptance Criteria
- API response shapes currently consumed by the frontend are represented by explicit TypeScript types.
- SSE events currently consumed by the frontend are represented by explicit TypeScript types.
- Shared app state has reusable TypeScript types instead of being re-inferred inside components.
- The type modules are organized so later UI work can import them directly.

## Edge Cases and Error Handling
- Optional fields that are truly absent in current payloads must stay optional instead of being treated as always present.
- Union-like notification and event payloads should model the fields actually relied on by the frontend.
- State types should allow empty or unloaded states without using `any`.
