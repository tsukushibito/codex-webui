# Issue #168 Browser Validation Evidence - 2026-04-22

## Worktree and status

- Worktree: `/workspace/.worktrees/issue-168-legacy-surface-validation`
- Branch: `issue-168-legacy-surface-validation`
- Status at evidence start: existing implementation changes were present in `apps/frontend-bff/**`, `tasks/README.md`, `apps/frontend-bff/src/retired-routes.ts`, and `tasks/issue-168-legacy-surface-validation/`. This evidence-capture slice intentionally edited only files under `artifacts/issue-168-legacy-surface-validation/` plus the approved task README sections.

Commands:

```text
pwd
/workspace/.worktrees/issue-168-legacy-surface-validation

git branch --show-current
issue-168-legacy-surface-validation

git status --short
 M apps/frontend-bff/app/api/v1/approvals/[approvalId]/approve/route.ts
 M apps/frontend-bff/app/api/v1/approvals/[approvalId]/deny/route.ts
 M apps/frontend-bff/app/api/v1/approvals/[approvalId]/route.ts
 M apps/frontend-bff/app/api/v1/approvals/route.ts
 M apps/frontend-bff/app/api/v1/approvals/stream/route.ts
 M apps/frontend-bff/app/api/v1/sessions/[sessionId]/events/route.ts
 M apps/frontend-bff/app/api/v1/sessions/[sessionId]/messages/route.ts
 M apps/frontend-bff/app/api/v1/sessions/[sessionId]/route.ts
 M apps/frontend-bff/app/api/v1/sessions/[sessionId]/start/route.ts
 M apps/frontend-bff/app/api/v1/sessions/[sessionId]/stop/route.ts
 M apps/frontend-bff/app/api/v1/sessions/[sessionId]/stream/route.ts
 M apps/frontend-bff/app/api/v1/workspaces/[workspaceId]/sessions/route.ts
 M apps/frontend-bff/e2e/helpers/browser-mocks.ts
 M apps/frontend-bff/src/browser-state-matrix.ts
 M apps/frontend-bff/tests/browser-state-matrix.test.ts
 M apps/frontend-bff/tests/routes.test.ts
 M tasks/README.md
?? apps/frontend-bff/src/retired-routes.ts
?? tasks/issue-168-legacy-surface-validation/
```

## Evidence matrix

| Issue #168 behavior | Desktop coverage | Mobile coverage | Evidence and observed assertions |
| --- | --- | --- | --- |
| First-input start | Passed in `e2e/chat-flow.spec.ts` and `e2e/chat-flow.runtime.spec.ts`. | Passed in `e2e/chat-flow.spec.ts` and `e2e/chat-flow.runtime.spec.ts`. | Mocked flow fills `First input`, enables `Start new thread`, shows `Started thread thread_001.`, and renders heading `thread_001`. Runtime flow starts a live runtime-backed thread, captures a non-empty thread id, and observes `/api/v1/threads/{threadId}/stream`. |
| Follow-up input | Passed in `e2e/chat-flow.spec.ts` and `e2e/chat-flow.runtime.spec.ts`. | Passed in `e2e/chat-flow.spec.ts` and `e2e/chat-flow.runtime.spec.ts`. | Mocked flow fills `Send follow-up input`, enables `Send reply`, shows `Input accepted. Waiting for thread updates.`, and later renders assistant text `Here is the explanation.` Runtime flow reloads/reconnects, fills follow-up input, sees the accepted state, and verifies the user article contains `Please explain the diff.` |
| Pending request response | Passed in `e2e/approval-flow.spec.ts` and `tests/chat-page-client.test.tsx`. | Passed in `e2e/approval-flow.spec.ts`; component coverage is viewport-independent jsdom. | `approval-flow.spec.ts` opens `/chat?workspaceId=ws_alpha&threadId=thread_001`, renders `.request-detail-card`, sees `Apply the prepared deployment plan.`, clicks `Approve request` and `Deny request`, then sees `Latest request: approved` or `Latest request: denied`. `tests/chat-page-client.test.tsx` verifies `respondToPendingRequest` is called from thread context with `req_001`, not from the approvals page. |
| Interrupt | Passed in `e2e/chat-flow.spec.ts` and `e2e/chat-flow.runtime.spec.ts`. | Passed in `e2e/chat-flow.spec.ts` and `e2e/chat-flow.runtime.spec.ts`. | Mocked flow verifies `Interrupt thread` is enabled while running, clicks it, sees `Interrupt requested.` and `Thread interrupted.`, then sends another follow-up. Runtime flow checks the interrupt button and either submits an interrupt when enabled or verifies it is disabled after the runtime already returned to waiting input. |
| Reload/reconnect | Passed in `e2e/chat-flow.runtime.spec.ts`. | Passed in `e2e/chat-flow.runtime.spec.ts`. | Runtime flow records `/api/v1/threads/{threadId}/view` and `/api/v1/threads/{threadId}/stream` request counts, reloads `/chat?workspaceId={workspaceId}`, verifies the selected thread heading returns, and asserts both view reacquisition and stream reconnect counts increase. |
| Background high-priority promotion | Covered by `tests/home-page-client.test.tsx` and `tests/chat-page-client.test.tsx`. | Component coverage is viewport-independent jsdom. | Home test observes `EventSource` URL `/api/v1/notifications/stream`, emits `approval.requested` with `high_priority: true`, verifies `fetchHomeData` is called twice, and checks text `High-priority background thread needs attention.`, `Resume here first`, and `Needs your response`. Chat test emits a background `approval.requested` notification and verifies `High-priority background thread needs attention.` appears. |
| No horizontal scroll | Existing e2e assertions passed in `e2e/chat-flow.spec.ts` and `e2e/approval-flow.spec.ts`; explicit 360 CSS px measurements passed. | Existing e2e assertions passed in mobile `e2e/chat-flow.spec.ts` and `e2e/approval-flow.spec.ts`; explicit 360 CSS px measurements passed. | Existing helper asserts `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`. Explicit measurements are recorded below and in `360-no-horizontal-scroll-measurements.json`. |

## Required local validation

All required local commands were run from the repo root of the active worktree.

```text
npm run test --prefix apps/frontend-bff -- tests/chat-page-client.test.tsx tests/home-page-client.test.tsx
Result: passed
Files: 2 passed
Tests: 14 passed
Duration: 8.73s
```

```text
npm run test:e2e --prefix apps/frontend-bff -- e2e/chat-flow.spec.ts e2e/approval-flow.spec.ts --project=desktop-chromium --reporter=line
Result: passed
Tests: 3 passed
Duration: 1.7m
```

```text
npm run test:e2e --prefix apps/frontend-bff -- e2e/chat-flow.spec.ts e2e/approval-flow.spec.ts --project=mobile-chromium --reporter=line
Result: passed
Tests: 3 passed
Duration: 1.4m
```

```text
npm run test:e2e --prefix apps/frontend-bff -- e2e/chat-flow.runtime.spec.ts --project=desktop-chromium --reporter=line
Result: passed
Tests: 1 passed
Duration: 2.0m
```

```text
npm run test:e2e --prefix apps/frontend-bff -- e2e/chat-flow.runtime.spec.ts --project=mobile-chromium --reporter=line
Result: passed
Tests: 1 passed
Duration: 2.1m
```

## 360 CSS px no-horizontal-scroll measurements

Measurement command:

```text
CODEX_WEBUI_RUNTIME_BASE_URL=http://127.0.0.1:3999 npm run dev --prefix apps/frontend-bff -- --hostname 127.0.0.1 --port 3000
node artifacts/issue-168-legacy-surface-validation/measure-360-no-horizontal-scroll.mjs
```

The measurement script uses a 360 x 800 CSS pixel Chromium viewport, browser-side API stubs, and a stubbed `EventSource`. It records exact metrics in `360-no-horizontal-scroll-measurements.json`.

| Surface | Path | Viewport width | `documentElement.clientWidth` | `documentElement.scrollWidth` | Result |
| --- | --- | ---: | ---: | ---: | --- |
| Home | `/` | 360 | 360 | 360 | Pass |
| Chat thread | `/chat?workspaceId=ws_alpha&threadId=thread_001` | 360 | 360 | 360 | Pass |
| Chat request detail | `/chat?workspaceId=ws_alpha&threadId=thread_request` | 360 | 360 | 360 | Pass |

## Ngrok remote-browser smoke

Prerequisite discovery:

```text
command -v ngrok
/usr/local/bin/ngrok

ngrok version
ngrok version 3.38.0

ngrok config check
ERROR:  stat /home/dev/.config/ngrok/ngrok.yml: no such file or directory

environment check
NGROK_AUTHTOKEN=present
NGROK_BASIC_AUTH=present
PLAYWRIGHT_BASE_URL=missing
PLAYWRIGHT_HTTP_USERNAME=missing
PLAYWRIGHT_HTTP_PASSWORD=missing

curl --silent --show-error --fail http://127.0.0.1:4040/api/tunnels
curl: (7) Failed to connect to 127.0.0.1 port 4040 after 0 ms: Couldn't connect to server
```

Because `NGROK_AUTHTOKEN` and `NGROK_BASIC_AUTH` were present, the supported launcher path was runnable even though no tunnel was already active.

Launcher command:

```text
scripts/start-codex-webui.sh --with-ngrok --ngrok-basic-auth="$NGROK_BASIC_AUTH"
```

Launcher outcome:

```text
codex-runtime ready at http://127.0.0.1:3001/api/v1/workspaces
frontend-bff ready at http://127.0.0.1:3000/
ngrok ready at https://humbly-salute-shredding.ngrok-free.dev
ngrok Basic Auth: enabled
```

Remote smoke command:

```text
PLAYWRIGHT_BASE_URL=https://humbly-salute-shredding.ngrok-free.dev
PLAYWRIGHT_HTTP_USERNAME="${NGROK_BASIC_AUTH%%:*}"
PLAYWRIGHT_HTTP_PASSWORD="${NGROK_BASIC_AUTH#*:}"
node remote browser smoke
```

Remote smoke result:

```text
Authenticated browser reached https://humbly-salute-shredding.ngrok-free.dev
HTTP status: 200
Visible heading: Home
Result: passed
```

Basic Auth boundary check:

```text
curl unauthenticated status: 401
curl authenticated status: 200
```

Additional observation: full `e2e/chat-flow.runtime.spec.ts` was attempted over the ngrok URL for both `mobile-chromium` and `desktop-chromium`. Both attempts reached the remote app but failed waiting for the post-start `Waiting for your input` assertion after the runtime created a pending request. This is not counted as passing full remote runtime workflow coverage; the required ngrok outcome for this slice is the narrower remote-browser smoke above.

## Final scope check

Final command requested by the planner:

```text
git diff --name-only
apps/frontend-bff/app/api/v1/approvals/[approvalId]/approve/route.ts
apps/frontend-bff/app/api/v1/approvals/[approvalId]/deny/route.ts
apps/frontend-bff/app/api/v1/approvals/[approvalId]/route.ts
apps/frontend-bff/app/api/v1/approvals/route.ts
apps/frontend-bff/app/api/v1/approvals/stream/route.ts
apps/frontend-bff/app/api/v1/sessions/[sessionId]/events/route.ts
apps/frontend-bff/app/api/v1/sessions/[sessionId]/messages/route.ts
apps/frontend-bff/app/api/v1/sessions/[sessionId]/route.ts
apps/frontend-bff/app/api/v1/sessions/[sessionId]/start/route.ts
apps/frontend-bff/app/api/v1/sessions/[sessionId]/stop/route.ts
apps/frontend-bff/app/api/v1/sessions/[sessionId]/stream/route.ts
apps/frontend-bff/app/api/v1/workspaces/[workspaceId]/sessions/route.ts
apps/frontend-bff/e2e/helpers/browser-mocks.ts
apps/frontend-bff/src/browser-state-matrix.ts
apps/frontend-bff/tests/browser-state-matrix.test.ts
apps/frontend-bff/tests/routes.test.ts
tasks/README.md
```

Because the approved evidence files and active task package are currently untracked, `git diff --name-only` reports only tracked pre-existing implementation changes. `git status --short` also reports:

```text
?? apps/frontend-bff/src/retired-routes.ts
?? artifacts/issue-168-legacy-surface-validation/
?? tasks/issue-168-legacy-surface-validation/
```

Scope result: the overall worktree diff does not stay within this evidence-capture write scope because pre-existing implementation changes are still present. The files intentionally created or edited by this worker are limited to the approved scope:

- `artifacts/issue-168-legacy-surface-validation/browser-validation-2026-04-22.md`
- `artifacts/issue-168-legacy-surface-validation/measure-360-no-horizontal-scroll.mjs`
- `artifacts/issue-168-legacy-surface-validation/360-no-horizontal-scroll-measurements.json`
- `artifacts/issue-168-legacy-surface-validation/ngrok-remote-browser-smoke.json`
- `tasks/issue-168-legacy-surface-validation/README.md`
