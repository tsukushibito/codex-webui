# Issues 4-8 Plan

## TDD
- TDD: partial
- Rationale: Core logic is integration-heavy (child process + SSE), so test-first unit coverage is limited in this iteration. Validation will combine static checks and end-to-end API smoke runs.

## Steps
- [x] Write requirements/design/plan for #4-#8 batch implementation.
- [x] Implement session manager, SSE endpoint, and idle cleanup.
- [x] Implement app-server JSON-RPC bridge and initialize handshake.
- [x] Implement APIs for `thread/start` and `turn/start`.
- [x] Implement approval storage, response API, and timeout handling.
- [x] Implement minimal responsive WebUI with incremental streaming output.
- [x] Run validation checks and smoke-test the flow.
- [x] Self-check acceptance criteria and summarize unresolved items.

## Validation Plan
- `node --check codexbox/webui-server.js`
- start server and call APIs with curl:
  - `session/start`
  - `thread/start`
  - `turn/start`
  - SSE event observation
- Validate UI load and chat turn on localhost.

## Risks and Unknowns
- Approval flows may be hard to trigger deterministically in smoke tests.
- Running server and app-server in this environment may differ from Docker runtime details.

## Merge and Issue Closeout Method
- Merge path: PR to `main`.
- Issue closeout: include `Closes #4`, `Closes #5`, `Closes #6`, `Closes #7`, `Closes #8` in PR body if acceptance criteria are met.
