# Local CA Certificate Files for `edge`

## Operational assumptions
- TLS terminates at the `edge` (Caddy) container.
- Certificates are issued by a local CA that clients trust.
- Only the server certificate and private key are mounted into the container.

## Required files
Place these files in this directory:
- `edge.crt`: server certificate issued by your local CA
- `edge.key`: private key for `edge.crt`

`infra/Caddyfile` expects these files at `/certs/edge.crt` and `/certs/edge.key`.

## Hostname and SAN guidance
- Issue the server certificate for the LAN hostname users will open in browser
  (for example `codexbox.home.arpa`).
- Ensure the certificate SAN contains every hostname you intend to use.

## Security notes
- Do not place the CA private key in this repository.
- Keep the CA key outside this directory and outside Docker mounts.
- Treat `edge.key` as secret material.
