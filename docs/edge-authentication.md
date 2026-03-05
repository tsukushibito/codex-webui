# Edge Authentication Setup

## Operational assumptions
- `edge` is the only LAN-exposed service.
- HTTPS is already configured with local-CA-issued certs.
- Basic auth is required before proxying to `codexbox`.

## Required environment variables
Set these variables before running `docker compose up`:
- `EDGE_BASIC_AUTH_USER`
- `EDGE_BASIC_AUTH_PASSWORD_HASH`

`EDGE_BASIC_AUTH_PASSWORD_HASH` must be a Caddy bcrypt hash.

## Generate password hash
Run this command on your host:

```bash
caddy hash-password --plaintext 'replace-with-strong-password'
```

Use the output string as `EDGE_BASIC_AUTH_PASSWORD_HASH`.

## Example startup

```bash
export EDGE_BASIC_AUTH_USER='codex'
export EDGE_BASIC_AUTH_PASSWORD_HASH='$2a$14$.................................................'
docker compose up -d
```

## Security notes
- Do not commit plaintext passwords.
- Rotate credentials if they are shared accidentally.
- Keep `codexbox` unexposed to host/LAN.
