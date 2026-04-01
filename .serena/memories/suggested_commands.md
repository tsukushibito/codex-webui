# Suggested commands
- List key repo files: `find . -maxdepth 2 -type f | sort`
- Search docs: `rg -n "<term>" docs/*.md`
- Read a doc section: `sed -n 'start,endp' docs/<file>.md`
- Check worktree: `git status --short`
- Because the repo currently has no build manifests or source tree, no project-specific test/lint/run commands are defined yet.
