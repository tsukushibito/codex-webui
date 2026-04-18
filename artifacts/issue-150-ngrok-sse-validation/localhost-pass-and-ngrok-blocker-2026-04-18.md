# Issue #150 localhost pass and ngrok blocker

Date: `2026-04-18`
Worktree: `/workspace/.worktrees/issue-150-ngrok-sse-validation`

## Localhost validation

Goal for this rerun:
- validate the live reload path against the current `main` baseline after `#158` merged
- prove thread-view reacquisition, stream reconnect, and post-reload follow-up sendability on the managed Playwright stack
- cover both configured Playwright projects: `desktop-chromium` and `mobile-chromium`

Observed adjustment:
- the earlier `#150` bounded spec assumed `Send reply` should become enabled before any follow-up draft was entered
- the current UI intentionally keeps `Send reply` disabled until both conditions are true:
  - `composer.accepting_user_input` is `true`
  - the follow-up draft is non-empty
- the validation spec was updated to assert browser-visible `Waiting for your input` convergence before reload and after reload, then fill the follow-up draft and assert `Send reply` enablement

Observed command outcomes:
- `npm run check --prefix apps/frontend-bff`: passed
- `npm run test:e2e --prefix apps/frontend-bff -- e2e/chat-flow.runtime.spec.ts --project=desktop-chromium --reporter=line`: passed
- `npm run test:e2e --prefix apps/frontend-bff -- e2e/chat-flow.runtime.spec.ts --project=mobile-chromium --reporter=line`: passed

Current localhost judgment:
- the managed localhost browser path now converges correctly on both configured Playwright projects
- the browser reload path reacquires the same thread through `GET /api/v1/threads/{thread_id}/view`
- the thread stream reconnects after reload
- after reload, a non-empty follow-up draft enables `Send reply` and the follow-up input is accepted successfully

## ngrok blocker

Remote `ngrok` validation is still blocked locally.

Observed command:

```bash
ngrok config check
```

Observed result:

```text
ERROR:  stat /home/dev/.config/ngrok/ngrok.yml: no such file or directory
```

Current remote-path judgment:
- the localhost validation blocker is cleared
- the supported remote-browser `ngrok` path is still not validated because this environment does not yet have a usable local `ngrok` configuration
- `#150` remains blocked on environment prerequisites for the remote-path pass, not on the localhost live-thread behavior
