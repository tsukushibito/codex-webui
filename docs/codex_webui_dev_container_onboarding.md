# Codex WebUI dev container onboarding

Last updated: 2026-04-05

## 1. Purpose

This document explains how to use the repo-local development container for `codex-webui`.

It covers:

- the repo-root `Dockerfile`
- the repo-root `docker-compose.yml`
- the `code tunnel` helper for remote development access
- the `devtunnel` flow for WebUI verification

This is an onboarding and operational guide. It does not replace the maintained product requirements or API specifications under `docs/requirements/` and `docs/specs/`.

## 2. What the repo provides

The repository root includes the following development entrypoints:

- `Dockerfile`: development image for this repository
- `docker-compose.yml`: recommended way to run the dev container
- `scripts/start-tunnel.sh`: starts `code tunnel`
- `scripts/start-codex-webui.sh`: starts `codex-runtime`, `frontend-bff`, and `devtunnel`
- `scripts/doctor.sh`: validates the development container toolchain

The container is intended to mount this repository as `/workspace`.

## 3. Recommended workflow

### 3.1 Build and start the dev container

From the repository root:

```bash
docker compose up -d --build dev
docker compose exec dev bash
```

The recommended path is `docker compose`, not a direct `docker run`, because the compose file already defines:

- the repo mount to `/workspace`
- persistent auth/cache volumes
- Docker socket access
- expected environment defaults

### 3.2 Install app dependencies

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

### 3.3 Validate the container toolchain

Inside the container:

```bash
scripts/doctor.sh
```

This checks the expected CLI/toolchain installation, including `code`, `codex`, `devtunnel`, Node.js, Python, Rust, and Vulkan tooling.

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

## 5. WebUI verification with Dev Tunnel

Use `devtunnel` when you want to verify the WebUI from a remote browser, including smartphone access.

### 5.1 One-time tunnel setup

Inside the container:

```bash
devtunnel user login
devtunnel create
devtunnel port create <tunnel-id> -p 3000 --protocol http
```

The current launcher expects an existing persistent tunnel ID.

### 5.2 Start the full WebUI stack

Inside the container:

```bash
CODEX_WEBUI_DEVTUNNEL_ID=<tunnel-id> scripts/start-codex-webui.sh
```

By default the launcher does the following:

- starts `codex-runtime` on port `3001`
- starts `frontend-bff` on port `3000`
- points the BFF at `http://127.0.0.1:3001`
- hosts the BFF through `devtunnel`

The launcher also creates the runtime workspace/data directories under `apps/codex-runtime/var/` when needed.

### 5.3 Default URLs

Local URLs:

- WebUI: `http://127.0.0.1:3000/`
- Runtime API: `http://127.0.0.1:3001/api/v1/`

The public URL comes from the configured Dev Tunnel.

## 6. Useful environment variables

The main variables used by `scripts/start-codex-webui.sh` are:

- `CODEX_WEBUI_DEVTUNNEL_ID`: required persistent Dev Tunnel ID
- `CODEX_WEBUI_RUNTIME_PORT`: defaults to `3001`
- `CODEX_WEBUI_FRONTEND_PORT`: defaults to `3000`
- `CODEX_WEBUI_WORKSPACE_ROOT`: optional override for the runtime workspace root
- `CODEX_WEBUI_DATABASE_PATH`: optional override for the runtime SQLite path
- `CODEX_WEBUI_RUNTIME_BASE_URL`: optional override for the BFF runtime base URL
- `CODEX_WEBUI_DEVTUNNEL_HOST_ARGS`: optional extra args for `devtunnel host`

## 7. Direct Docker usage

The repo-root `Dockerfile` can also be built directly:

```bash
docker build -t codex-webui/dev .
```

However, direct `docker run` is not the primary documented workflow because you would need to recreate the compose-managed volume mounts and runtime options yourself.

Use `docker-compose.yml` unless you have a specific reason not to.

## 8. Troubleshooting

### 8.1 `devtunnel` command not found

Rebuild the image:

```bash
docker compose up -d --build dev
```

### 8.2 `CODEX_WEBUI_DEVTUNNEL_ID` is missing

Create a persistent tunnel first, then export the tunnel ID before starting `scripts/start-codex-webui.sh`.

### 8.3 The launcher says port `3000` is missing on the tunnel

Run:

```bash
devtunnel port create <tunnel-id> -p 3000 --protocol http
```

### 8.4 The runtime fails because the workspace root does not exist

The launcher creates the default workspace root for you. If you override `CODEX_WEBUI_WORKSPACE_ROOT`, make sure the target path is valid and writable inside the container.

### 8.5 `vulkaninfo` only shows `llvmpipe`

If `nvidia-smi` works but `vulkaninfo --summary` still falls back to `llvmpipe`, the container runtime is exposing compute/NVML but not the NVIDIA graphics stack or Vulkan ICD.

This repository now ships `scripts/with-vulkan-driver.sh`, which can repair the manifest side when the NVIDIA graphics libraries are already mounted into the container.

If the helper still cannot surface an NVIDIA Vulkan device, the host runtime is not providing the required graphics libraries. Native Linux Docker Engine with NVIDIA Container Toolkit is the recommended path for containerized Vulkan validation. Docker Desktop on Windows with the WSL2 backend is reliable for GPU compute, but may not expose the full graphics/Vulkan stack needed for Vulkan app development inside containers.
