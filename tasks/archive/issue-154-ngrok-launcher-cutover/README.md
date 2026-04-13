# Issue #154 ngrok launcher cutover

## Purpose

- Replace the legacy DevTunnels-based launcher path with the supported `ngrok`-based remote-browser flow while preserving a clear local-only startup mode.

## Primary issue

- Issue: `#154` `Switch WebUI launch flow from DevTunnels to ngrok`

## Source docs

- `scripts/start-codex-webui.sh`
- `docs/codex_webui_dev_container_onboarding.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `tasks/archive/issue-153-ngrok-prereqs-doctor/README.md`

## Scope for this package

- replace the current `devtunnel`-specific launcher assumptions in `scripts/start-codex-webui.sh`
- define the launcher-facing `ngrok` and `ngrok Basic Auth` environment inputs for the supported remote-browser path
- separate the supported local-only and `ngrok` launch modes clearly enough for follow-on validation to target them explicitly
- record any intentionally deferred `devtunnel` cleanup that remains outside this slice

## Exit criteria

- `scripts/start-codex-webui.sh` no longer requires `devtunnel` for the supported remote-browser path
- the launcher exposes a concrete local-only path and a concrete `ngrok` path with explicit input requirements
- targeted validation shows the updated launcher surface is internally consistent
- any residual legacy cleanup is linked explicitly instead of remaining implicit

## Work plan

- inspect the current launcher flow and the prerequisite/document changes already landed in `#152` and `#153`
- implement the bounded launcher changes for `ngrok`
- run targeted static and script-surface validation for the changed launcher behavior
- update handoff notes with any remaining manual or external validation boundary

## Artifacts / evidence

- `bash -n scripts/start-codex-webui.sh`
- `scripts/start-codex-webui.sh --help`
- `rg -n 'devtunnel|DEVTUNNEL|ngrok|NGROK_BASIC_AUTH' scripts/start-codex-webui.sh docs/codex_webui_dev_container_onboarding.md`
- dedicated pre-push validation gate: `git status --short --branch`, `git diff --check`, `git diff --stat`, `bash -n scripts/start-codex-webui.sh`, `scripts/start-codex-webui.sh --help`, and the targeted `rg` check
- manual verification passed on `2026-04-14` in the Docker-backed/dev-container environment: `codex-runtime` reached `http://127.0.0.1:3001/api/v1/workspaces`, `frontend-bff` reached `http://127.0.0.1:3000/`, and the launcher emitted the expected local-only / separate-ngrok guidance

## Status / handoff notes

- Status: `archive-ready; pre-push gate passed; manual launcher verification passed`
- Notes: `scripts/start-codex-webui.sh` now runs only the local runtime and frontend startup flow, removes active DevTunnel prompts/helpers/hosting branches, and points users to a separate ngrok command after local readiness. Sprint approval and the dedicated pre-push validation gate both passed with no remaining `devtunnel` matches in the launcher script and no diff-format errors. Manual verification also passed on `2026-04-14` in the intended Docker-backed/dev-container environment. Completion retrospective for this archive boundary: the issue split from #152/#153 kept the launcher scope bounded and reusable, while the main workflow problem was a read-only evaluator that created a stray .tmp handoff file; that side effect was quarantined and a clean evaluator rerun produced the final approval. Root README.md still mentions devtunnel in the launcher repo-map bullet; treat that as adjacent doc drift outside this bounded launcher slice unless closure work decides to absorb it explicitly.`

## Archive conditions

- Archive this package when the exit criteria are met, the dedicated pre-push validation gate passes, and the handoff notes are updated.
