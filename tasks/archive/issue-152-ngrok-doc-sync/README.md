# Issue 152 ngrok doc sync

## Purpose

- Update the maintained requirements and onboarding docs so the supported remote browser path is `ngrok`, not `Dev Tunnel`.

## Primary issue

- Issue: `#152` https://github.com/tsukushibito/codex-webui/issues/152

## Source docs

- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/codex_webui_dev_container_onboarding.md`
- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/README.md`

## Scope for this package

- replace maintained requirements wording that still assumes `Dev Tunnel`
- replace maintained onboarding guidance so the remote browser workflow is `ngrok`-based
- record the fixed migration assumptions for `ngrok Basic Auth`, `OAuth` out of scope, free-plan constraints, and no fixed public URL requirement
- update wiki navigation or log entries if the maintained docs materially change

## Exit criteria

- the maintained requirements and onboarding docs both describe `ngrok` as the supported remote browser path
- the auth boundary is documented as `ngrok Basic Auth`, with `OAuth` explicitly out of scope
- stale `DevTunnel` / `Dev Tunnel` wording is removed from the supported maintained path, or any deferred cleanup is named explicitly
- any required `docs/index.md` or `docs/log.md` maintenance for this doc change is included

## Work plan

- audit the maintained docs for current `Dev Tunnel` assumptions and decide which wording changes belong in this slice
- update the requirements doc to reflect the `ngrok` remote browser boundary and access-control assumptions
- update the onboarding doc to describe `ngrok`-based remote browser verification and current operating assumptions
- refresh wiki index and log entries if the maintained docs change discoverability or maintenance history
- run focused doc checks and git diff review for the touched files

## Artifacts / evidence

- `git diff --stat`
- `git diff --check`
- `rg -n "Dev Tunnel|DevTunnel|devtunnel" docs/requirements/codex_webui_mvp_requirements_v0_9.md docs/codex_webui_dev_container_onboarding.md`

## Status / handoff notes

- Status: `locally complete`
- Notes: Requirements and onboarding docs now describe `ngrok` as the supported remote browser path and record `ngrok Basic Auth`, `OAuth` out of scope, free-plan URL churn, and no fixed public URL requirement. The dedicated pre-push validation gate passed with `git status --short`, `git diff --check`, `git diff --stat`, and a stale-wording `rg` that returned no matches. The completion retrospective for this archive boundary found two workflow notes: a stale archived-package reference had been left in `tasks/README.md`, and an early parallel worktree-setup helper raced before the worktree path existed. Neither blocks archive, and no immediate skill or doc update is required from this slice. The next step is PR / merge / cleanup / Issue close follow-through.

## Archive conditions

- Archive this package after the doc slice is locally complete, the dedicated pre-push validation gate passes, and the handoff notes are updated.
