# Issue 14 Requirements

## Goal
- Add a stateless backend execution path that streams `codex exec --json` output without reusing the session-based chat runtime.

## In Scope
- Add a backend route for one-shot exec requests.
- Spawn `codex exec --json` as a separate child process from the session/app-server flow.
- Stream one-shot exec events to the caller in a clear backend contract.
- Validate the one-shot path end-to-end at the backend boundary.

## Out of Scope
- Bundled WebUI UI for launching one-shot jobs.
- Reusing browser session IDs, SSE channels, or app-server session state for one-shot jobs.
- Long-lived job persistence or resume support.

## Acceptance Criteria Mapping
- A one-shot route exists.
- `codex exec --json` output is streamed to the caller.
- One-shot jobs are operationally separated from the session-based chat runtime.
- The backend response and event shape are explicit enough for later consumer work.
- Validation covers the stateless execution path end-to-end at the backend boundary.

## Consumers and Workflows
- No shipped bundled UI consumer in this issue.
- Later clients can call the backend route directly and consume the streamed event contract.

## Edge Cases and Error Handling
- Missing prompts return a clear API error.
- Child-process spawn failures surface as stream errors instead of hanging the request.
- `stderr` output is forwarded separately from parsed JSON events.
- One-shot execution must not create or require a session entry in the session manager.

## Constraints and Assumptions
- Keep the route backend-only for this issue.
- Stream the raw `codex exec --json` events rather than inventing a second semantic event model.
- Use the configured workspace root as the one-shot working directory.

## Open Questions
- None blocking.
