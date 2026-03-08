# Issue 55 Requirements Review

## Scope
- Rework the bundled Preact WebUI information architecture around a chat-first workbench flow.
- Promote pending approvals and user-input requests into a first-class action workflow element.
- Replace the always-on right-side multi-panel layout with a context-switched inspect surface.
- Make the topbar emphasize current execution state over session metadata.
- Reduce empty persistent panels.
- Rework mobile navigation around `Chat`, `Actions`, and `Inspect`.

## Constraints
- Preserve the existing backend/API contracts.
- Keep the existing Preact architecture and state hook unless a small extension is necessary.
- Do not implement the VS Code-like explorer redesign in this issue.

## Acceptance Mapping
- Conversation remains the primary workspace surface.
- Desktop inspect area uses explicit context switching rather than always rendering file, diff, approvals, and user input together.
- Pending approvals and user inputs are surfaced in a high-visibility action queue.
- Status is the primary topbar signal; session metadata is secondary.
- Empty panes are hidden or collapsed when they do not help the current flow.
- Mobile tabs become `Chat`, `Actions`, `Inspect`.
- Validation includes automated checks and Playwright desktop/mobile screenshots on the Vite dev flow.

## Review Result
- Pass. Scope and constraints are explicit enough to implement.
