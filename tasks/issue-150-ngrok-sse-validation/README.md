# Issue #150 ngrok SSE validation

## Purpose

- Validate whether the supported `ngrok` remote-browser path preserves browser-visible SSE behavior well enough for the Phase 5 live-thread workflow.

## Primary issue

- Issue: `#150` `https://github.com/tsukushibito/codex-webui/issues/150`

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`
- `docs/codex_webui_dev_container_onboarding.md`
- `tasks/archive/issue-154-ngrok-launcher-cutover/README.md`

## Scope for this package

- validate the localhost live thread reload path first, using the existing Playwright desktop and smartphone-width projects
- record whether reload and reconnect converge through the documented v0.9 thread-view reacquisition path
- capture the current `ngrok` remote-browser boundary explicitly if prerequisite environment state still blocks remote execution
- avoid reopening the launcher-cutover or `ngrok` prerequisite slices in this package

## Exit criteria

- localhost validation evidence records whether reload reacquisition and post-reload follow-up sendability converge on both configured Playwright projects
- the current `ngrok` state is captured explicitly instead of being inferred
- any residual instability or degraded behavior is tracked explicitly instead of remaining implicit
- the package notes distinguish localhost findings from the still-blocked remote `ngrok` path

## Work plan

- extend the live runtime Playwright spec to cover reload-driven thread reacquisition and post-reload follow-up on the existing desktop and mobile projects
- run the bounded localhost validations needed for the live stack and capture exact command outcomes
- run `ngrok config check` without repairing the environment and record the resulting blocker verbatim
- capture the resulting localhost evidence and remote-path blocker in `artifacts/` and this package README

## Artifacts / evidence

- evidence root: `artifacts/issue-150-ngrok-sse-validation/`
- localhost reload baseline and `ngrok` blocker log: [`localhost-baseline-and-ngrok-blocker-2026-04-14.md`](../../artifacts/issue-150-ngrok-sse-validation/localhost-baseline-and-ngrok-blocker-2026-04-14.md)
- localhost pass and current `ngrok` blocker log: [`localhost-pass-and-ngrok-blocker-2026-04-18.md`](../../artifacts/issue-150-ngrok-sse-validation/localhost-pass-and-ngrok-blocker-2026-04-18.md)
- `ngrok` remote validation log: [`ngrok-remote-validation-2026-04-18.md`](../../artifacts/issue-150-ngrok-sse-validation/ngrok-remote-validation-2026-04-18.md)
- pre-push validation log: [`pre-push-validation-2026-04-19.md`](../../artifacts/issue-150-ngrok-sse-validation/pre-push-validation-2026-04-19.md)

## Status / handoff notes

- Status: `locally complete`
- Localhost baseline:
  `Resolved. After syncing the worktree to main and correcting the validation spec to respect the composer draft requirement, the managed Playwright localhost path now passes on both desktop-chromium and mobile-chromium. Reload reacquisition, stream reconnect, and post-reload follow-up submission all converge successfully.`
- Remote ngrok path:
  `Resolved. ngrok config check now passes, unauthenticated access returns 401, and the authenticated ngrok browser path passes on both desktop-chromium and mobile-chromium. Free-plan ngrok still shows a first-visit Visit Site abuse-warning interstitial, but after dismissing it once the bounded SSE workflow passes.`
- Notes:
  `See the linked artifacts for the original localhost blocker, the corrected localhost pass, the final ngrok remote validation judgment, and the 2026-04-19 pre-push validation gate. Retrospective summary: the validation slice itself is complete; the main workflow friction came from shared-state localhost retries, where managed Playwright runs can contend on the shared SQLite path and where cold-start Home compilation can mask the real transport verdict. The package is ready for publish-oriented tracking follow-through, archive, and Issue close once the branch reaches main and cleanup is complete.`

## Archive conditions

- Archive this package when the validation result is recorded, any follow-up issues are explicit, the dedicated pre-push validation gate passes, and the handoff notes are updated.
