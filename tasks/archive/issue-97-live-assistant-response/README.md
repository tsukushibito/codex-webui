# Issue 97 Live Assistant Response

## Purpose

- Restore the live browser chat path so the first user message produces a real assistant response or approval transition instead of remaining stuck after message acceptance.

## Primary issue

- Issue: `#97 https://github.com/tsukushibito/codex-webui/issues/97`

## Source docs

- `docs/codex_webui_mvp_roadmap_v0_1.md`
- `docs/requirements/codex_webui_mvp_requirements_v0_8.md`
- `docs/specs/codex_webui_public_api_v0_8.md`
- `docs/specs/codex_webui_internal_api_v0_8.md`
- `apps/codex-runtime/README.md`

## Scope for this package

- Replace the live runtime's synthetic post-send behavior with a real bridge to `codex app-server` turn events.
- Preserve the documented `waiting_input -> running -> waiting_input|waiting_approval` turn semantics in browser-visible flows.
- Add focused regression coverage for send -> assistant response behavior in the live stack.

## Exit criteria

- A browser message send produces either assistant output or approval wait through the normal live runtime path.
- Runtime no longer depends on manual `/assistant-events` injection for the main chat flow.
- Focused validation covers the live send -> response path and records any remaining gaps.

## Work plan

- Inspect the current app-server supervisor and native session gateway boundaries to confirm the missing live event bridge.
- Implement the smallest runtime slice that can ingest real assistant or approval events from `codex app-server`.
- Add focused tests and rerun targeted browser/runtime validation.
- Record what still remains for `#93` and parent `#63` after the fix.

## Artifacts / evidence

- Validation: `cd apps/codex-runtime && npm test -- --run tests/session-routes.test.ts`
- Validation: `cd apps/codex-runtime && npm run build`
- Validation: `cd apps/frontend-bff && npm test -- --run tests/chat-page-client.test.tsx tests/chat-send-recovery.test.ts tests/chat-data.test.ts tests/chat-view.test.tsx`
- Validation: `cd apps/frontend-bff && timeout 120s npm run build`
- Manual validation: DevTunnel browser path now shows assistant response without reload after `send`, and the EventLog converges in-place for the same interaction
- Added focused live-bridge regression coverage in `apps/codex-runtime/tests/session-routes.test.ts` using `tests/fixtures/fake-codex-app-server.mjs`
- Added env-gated live-chat debug logging across runtime, BFF SSE relay, and browser chat recovery to support future field debugging without changing default behavior

## Status / handoff notes

- Status: `locally complete`
- Notes: `The live assistant-response path now has three layers of coverage: runtime bridge tests, frontend missed-SSE recovery tests, and a manual DevTunnel verification that confirmed reload-free assistant rendering. Env-gated debug logging remains in place because the browser-path failure reproduced only under remote validation and the logs are useful for #93 follow-up verification. Remaining work for this issue is GitHub completion flow only: archive package, open/merge PR, sync main, cleanup worktree, then close #97.`

## Archive conditions

- Archive this package when the live assistant-response slice is complete, validation evidence is recorded, and the handoff notes are updated.
