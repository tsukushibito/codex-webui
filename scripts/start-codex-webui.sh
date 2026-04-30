#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RUNTIME_DIR="${REPO_ROOT}/apps/codex-runtime"
FRONTEND_DIR="${REPO_ROOT}/apps/frontend-bff"

RUNTIME_HOST="${CODEX_WEBUI_RUNTIME_HOST:-127.0.0.1}"
RUNTIME_PORT="${CODEX_WEBUI_RUNTIME_PORT:-3001}"
FRONTEND_HOST="${CODEX_WEBUI_FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${CODEX_WEBUI_FRONTEND_PORT:-3000}"
WORKSPACE_ROOT="${CODEX_WEBUI_WORKSPACE_ROOT:-${RUNTIME_DIR}/var/workspaces}"
DATABASE_PATH="${CODEX_WEBUI_DATABASE_PATH:-${RUNTIME_DIR}/var/data/codex-runtime.sqlite}"
RUNTIME_BASE_URL="${CODEX_WEBUI_RUNTIME_BASE_URL:-http://127.0.0.1:${RUNTIME_PORT}}"
STARTUP_TIMEOUT_SECONDS="${CODEX_WEBUI_STARTUP_TIMEOUT_SECONDS:-180}"
APP_SERVER_BRIDGE_ENABLED="${CODEX_WEBUI_APP_SERVER_BRIDGE_ENABLED:-1}"
LOG_FILE="${CODEX_WEBUI_LOG_FILE:-}"
DEBUG_LIVE_CHAT=false

usage() {
  cat <<'EOF'
Usage:
  scripts/start-codex-webui.sh [--debug-live-chat] [--log-file PATH] [--help]

Options:
  --debug-live-chat  Enable live-chat debug logs for runtime and frontend
  --log-file         Append combined launcher, runtime, and frontend output to PATH
  --help             Show this help text

This launcher starts only the local runtime and frontend inside the current namespace.
For remote browser access, run Tailscale sidecar and Tailscale Serve separately as documented in
docs/codex_webui_dev_container_onboarding.md.
EOF
}

parse_args() {
  while (($# > 0)); do
    case "$1" in
      --debug-live-chat)
        DEBUG_LIVE_CHAT=true
        ;;
      --log-file)
        shift
        if (($# == 0)); then
          fail "--log-file requires a path"
        fi
        LOG_FILE="$1"
        ;;
      --log-file=*)
        LOG_FILE="${1#*=}"
        if [[ -z "${LOG_FILE}" ]]; then
          fail "--log-file requires a path"
        fi
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      --)
        shift
        break
        ;;
      *)
        fail "unknown argument: $1"
        ;;
    esac

    shift
  done

  if (($# > 0)); then
    fail "unexpected positional arguments: $*"
  fi
}

if [[ "${CODEX_WEBUI_DEBUG_LIVE_CHAT:-}" == "1" || "${NEXT_PUBLIC_CODEX_WEBUI_DEBUG_LIVE_CHAT:-}" == "1" ]]; then
  DEBUG_LIVE_CHAT=true
fi

PIDS=()

log() {
  echo "[codex-webui] $*"
}

fail() {
  echo "[codex-webui] error: $*" >&2
  exit 1
}

setup_logging() {
  if [[ -z "${LOG_FILE}" ]]; then
    return 0
  fi

  mkdir -p "$(dirname "${LOG_FILE}")"
  touch "${LOG_FILE}"
  exec > >(tee -a "${LOG_FILE}") 2>&1
  log "writing combined logs to ${LOG_FILE}"
}

require_command() {
  local command="$1"

  if ! command -v "${command}" >/dev/null 2>&1; then
    fail "required command not found: ${command}"
  fi
}

require_directory() {
  local path="$1"

  if [[ ! -d "${path}" ]]; then
    fail "required directory not found: ${path}"
  fi
}

require_file() {
  local path="$1"

  if [[ ! -f "${path}" ]]; then
    fail "required file not found: ${path}"
  fi
}

cleanup() {
  local exit_code=$?

  trap - EXIT INT TERM

  if (( ${#PIDS[@]} > 0 )); then
    log "stopping child processes"
    kill "${PIDS[@]}" 2>/dev/null || true
    wait "${PIDS[@]}" 2>/dev/null || true
  fi

  exit "${exit_code}"
}

wait_for_http() {
  local url="$1"
  local label="$2"
  local pid="$3"
  local attempts=0

  while (( attempts < STARTUP_TIMEOUT_SECONDS )); do
    if ! kill -0 "${pid}" 2>/dev/null; then
      fail "${label} exited before becoming ready"
    fi

    if curl --silent --fail --output /dev/null "${url}"; then
      log "${label} is ready at ${url}"
      return 0
    fi

    attempts=$((attempts + 1))
    sleep 1
  done

  fail "timed out waiting for ${label} at ${url}"
}

start_runtime() {
  log "starting codex-runtime on ${RUNTIME_HOST}:${RUNTIME_PORT}"
  (
    cd "${RUNTIME_DIR}"
    exec env \
      HOST="${RUNTIME_HOST}" \
      PORT="${RUNTIME_PORT}" \
      CODEX_WEBUI_DEBUG_LIVE_CHAT="$([[ "${DEBUG_LIVE_CHAT}" == true ]] && echo 1 || echo 0)" \
      CODEX_WEBUI_WORKSPACE_ROOT="${WORKSPACE_ROOT}" \
      CODEX_WEBUI_DATABASE_PATH="${DATABASE_PATH}" \
      CODEX_WEBUI_APP_SERVER_BRIDGE_ENABLED="${APP_SERVER_BRIDGE_ENABLED}" \
      CODEX_APP_SERVER_COMMAND="${CODEX_APP_SERVER_COMMAND:-codex}" \
      CODEX_APP_SERVER_ARGS="${CODEX_APP_SERVER_ARGS:-app-server}" \
      npm run dev
  ) > >(sed -u 's/^/[runtime] /') 2> >(sed -u 's/^/[runtime] /' >&2) &
  PIDS+=("$!")
}

start_frontend() {
  log "starting frontend-bff on ${FRONTEND_HOST}:${FRONTEND_PORT}"
  (
    cd "${FRONTEND_DIR}"
    exec env \
      CODEX_WEBUI_RUNTIME_BASE_URL="${RUNTIME_BASE_URL}" \
      NEXT_PUBLIC_CODEX_WEBUI_DEBUG_LIVE_CHAT="$([[ "${DEBUG_LIVE_CHAT}" == true ]] && echo 1 || echo 0)" \
      npm run dev -- --hostname "${FRONTEND_HOST}" --port "${FRONTEND_PORT}"
  ) > >(sed -u 's/^/[frontend] /') 2> >(sed -u 's/^/[frontend] /' >&2) &
  PIDS+=("$!")
}

trap cleanup EXIT INT TERM
parse_args "$@"
setup_logging

require_directory "${REPO_ROOT}"
require_directory "${RUNTIME_DIR}"
require_directory "${FRONTEND_DIR}"
require_file "${RUNTIME_DIR}/package.json"
require_file "${FRONTEND_DIR}/package.json"
require_file "${RUNTIME_DIR}/node_modules/.package-lock.json"
require_file "${FRONTEND_DIR}/node_modules/.package-lock.json"
require_command curl
require_command npm
require_command codex

mkdir -p "${WORKSPACE_ROOT}" "$(dirname "${DATABASE_PATH}")"

start_runtime
wait_for_http "http://127.0.0.1:${RUNTIME_PORT}/api/v1/workspaces" "codex-runtime" "${PIDS[0]}"

start_frontend
wait_for_http "http://127.0.0.1:${FRONTEND_PORT}/" "frontend-bff" "${PIDS[1]}"

log "local UI: http://127.0.0.1:${FRONTEND_PORT}/"
log "runtime API: http://127.0.0.1:${RUNTIME_PORT}/api/v1/"
log "browser-facing entrypoint inside the shared Tailscale namespace: http://127.0.0.1:${FRONTEND_PORT}/"
log "remote browser access is provided separately by the Tailscale sidecar and Tailscale Serve"
log "press Ctrl-C to stop runtime and frontend"

wait -n "${PIDS[@]}"
exit $?
