# Issues 19-20 Design

## Overview
- Add Caddy `basic_auth` to the `:443` site block using runtime-injected env vars.
- Add server-side safety policy constants in `webui-server.js`, reject unsafe client overrides, and force thread-start policy to safe defaults.

## Main Decisions
- Caddy auth variables:
  - `EDGE_BASIC_AUTH_USER`
  - `EDGE_BASIC_AUTH_PASSWORD_HASH`
- Compose will require these variables at startup (`${VAR:?error}` style) to avoid insecure silent defaults.
- Thread safety policy fixed at server side via env-configurable defaults:
  - `CODEX_DEFAULT_APPROVAL_POLICY` (default `untrusted`)
  - `CODEX_DEFAULT_SANDBOX` (default `read-only`)
- Reject request payload keys that attempt to override safety policy:
  - `/api/thread/start`: `approvalPolicy`, `sandbox`
  - `/api/turn/start`: `approvalPolicy`, `sandboxPolicy`

## Validation Strategy
- `docker compose config` should fail if required auth env vars are missing.
- `caddy adapt` with auth env vars should parse successfully.
- API negative test for unsafe override should return an error.
- Positive smoke flow should still complete `session/start` and `thread/start`.

## Risks
- Users without env vars set will see compose startup failure.
  - Mitigation: document credential generation/setup clearly.
