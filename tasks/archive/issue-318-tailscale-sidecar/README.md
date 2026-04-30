# Issue #318 Tailscale sidecar migration

## Purpose

Migrate the supported remote-browser access path from ngrok to a Tailscale Docker sidecar workflow while preserving the repo boundary that only `frontend-bff` is browser-facing and `codex-runtime` remains private.

## Primary issue

- [#318 Infra: migrate remote WebUI access from ngrok to Tailscale sidecar](https://github.com/tsukushibito/codex-webui/issues/318)

## Source docs

- `README.md`
- `docs/README.md`
- `tasks/README.md`
- `docs/codex_webui_dev_container_onboarding.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docker-compose.yml`
- `scripts/start-codex-webui.sh`
- `scripts/stop-codex-webui.sh`
- `scripts/doctor.sh`

## Scope for this package

- Replace maintained ngrok remote-browser guidance with Tailscale VPN / Tailscale Serve guidance.
- Add or adjust Docker Compose sidecar configuration for `tailscale/tailscale`, persistent Tailscale state, and Serve config.
- Update environment examples from `NGROK_*` to Tailscale auth/hostname/config variables.
- Remove ngrok startup responsibility from the WebUI launcher and stop helper for the supported path.
- Update doctor checks so the supported remote-browser prerequisite is Tailscale sidecar state, not ngrok credentials.
- Keep live Docker/Tailscale verification as a user-run step and document the exact commands/evidence expected.

## Exit criteria

- `frontend-bff` remains the only browser-facing entrypoint in the documented Tailscale path.
- `codex-runtime` is not directly exposed through the tailnet browser path.
- Maintained docs no longer describe ngrok as the supported v0.9 remote-browser path.
- Repo scripts and environment examples no longer require `NGROK_*` values for the supported path.
- Docker/Tailscale verification steps are explicit and marked as user-run for this package.
- Static validation and targeted shell syntax checks pass locally where they do not require live Tailscale networking.

## Work plan

1. Inspect existing ngrok references and decide which are source-of-truth versus archived history.
2. Update Compose, environment examples, and launcher/doctor scripts for Tailscale sidecar operation.
3. Update maintained docs and wiki index/log entries for the remote-browser path change.
4. Add static checks for changed shell/YAML/documentation surfaces where available.
5. Record user-run Docker/Tailscale validation instructions and any known unverified live-networking boundary.

## Artifacts / evidence

- Orchestration log: `artifacts/execution_orchestrator/runs/2026-04-29T13-40-28Z-tailscale-migration/events.ndjson`
- Static validation results:
  - `git status --short --branch`
    - result: modified files limited to the approved sprint slice plus the active task package directory
  - `bash -n scripts/start-codex-webui.sh scripts/stop-codex-webui.sh scripts/doctor.sh`
    - result: pass
  - `docker compose --env-file .env.example config`
    - result: pass; rendered `tailscale` sidecar, `dev` `network_mode: service:tailscale`, persistent Tailscale state volume, and no host port publication for frontend/runtime
  - `rg -n "NGROK|ngrok|--with-ngrok|ngrok-basic-auth|ngrok-authtoken|CODEX_WEBUI_NGROK" README.md docs/codex_webui_dev_container_onboarding.md docs/requirements/codex_webui_mvp_requirements_v0_9.md docker-compose.yml Dockerfile scripts .env.example`
    - result: no matches
  - `rg -n "tailscale funnel|TS_FUNNEL|--funnel" docker-compose.yml Dockerfile scripts .env.example`
    - result: no matches
  - `rg -n "3001|CODEX_WEBUI_RUNTIME_PORT|codex-runtime" docs/codex_webui_dev_container_onboarding.md docker-compose.yml`
    - result: three intentional onboarding matches for `apps/codex-runtime` dependency and test/build commands only; no `3001` or `CODEX_WEBUI_RUNTIME_PORT` matches
- Pre-push validation re-run before merge:
  - `bash -n scripts/start-codex-webui.sh scripts/stop-codex-webui.sh scripts/doctor.sh`
    - result: pass
  - `docker compose --env-file .env.example config`
    - result: pass; rendered the `tailscale` sidecar, `dev` `network_mode: service:tailscale`, `TS_USERSPACE: "false"`, and no direct host port publication
  - `rg -n "NGROK|ngrok|--with-ngrok|ngrok-basic-auth|ngrok-authtoken|CODEX_WEBUI_NGROK" README.md docs/codex_webui_dev_container_onboarding.md docs/requirements/codex_webui_mvp_requirements_v0_9.md docker-compose.yml Dockerfile scripts .env.example`
    - result: no matches
  - `rg -n "tailscale funnel|TS_FUNNEL|--funnel" docker-compose.yml Dockerfile scripts .env.example`
    - result: no matches
  - `rg -n "3001|CODEX_WEBUI_RUNTIME_PORT|codex-runtime" docs/codex_webui_dev_container_onboarding.md docker-compose.yml`
    - result: three intentional onboarding matches for `apps/codex-runtime` dependency and test/build commands only; no `3001` or `CODEX_WEBUI_RUNTIME_PORT` matches
- User-run live Docker/Tailscale verification: moved to follow-up issue #319.

## Status / handoff notes

- Active branch: `issue-318-tailscale-sidecar`
- Active worktree: `.worktrees/issue-318-tailscale-sidecar`
- User stated that live Docker/Tailscale verification will be tracked separately from this migration slice.
- Follow-up issue: [#319 Validation: verify Tailscale sidecar browser access](https://github.com/tsukushibito/codex-webui/issues/319)
- Supported ngrok workflow replaced in Compose, env example, Dockerfile, launcher, stop helper, doctor, and maintained docs.
- Local static validation completed; live Docker/Tailscale browser verification remains pending under #319.
- Completion retrospective:
  - Completion boundary: package archive and Issue #318 close after merge to `main`.
  - Contract check: #318 scope is satisfied by repo configuration/docs/scripts plus explicit user-run validation commands; live environment proof is intentionally split to #319.
  - What worked: sidecar topology, Serve boundary, and ngrok removal could be validated without requiring live tailnet access.
  - Workflow problems: the original issue mixed implementation migration with live environment verification, which made completion ambiguous.
  - Improvements to adopt: split infrastructure implementation and environment-specific live verification when the user owns the runtime environment.
  - Skill candidates or skill updates: none.
  - Follow-up updates: complete #319 after user-run Docker/Tailscale verification.

## Archive conditions

- Package exit criteria are satisfied.
- Dedicated pre-push validation has passed.
- Completion retrospective has been recorded.
- Package is moved to `tasks/archive/issue-318-tailscale-sidecar/`.
- Issue #318 `Execution` section links the archived package while PR/merge state remains visible until the work reaches `main`.
