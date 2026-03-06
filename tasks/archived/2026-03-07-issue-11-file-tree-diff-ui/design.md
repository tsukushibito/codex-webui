# Issue 11 Design

## Overview
- Expand the bundled page to a three-pane workspace layout on desktop.
- Use a file explorer on the left, chat in the center, and file inspection plus diff on the right.
- Keep approvals and pending user input below the inspection panels.

## Main Decisions
- Load the workspace tree from `/api/fs/tree` during app init.
- Auto-select the first available file so file content and diff panes have meaningful initial content.
- Fetch `/api/fs/file` and `/api/git/diff` together when a file is selected.
- On mobile, use explicit pane tabs to switch between chat, files, and inspection views.
- Render Git diffs as split HEAD and WORKTREE text panels rather than implementing a full line-by-line diff algorithm.

## Risks
- Browser-side state can become inconsistent if rapid file selections race each other.
  - Mitigation: track a selection request token and ignore stale responses.
- Loading workspace data during startup could make the initial UI feel busier.
  - Mitigation: use simple loading placeholders and keep chat startup independent.
