# Issue 56 Requirements Review

## Scope
- Redesign the bundled WebUI left navigation into a denser, VS Code-like explorer.
- Add a `Changed` section above the full explorer using turn-relevant or otherwise meaningful changed files.
- Keep the full explorer below the changed section.
- Use compact Git/worktree state indicators instead of dominant badges.

## Constraints
- Do not add an editor or advanced explorer interactions.
- Do not change backend APIs unless a gap is discovered.
- Keep the explorer usable in the mobile `Inspect` flow introduced by issue #55.

## Acceptance Mapping
- File rows become line-based rather than card-based.
- `Changed` appears before `Explorer`.
- Directory collapse/expand remains explicit.
- Selected and hover states remain obvious.
- Validation uses tests plus Playwright screenshots from the Vite dev workflow.

## Review Result
- Pass. The changed-files source can be derived from current workspace Git status without requiring new backend work for this issue.
