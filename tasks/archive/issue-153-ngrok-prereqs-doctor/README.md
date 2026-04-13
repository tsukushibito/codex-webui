# Issue #153 ngrok prerequisites and doctor checks

## Purpose

- Prepare the dev-container prerequisite surface for `ngrok` so launcher work can depend on explicit tooling and environment expectations.

## Primary issue

- Issue: `#153` `Add ngrok prerequisites and doctor checks to the dev container`

## Source docs

- `docs/codex_webui_dev_container_onboarding.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `Dockerfile`
- `scripts/doctor.sh`

## Scope for this package

- add the supported `ngrok` CLI prerequisite to the repo-local dev container
- replace `devtunnel`-specific doctor checks with `ngrok`-oriented prerequisite checks
- make the expected `ngrok` authtoken and `ngrok Basic Auth` inputs explicit in the implementation surface that `#154` will consume
- record any deferred cleanup that remains outside this package

## Exit criteria

- the container build installs the supported `ngrok` CLI for the dev-container workflow
- `scripts/doctor.sh` checks the supported remote-browser tooling surface for `ngrok`
- the repo-tracked implementation surface makes `NGROK_AUTHTOKEN` and `NGROK_BASIC_AUTH` expectations concrete enough for launcher work
- targeted validation shows the changed prerequisite paths are internally consistent

## Work plan

- inspect `Dockerfile`, `scripts/doctor.sh`, and related helper scripts for current `devtunnel` assumptions
- implement the bounded prerequisite changes for `ngrok`
- run targeted validation for the changed prerequisite and doctor paths
- update handoff notes for `#154` if any `devtunnel` cleanup is intentionally deferred

## Artifacts / evidence

- planned: `git diff --check`
- planned: targeted grep over `Dockerfile`, `scripts/doctor.sh`, and onboarding references
- planned: any required container or script validation evidence captured in command output
- manual verification steps: `tasks/issue-153-ngrok-prereqs-doctor/manual-docker-verification.md`

## Status / handoff notes

- Status: `locally complete`
- Notes: `Static validation passed in-session, and manual Docker build/run verification was completed outside this session on 2026-04-13. This slice keeps devtunnel installed only as temporary legacy tooling so scripts/start-codex-webui.sh stays functional while launcher cleanup and ngrok migration are deferred to #154. Completion retrospective: the only workflow snag was evaluator scope framing around pre-sprint tasks/README state; no further skill or doc update is required from this slice.`

## Archive conditions

- Archive this package when the exit criteria are met, the dedicated pre-push validation gate passes, and the handoff notes are updated.
