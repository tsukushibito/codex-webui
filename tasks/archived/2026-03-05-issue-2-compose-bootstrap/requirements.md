# Issue 2 Requirements

## Goal
- Add the initial compose-based development and runtime layout for `edge` and `codexbox`.

## In Scope
- Add a `docker-compose.yml` file.
- Define `edge` and `codexbox` services.
- Define workspace and `CODEX_HOME` mounts for `codexbox`.
- Add the minimum supporting files needed so the compose layout is coherent in-repo.

## Out of Scope
- Final TLS and reverse proxy configuration details for `edge`.
- Full WebUI backend implementation.
- Final security hardening beyond the baseline already described in the design doc.

## Acceptance Criteria
- `docker-compose.yml` exists.
- `edge` and `codexbox` services are defined.
- Workspace and `CODEX_HOME` mounts are defined.

## Constraints and Assumptions
- Follow the layout described in `docs/codex-webui-docker-lan-design.md`.
- Keep the scope limited to Issue #2.
- Keep placeholders minimal where later P0 issues will refine them.

## Open Questions
- None blocking for Issue #2.
