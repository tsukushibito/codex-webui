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
- Pre-push validation memo: `artifacts/issue-158-post-start-sendability/pre-push-validation-2026-04-18.md`
- Expected touched areas:
  - `apps/frontend-bff/e2e/`
  - `apps/frontend-bff/src/`
  - `apps/frontend-bff/tests/`
  - `apps/codex-runtime/` if runtime-side convergence is implicated

## Status / handoff notes

- Status: `completed on main`
- Notes: `Merged by PR #159 on 2026-04-17. The runtime now defaults to the live app-server bridge, synthetic-only tests opt out explicitly, and the managed Playwright stack clears its fake-app-server state between runs. Parent validation issue #150 can resume from localhost validation without carrying this implementation defect inline.`

## Completion retrospective

- Completion boundary: `Issue close and task-package archive after PR #159 merged to main.`
- Contract check: `Satisfied. The localhost browser path now becomes sendable before reload on both Playwright projects, and the fix is backed by runtime config tests, thread-route convergence coverage, frontend unit coverage, and managed Playwright evidence.`
- What worked: `The runtime-only convergence work was already correct; the blocking gap was the managed Playwright harness not enabling the bridge and reusing fake-app-server SQLite state across runs.`
- Workflow problems: `The runtime default and the launcher default drifted apart, which hid the live bridge behind an environment toggle and made the managed browser path silently exercise the synthetic gateway.`
- Improvements to adopt: `Keep the live bridge as the default runtime path, make synthetic mode explicit in tests, and reset deterministic fake-app-server state in managed browser harnesses.`
- Skill candidates or skill updates: `The execution workflow should explicitly check whether Playwright launcher commands exercise the same runtime mode as the documented local launcher path.`
- Follow-up updates: `None for #158. #150 remains the next validation issue.`

## Archive conditions

- Archive this package when the exit criteria are met, the dedicated pre-push validation gate passes, and the handoff notes are updated.
