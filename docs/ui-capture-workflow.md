# UI Capture Workflow

## Operational Assumptions
- The repository root is mounted locally and `codexbox` dependencies are installed.
- Codex can run local shell commands in this workspace.
- During frontend development, the primary review target is the Vite dev server at `http://127.0.0.1:5173/`.
- The integrated backend-served UI remains available at `http://127.0.0.1:8080/` for integration checks.

## Purpose
- Let Codex render the WebUI in a real headless browser.
- Produce repeatable desktop and mobile screenshots for UI review.
- Keep screenshot artifacts out of Git by writing them under `.tmp/ui-captures/`.

## Commands
- Install the browser runtime once:

```bash
cd codexbox
npm run ui:install-browser
```

- Capture the default development UI:

```bash
cd codexbox
npm run ui:capture
```

- The default capture command targets `http://127.0.0.1:5173/` and starts `npm run dev:all` when needed.

- Capture the integrated backend-served UI:

```bash
cd codexbox
npm run ui:capture:integrated
```

- Capture a specific route or theme:

```bash
cd codexbox
npm run ui:capture -- --url=http://127.0.0.1:8080/app --theme=dark
```

## Behavior
- `npm run ui:capture` checks whether `:5173` is already serving the frontend.
- If not, it starts `npm run dev:all`, waits for the page to respond, captures screenshots, then stops the temporary server process.
- `npm run ui:capture:integrated` keeps the previous integrated behavior and targets `:8080`.
- The script writes:
  - `desktop-<theme>.png`
  - `mobile-<theme>.png`
  - `capture-<theme>.json`
  - `capture-server.log` when the script started the server itself

## Options
- `--url=<http-url>`
- `--theme=system|light|dark`
- `--output-dir=<path>`
- `--selector=<css-selector>`
- `--timeout=<milliseconds>`
- `--start-command="<shell command>"`
- `--skip-start=true`

Environment variables with the `UI_CAPTURE_` prefix are also supported:
- `UI_CAPTURE_URL`
- `UI_CAPTURE_THEME`
- `UI_CAPTURE_OUTPUT_DIR`
- `UI_CAPTURE_SELECTOR`
- `UI_CAPTURE_TIMEOUT_MS`
- `UI_CAPTURE_START_COMMAND`
- `UI_CAPTURE_SKIP_START=1`

## Review Loop
- Use the generated PNGs for visual checks.
- Use the JSON report to inspect console errors and captured file paths.
- If direct image review by the agent is needed in-chat, provide the generated file path or attach the image.
