# Issue 158 Post-Start Sendability

## Purpose

- Restore pre-reload thread sendability after the canonical first-input start on the live v0.9 browser path.

## Primary issue

- Issue: `#158 https://github.com/tsukushibito/codex-webui/issues/158`

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/specs/codex_webui_internal_api_v0_9.md`

## Scope for this package

- Reproduce why `Send reply` stays disabled after the first-input start on the managed localhost browser path.
- Fix the runtime, BFF, frontend, or cross-layer convergence defect that keeps `composer.accepting_user_input` from returning to `true`.
- Add focused regression coverage for the post-start sendability path on both configured Playwright projects.
- Leave remote-path validation itself to `#150` after this implementation defect is cleared.

## Exit criteria

- A newly started live thread becomes browser-sendable before reload on the managed localhost path.
- `Send reply` enables before reload on both `desktop-chromium` and `mobile-chromium`.
- Focused regression coverage proves the pre-reload sendability path and protects against the observed disabled-state regression.
- `#150` can resume localhost validation without carrying this fix inline.

## Work plan

- Reproduce the failure in the active worktree and identify the layer that prevents sendability convergence.
- Implement the bounded fix in the affected app/runtime surface and update focused coverage.
- Re-run the managed Playwright flow plus touched-suite checks and record the evidence.
- Prepare archive and close handoff only after the dedicated pre-push validation gate passes.

## Artifacts / evidence

- Planned evidence root: `artifacts/issue-158-post-start-sendability/`
- Local validation memo: `artifacts/issue-158-post-start-sendability/managed-playwright-validation-2026-04-18.md`
- Expected touched areas:
  - `apps/frontend-bff/e2e/`
  - `apps/frontend-bff/src/`
  - `apps/frontend-bff/tests/`
  - `apps/codex-runtime/` if runtime-side convergence is implicated

## Status / handoff notes

- Status: `in progress`
- Notes: `Local reproduction showed the managed Playwright stack was starting codex-runtime without CODEX_WEBUI_APP_SERVER_BRIDGE_ENABLED, so the browser path never exercised the app-server convergence flow. The active slice now enables the live bridge for the managed stack, uses the fake app-server fixture for deterministic first-turn completion, and keeps the browser assertion scoped to the exact follow-up user message. Parent validation issue #150 can resume after this slice reaches main.`

## Archive conditions

- Archive this package when the exit criteria are met, the dedicated pre-push validation gate passes, and the handoff notes are updated.
