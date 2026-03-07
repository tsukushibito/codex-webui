# Issue 34 Design

## Goal
Move repeated backend and frontend test harness logic into a small shared helper layer so future tests can reuse setup code without bloating the main test files.

## Proposed Structure
- `codexbox/test-helpers/server-harness.js`
  - free-port lookup
  - server startup/wait helpers
  - temp Git repo setup
  - fake Codex binary creation
  - SSE transcript parsing
- `codexbox/test-helpers/fake-dom.js`
  - fake class list and DOM elements
  - fake document/storage/EventSource
  - tree search helper for assertions

## Boundary Notes
- Helpers should stay test-only and should not pull product logic into the test layer.
- Test files should still contain scenario-specific fake Codex scripts and API expectations so intent remains local.

## Risks
- Relative-path mistakes when the helper module starts the backend server.
- Over-abstracting helper APIs and making tests harder to follow.

## Validation Focus
- Use the existing backend, frontend, and combined test suites unchanged except for the helper imports.
