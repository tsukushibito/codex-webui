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

- [`apps/codex-runtime/`](./apps/codex-runtime/README.md): private runtime service that manages `codex app-server`, workspace state, and v0.9 thread/request/timeline projections
- [`apps/frontend-bff/`](./apps/frontend-bff/README.md): public BFF and browser UI built on Next.js, including the v0.9 REST facade, browser shaping, and SSE relay responsibilities

## Source-of-truth documents

Start with these maintained documents when you need project intent or interface boundaries:

- [`docs/codex_webui_mvp_roadmap_v0_1.md`](./docs/codex_webui_mvp_roadmap_v0_1.md)
- [`docs/requirements/codex_webui_mvp_requirements_v0_9.md`](./docs/requirements/codex_webui_mvp_requirements_v0_9.md)
- [`docs/specs/codex_webui_common_spec_v0_9.md`](./docs/specs/codex_webui_common_spec_v0_9.md)
- [`docs/specs/codex_webui_public_api_v0_9.md`](./docs/specs/codex_webui_public_api_v0_9.md)
- [`docs/specs/codex_webui_internal_api_v0_9.md`](./docs/specs/codex_webui_internal_api_v0_9.md)
- [`docs/specs/codex_webui_ui_layout_spec_v0_9.md`](./docs/specs/codex_webui_ui_layout_spec_v0_9.md)
- [`docs/specs/codex_webui_technical_stack_decision_v0_1.md`](./docs/specs/codex_webui_technical_stack_decision_v0_1.md)

## Development entrypoints

Work from the app directory you are changing and use its local README for setup and commands:

- [`apps/codex-runtime/README.md`](./apps/codex-runtime/README.md)
- [`apps/frontend-bff/README.md`](./apps/frontend-bff/README.md)

For a repo-local development container and launcher workflow, this repository also provides:

- [`Dockerfile`](./Dockerfile)
- [`docker-compose.yml`](./docker-compose.yml) for the dev container plus Tailscale sidecar workflow
- [`scripts/start-tunnel.sh`](./scripts/start-tunnel.sh) for `code tunnel`
- [`scripts/start-codex-webui.sh`](./scripts/start-codex-webui.sh) for local `codex-runtime` + `frontend-bff` startup inside the shared sidecar namespace
- [`scripts/stop-codex-webui.sh`](./scripts/stop-codex-webui.sh) for stopping local `codex-runtime` + `frontend-bff` dev processes
- [`docs/codex_webui_dev_container_onboarding.md`](./docs/codex_webui_dev_container_onboarding.md) for the full container, Tailscale Serve, and tunnel workflow

Use the onboarding document for the full setup and usage flow instead of relying on the root README for step-by-step operational detail.

## Workflow notes

- Treat [`docs/`](./docs/README.md) as the maintained source of truth
- Keep only active work packages under [`tasks/`](./tasks/README.md); move completed packages to [`tasks/archive/`](./tasks/archive/README.md)
- The default repo-tracked flow is a short-lived branch plus PR
- For normal execution, use a dedicated worktree under `.worktrees/<branch>` and keep the parent checkout for sync and tracking
