#!/usr/bin/env bash
set -euo pipefail

if [[ $# -gt 0 ]]; then
  exec code tunnel "$@"
fi

TUNNEL_NAME="${TUNNEL_NAME:-codex-webui-dev}"

exec code tunnel --accept-server-license-terms --name "${TUNNEL_NAME}"
