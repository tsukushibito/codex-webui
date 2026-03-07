# Issue #44 Requirements

## Goal
Port the WebUI shell, pane layout, transcript, status line, session metadata, and composer flow to Preact components while preserving the current behavior for those areas.

## Scope
- Replace the bridge placeholder app with a real Preact shell.
- Render the top bar, pane tabs, chat transcript, and composer in Preact.
- Show session status and session ID in Preact.
- Wire enough session bootstrap/reconnect and turn sending behavior to keep transcript/session metadata functional.
- Keep the files/approvals/user-input side surfaces present as placeholders for #45.

## Out of Scope
- Approval resolution UI.
- User-input form handling.
- File tree selection and file/diff loading.
- Final frontend cutover.

## Consumers and Workflows
- Initial session bootstrap.
- Reconnect via stored session ID.
- Thread transcript resync.
- Turn send and live assistant transcript updates.
- Pane switching between chat/files/inspect views.

## Constraints and Assumptions
- Reuse the backend API and SSE contracts as they exist today.
- Keep local storage compatibility for session reconnect.
- Preserve the overall layout and pane behavior rather than redesigning it.

## Acceptance Criteria
- `/app` renders the main shell via Preact components.
- Session status text and session ID are driven by the live Preact state.
- Transcript rendering and composer send flow work on the Preact path.
- Mobile pane-tab behavior remains compatible for chat/files/inspect.
- Files/inspect/approvals/user-input sections remain visible but clearly deferred to #45.
