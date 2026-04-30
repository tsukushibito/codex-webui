# Tailscale browser check compose

Last updated: 2026-04-30

## Purpose

This document explains how to use the repo-root `docker-compose.tailscale-browser.yml` file.

The compose file is a lightweight browser verification stack for checking tailnet-reachable web surfaces from inside a Tailscale-connected container. It is separate from the main dev container workflow in `docker-compose.yml`.

The stack has two services:

- `tailscale`: Tailscale sidecar that owns the network namespace
- `browser`: Selenium standalone Chrome container with noVNC enabled

The browser service shares the sidecar network namespace with `network_mode: service:tailscale`. This lets Chrome behave as a browser running from the Tailscale node while noVNC remains reachable from the host through a localhost-only port mapping.

## When to use this stack

Use this stack when you want to:

- operate a containerized Chrome instance from the host browser
- verify a Tailscale-only URL from inside a Tailscale-connected Docker network namespace
- keep the browser verification environment separate from the repo development container

Do not use this stack as the primary `codex-webui` development container. Use `docker-compose.yml` and `docs/codex_webui_dev_container_onboarding.md` for that workflow.

## Files

- `docker-compose.tailscale-browser.yml`: verification compose file
- `.env.tailscale-browser.example`: example environment file for this compose stack
- `scripts/tailscale-browser-compose.sh`: short wrapper for running this compose stack from Linux, macOS, WSL, or Git Bash
- `scripts/tailscale-browser-compose.ps1`: PowerShell wrapper for Windows
- `scripts/tailscale-browser-compose.bat`: Command Prompt wrapper for Windows

Create a local env file before starting the stack:

```bash
cp .env.tailscale-browser.example .env.tailscale-browser
```

On Windows PowerShell:

```powershell
Copy-Item .env.tailscale-browser.example .env.tailscale-browser
```

Set at least:

- `TAILSCALE_AUTHKEY`: auth key for the target tailnet
- `TAILSCALE_HOSTNAME`: optional stable node name for this browser-check container pair

## Start the stack

From the repository root:

```bash
scripts/tailscale-browser-compose.sh up -d
```

On Windows PowerShell:

```powershell
.\scripts\tailscale-browser-compose.ps1 up -d
```

On Windows Command Prompt:

```bat
scripts\tailscale-browser-compose.bat up -d
```

Check that both services are running:

```bash
scripts/tailscale-browser-compose.sh ps
```

Check Tailscale state:

```bash
scripts/tailscale-browser-compose.sh exec tailscale tailscale status
```

Use the same wrapper style for later examples. On Windows, replace `scripts/tailscale-browser-compose.sh` with `.\scripts\tailscale-browser-compose.ps1` in PowerShell or `scripts\tailscale-browser-compose.bat` in Command Prompt.

## Open the container browser

Open noVNC from the host:

```text
http://127.0.0.1:7900/?autoconnect=1&resize=scale
```

If `NOVNC_HOST_PORT` is changed in `.env.tailscale-browser`, replace `7900` with that port.

The compose file binds noVNC to `127.0.0.1` on the host. This keeps the remote-control surface local to the host machine instead of publishing it on all host interfaces.

## Network model

The `browser` service uses:

```yaml
network_mode: service:tailscale
```

Because of that:

- the browser container does not declare its own Docker network attachment
- the sidecar service owns the shared network namespace
- host port mappings for noVNC belong on the `tailscale` service, not the `browser` service
- Chrome can access tailnet routes through the Tailscale sidecar

The noVNC port is a host-control path only. It is not the web surface under test.

## Common checks

Render the compose configuration without starting containers:

```bash
scripts/tailscale-browser-compose.sh --example-env config
```

On Windows PowerShell:

```powershell
.\scripts\tailscale-browser-compose.ps1 --example-env config
```

Watch logs:

```bash
scripts/tailscale-browser-compose.sh logs -f
```

Open a shell in the shared namespace through the sidecar:

```bash
scripts/tailscale-browser-compose.sh exec tailscale sh
```

## Stop and reset

Stop the stack while keeping Tailscale state:

```bash
scripts/tailscale-browser-compose.sh down
```

Remove the persisted Tailscale state volume when you need a fresh node identity:

```bash
scripts/tailscale-browser-compose.sh down -v
```

Use `down -v` carefully because it removes the Tailscale state for this verification stack.

## Troubleshooting

### noVNC does not open

Confirm the stack is running and that the host port is not in use by another process:

```bash
scripts/tailscale-browser-compose.sh ps
```

If port `7900` is already in use, set another `NOVNC_HOST_PORT` value in `.env.tailscale-browser` and recreate the stack.

### Tailscale does not authenticate

Confirm `TAILSCALE_AUTHKEY` is set in `.env.tailscale-browser`, then inspect sidecar logs:

```bash
scripts/tailscale-browser-compose.sh logs tailscale
```

If the host cannot provide `/dev/net/tun`, set `TAILSCALE_USERSPACE=true` and recreate the stack. The default path remains kernel networking with `/dev/net/tun`.

### Tailnet URL does not load in Chrome

Check whether the sidecar is online:

```bash
scripts/tailscale-browser-compose.sh exec tailscale tailscale status
```

Then verify the target URL is reachable from another machine on the same tailnet. If it works elsewhere but not in the container browser, inspect Tailscale DNS and ACL settings for the browser-check node.
