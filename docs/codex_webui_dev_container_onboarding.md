# Codex WebUI dev container onboarding

Last updated: 2026-04-30

## 1. Purpose

This document explains how to use the repo-local development container for `codex-webui`.

It covers:

- the repo-root `Dockerfile`
- the repo-root `docker-compose.yml`
- the repo-root `docker-compose.tailscale-browser.yml` browser-check helper
- the `code tunnel` helper for remote development access
- the supported Tailscale sidecar + Tailscale Serve flow for remote WebUI verification

This is an onboarding and operational guide. It does not replace the maintained product requirements or API specifications under `docs/requirements/` and `docs/specs/`.

## 2. What the repo provides

The repository root includes the following development entrypoints:

- `Dockerfile`: development image for this repository
- `docker-compose.yml`: recommended way to run the dev container and the Tailscale sidecar
- `docker-compose.tailscale-browser.yml`: separate Tailscale sidecar plus noVNC browser verification stack
- `scripts/tailscale-browser-compose.sh`, `scripts/tailscale-browser-compose.ps1`, and `scripts/tailscale-browser-compose.bat`: short wrappers for the separate browser verification compose stack
- `scripts/start-codex-webui.sh`: starts the local runtime service and `frontend-bff` inside the shared sidecar namespace
- `scripts/stop-codex-webui.sh`: stops local WebUI dev processes from this checkout
- `scripts/start-tunnel.sh`: starts `code tunnel`
- `scripts/doctor.sh`: validates the development container toolchain and prints user-run Tailscale verification steps

The container is intended to mount this repository as `/workspace`.

For the separate containerized Chrome/noVNC verification stack, use [`docs/codex_webui_tailscale_browser_check.md`](./codex_webui_tailscale_browser_check.md).

## 3. Recommended workflow

### 3.1 Prepare environment values

From the repository root:

```bash
cp .env.example .env
```

Set at least the following before you bring up the sidecar:

- `TAILSCALE_AUTHKEY`: auth key for the target tailnet
- `TAILSCALE_HOSTNAME`: optional stable hostname for this dev node
- `TAILSCALE_USERSPACE`: defaults to `false` for the kernel-networking sidecar path with `/dev/net/tun`

The supported remote-browser path assumes tailnet membership and Tailscale ACLs are the access boundary. Public internet exposure is out of scope, and `tailscale funnel` is not a supported command for this repo workflow.

### 3.2 Build and start the dev container plus sidecar

From the repository root:

```bash
docker compose --env-file .env up -d --build tailscale dev
docker compose --env-file .env exec dev bash
```

The recommended path is `docker compose`, not a direct `docker run`, because the compose file already defines:

- the repo mount to `/workspace`
- persistent auth/cache volumes
- Docker socket access
- the shared network namespace between `dev` and the Tailscale sidecar
- the persistent Tailscale state volume used for node state
- the read-only Tailscale Serve configuration mounted from `config/tailscale/serve.json`

The sidecar owns the network namespace. The local browser-facing entrypoint inside that namespace is `http://127.0.0.1:3000/`. Do not publish or expose the private runtime service directly.

The supported default is kernel networking with `/dev/net/tun`, container caps, and `TS_USERSPACE=false`. Set `TAILSCALE_USERSPACE=true` only if your host cannot provide `/dev/net/tun`; that is a fallback path with different networking behavior, not the primary recommended setup.

### 3.3 Install app dependencies

Inside the container:

```bash
npm install --prefix apps/codex-runtime
npm install --prefix apps/frontend-bff
```

Run focused checks when needed:

```bash
npm test --prefix apps/codex-runtime
npm test --prefix apps/frontend-bff
npm run build --prefix apps/codex-runtime
npm run build --prefix apps/frontend-bff
```

### 3.4 Validate the container toolchain

Inside the container:

```bash
scripts/doctor.sh
```

This checks the expected CLI/toolchain installation, plus static prerequisites for the supported Tailscale sidecar path. It does not authenticate Tailscale or perform live tailnet verification.

When you run a Vulkan workload directly inside the container, prefer the helper wrapper so an NVIDIA ICD manifest can be synthesized when the graphics libraries are mounted but the manifest is missing:

```bash
scripts/with-vulkan-driver.sh <your-vulkan-command>
```

## 4. Remote development access with Code Tunnel

Use `code tunnel` when you want to connect to the container for development work.

Inside the container:

```bash
scripts/start-tunnel.sh
```

This wrapper is intentionally separate from the WebUI launcher. It is for development access, not for exposing the application to a browser.

## 5. Supported remote-browser workflow

The supported v0.9 remote-browser path is Tailscale sidecar + Tailscale Serve. The browser-facing surface must remain `frontend-bff` on `http://127.0.0.1:3000/` inside the shared namespace. The private runtime service and App Server must stay unreachable from the browser.

### 5.1 Start the local WebUI stack

Inside the dev container:

```bash
scripts/start-codex-webui.sh
```

The launcher starts only local services. It binds both processes to `127.0.0.1` by default so they remain inside the sidecar namespace. The frontend keeps its runtime base URL on the private loopback address internally, but that private address is not a supported browser target.

If an earlier local WebUI run is still active, stop it before starting again:

```bash
scripts/stop-codex-webui.sh
```

### 5.2 Confirm Tailscale Serve configuration

The sidecar reads `config/tailscale/serve.json` through `TS_SERVE_CONFIG=/config/serve.json` when the `tailscale` service starts. Run these commands from the host checkout or from any shell that can reach the Docker daemon:

```bash
docker compose --env-file .env exec tailscale tailscale status
docker compose --env-file .env exec tailscale ls -l /config/serve.json
docker compose --env-file .env exec tailscale tailscale serve status
```

Expected Serve behavior:

- the active handler targets only `http://127.0.0.1:3000`
- the exposed HTTPS URL resolves inside the tailnet only
- the access boundary is tailnet membership plus ACLs
- `tailscale funnel` is not used and is not supported for this repo workflow

### 5.3 User-run live verification

Live browser verification is intentionally user-run outside this agent session.

Desktop and smartphone verification steps:

1. Confirm the node is online in the target tailnet:

```bash
docker compose --env-file .env exec tailscale tailscale status --json
```

2. Confirm Serve is still pointed at the frontend only:

```bash
docker compose --env-file .env exec tailscale tailscale serve status --json
```

3. Capture the tailnet-reachable HTTPS URL from `tailscale status` or the Tailscale admin UI and open it from a desktop browser that is already on the same tailnet.
4. Confirm the WebUI loads successfully.
5. Open the same HTTPS URL from a smartphone browser that is also on the same tailnet.
6. Confirm the smartphone can load the same `frontend-bff` surface.
7. Confirm the browser workflow does not require or expose a direct private runtime URL.

Expected evidence:

- a desktop screenshot of the WebUI over the tailnet URL
- a smartphone screenshot of the same WebUI over the tailnet URL
- `tailscale serve status --json` output showing the handler mapped to `http://127.0.0.1:3000`
- no browser step, command, or screenshot that depends on direct access to the private runtime service

## 6. Useful environment variables

- `TAILSCALE_AUTHKEY`: auth key used by the sidecar container
- `TAILSCALE_HOSTNAME`: optional tailnet hostname override for the sidecar container
- `TAILSCALE_USERSPACE`: defaults to `false`; set `true` only as a fallback when the host cannot provide `/dev/net/tun`
- `TAILSCALE_EXTRA_ARGS`: optional extra `tailscale up` flags; the documented default disables Tailscale-managed DNS rewrites
- `TS_SERVE_CONFIG`: set by `docker-compose.yml` to `/config/serve.json`; do not override it in `.env`
- `CODEX_WEBUI_FRONTEND_PORT`: defaults to `3000`
- `CODEX_WEBUI_WORKSPACE_ROOT`: optional override for the runtime workspace root
- `CODEX_WEBUI_DATABASE_PATH`: optional override for the runtime SQLite path
- `CODEX_WEBUI_RUNTIME_BASE_URL`: optional override for the internal BFF runtime base URL
- `CODEX_WEBUI_APP_SERVER_BRIDGE_ENABLED`: optional override for the runtime bridge flag; defaults to enabled, set it to `false` only when you intentionally want the synthetic gateway path

## 7. Direct Docker usage

The repo-root `Dockerfile` can also be built directly:

```bash
docker build -t codex-webui/dev .
```

However, direct `docker run` is not the primary documented workflow because you would need to recreate the compose-managed volume mounts, GPU options, and the shared Tailscale sidecar namespace yourself.

Use `docker-compose.yml` unless you have a specific reason not to.

## 8. Troubleshooting

### 8.1 Tailscale sidecar does not authenticate

Confirm that `.env` contains a valid `TAILSCALE_AUTHKEY`, then recreate the sidecar:

```bash
docker compose --env-file .env up -d --build tailscale dev
docker compose --env-file .env logs tailscale
```

If your host cannot provide `/dev/net/tun`, set `TAILSCALE_USERSPACE=true` and recreate the sidecar. This is a fallback, not the preferred path, because the documented default assumes kernel networking with tun plus the required caps.

### 8.2 Tailscale Serve does not point at the frontend

Confirm the mounted configuration exists, then recreate the sidecar so `TS_SERVE_CONFIG` is read again:

```bash
docker compose --env-file .env exec tailscale ls -l /config/serve.json
docker compose --env-file .env up -d --force-recreate tailscale dev
docker compose --env-file .env exec tailscale tailscale serve status
```

The supported Serve target is only `http://127.0.0.1:3000`. If you intentionally need to repair it manually, run the command from the sidecar:

```bash
docker compose --env-file .env exec tailscale tailscale serve --bg 3000
```

### 8.3 Port `3000` is already in use inside the shared namespace

If the launcher reports `EADDRINUSE` for `127.0.0.1:3000`, an earlier `frontend-bff` process is still active in this checkout. Stop local WebUI processes and start again:

```bash
scripts/stop-codex-webui.sh
scripts/start-codex-webui.sh
```

### 8.4 The runtime fails because the workspace root does not exist

The local startup process creates the default workspace root for you. If you override `CODEX_WEBUI_WORKSPACE_ROOT`, make sure the target path is valid and writable inside the container.

### 8.5 `vulkaninfo` only shows `llvmpipe`

If `nvidia-smi` works but `vulkaninfo --summary` still falls back to `llvmpipe`, the container runtime is exposing compute/NVML but not the NVIDIA graphics stack or Vulkan ICD.

This repository now ships `scripts/with-vulkan-driver.sh`, which can repair the manifest side when the NVIDIA graphics libraries are already mounted into the container.

If the helper still cannot surface an NVIDIA Vulkan device, the host runtime is not providing the required graphics libraries. Native Linux Docker Engine with NVIDIA Container Toolkit is the recommended path for containerized Vulkan validation. Docker Desktop on Windows with the WSL2 backend is reliable for GPU compute, but may not expose the full graphics/Vulkan stack needed for Vulkan app development inside containers.

### 8.6 Vulkan SDK download 404s during image build

The Dockerfile uses LunarG's automated download API with the generic Linux file name, `vulkan_sdk.tar.xz`, instead of constructing the embedded-version tarball name directly.

Keep the post-extraction Dockerfile check in place. `VULKAN_SDK_VERSION` is used both to choose the download path and to define the installed SDK path under `/opt/vulkansdk/<version>/x86_64`. If LunarG metadata or redirects return a different SDK archive than requested, the build must fail immediately instead of leaving a broken `vulkaninfo` symlink or a runtime path that does not match the compose-provided expected version.

When changing the default Vulkan SDK version, update the Dockerfile, `docker-compose.yml`, and `scripts/doctor.sh` together. The compose file passes the version into the image build and also passes the matching expected version into the runtime doctor check.
