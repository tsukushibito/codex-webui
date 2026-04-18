# Issue #150 localhost baseline and ngrok blocker

Date: `2026-04-14`
Worktree: `/workspace/.worktrees/issue-150-ngrok-sse-validation`

## Localhost baseline

Goal for this slice:
- cover create workspace -> start thread -> observe `/stream` -> reload -> reacquire the same thread via v0.9 helpers -> submit follow-up input afterward
- exercise both Playwright projects already configured in `apps/frontend-bff/playwright.config.ts`: `desktop-chromium` and `mobile-chromium`

Implementation state:
- `apps/frontend-bff/e2e/chat-flow.runtime.spec.ts` now asserts the reload path on the live runtime stack through:
  - initial `/api/v1/threads/{thread_id}/stream` observation
  - pre-reload `Send reply` enablement so the thread is proven sendable before refresh
  - page reload
  - same-thread reacquisition through `GET /api/v1/threads/{thread_id}/view`
  - reopened `/api/v1/threads/{thread_id}/stream`
  - post-reload `Send reply` enablement before submitting follow-up input

Observed localhost results:
- `git diff --check`: passed
- `npm run check --prefix apps/frontend-bff`: passed
- `npm run test:e2e --prefix apps/frontend-bff -- e2e/chat-flow.runtime.spec.ts`: now reproducibly starts the managed localhost stack and executes both Playwright projects, but fails on live thread sendability before reload because `Send reply` stays disabled for 45 seconds on both projects
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:e2e --prefix apps/frontend-bff -- e2e/chat-flow.runtime.spec.ts`: no longer needed once the managed command became reproducible

Observed managed-command evidence:
- `desktop-chromium`: initial thread creation completed enough to emit `POST /api/v1/workspaces/ws_f7bf720c5ee9478da8d7079013ee9128/inputs` and a thread stream request, but `Send reply` remained disabled for 45 seconds before reload
- `mobile-chromium`: initial thread creation completed enough to emit `POST /api/v1/workspaces/ws_3b4242fa86924cb4986d0063c60bc3d5/inputs` and a thread stream request, but `Send reply` remained disabled for 45 seconds before reload

Current localhost judgment:
- The managed Playwright command itself is now reproducible, so the remaining problem is not the test launcher path.
- The localhost baseline is still blocked within the current write scope because the live app never transitions the started thread into `accepting_user_input` on either configured project.
- Because the thread is not sendable even before reload, this sprint cannot prove successful post-reload follow-up submission without changing app/runtime behavior outside the approved file scope.

## Ngrok blocker

Remote `ngrok` validation was not performed.

Observed command:

```bash
ngrok config check
```

Observed result:

```text
ERROR:  stat /home/dev/.config/ngrok/ngrok.yml: no such file or directory
```

Current remote-path judgment:
- The supported remote-browser `ngrok` path remains blocked by missing local `ngrok` configuration.
- This slice did not repair `ngrok`, reopen launcher work, or modify prerequisite docs/files.
