# Issue #47 Design

## Overview
Point `/` at the built Preact frontend and remove the old browser-delivered vanilla bundle. Keep static asset serving generic enough for built assets under `public/preact/`, and keep `/app` as an alias to the same built frontend for compatibility.

## Main Changes
- Update `webui-server.js` so `/` and `/app` both serve the built frontend HTML.
- Remove `codexbox/public/index.html`, `styles.css`, `app.js`, `app-session.js`, `app-render.js`, `app-transport.js`, and `public/app.test.js`.
- Update tests to validate the built frontend as the default root path.
- Remove the temporary `test:legacy` script and simplify `test:all`.
- Update docs to state that the built Preact frontend is now the shipped UI.

## Validation
- `npm run test:frontend`
- `npm run test:backend`
- `npm run test:all`
- `npm run check`
- `npm run build`

## Risks
- After this change there is no legacy browser fallback, so the built frontend output must stay committed and valid.
