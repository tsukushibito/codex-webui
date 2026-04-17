# Issue 158 Managed Playwright Validation

Date: `2026-04-18`
Issue: `#158`
Worktree: `.worktrees/issue-158-post-start-sendability`

## Summary

The browser-path defect was reproducible because the managed Playwright stack launched `codex-runtime` without `CODEX_WEBUI_APP_SERVER_BRIDGE_ENABLED=true`. That meant the runtime used `SyntheticNativeSessionGateway`, so first-input starts stayed in `running` forever and never exercised the live app-server convergence code.

After enabling the bridge and switching the managed app-server command to the repo fake fixture with `--turn-start-mode=pre_ack_completion`, the localhost browser path converged back to `Waiting for your input` before reload on both configured Playwright projects.

## Evidence

### Reproduction before harness fix

- Manual BFF API polling against the managed stack showed `thread_view.current_activity.kind = "running"` and `composer.accepting_user_input = false` for more than 12 seconds after the first input.
- The persisted session row remained `status = "running"` with a non-null `current_turn_id`.
- The timeline only showed:
  - `session.status_changed` `created -> running`
  - `session.status_changed` `running -> waiting_input`
  - `message.user`
  - `session.status_changed` `waiting_input -> running`

### Root cause check

- Starting the same stack with:
  - `CODEX_WEBUI_APP_SERVER_BRIDGE_ENABLED=true`
  - `CODEX_APP_SERVER_COMMAND=node`
  - `CODEX_APP_SERVER_ARGS='tests/fixtures/fake-codex-app-server.mjs --turn-start-mode=pre_ack_completion'`
- Manual API polling then converged within 1 second to:
  - thread list `current_activity.kind = "waiting_on_user_input"`
  - thread view `current_activity.kind = "waiting_on_user_input"`
  - `composer.accepting_user_input = true`
  - timeline includes `message.assistant.completed` and the final `session.status_changed` back to `waiting_input`

### Final validation

Ran from the active worktree:

```bash
npm run check --prefix apps/frontend-bff
npm run test:e2e --prefix apps/frontend-bff -- e2e/chat-flow.runtime.spec.ts --project=desktop-chromium --project=mobile-chromium
```

Results:

- `npm run check --prefix apps/frontend-bff`: pass
- `npm run test:e2e --prefix apps/frontend-bff -- e2e/chat-flow.runtime.spec.ts --project=desktop-chromium --project=mobile-chromium`: pass

Managed Playwright result:

- `desktop-chromium`: pass
- `mobile-chromium`: pass

## Notes

- One intermediate external-stack Playwright run failed after the convergence fix because `getByText(followUpInput)` matched both the user message and the synthetic assistant echo. The final test uses an exact-text assertion for the follow-up user message.
- The managed Playwright config now uses `reuseExistingServer: false` for both web servers so the validation does not silently attach to unrelated local servers.
