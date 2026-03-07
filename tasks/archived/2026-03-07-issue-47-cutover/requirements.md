# Issue #47 Requirements

## Goal
Make the Preact frontend the shipped default path and retire the legacy vanilla frontend entrypoints and temporary migration-only validation paths.

## Scope
- Serve the built Preact frontend from `/`.
- Remove legacy vanilla frontend source files and legacy frontend tests.
- Update package scripts and docs to reflect the new default frontend runtime.
- Leave `/app` as an optional alias only if it does not complicate the runtime.

## Out of Scope
- New frontend features.
- Backend API changes.

## Consumers and Workflows
- Browser users opening `/` should land on the Preact frontend.
- Local validation should target the migrated frontend and backend tests only.
- Repository docs should describe the Preact frontend as the default shipped UI.

## Acceptance Criteria
- The shipped frontend path no longer depends on the legacy vanilla implementation.
- The legacy frontend files and legacy frontend test entrypoint are removed.
- `test:all` reflects the final frontend/backend validation path.
- Docs and server behavior reflect the new default frontend structure.
- Parent issue #41 can be closed from the resulting state.
