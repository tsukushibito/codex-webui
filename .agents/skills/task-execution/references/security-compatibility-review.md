# Security and Compatibility Review

Run this review before delivery, even if Issue acceptance criteria look complete.

## Review Checklist

- Is the public boundary still narrow (only intended services exposed)?
- Are authentication and authorization expectations still enforced?
- Can client inputs weaken runtime safety settings (for example approval policy or sandbox mode)?
- Is there at least one negative test proving unsafe or invalid inputs are rejected?
- Are server-initiated protocol requests/events handled explicitly (or safely ignored with rationale)?
- Are unknown protocol messages logged and handled without breaking the session lifecycle?
- Is the implementation aligned with repository design expectations in `AGENTS.md` and `docs/`?

## Passing Conditions

Do not finalize delivery until all are true:
- Public boundary and auth controls match intended design.
- Client inputs cannot silently relax safety-critical settings.
- At least one negative test has been executed and documented.
- Server-initiated protocol compatibility is explicit; no accidental blanket rejects for expected methods.
- The change satisfies both Issue acceptance criteria and repository-level security/design expectations.
