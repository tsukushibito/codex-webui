# Issue #47 Plan

## Review Status
- Requirements review: pass
- Design review: pass

## TDD Decision
- TDD: partial
- Rationale: route/default-runtime expectations should stay covered by tests, while file removal and script cleanup are validated by the final combined test/build path.

## Steps
1. Switch the default root route to the built Preact frontend and update server tests.
   - Validation: `npm run test:backend`.
2. Remove legacy frontend source and legacy frontend tests.
   - Validation: `npm run test:all` still passes without legacy coverage.
3. Update docs and package scripts for the final runtime.
   - Validation: doc diff and script diff are consistent.
4. Archive task artifacts, merge, close #47, and close parent #41.
   - Validation: PR includes `Closes #47` and parent issue can be closed afterwards.
