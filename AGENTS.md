# AGENTS.md

This repository is an experimental project for a WebUI for `codex`.

Start with the root `README.md` for the repo map, implementation shape, and development entrypoints.
Read the nearest relevant `README.md` before editing files in that area.  
Directory-specific responsibilities, document policies, and workflow details belong in local README files, not in this root `AGENTS.md`.

## Repository-wide Rules

- Git commit messages must follow Conventional Commits
- Prefer updating the source-of-truth file instead of duplicating the same content elsewhere
- Follow the terminology and naming already used near the files you are editing
- When implementation files are added, follow the conventions documented near that code
- If guidance conflicts, prefer the more specific local `README.md` or nested `AGENTS.md`

## Workspace Environment

- Primary app implementation in this repository is `Node.js` and `TypeScript`; use local app `README.md` files for setup and commands
- `.venv/` may be used as the repo-local Python virtual environment for skill validation and other Python-based validation helpers; prefer it over ad hoc global installs and keep it ignored
- GitHub repository and project management may use `gh` when it is available
- Use `docs/codex_webui_dev_container_onboarding.md` for the dev container, tunnel, and repo-level operational workflow
- Keep root guidance environment-light; put area-specific setup or tool usage details in local `README.md` files

## Cross-cutting Workflow

- Treat `docs/` as the maintained source of truth; keep reusable synthesis there and update `docs/index.md` and `docs/log.md` when maintained wiki content materially changes
- Treat `tasks/` as the area for active work packages only; move completed packages to `tasks/archive/`
- Treat `artifacts/` as the area for execution outputs such as logs, evidence, and judgment notes
- Default repo-tracked change flow is a short-lived branch and PR; direct commits to `main` are exceptions only, such as urgent fixes or explicit user direction
- For normal branch/PR work, create and use a dedicated git worktree under `.worktrees/<branch>`; keep the parent checkout as the control checkout for sync, tracking, and worktree management
- Approved direct-to-`main` exceptions may use the parent checkout and should record `Active worktree: .`
- Sprint approval is a local implementation gate only; before any push-oriented, merge-oriented, or archive-oriented handoff, run the dedicated pre-push validation skill
- Before archiving a completed task package or closing an Issue, perform a brief completion retrospective
- Do not mark work complete, close an Issue, or set a Project item to `Done` until the work is reachable on `main` and the local repo state is clean and synced
- When exploring from the parent checkout, treat `.worktrees/` as outside the normal search and edit surface by default
- When sub-agents can materially advance the current task, use them proactively for bounded planning, evaluation, or parallel sidecar work instead of defaulting to single-agent execution
- Use GitHub Projects for execution tracking such as progress, ownership, dependencies, and review state; do not treat Projects as the source of truth for specifications
- When updating roadmap tracking, prefer updating the existing Project and linked issues instead of creating competing tracking structures
- Do not delete Projects, issues, or project items unless the user explicitly asks for deletion
- Use `docs/README.md` for docs placement and wiki maintenance details, and `tasks/README.md` for active package, archive, and completion-flow details
- If GitHub Projects workflow details are needed, prefer the repo skill under `.agents/skills/codex-webui-github-projects/` rather than expanding this root file
- If repo-local LLM Wiki maintenance workflow details are needed, prefer the repo skill under `.agents/skills/codex-webui-llm-wiki-maintenance/` rather than expanding this root file
- If completion retrospective workflow details are needed, prefer the repo skill under `.agents/skills/codex-webui-completion-retrospective/` rather than expanding this root file
