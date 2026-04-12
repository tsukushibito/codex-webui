## Title

Issue 149 live stream transport handoff

## Date / repo / branch / status at handoff

- Date: 2026-04-12
- Repo: `/workspace` (`tsukushibito/codex-webui`)
- Branch: `main`
- Status at handoff: local changes present, validated, not yet committed at the moment this handoff was written

## Purpose

Preserve the current understanding of the `#149` live thread-stream convergence investigation before closing that issue and splitting follow-up work into a new server-event transport validation issue.

## Current state

- Confirmed behavior split:
  - `localhost` browser access does not reproduce the user-reported `Running`-fixed symptom.
  - `DevTunnels` access reproduces the symptom; threads remain visually `Running` until reload.
- Runtime persistence is not the primary defect for the reported case:
  - thread completion and status updates are persisted and become visible after reload.
- The transport path is the unstable layer:
  - browser debug logs show `EventSource` creation for the selected thread.
  - BFF/runtime logs previously showed stale stream lifetime issues and long-lived relay behavior.
  - `devtunnel` logs showed `send window is full`, which is consistent with tunnel backpressure on long-lived responses.
- Playwright automation can validate local/live behavior against `localhost`, but it cannot directly exercise the authenticated DevTunnels URL from this Codex session because the tunnel redirects to Microsoft login.
- Local live Playwright also exposed an additional nuance:
  - some turns enter `approval.requested` rather than converging directly to `waiting_input`, so a validation flow must not assume only one terminal state.

## What is already done

- Added BFF/runtime stream diagnostics and Playwright debug capture earlier in the session history.
- In this slice, updated `frontend-bff` stream handling and validation surface:
  - `src/runtime-client.ts`: long-lived stream fetch uses an undici `Agent` with `bodyTimeout: 0` and `headersTimeout: 0`, and accepts an abort signal.
  - `src/handlers.ts`: SSE relay now propagates browser aborts to runtime fetch, pumps upstream in `start()`, emits `: stream-open`, and emits periodic `: keep-alive`.
  - `src/chat-page-client.tsx`: `connectionState` switches to `live` only on `EventSource.onopen`; added active-thread canonical polling every 1500 ms while the selected thread is `running`.
  - `tests/routes.test.ts`: stream route coverage now asserts request-signal forwarding and stream-open behavior.
  - `tests/chat-page-client.test.tsx`: added a regression that active-thread polling converges to `Waiting for your input` without depending on live stream delivery.
  - `playwright.config.ts`: supports `PLAYWRIGHT_BASE_URL` so Playwright can target an external stack when reachable.
  - `e2e/chat-flow.runtime.spec.ts`: strengthened to assert post-send convergence instead of only checking that a `/stream` request was attempted.
- Validation completed before handoff:
  - `npm run check`
  - `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  - `npm test -- --run tests/routes.test.ts tests/chat-page-client.test.tsx`

## What remains or what the next session must verify

- Verify whether active-thread canonical polling is sufficient for the real DevTunnels path after the current patch reaches the running server.
- Decide whether DevTunnels should be treated as an officially degraded transport path for live updates, with polling as the supported convergence mechanism.
- Validate terminal-state handling in E2E against both:
  - `waiting_input`
  - `approval.requested`
- If needed, split transport-specific behavior so localhost keeps low-latency SSE semantics while DevTunnels paths rely on canonical reacquisition.

## Recommended execution order

1. Push the current `frontend-bff` changes to `main`.
2. Close `#149` as completed for the bounded investigation-and-hardening slice.
3. Open a new Phase 5 validation issue focused on server-event transport options and DevTunnels behavior, with scope that explicitly covers SSE, polling, and alternative transport evaluation.
4. When execution resumes, validate on both localhost and DevTunnels with the new issue as the tracker.

## Suggested validation commands

```bash
cd /workspace/apps/frontend-bff
npm run check
node ./node_modules/typescript/bin/tsc --noEmit --pretty false
npm test -- --run tests/routes.test.ts tests/chat-page-client.test.tsx
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:e2e -- --project=desktop-chromium e2e/chat-flow.runtime.spec.ts
```

## Risks / notes for the next session

- DevTunnels appears to be a material confounder for long-lived event delivery. Treat it as a transport under investigation, not as a neutral equivalent to localhost.
- The current patch improves convergence by polling canonical thread state while active, but this should be documented as an explicit design choice if retained.
- The authenticated tunnel URL is not directly automatable from this Codex session without an authenticated browser storage state or a public/anonymous validation tunnel.
- Do not assume that `Waiting for your input` is the only healthy terminal state in live tests; approvals can be the expected terminal outcome for some prompts.
