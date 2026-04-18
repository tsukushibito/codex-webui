## Issue #150 pre-push validation

Date: 2026-04-19
Worktree: `/workspace/.worktrees/issue-150-ngrok-sse-validation`
Boundary: publish-oriented validation before PR / merge / archive follow-through

### Gate status

- passed

### Commands run

```bash
git diff --check
npm run check --prefix apps/frontend-bff
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:e2e --prefix apps/frontend-bff -- e2e/chat-flow.runtime.spec.ts --project=desktop-chromium --reporter=line
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:e2e --prefix apps/frontend-bff -- e2e/chat-flow.runtime.spec.ts --project=mobile-chromium --reporter=line
PLAYWRIGHT_BASE_URL=https://humbly-salute-shredding.ngrok-free.dev PLAYWRIGHT_HTTP_USERNAME="${NGROK_BASIC_AUTH%%:*}" PLAYWRIGHT_HTTP_PASSWORD="${NGROK_BASIC_AUTH#*:}" npm run test:e2e --prefix apps/frontend-bff -- e2e/chat-flow.runtime.spec.ts --project=desktop-chromium --reporter=line
PLAYWRIGHT_BASE_URL=https://humbly-salute-shredding.ngrok-free.dev PLAYWRIGHT_HTTP_USERNAME="${NGROK_BASIC_AUTH%%:*}" PLAYWRIGHT_HTTP_PASSWORD="${NGROK_BASIC_AUTH#*:}" npm run test:e2e --prefix apps/frontend-bff -- e2e/chat-flow.runtime.spec.ts --project=mobile-chromium --reporter=line
```

### Evidence summary

- `git diff --check`: pass
- `npm run check --prefix apps/frontend-bff`: pass
- localhost external-stack validation:
  - `desktop-chromium`: pass (`1 passed (32.5s)`)
  - `mobile-chromium`: pass (`1 passed (20.2s)`)
- `ngrok` remote validation:
  - unauthenticated `GET /`: `401`
  - `desktop-chromium`: pass (`1 passed (10.7s)`)
  - `mobile-chromium`: pass (`1 passed (10.8s)`)

### Notes

- The dedicated repo skill normally expects a read-only `validator` agent. In this session, sub-agent delegation was not used, so the gate was executed manually with the same read-only command scope.
- Managed Playwright localhost runs can race on the shared SQLite path when launched in parallel. The gate therefore used the already-started external localhost stack and executed the desktop/mobile projects sequentially.
