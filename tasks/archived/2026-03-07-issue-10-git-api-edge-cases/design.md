# Issue 10 Edge-Case Fix Design

## Overview
- Validate the requested Git ref separately from path existence so invalid refs fail fast.
- Read worktree symlinks as symlink entries after confirming the resolved target stays inside the workspace.

## Main Decisions
- Use a dedicated Git ref validation helper before checking `ref:path` existence.
- Keep missing-file-at-valid-ref behavior unchanged.
- For worktree symlinks, return the link target text via `readlink` instead of dereferencing the linked file contents.
- Keep realpath-based workspace escape protection for symlink targets.

## Risks
- Git ref validation must not collapse malformed refs into a missing-file response.
- Symlink handling must keep existing path-safety guarantees.
