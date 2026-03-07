# Issue #43 Plan

## Review Status
- Requirements review: pass
- Design review: pass

## TDD Decision
- TDD: no
- Rationale: this issue is primarily type-structure work. Validation is by strict compilation and build success rather than behavior-first tests.

## Steps
1. Add shared contract types for the frontend-consumed API responses and SSE payloads.
   - Validation: `npm run check`.
2. Add shared state types for session, transcript, approvals, user input, workspace tree, and file inspection.
   - Validation: `npm run check`.
3. Add a barrel export and integrate the types into the current Preact source where practical.
   - Validation: `npm run check` and `npm run build`.
4. Self-review against the issue acceptance criteria, archive task artifacts, and close out through PR/merge.
   - Validation: PR includes `Closes #43`.
