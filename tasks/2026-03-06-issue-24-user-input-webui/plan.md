# Issue 24 Plan

## TDD
- TDD: partial
- Rationale: browser DOM wiring benefits from a focused regression test, but the page bootstrap still needs some setup scaffolding.

## Steps
- [ ] Add user-input state and rendering logic to the bundled client.
- [ ] Add user-input panel markup and styles.
- [ ] Wire snapshot and SSE events to keep pending requests synchronized.
- [ ] Submit answers to `/api/user-input/respond` and handle cleared requests.
- [ ] Add regression coverage for the shipped browser-side flow.
- [ ] Run validation and self-check acceptance criteria.

## Validation Notes
- Primary: `node --test` against a browser-side regression test.
- Secondary: smoke-check the existing backend test still passes if touched.

## Merge and Issue Closeout Method
- Merge path: PR to `main`.
- Issue closeout: include `Closes #24` in the PR description.
