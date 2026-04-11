# Phase 4B: Cut over the browser UI to the v0.9 thread-first interaction model

## Purpose

- Replace the current session-first Chat and standalone Approval UI with the maintained v0.9 thread-first browser UX.

## Primary issue

- Issue: [#127](https://github.com/tsukushibito/codex-webui/issues/127)

## Source docs

- [docs/codex_webui_mvp_roadmap_v0_1.md](/workspace/docs/codex_webui_mvp_roadmap_v0_1.md)
- [docs/requirements/codex_webui_mvp_requirements_v0_9.md](/workspace/docs/requirements/codex_webui_mvp_requirements_v0_9.md)
- [docs/specs/codex_webui_public_api_v0_9.md](/workspace/docs/specs/codex_webui_public_api_v0_9.md)
- [apps/frontend-bff/README.md](/workspace/apps/frontend-bff/README.md)

## Scope for this package

- Rework Home around workspace selection, resume candidates, and thread list cues.
- Rework the main interaction surface around `thread_view`, `timeline`, `current_activity`, `composer`, and thread-context request helpers.
- Make first user input the canonical new-thread start path from the browser.
- Present pending and just-resolved request information from thread context instead of a standalone approval domain flow.
- Converge reconnect behavior on REST reacquisition of `thread_view`, `timeline`, and request helper state.
- Keep smartphone usability as a first-class constraint during the cutover.

## Exit criteria

- Browser interaction follows the v0.9 thread-first model.
- Request response actions are reachable from thread context with minimum confirmation information.
- Desktop and smartphone layouts no longer depend on the old session/approval UI model.

## Work plan

- Inspect the current Home, Chat, and shared thread/request view models in `apps/frontend-bff`.
- Update browser data-loading and state management to use the v0.9 thread-first contract.
- Revise the UI components and route wiring to remove session-first assumptions.
- Add or update focused tests for the new browser flow and reconnect behavior.

## Artifacts / evidence

- Local validation outputs from `apps/frontend-bff`.
- Any screenshots or manual notes needed to confirm desktop and smartphone layout behavior.

## Status / handoff notes

- Status: `locally complete`
- Notes: Home and Chat now present a thread-first browser shell with thread/request wording, request-context actions, and reconnect-friendly thread lists. Validation passed with `npm run check`, `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`, `npm test`, and `npm run build`. The remaining work is publish-oriented follow-through for the branch / PR path.
- Notes: Workflow was straightforward once the active package and worktree were created; the main drift to avoid next time is starting UI execution without first normalizing the issue/package links.

## Archive conditions

- Archive this package after the slice is locally complete, the pre-push validation gate has passed, and the work has been merged to `main` with the Issue tracking updated.
