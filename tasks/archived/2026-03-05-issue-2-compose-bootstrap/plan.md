# Issue 2 Plan

## TDD
- TDD: no
- Rationale: This task is infrastructure scaffolding and repository layout work. Validation should focus on file presence and compose configuration sanity rather than test-first behavior.

## Steps
- [x] Add `docker-compose.yml` with `edge` and `codexbox`.
- [x] Add minimal `infra/Caddyfile` placeholder referenced by compose.
- [x] Add minimal `codexbox` build files and placeholder entrypoint.
- [x] Validate compose syntax if the local environment supports it.
  - `docker` is not installed in the current environment, so `docker compose config` could not be run here.
- [x] Summarize any follow-up work that remains for later P0 issues.

## Risks and Unknowns
- Docker tooling may not be available in the current environment for validation.
- Later issues will intentionally replace placeholder behavior.
