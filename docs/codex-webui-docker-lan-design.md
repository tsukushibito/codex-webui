# Codex WebUI Docker/LAN Design

## 1. Goal
- Run the development environment, Codex, and the WebUI server in Docker.
- Allow Codex to be used from mobile devices on the same LAN through the WebUI.
- Provide a WebUI experience equivalent to Codex CLI conversations.
- Provide read-only file tree, file view, and diff view in the WebUI.
- Standardize on authenticated HTTPS for regular LAN use.

## 2. Scope
- Assume a single-user deployment.
- Assume clients are PCs, iPhones, and iPads on the same LAN.
- Assume one Git repository is mounted as the workspace.
- Multi-user isolation and browser-based file editing are out of scope.

## 3. Design Principles

### 3.1 Public Boundary
- Only the `edge` container is exposed to the LAN.
- `codex app-server` is not exposed directly and runs as a child process inside `codexbox`.
- `codexbox` is reachable only on the internal network.

### 3.2 Codex Integration
- Use `stdio` transport for `codex app-server`.
- Do not use `--listen ws://...` because it is experimental.
- The WebUI server is responsible for JSON-RPC bridging and event translation.

### 3.3 TLS and Authentication
- Browser access must use HTTPS.
- TLS terminates at `edge`.
- Certificates are issued by a local CA.
- Start with Basic authentication at `edge`.
- Basic authentication is allowed only over HTTPS.

## 4. Container Layout

### 4.1 Services
1. `edge`
2. `codexbox`

### 4.2 `edge` Responsibilities
- Public HTTP/HTTPS entry point on the LAN
- TLS termination
- Basic authentication
- Reverse proxy to `codexbox`
- SSE and WebSocket connection handling

### 4.3 `codexbox` Responsibilities
- Serve the WebUI and backend APIs
- Spawn one `codex app-server` child per browser session
- Bridge stdio JSONL traffic
- Handle approval flows
- Expose read-only FS and Git APIs
- Hold the workspace and Codex state

## 5. Network Design

### 5.1 Networks
- `frontend`
  - Public-facing network for `edge`
- `backend`
  - Internal network between `edge` and `codexbox`
  - Set `internal: true`

### 5.2 Traffic Flow
- Browser -> `edge`: HTTPS
- `edge` -> `codexbox`: HTTP
- `codexbox` -> `codex app-server`: stdio JSONL

### 5.3 Port Exposure
- Publish only `80/443` from `edge`.
- Use `expose` for `codexbox`; do not publish it to the host.

## 6. Local CA HTTPS

### 6.1 Why Local CA
- More stable than self-signed server certificates once trust is distributed.
- Easier to use from iPhones and multiple devices without browser warnings.
- Reusable when additional internal hostnames or services are added later.

### 6.2 Model
- Create one local CA.
- Issue the `edge` server certificate from that CA.
- Distribute the CA certificate to client devices and mark it as trusted.
- Mount only the server certificate and server private key into `edge`, not the CA private key.

### 6.3 Hostname
- Use a stable LAN hostname.
- Example: `codexbox.home.arpa`
- Provide name resolution using local DNS, router DNS, or per-device hosts entries.

## 7. Session Model

### 7.1 Rule
- `1 browser session = 1 codex app-server child`
- One `codexbox` container may host multiple sessions, but each session gets an isolated app-server child.

### 7.2 Reasoning
- Avoids routing approvals to the wrong client.
- Keeps SSE streams scoped to one session.
- Makes mobile reconnect behavior deterministic.

### 7.3 Lifecycle
1. The user opens the WebUI.
2. The WebUI server issues a session ID.
3. The server spawns a dedicated `codex app-server`.
4. The server completes the `initialize` and `initialized` handshake.
5. The UI opens an SSE stream.
6. Idle sessions are terminated after a timeout.

### 7.4 Reconnect
- Assume mobile clients disconnect.
- Reconnect requests include the session ID and last event position.
- Resync conversation state with `thread/read` when needed.
- Redisplay pending approvals after reconnect.

## 8. Persistence

### 8.1 Paths
- `CODEX_HOME=/state/codex`
- Bind mount the repo at `/workspace`

### 8.2 Persistent Data
- Codex auth data
- Codex config
- Thread history
- Optional WebUI session metadata if reconnect behavior needs it

## 9. Compose Layout

```yaml
services:
  edge:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - codexbox
    networks:
      - frontend
      - backend
    volumes:
      - ./infra/Caddyfile:/etc/caddy/Caddyfile:ro
      - ./infra/certs:/certs:ro
      - caddy_data:/data
      - caddy_config:/config

  codexbox:
    build: ./codexbox
    working_dir: /workspace
    command: ["node", "/app/webui-server.js"]
    expose:
      - "8080"
    environment:
      - PORT=8080
      - CODEX_HOME=/state/codex
      - WORKSPACE_ROOT=/workspace
    networks:
      - backend
    volumes:
      - ./repo:/workspace
      - codex_state:/state/codex
    tmpfs:
      - /tmp
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL

networks:
  frontend:
  backend:
    internal: true

volumes:
  codex_state:
  caddy_data:
  caddy_config:
```

Notes:
- `./infra/certs` should contain only the server certificate and private key for `edge`.
- Port `80` is only for redirecting to HTTPS. If not needed, expose only `443`.

## 10. WebUI Server Design

### 10.1 Codex RPC Bridge
- Spawn `codex app-server` as a child process.
- Read and write stdio as JSONL.
- Map each session ID to its app-server child.
- Always perform the `initialize` and `initialized` handshake per connection.
- Translate app-server events into UI-facing SSE events.

### 10.2 Approval Flow
- Store approval requests received from app-server.
- Show an Allow/Deny dialog in the UI.
- Return the user decision to app-server.
- Handle timeout, cancellation, and redisplay after reconnect.

### 10.3 Configuration
- Fix defaults in `~/.codex/config.toml` and repo-local `.codex/config.toml`.
- Start with read-only and approval-required defaults.

## 11. WebUI Feature Scope

### 11.1 Threads
- `thread/start`
- `thread/resume`
- `thread/list`
- `thread/read`

### 11.2 Turns
- `turn/start`
- `turn/steer`

### 11.3 Events
- `item/started`
- `item/completed`
- `item/agentMessage/delta`
- Approval request events

### 11.4 One-shot Execution
- If needed later, add a separate `codex exec --json` path.
- Keep one-shot jobs separate from the stateful conversation UI.

## 12. FS and Git API Design

### 12.1 Path Constraints
- Restrict all FS APIs to `WORKSPACE_ROOT`.
- Resolve user paths with `realpath` and reject anything outside the workspace.
- Allow symlinks only if the resolved path still stays inside the workspace.

### 12.2 File Tree
- Use Git as the primary source.
- Get tracked files from `git ls-files`.
- Get status badges from `git status --porcelain`.
- Optionally surface untracked files as a secondary source.

### 12.3 File View
- `GET /api/fs/file?path=...`
- Return text only.
- Reject binaries, oversized files, and paths outside the repo.

### 12.4 Diff View
- `GET /api/git/diff`
- `GET /api/git/show`
- Use an empty left side for new files.
- Use an empty right side for deleted files.
- Do not assume `git show HEAD:path` always exists; check first.

### 12.5 Turn-local Diff
- Do not use plain `git diff --name-only` at `turn/completed` as the turn diff.
- Compute turn-local changes against a snapshot captured at turn start.
- At minimum store starting status and file hashes.
- Expose completed turn-local changes through `GET /api/turn/changes?sessionId=...&turnId=...`.
- Return per-path `changeType` plus before/after snapshot summaries so later UI work can render turn-local change state without re-deriving it from the current workspace.

## 13. UI Design

### 13.1 Layout
- Left: thread list and file tree
- Center: chat
- Right: diff view
- Bottom: tool execution log
- Modal: approval dialog

### 13.2 Mobile Behavior
- Avoid a permanent three-pane layout on iPhone.
- Default to the chat view and switch file/diff panes via tabs.
- Provide an explicit reconnect path after long background suspension.

## 14. Security Policy
- Expose only `edge`.
- Require HTTPS.
- Require authentication.
- Never expose app-server directly.
- Start with read-only and approval-required permissions.
- Enable `no-new-privileges` and drop Linux capabilities in `codexbox`.
- Add a read-only root filesystem where practical.

## 15. Implementation Order
1. Create the `edge + codexbox` compose setup.
2. Configure local-CA-issued TLS certificates on `edge`.
3. Spawn `codex app-server` per session inside `codexbox`.
4. Wire `initialize`, `thread/start`, and `turn/start` through SSE-backed streaming.
5. Implement reverse-direction approval handling.
6. Implement `/api/fs/tree` and `/api/fs/file`.
7. Implement `/api/git/diff` and `/api/git/show`.
8. Add reconnect handling, approval redisplay, and turn snapshot diffing.

## 16. Project and Issue Management

### 16.1 Tracking Model
- Create one GitHub Project for this repository named `codex-webui implementation`.
- Use repository Issues for execution units and add them to the Project.
- Keep one parent planning Issue for the MVP and track the implementation issues as linked execution work.

### 16.2 Recommended Project Fields
- `Status`
  - `Todo`
  - `In Progress`
  - `Done`
- `Priority`
  - `P0`
  - `P1`
  - `P2`
- `Area`
  - `Infra`
  - `Backend`
  - `Frontend`
  - `Security`

### 16.3 Initial Issue Breakdown
- `P0` `Infra`: Bootstrap Docker Compose, `edge`, and `codexbox`
- `P0` `Infra`: Configure local CA TLS and reverse proxy with Caddy
- `P0` `Backend`: Implement session lifecycle and SSE endpoint
- `P0` `Backend`: Bridge `codex app-server` over stdio
- `P0` `Backend`: Support `thread/start` and `turn/start`
- `P0` `Frontend`: Render streaming chat output in the WebUI
- `P0` `Backend`: Implement approval request handling
- `P1` `Backend`: Add read-only file tree and file content APIs
- `P1` `Backend`: Add read-only Git diff APIs
- `P1` `Frontend`: Add file tree and diff panes
- `P1` `Backend`: Add reconnect and pending approval recovery
- `P2` `Backend`: Compute turn-local changed files from snapshots
- `P2` `Backend`: Add optional one-shot `codex exec --json` path

### 16.4 Working Rules
- Complete `P0` items before starting `P1`, unless blocked by external setup.
- Each implementation branch should map to one Issue.
- If one Issue becomes too large, split it before implementation rather than carrying hidden subtasks in a branch.
- Keep the Project ordered primarily by `Priority`, then by dependency order.
- If stricter queue control becomes necessary later, add a separate workflow field such as `Backlog`, `Ready`, `Blocked`, and `Done` instead of overloading `Priority`.

## 17. Future Work
- Replace Basic auth with OIDC.
- Split `codexbox` per repo.
- Fully isolate sessions and workspaces for multi-user deployments.
- Split one-shot job UI from the conversation UI.
