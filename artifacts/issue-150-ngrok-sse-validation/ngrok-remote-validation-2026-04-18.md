# Issue #150 ngrok remote validation

Date: `2026-04-18`
Worktree: `/workspace/.worktrees/issue-150-ngrok-sse-validation`

## Environment boundary

- local runtime: `http://127.0.0.1:3001`
- local browser entrypoint: `http://127.0.0.1:3000`
- public browser entrypoint: one free-plan `ngrok` HTTPS URL on the Japan region
- access control: `ngrok` Basic Auth

Observed prerequisite confirmation:
- `ngrok config check`: passed after creating `/home/dev/.config/ngrok/ngrok.yml` from the existing `NGROK_AUTHTOKEN`
- unauthenticated access to the public URL: `401`
- authenticated browser path requires one extra first-visit step on the free plan: the `Visit Site` abuse-warning interstitial

## Validation commands

Observed local commands:
- `npm run check --prefix apps/frontend-bff`: passed
- `npm run test:e2e --prefix apps/frontend-bff -- e2e/chat-flow.runtime.spec.ts --project=desktop-chromium --reporter=line`: passed
- `npm run test:e2e --prefix apps/frontend-bff -- e2e/chat-flow.runtime.spec.ts --project=mobile-chromium --reporter=line`: passed

Observed remote-path commands:
- `PLAYWRIGHT_BASE_URL=<ngrok https url> PLAYWRIGHT_HTTP_USERNAME=<basic-auth-user> PLAYWRIGHT_HTTP_PASSWORD=<basic-auth-password> npm run test:e2e --prefix apps/frontend-bff -- e2e/chat-flow.runtime.spec.ts --project=desktop-chromium --reporter=line`: passed
- `PLAYWRIGHT_BASE_URL=<ngrok https url> PLAYWRIGHT_HTTP_USERNAME=<basic-auth-user> PLAYWRIGHT_HTTP_PASSWORD=<basic-auth-password> npm run test:e2e --prefix apps/frontend-bff -- e2e/chat-flow.runtime.spec.ts --project=mobile-chromium --reporter=line`: passed

## Validation notes

- the remote browser run needed two test-side adjustments to reflect the supported `ngrok` boundary correctly:
  - dismiss the free-plan `Visit Site` interstitial when it appears
  - use Playwright `httpCredentials` for Basic Auth instead of embedding credentials in the URL, because embedded credentials break browser-side relative `fetch('/api/v1/...')` calls
- the localhost reload validation also needed one correction:
  - `Send reply` should be asserted only after a non-empty follow-up draft is entered, because the composer is intentionally disabled for an empty draft even when `accepting_user_input` is `true`

## Judgment

- localhost path: passed
- `ngrok` remote browser path: passed on both desktop and smartphone-width Chromium
- reload and reconnect convergence: passed on both localhost and `ngrok`
- follow-up sendability after reload: passed on both localhost and `ngrok`

Current migration judgment:
- the supported `ngrok` remote browser path is stable enough for the bounded Phase 5 live-thread SSE workflow exercised by this validation slice
- the remaining caveat is explicit but non-blocking:
  - free-plan `ngrok` adds a first-visit abuse-warning interstitial that must be dismissed once per browser before the app UI is reached
