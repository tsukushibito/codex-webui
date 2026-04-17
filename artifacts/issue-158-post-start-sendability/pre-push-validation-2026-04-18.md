# Issue 158 Pre-Push Validation

Date: `2026-04-18`
Issue: `#158`
Worktree: `.worktrees/issue-158-post-start-sendability`

## Gate status

Passed

## Commands run

```bash
npm run check --prefix apps/codex-runtime
npm run test --prefix apps/codex-runtime -- tests/config.test.ts tests/runtime-lifecycle.test.ts tests/thread-routes.test.ts
npm run check --prefix apps/frontend-bff
npm run test --prefix apps/frontend-bff -- tests/chat-page-client.test.tsx
npm run test:e2e --prefix apps/frontend-bff -- e2e/chat-flow.runtime.spec.ts --project=desktop-chromium --project=mobile-chromium
```

## Evidence summary

- `apps/codex-runtime` Biome check: pass
- `apps/codex-runtime` focused test set: pass
  - includes `tests/config.test.ts` to pin `CODEX_WEBUI_APP_SERVER_BRIDGE_ENABLED` default-on behavior
  - includes `tests/thread-routes.test.ts` to cover the pre-ack convergence path
- `apps/frontend-bff` Biome check: pass
- `apps/frontend-bff` focused unit test: pass
- managed Playwright runtime flow: pass
  - `desktop-chromium`: pass
  - `mobile-chromium`: pass

## Notes

- The managed Playwright launcher now resets `apps/codex-runtime/var/playwright` before startup so the fake app-server's deterministic `thread_live_*` ids do not collide with stale SQLite state across runs.
- The follow-up browser assertion is scoped to `message.user` timeline articles so duplicate assistant echo text does not produce strict-locator noise.
