# Issue #46 Requirements

## Goal
Add automated frontend tests for the migrated Preact UI and make combined validation practical from the `codexbox` toolchain.

## Scope
- Add a frontend test runner compatible with Vite/Preact/TypeScript.
- Add automated tests for critical migrated browser behaviors.
- Add package scripts that make frontend-only and combined validation straightforward.

## Out of Scope
- Large-scale backend test refactors.
- End-to-end browser automation beyond the migration needs.

## Critical Behaviors to Cover
- Reconnect restores transcript and pending interaction state.
- Workspace tree selection loads file and diff previews.
- Approval and user-input actions submit the expected backend payloads.

## Acceptance Criteria
- Frontend tests run against the Preact app.
- Local scripts make frontend-only and combined validation practical.
- Automated coverage includes the critical migrated browser behaviors.
- Test additions stay focused on migration regression coverage.
