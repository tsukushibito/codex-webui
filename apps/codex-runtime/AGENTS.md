# AGENTS.md

Read [`README.md`](./README.md) before editing files in this app.

## Validation flow

- Do not start routine validation with `npm run build`
- In `codex-runtime`, `npm run build` already runs `tsc --noEmit`
- Prefer this order unless the task requires something narrower:
  1. `npm run check`
  2. `npm test`
  3. `npm run build`

Keep the README as the source of truth for commands and workflow details. Use this file only as a short agent reminder.
