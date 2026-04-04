# codex-webui

`codex-webui` is an experimental project for a personal WebUI for `codex`.

The MVP targets browser access from both PC and smartphone while keeping the public surface small: `frontend-bff` is the only externally exposed entrypoint, and `codex-runtime` remains private behind it.

## Repository guide

- [`docs/`](./docs/README.md): maintained source-of-truth requirements, specifications, roadmap, and validation documents
- [`apps/`](./apps/README.md): implementation directories for the runtime and public BFF/UI
- [`tasks/`](./tasks/README.md): active local work packages for issues currently in progress
- [`artifacts/`](./artifacts/): execution outputs such as evidence, observations, and judgment notes

## Current implementation shape

This repository currently contains two application directories under [`apps/`](./apps/README.md):

- [`apps/codex-runtime/`](./apps/codex-runtime/README.md): private runtime service that manages `codex app-server`, workspace and session state, and app-owned persistence
- [`apps/frontend-bff/`](./apps/frontend-bff/README.md): public BFF and browser UI built on Next.js, including REST facade and SSE relay responsibilities

## Source-of-truth documents

Start with these maintained documents when you need project intent or interface boundaries:

- [`docs/codex_webui_mvp_roadmap_v0_1.md`](./docs/codex_webui_mvp_roadmap_v0_1.md)
- [`docs/requirements/codex_webui_mvp_requirements_v0_8.md`](./docs/requirements/codex_webui_mvp_requirements_v0_8.md)
- [`docs/specs/codex_webui_common_spec_v0_8.md`](./docs/specs/codex_webui_common_spec_v0_8.md)
- [`docs/specs/codex_webui_public_api_v0_8.md`](./docs/specs/codex_webui_public_api_v0_8.md)
- [`docs/specs/codex_webui_internal_api_v0_8.md`](./docs/specs/codex_webui_internal_api_v0_8.md)
- [`docs/specs/codex_webui_technical_stack_decision_v0_1.md`](./docs/specs/codex_webui_technical_stack_decision_v0_1.md)

## Development entrypoints

Work from the app directory you are changing and use its local README for setup and commands:

- [`apps/codex-runtime/README.md`](./apps/codex-runtime/README.md)
- [`apps/frontend-bff/README.md`](./apps/frontend-bff/README.md)

For a repo-local development container and launcher workflow, this repository also provides:

- [`Dockerfile`](./Dockerfile)
- [`docker-compose.yml`](./docker-compose.yml)
- [`scripts/start-tunnel.sh`](./scripts/start-tunnel.sh) for `code tunnel`
- [`scripts/start-codex-webui.sh`](./scripts/start-codex-webui.sh) for `codex-runtime` + `frontend-bff` + `devtunnel`

Typical container flow:

```bash
docker compose up -d --build dev
docker compose exec dev bash
```

Inside the container:

```bash
npm install --prefix apps/codex-runtime
npm install --prefix apps/frontend-bff
```

For remote development access through VS Code tunnels:

```bash
scripts/start-tunnel.sh
```

For WebUI verification through Microsoft Dev Tunnels, create a persistent tunnel once and add port `3000`, then launch the stack:

```bash
devtunnel user login
devtunnel create
devtunnel port create <tunnel-id> -p 3000 --protocol http
CODEX_WEBUI_DEVTUNNEL_ID=<tunnel-id> scripts/start-codex-webui.sh
```

## Workflow notes

- Treat [`docs/`](./docs/README.md) as the maintained source of truth
- Keep only active work packages under [`tasks/`](./tasks/README.md); move completed packages to [`tasks/archive/`](./tasks/archive/README.md)
- The default repo-tracked flow is a short-lived branch plus PR
- For normal execution, use a dedicated worktree under `.worktrees/<branch>` and keep the parent checkout for sync and tracking
