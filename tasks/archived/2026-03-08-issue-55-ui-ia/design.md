# Issue 55 Design Notes

## Proposed Layout
- Desktop: left `workspace`, center `conversation`, right `inspect`.
- Topbar: title plus primary status card; theme/session metadata moves to a secondary block.
- Action queue: rendered as a prominent strip above the main grid when approvals or user inputs exist.
- Inspect panel: tabbed between `File` and `Diff` with one active context at a time.
- Mobile: pane tabs become `Chat`, `Actions`, `Inspect`; workspace tree moves into the inspect pane so actions have a dedicated tab.

## State Changes
- Extend `PaneId` to `chat | actions | inspect`.
- Add a local inspect-tab state in the shell for `file | diff`.
- Derive a status variant/summary from existing `statusText`, `sending`, pending approvals, pending user inputs, and session readiness.

## Risks
- Existing tests assert current pane labels and always-visible approval/user-input sections.
- Mobile behavior depends on pane class names, so CSS and tests must move together.

## Review Result
- Pass. Design stays within current architecture and keeps the explorer redesign out of this issue.
