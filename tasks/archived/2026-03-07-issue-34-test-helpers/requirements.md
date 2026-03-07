# Issue 34 Requirements

## Scope Assessment
- Change size: medium.
- Reasoning: the refactor spans both backend and frontend test harnesses and introduces shared helper modules without changing product behavior.

## In Scope
- Extract repeated backend test harness helpers such as temp Git repo setup, fake Codex bin creation, server boot helpers, and SSE transcript parsing into shared helper modules.
- Extract repeated frontend fake DOM/storage/EventSource helpers into shared helper modules.
- Preserve current test behavior and keep test files readable.
- Keep backend/frontend validation green.

## Out of Scope
- Changing test framework or assertion style.
- Product-code refactors that are only indirectly motivated by tests.
- Reducing test coverage.

## Acceptance Criteria
- Repeated backend/frontend harness code moves into shared helpers.
- Test files remain straightforward to read and still emphasize scenario intent.
- Existing validation coverage continues to pass.
- The extraction reduces obvious duplication without hiding important setup detail.

## Validation Targets
- `node --test codexbox/webui-server.test.js`
- `node --test codexbox/public/app.test.js`
- `node --test codexbox/webui-server.test.js codexbox/public/app.test.js`
