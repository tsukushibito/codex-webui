# Issue 3 Design

## Overview
- Configure `edge` in Caddy to redirect HTTP to HTTPS and terminate TLS on `:443` using certificate/key files mounted from `infra/certs`.
- Proxy all browser traffic from `edge` to internal `codexbox:8080`.

## Main Decisions
- Use explicit TLS file paths (`/certs/edge.crt` and `/certs/edge.key`) to enforce local certificate usage.
- Keep site addressing host-agnostic (`:443`) so deployment hostname can vary as long as cert SAN matches the client hostname.
- Keep `codexbox` reachable only through internal compose networking (`expose`, no `ports`).
- Add cert operation guidance in-repo and ignore generated cert/key artifacts in Git.

## Impact
- Replaces the bootstrap HTTP-only edge config with TLS-enabled reverse proxy behavior.
- Clarifies local CA certificate placement and reduces accidental key commit risk.

## Risks
- Certificate CN/SAN mismatch will cause browser trust warnings.
  - Mitigation: document hostname/SAN requirements in cert README.
