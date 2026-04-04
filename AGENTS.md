# AGENTS.md

This repository is an experimental project for a WebUI for `codex`.

Read the nearest relevant `README.md` before editing files in that area.  
Directory-specific responsibilities, document policies, and workflow details belong in local README files, not in this root `AGENTS.md`.

## Repository-wide Rules

- Git commit messages must follow Conventional Commits
- Prefer updating the source-of-truth file instead of duplicating the same content elsewhere
- Follow the terminology and naming already used near the files you are editing
- When implementation files are added, follow the conventions documented near that code
- If guidance conflicts, prefer the more specific local `README.md` or nested `AGENTS.md`

## Workspace Environment

- `.venv/` may be used for local Python-based validation and must remain ignored
- GitHub repository and project management may use `gh` when it is available
- Keep root guidance environment-light; put area-specific setup or tool usage details in local `README.md` files

## Cross-cutting Workflow

- Treat `docs/` as the maintained source of truth for requirements, specifications, validation plans, and roadmap decisions
- Treat `tasks/` as the area for active work packages only; move completed task packages to `tasks/archive/`
- Treat `artifacts/` as the area for execution outputs such as logs, evidence, and judgment notes
- Default repo-tracked change flow is a short-lived branch and PR; direct commits to `main` are exceptions only, such as urgent fixes or explicit user direction
- For normal branch/PR work, create and use a dedicated git worktree under `.worktrees/<branch>`; keep the parent checkout as the control checkout for sync, tracking, and worktree management
- Approved direct-to-`main` exceptions may use the parent checkout and should record `Active worktree: .`
- Before archiving a completed task package or closing an Issue, perform a brief completion retrospective that checks for workflow problems, improvement opportunities, and repeated patterns that should become repo skills
- Do not close an Issue or set a Project item to `Done` until the corresponding work is reachable on `main`
- Under the default branch workflow, `reachable on main` means the PR is merged to `main`; under an approved direct-to-`main` exception, it means the commits are pushed to `origin/main`
- Before marking execution complete, verify the local repo state is clean and synced with the relevant remote branch
- For normal branch/PR work, require worktree cleanup after the slice reaches `main` and before final completion
- When exploring from the parent checkout, treat `.worktrees/` as outside the normal search and edit surface by default
- When sub-agents can materially advance the current task, use them proactively for bounded planning, evaluation, or parallel sidecar work instead of defaulting to single-agent execution
- Record concise retrospective results in task-package handoff notes, and use `artifacts/` only when the review needs more than a short summary
- If the retrospective identifies a durable process improvement, reflect it into the maintained source of truth instead of leaving it only in task notes
- Use GitHub Projects for execution tracking such as progress, ownership, dependencies, and review state; do not treat Projects as the source of truth for specifications
- When updating roadmap tracking, prefer updating the existing Project and linked issues instead of creating competing tracking structures
- Keep Project items and issue bodies aligned with the maintained documents, and prefer links or short summaries over duplicating detailed specification text
- Do not delete Projects, issues, or project items unless the user explicitly asks for deletion
- If GitHub Projects workflow details are needed, prefer the repo skill under `.agents/skills/codex-webui-github-projects/` rather than expanding this root file
- If completion retrospective workflow details are needed, prefer the repo skill under `.agents/skills/codex-webui-completion-retrospective/` rather than expanding this root file
