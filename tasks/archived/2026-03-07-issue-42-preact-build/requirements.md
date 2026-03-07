# Issue #42 Requirements

## Goal
Introduce a `Preact + TypeScript` frontend build pipeline for the WebUI while keeping the current server-delivered vanilla UI as the shipped default until a later cutover issue.

## Scope
- Add frontend package management and scripts under `codexbox`.
- Add `Vite + Preact + TypeScript` configuration and a minimal frontend app scaffold.
- Produce build output that the existing Node server can serve.
- Expose the built frontend on a separate route so later migration work can proceed without cutting over the current UI.
- Keep local dev and production build flows discoverable from scripts and repository docs.

## Out of Scope
- Porting the current vanilla UI behavior.
- Replacing the default `/` route.
- Removing legacy frontend files.
- Introducing shared contracts or parity behavior beyond a minimal scaffold.

## Consumers and Workflows
- Browser users opening the current WebUI at `/` remain on the legacy frontend.
- Browser users and developers can open the new scaffolded frontend at a separate route served by the backend.
- Developers can run a frontend dev server for the new app while continuing to use the existing backend API.

## Constraints and Assumptions
- The repository currently has no frontend package manager or bundler setup.
- The backend continues to serve static assets directly from the filesystem.
- The Docker image should still be able to serve the frontend build output without requiring a runtime bundler.
- Keep the change small enough that later issues can port the UI incrementally.

## Acceptance Criteria
- `npm install` works in `codexbox` and produces a lockfile.
- `npm run build` in `codexbox` produces a `Preact + TypeScript` frontend bundle.
- The backend serves the built frontend HTML and referenced assets on a separate route.
- The legacy frontend remains available at `/`.
- The frontend development and build entrypoints are clear from scripts and/or docs.

## Edge Cases and Error Handling
- If the built frontend output is missing, the new route should fail explicitly instead of silently serving the legacy frontend.
- The new built asset route must not weaken existing static path traversal protection.
- The server should continue serving existing `/static/*` legacy assets unchanged.

## Open Questions
- Package manager choice: use `npm` for the smallest adoption cost. Resolved.
- Route name for the new frontend: use `/app` and `/app/` as the bridge path. Resolved.
