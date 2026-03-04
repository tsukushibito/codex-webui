# Issue 2 Design

## Overview
- Add a compose file that defines the two-container layout from the design doc.
- Add only the minimum repository files needed to make the compose layout internally consistent.

## Main Decisions
- Use `docker-compose.yml` as requested by the Issue acceptance criteria.
- Keep `edge` on `caddy:2` and mount `infra/Caddyfile` and `infra/certs` as described in the design doc.
- Add a minimal `codexbox` image build context under `codexbox/`.
- Use a placeholder Node server entrypoint so the container command is valid before later backend work.
- Mount the current repository root into `/workspace` instead of a non-existent `./repo` directory so the compose file matches the actual repository layout.

## Impact
- Creates the initial container skeleton without finalizing TLS behavior or application behavior.
- Keeps Issue #3 free to replace the placeholder Caddy config with the real TLS and auth config.

## Risks
- Placeholder config may look more complete than it is.
  - Mitigation: keep the placeholder files minimal and comment them clearly.
