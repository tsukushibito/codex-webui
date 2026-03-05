# Issues 19-20 Plan

## TDD
- TDD: partial
- Rationale: Config and integration changes are better validated via command-level and API smoke/negative tests.

## Steps
- [x] Create requirements/design/plan artifacts.
- [x] Update `infra/Caddyfile` to require Basic auth using env vars.
- [x] Update `docker-compose.yml` to require auth env vars for `edge`.
- [x] Add credential setup documentation for local development.
- [x] Harden backend API parameter handling in `codexbox/webui-server.js`.
- [x] Run security boundary and negative tests.
- [x] Self-check acceptance criteria and prepare closeout.

## Security and Compatibility Checks
- Boundary check: unauthenticated access blocked at `edge`.
- Negative test: reject unsafe override payload for `thread/start`.
- Design check: secure-by-default expectations remain satisfied.

## Merge and Issue Closeout Method
- Merge path: PR to `main`.
- Issue closeout: include `Closes #19` and `Closes #20` in PR body when validated.
