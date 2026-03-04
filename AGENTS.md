# AGENTS.md

## Purpose
- This repository is for experimenting with a WebUI for Codex.
- At the current stage, the repository is documentation-first and may not yet contain the actual application code.

## Working Rules
- Keep changes small and scoped to the user request.
- Do not rewrite or delete existing documents unless the user explicitly asks for it.
- Prefer adding new formal documents under `docs/`.
- Use `tasks/` for temporary work artifacts and move completed task directories to `tasks/archived/`.
- When using `task-execution`, record repeated friction or missing guidance as a candidate improvement for the skill.
- Follow [docs/task-management.md](/workspace/codex-webui/docs/task-management.md) for repository task-tracking rules.
- Follow [docs/work-product-rules.md](/workspace/codex-webui/docs/work-product-rules.md) for rules on preserving requirements, design documents, and task artifacts.

## Documentation Conventions
- Use clear, stable file names. Prefer ASCII file names for formal documents.
- Put implementation-independent architecture and operational decisions in `docs/`.
- If a document contains operational assumptions, state them explicitly near the top.

## Git Conventions
- Use English Conventional Commit messages.
- Avoid bundling unrelated changes into a single commit.

## Design Expectations
- Treat `codex app-server` as non-public unless a document explicitly says otherwise.
- Prefer `stdio` transport over experimental network transports for the default design.
- Prefer secure-by-default LAN designs: authenticated access, HTTPS, and a narrow public boundary.

## Skills
- `task-execution`: Repository-local implementation workflow skill. Use it for features, bug fixes, refactors, and other code changes that should follow the structured execution flow defined in `/workspace/codex-webui/.agents/skills/task-execution/SKILL.md`.
