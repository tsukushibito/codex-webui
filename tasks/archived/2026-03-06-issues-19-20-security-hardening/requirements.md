# Issues 19-20 Requirements

## Goal
- Enforce authenticated access at `edge` and block client-driven safety override escalation in backend execution APIs.

## In Scope
- Issue #19
  - Require Basic auth at `edge` before reverse proxying to `codexbox`.
  - Configure auth credentials from environment variables.
  - Document local setup for auth credentials.
- Issue #20
  - Prevent clients from overriding safety-critical runtime settings (`approvalPolicy`, `sandbox`, `sandboxPolicy`).
  - Enforce server-side defaults for thread execution safety policy.
  - Add negative validation for unsafe override attempts.

## Out of Scope
- Comprehensive protocol compatibility expansion (`#21`).
- P1/P2 feature work (`#9` and later).
- OIDC or production identity federation.

## Acceptance Criteria Mapping
- #19
  - Caddy auth is required before proxying.
  - Credentials are env/secret-driven.
  - Unauthorized access is rejected.
- #20
  - Backend enforces safe approval/sandbox defaults.
  - Unsafe client overrides are rejected.
  - Negative test proves escalation attempt is blocked.

## Constraints and Assumptions
- Keep changes small and focused.
- Preserve HTTPS termination behavior.
- Keep WebUI startup path functional after hardening.

## Open Questions
- None blocking for #19/#20 implementation.
