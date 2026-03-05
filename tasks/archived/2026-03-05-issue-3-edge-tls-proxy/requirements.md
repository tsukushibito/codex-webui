# Issue 3 Requirements

## Goal
- Configure `edge` to terminate HTTPS with a local-CA-issued certificate and reverse proxy traffic to `codexbox`.

## In Scope
- Replace the placeholder Caddy config with HTTPS/TLS and reverse proxy behavior.
- Keep `codexbox` non-public (internal-only service exposure).
- Document expected certificate files for local CA operation.

## Out of Scope
- Final production authentication policy beyond this issue scope.
- DNS/router setup and client trust-store distribution steps.
- WebUI backend feature work.

## Acceptance Criteria
- Caddy config exists.
- HTTPS is enabled with local-CA-issued certs.
- `codexbox` is not directly published.

## Constraints and Assumptions
- Follow `docs/codex-webui-docker-lan-design.md`.
- Use mounted cert files under `infra/certs`.
- Keep changes minimal and focused on Issue #3.

## Open Questions
- None blocking for Issue #3.
