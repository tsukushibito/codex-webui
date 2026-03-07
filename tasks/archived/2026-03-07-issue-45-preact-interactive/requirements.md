# Issue #45 Requirements

## Goal
Reach functional parity for the Preact frontend path by porting approvals, user input, workspace tree selection, file preview, diff preview, and the remaining session integration needed for those workflows.

## Scope
- Port workspace tree rendering and file selection.
- Port file preview and diff preview flows.
- Port approval rendering and resolution actions.
- Port user-input rendering and submit/skip actions.
- Keep reconnect/session snapshot behavior compatible for these workflows.

## Out of Scope
- New frontend features beyond parity.
- Final route cutover and legacy frontend removal.
- Dedicated frontend test harness work beyond what is needed to keep the app building; broader testing belongs in #46.

## Consumers and Workflows
- Reconnect showing pending approvals and user inputs.
- Workspace tree load and default file selection.
- File selection loading workspace content and Git diff.
- Approval allow/deny/cancel.
- User-input quick choices, multiline answers, submit, and skip.

## Constraints and Assumptions
- Backend contracts remain unchanged.
- The Preact route should become usable end-to-end even though browser-side automated tests are deferred to #46.
- Existing pane layout and status messaging should remain compatible.

## Acceptance Criteria
- `/app` supports the current approval and user-input workflows.
- `/app` supports workspace tree navigation, file preview, and diff preview.
- Reconnect restores pending approvals/user inputs and transcript state compatibly.
- The Preact route reaches functional parity with the current shipped legacy UI for the migrated workflows.
- Any validation still deferred to #46 is explicit and narrow.
