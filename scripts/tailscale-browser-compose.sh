#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${TAILSCALE_BROWSER_COMPOSE_FILE:-${REPO_ROOT}/docker-compose.tailscale-browser.yml}"
ENV_FILE="${TAILSCALE_BROWSER_ENV_FILE:-${REPO_ROOT}/.env.tailscale-browser}"
USE_EXAMPLE_ENV=false

usage() {
  cat <<'EOF'
Usage:
  scripts/tailscale-browser-compose.sh [--example-env] [docker compose args...]

Options:
  --example-env  Use .env.tailscale-browser.example instead of .env.tailscale-browser
  --help         Show this help text

Examples:
  scripts/tailscale-browser-compose.sh up -d
  scripts/tailscale-browser-compose.sh ps
  scripts/tailscale-browser-compose.sh logs -f
  scripts/tailscale-browser-compose.sh exec tailscale tailscale status
  scripts/tailscale-browser-compose.sh down

Environment overrides:
  TAILSCALE_BROWSER_COMPOSE_FILE  Compose file path
  TAILSCALE_BROWSER_ENV_FILE      Env file path
EOF
}

fail() {
  echo "[tailscale-browser-compose] error: $*" >&2
  exit 1
}

args=()

while (($# > 0)); do
  case "$1" in
    --example-env)
      USE_EXAMPLE_ENV=true
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    --)
      shift
      args+=("$@")
      break
      ;;
    *)
      args+=("$1")
      ;;
  esac
  shift
done

if [[ "${USE_EXAMPLE_ENV}" == true ]]; then
  ENV_FILE="${REPO_ROOT}/.env.tailscale-browser.example"
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  fail "compose file not found: ${COMPOSE_FILE}"
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  fail "env file not found: ${ENV_FILE}; create it with: cp .env.tailscale-browser.example .env.tailscale-browser"
fi

exec docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" "${args[@]}"
