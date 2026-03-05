# Issue 21 Design

## Overview
- Extend server-request dispatch with explicit handlers for non-approval methods.
- Reuse existing pending-request management pattern used for approvals.

## Main Decisions
- `item/tool/requestUserInput`:
  - Store as pending user-input request with timeout.
  - Expose list/respond APIs for client participation.
  - On timeout, auto-respond with empty answer set.
- `item/tool/call`:
  - Respond deterministically with `success:false` and explanatory text.
  - Emit structured event for observability.
- Unknown methods:
  - Keep JSON-RPC error response (`-32601`) but emit structured unsupported-request event fields.

## API Additions
- `GET /api/user-input?sessionId=...`
- `POST /api/user-input/respond`

## Risks
- Response payload mismatch could fail request completion.
  - Mitigation: use schema-aligned shape from generated JSON schema.
