# Issue 12 Requirements

## Goal
- Let the bundled WebUI reconnect to an existing browser session after a reload or mobile reconnect.
- Restore pending approvals and resync visible conversation history from `thread/read`.

## In Scope
- Add a backend reconnect path for an existing session ID without spawning a new app-server child.
- Add a backend `thread/read` bridge that the bundled WebUI can call for resync.
- Persist enough client-side session metadata to attempt reconnect on page bootstrap.
- Rebuild the visible chat transcript from `thread/read` after reconnect.
- Validate the reconnect path across backend and bundled client behavior.

## Out of Scope
- Multi-user session discovery or account-level thread browsing.
- Replaying exact SSE event history by event ID.
- New UI for thread list, manual thread resume, or one-shot execution.
- Durable server-side session persistence beyond in-memory session lifetime.

## Acceptance Criteria Mapping
- Reconnect resumes the same in-memory session instead of always creating a new one.
- Pending approvals reappear after reconnect through the shipped WebUI path.
- Conversation state can be resynced from `thread/read` and rendered back into the chat view.
- Validation covers at least one shipped end-to-end reconnect path.

## Consumers and Workflows
- Bundled WebUI bootstrap and mobile/browser reload recovery flow.
- Existing approval controls that depend on the reconnected session ID.

## Edge Cases and Error Handling
- Missing or unknown stored session IDs fall back to creating a new session.
- Missing thread IDs do not block session reconnect; the UI skips transcript resync in that case.
- `thread/read` errors do not kill the session; the UI shows a reconnect warning and can continue live streaming.
- Session closure clears persisted reconnect metadata so stale sessions are not retried forever.

## Constraints and Assumptions
- Keep the current single-session bundled UI model.
- Reuse current SSE snapshot behavior for pending approvals and other pending requests.
- Use `thread/read` with `includeTurns: true` for transcript resync.

## Open Questions
- None blocking.
