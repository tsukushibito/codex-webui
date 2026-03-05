# Issue 3 Plan

## TDD
- TDD: no
- Rationale: This issue is infrastructure/configuration work where validation is compose config resolution and Caddy config parsing rather than behavior-first unit tests.

## Steps
- [x] Write requirements and design notes for Issue #3.
- [x] Update `infra/Caddyfile` for HTTP->HTTPS redirect and TLS reverse proxy.
- [x] Add `infra/certs/README.md` with local-CA certificate placement guidance.
- [x] Add `.gitignore` rules for generated cert/key materials under `infra/certs`.
- [x] Validate with `docker compose config` and Caddy config parse (`caddy adapt`).
- [x] Self-check against acceptance criteria and summarize closeout path.

## Risks and Unknowns
- Runtime TLS cannot be fully proven without an actual local-CA cert pair and trusted client.
- Basic auth is recommended in architecture guidance but not explicitly required by Issue #3 acceptance criteria.

## Merge and Issue Closeout Method
- Merge path: PR to `main`.
- Issue closeout: include `Closes #3` in PR description.
