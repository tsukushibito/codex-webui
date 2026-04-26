# Codex WebUI UX renewal validation gates v0.1

## 1. Purpose

This document defines the maintained validation gates for the v0.9 UX renewal.

It is the source of truth for:

- browser E2E gates that must pass before the UX renewal is judged complete
- UX regression gates that protect the thread-first model from legacy surface regressions
- desktop visual inspection expectations
- mobile reachability checks
- the current coverage map from maintained gates to automated and manual evidence

This document does not replace the roadmap, requirements, or UI specification. It points validation back to those maintained sources.

## 2. Governing sources

Use these maintained documents as the normative source for what the UX renewal must satisfy:

- `docs/codex_webui_mvp_roadmap_v0_1.md`, especially section `5.4 Phase 5: v0.9 validation, convergence, and MVP judgment`
- `docs/requirements/codex_webui_mvp_requirements_v0_9.md`
- `docs/specs/codex_webui_common_spec_v0_9.md`
- `docs/specs/codex_webui_public_api_v0_9.md`
- `docs/specs/codex_webui_ui_layout_spec_v0_9.md`

When this validation document and a normative source appear to disagree, treat this document as the execution and evidence layer and defer product behavior to the normative source.

## 3. Gate families

### 3.1 UX renewal E2E gates

The browser suite must prove the thread-first v0.9 flow across desktop and mobile for:

1. first-input thread start from workspace context
2. existing-thread continuation
3. pending request response inside thread context
4. interrupt and return to normal sendability
5. reconnect or stream reacquisition convergence
6. background high-priority return using a lightweight notification path

### 3.2 UX regression gates

Validation must reject regressions that reintroduce legacy surface assumptions. At minimum, the browser and component/test evidence must continue to prove:

- no required primary Home screen dependency for thread start, thread return, or approval response
- no dedicated standalone approval screen or approval inbox as the required intervention path
- no event-driven auto-open detail behavior for approval or background-priority events
- pending request response remains thread-scoped
- desktop and mobile both preserve a reachable return-to-thread path

### 3.3 Desktop visual inspection gates

Manual desktop inspection must confirm:

- the desktop layout preserves the normative `[ Navigation ] [ Thread View ]` composition
- thread context remains readable without route changes to legacy primary screens
- high-priority background promotion is noticeable through lightweight UI such as the banner/notice, badges, or navigation summaries
- the selected thread can be opened from the lightweight notification path and the user stays in `thread_view`
- detail remains selection-driven rather than auto-opened by events
- no horizontal overflow appears in the validated desktop flows

### 3.4 Mobile reachability gates

Manual and automated mobile validation must confirm:

- the single-column `thread_view` remains usable at the mobile project width
- navigation is reachable through the mobile thread drawer toggle
- first-input start, thread continuation, request response, interrupt, and background return remain reachable without desktop-only assumptions
- the background high-priority notice is visible in thread context without first opening Navigation
- returning to the target thread from the notice does not require a standalone approval route or a dedicated approval page
- no horizontal overflow appears in the validated mobile flows

## 4. Required automated gates

The current required automated gate set for `apps/frontend-bff` is:

```bash
npm run check
node ./node_modules/typescript/bin/tsc --noEmit --pretty false
npm test -- tests/chat-page-client.test.tsx tests/browser-entry-routes.test.ts
npm run test:e2e -- e2e/legacy-entry-routes.spec.ts e2e/chat-flow.spec.ts e2e/approval-flow.spec.ts e2e/background-priority.spec.ts --project=desktop-chromium --reporter=line
npm run test:e2e -- e2e/legacy-entry-routes.spec.ts e2e/chat-flow.spec.ts e2e/approval-flow.spec.ts e2e/background-priority.spec.ts --project=mobile-chromium --reporter=line
```

These commands are the bounded validation slice for the UX renewal gates in this work package. Broader build or redesign validation is out of scope for this document version.

## 5. Coverage map

| Gate | Normative source anchor | Current automated evidence | Current manual evidence |
| --- | --- | --- | --- |
| First-input thread start in workspace context | roadmap `5.4` item 4; UI layout spec section `13.4`; requirements thread-first/mobile start rules | `apps/frontend-bff/e2e/chat-flow.spec.ts`; `apps/frontend-bff/tests/chat-page-client.test.tsx` | desktop and mobile visual pass during targeted browser inspection |
| Existing-thread continuation and normal composer flow | roadmap `5.4` item 4; UI layout spec section `13.3` and `13.4` | `apps/frontend-bff/e2e/chat-flow.spec.ts`; `apps/frontend-bff/tests/chat-page-client.test.tsx` | desktop and mobile visual pass during targeted browser inspection |
| Pending request response inside thread context | roadmap `5.4` item 4; UI layout spec section `13.5`; requirements request-response rules | `apps/frontend-bff/e2e/approval-flow.spec.ts`; `apps/frontend-bff/tests/chat-page-client.test.tsx` | desktop and mobile request card/readability inspection |
| Background high-priority return via lightweight notification | roadmap `5.3` items 7 and acceptance bullets; roadmap `5.4` item 6; UI layout spec sections `12` and `13.7` | `apps/frontend-bff/e2e/background-priority.spec.ts`; `apps/frontend-bff/tests/chat-page-client.test.tsx` | desktop and mobile notice visibility plus return-path inspection |
| Legacy browser entry compatibility stays thread-first | UI layout spec sections `3.3`, `5.5`, `12.3`, `13.5`, `13.11` | `apps/frontend-bff/e2e/legacy-entry-routes.spec.ts`; `apps/frontend-bff/tests/browser-entry-routes.test.ts` | browser review confirms `/` and `/approvals` land on `/chat` without standalone Home or Approvals UI |
| Reconnect and state reacquisition convergence | roadmap `5.4` item 3 and item 4; UI layout spec section `13.9` | `apps/frontend-bff/tests/chat-page-client.test.tsx`; `apps/frontend-bff/tests/chat-send-recovery.test.ts` | deferred manual reconnect drill in a full-stack session when pre-push validation runs |
| Desktop detail remains selection-driven | UI layout spec sections `11.3`, `11.4`, `13.6`, `13.7` | `apps/frontend-bff/tests/chat-page-client.test.tsx`; `apps/frontend-bff/tests/chat-view.test.tsx` | desktop visual inspection of request/background flows |
| Mobile reachability for notification return and request response | roadmap `5.4` item 5; requirements mobile acceptance rules; UI layout spec sections `4.6`, `6`, `13.10` | `apps/frontend-bff/e2e/approval-flow.spec.ts`; `apps/frontend-bff/e2e/background-priority.spec.ts` | mobile visual inspection at Playwright mobile project width |

## 6. Desktop visual inspection checklist

Run desktop inspection against `desktop-chromium` using the validated thread-first flows.

Confirm all of the following:

1. Navigation remains visible as the left discovery surface.
2. Thread View remains the primary center surface.
3. Background high-priority promotion appears as a lightweight notice or equivalent signal without route replacement.
4. Opening the promoted thread keeps the reviewer on `/chat` and lands on the target thread header and pending request state.
5. No standalone approval route, approval inbox, or auto-open detail surface is required to complete the return.
6. No horizontal overflow appears before or after the background return.

## 7. Mobile inspection checklist

Run mobile inspection against `mobile-chromium` using the validated thread-first flows.

Confirm all of the following:

1. The thread-first surface remains single-column and readable.
2. The background high-priority notice is visible from thread context without opening the thread drawer first.
3. The lightweight notice can open the target thread directly.
4. The target thread shows pending request context in `thread_view` after the return.
5. The flow remains on `/chat` and does not depend on a standalone approval route.
6. No horizontal overflow appears in the validated flow.

## 8. Current evidence status

Current automated evidence for this document version is expected from:

- `apps/frontend-bff/e2e/chat-flow.spec.ts`
- `apps/frontend-bff/e2e/approval-flow.spec.ts`
- `apps/frontend-bff/e2e/background-priority.spec.ts`
- `apps/frontend-bff/tests/chat-page-client.test.tsx`
- `apps/frontend-bff/tests/browser-entry-routes.test.ts`
- `apps/frontend-bff/e2e/legacy-entry-routes.spec.ts`

Current manual evidence remains targeted visual/browser inspection for desktop and mobile layouts. Record execution-specific command results and inspection notes in the active task package and artifacts, not by rewriting this maintained document.
