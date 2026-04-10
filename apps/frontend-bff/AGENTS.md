# AGENTS.md

Read [`README.md`](./README.md) before editing files in this app.

## Validation flow

- Do not start routine validation with `npm run build`
- Prefer this order unless the task requires something narrower:
  1. `npm run check`
  2. `node ./node_modules/typescript/bin/tsc --noEmit --pretty false`
  3. `npm test`
  4. `npm run build`

Keep the README as the source of truth for commands and workflow details. Use this file only as a short agent reminder.
