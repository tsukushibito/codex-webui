#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RUNTIME_DIR="${REPO_ROOT}/apps/codex-runtime"
FRONTEND_DIR="${REPO_ROOT}/apps/frontend-bff"

RUNTIME_HOST="${CODEX_WEBUI_RUNTIME_HOST:-0.0.0.0}"
RUNTIME_PORT="${CODEX_WEBUI_RUNTIME_PORT:-3001}"
FRONTEND_HOST="${CODEX_WEBUI_FRONTEND_HOST:-0.0.0.0}"
FRONTEND_PORT="${CODEX_WEBUI_FRONTEND_PORT:-3000}"
WORKSPACE_ROOT="${CODEX_WEBUI_WORKSPACE_ROOT:-${RUNTIME_DIR}/var/workspaces}"
DATABASE_PATH="${CODEX_WEBUI_DATABASE_PATH:-${RUNTIME_DIR}/var/data/codex-runtime.sqlite}"
RUNTIME_BASE_URL="${CODEX_WEBUI_RUNTIME_BASE_URL:-http://127.0.0.1:${RUNTIME_PORT}}"
DEVTUNNEL_ID="${CODEX_WEBUI_DEVTUNNEL_ID:-}"
DEVTUNNEL_HOST_ARGS="${CODEX_WEBUI_DEVTUNNEL_HOST_ARGS:-}"
STARTUP_TIMEOUT_SECONDS="${CODEX_WEBUI_STARTUP_TIMEOUT_SECONDS:-60}"

PIDS=()

log() {
  echo "[codex-webui] $*"
}

fail() {
  echo "[codex-webui] error: $*" >&2
  exit 1
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

trap cleanup EXIT INT TERM

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
require_command devtunnel

if [[ -z "${DEVTUNNEL_ID}" ]]; then
  fail "set CODEX_WEBUI_DEVTUNNEL_ID to an existing persistent dev tunnel id"
fi

mkdir -p "${WORKSPACE_ROOT}" "$(dirname "${DATABASE_PATH}")"

if ! devtunnel port show "${DEVTUNNEL_ID}" -p "${FRONTEND_PORT}" >/dev/null 2>&1; then
  fail "dev tunnel ${DEVTUNNEL_ID} does not have port ${FRONTEND_PORT}; run 'devtunnel port create ${DEVTUNNEL_ID} -p ${FRONTEND_PORT} --protocol http'"
fi

log "starting codex-runtime on ${RUNTIME_HOST}:${RUNTIME_PORT}"
(
  cd "${RUNTIME_DIR}"
  exec env \
    HOST="${RUNTIME_HOST}" \
    PORT="${RUNTIME_PORT}" \
    CODEX_WEBUI_WORKSPACE_ROOT="${WORKSPACE_ROOT}" \
    CODEX_WEBUI_DATABASE_PATH="${DATABASE_PATH}" \
    npm run dev
) > >(sed 's/^/[runtime] /') 2> >(sed 's/^/[runtime] /' >&2) &
PIDS+=("$!")

wait_for_http "http://127.0.0.1:${RUNTIME_PORT}/api/v1/workspaces" "codex-runtime" "${PIDS[0]}"

log "starting frontend-bff on ${FRONTEND_HOST}:${FRONTEND_PORT}"
(
  cd "${FRONTEND_DIR}"
  exec env \
    CODEX_WEBUI_RUNTIME_BASE_URL="${RUNTIME_BASE_URL}" \
    npm run dev -- --hostname "${FRONTEND_HOST}" --port "${FRONTEND_PORT}"
) > >(sed 's/^/[frontend] /') 2> >(sed 's/^/[frontend] /' >&2) &
PIDS+=("$!")

wait_for_http "http://127.0.0.1:${FRONTEND_PORT}/" "frontend-bff" "${PIDS[1]}"

log "hosting dev tunnel ${DEVTUNNEL_ID} for port ${FRONTEND_PORT}"
if [[ -n "${DEVTUNNEL_HOST_ARGS}" ]]; then
  # shellcheck disable=SC2206
  tunnel_args=( ${DEVTUNNEL_HOST_ARGS} )
else
  tunnel_args=()
fi

(
  exec devtunnel host "${DEVTUNNEL_ID}" "${tunnel_args[@]}"
) > >(sed 's/^/[devtunnel] /') 2> >(sed 's/^/[devtunnel] /' >&2) &
PIDS+=("$!")

log "local UI: http://127.0.0.1:${FRONTEND_PORT}/"
log "runtime API: http://127.0.0.1:${RUNTIME_PORT}/api/v1/"
log "press Ctrl-C to stop runtime, frontend, and tunnel"

wait -n "${PIDS[@]}"
exit $?
