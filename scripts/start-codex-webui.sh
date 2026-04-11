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
APP_SERVER_BRIDGE_ENABLED="${CODEX_WEBUI_APP_SERVER_BRIDGE_ENABLED:-1}"
INTERACTIVE_MODE=false
USE_DEVTUNNEL=false

usage() {
  cat <<'EOF'
Usage:
  scripts/start-codex-webui.sh [--interactive] [--help]

Options:
  --interactive  Prompt before startup to decide whether to host through Dev Tunnel
  --help         Show this help text
EOF
}

parse_args() {
  while (($# > 0)); do
    case "$1" in
      --interactive)
        INTERACTIVE_MODE=true
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

PIDS=()

log() {
  echo "[codex-webui] $*"
}

fail() {
  echo "[codex-webui] error: $*" >&2
  exit 1
}

prompt_yes_no() {
  local prompt="$1"
  local default_answer="${2:-yes}"
  local suffix=" [y/n]"
  local reply

  case "${default_answer}" in
    yes)
      suffix=" [Y/n]"
      ;;
    no)
      suffix=" [y/N]"
      ;;
    *)
      fail "invalid default answer: ${default_answer}"
      ;;
  esac

  while true; do
    read -r -p "${prompt}${suffix} " reply || fail "prompt cancelled"
    reply="${reply:-${default_answer}}"

    case "${reply,,}" in
      y|yes)
        return 0
        ;;
      n|no)
        return 1
        ;;
      *)
        echo "Please answer yes or no."
        ;;
    esac
  done
}

prompt_choice() {
  local prompt="$1"
  local max_choice="$2"
  local reply

  while true; do
    read -r -p "${prompt} " reply || fail "prompt cancelled"

    if [[ "${reply}" =~ ^[0-9]+$ ]] && (( reply >= 1 && reply <= max_choice )); then
      printf '%s\n' "${reply}"
      return 0
    fi

    echo "Please enter a number between 1 and ${max_choice}."
  done
}

require_tty() {
  if [[ ! -t 0 || ! -t 1 ]]; then
    fail "interactive mode requires an attached TTY"
  fi
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

devtunnel_json() {
  local output

  if ! output="$(devtunnel "$@" -j)"; then
    fail "devtunnel $* failed"
  fi

  printf '%s\n' "${output}"
}

list_dev_tunnels() {
  devtunnel_json list | node --input-type=module -e '
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      input += chunk;
    });
    process.stdin.on("end", () => {
      const data = JSON.parse(input || "{}");
      const tunnels = Array.isArray(data.tunnels) ? data.tunnels : [];

      for (const tunnel of tunnels) {
        const tunnelId = typeof tunnel.tunnelId === "string" ? tunnel.tunnelId : "";
        const parsedPortCount = Number(tunnel.portCount);
        const portCount = Number.isFinite(parsedPortCount) ? parsedPortCount : 0;
        const description =
          typeof tunnel.description === "string" && tunnel.description.length > 0
            ? tunnel.description.replace(/\t/g, " ")
            : "";

        if (tunnelId.length > 0) {
          console.log([tunnelId, portCount, description].join("\t"));
        }
      }
    });
  '
}

choose_dev_tunnel() {
  local configured_tunnel="${DEVTUNNEL_ID}"
  local -a tunnel_rows=()
  local tunnel_id port_count description choice create_new selected_new_id
  local row tunnel_output

  if [[ -n "${configured_tunnel}" ]]; then
    if devtunnel show "${configured_tunnel}" >/dev/null 2>&1; then
      if prompt_yes_no "Use configured Dev Tunnel ${configured_tunnel}?" "yes"; then
        return 0
      fi
    else
      echo "[codex-webui] configured Dev Tunnel ${configured_tunnel} was not found or is not accessible"
    fi
  fi

  if ! tunnel_output="$(list_dev_tunnels)"; then
    fail "failed to load available Dev Tunnels"
  fi

  while IFS=$'\t' read -r tunnel_id port_count description; do
    if [[ -n "${tunnel_id}" ]]; then
      tunnel_rows+=("${tunnel_id}"$'\t'"${port_count}"$'\t'"${description}")
    fi
  done <<<"${tunnel_output}"

  if (( ${#tunnel_rows[@]} == 0 )); then
    if prompt_yes_no "No existing Dev Tunnels were found. Create a new one now?" "yes"; then
      create_new=true
    else
      fail "cannot use Dev Tunnel without an existing tunnel or a new tunnel"
    fi
  else
    echo "Available Dev Tunnels:"
  fi

  if (( ${#tunnel_rows[@]} > 0 )); then
    local index=1
    for row in "${tunnel_rows[@]}"; do
      IFS=$'\t' read -r tunnel_id port_count description <<<"${row}"
      if [[ -n "${description}" ]]; then
        echo "  ${index}) ${tunnel_id} (ports: ${port_count}, description: ${description})"
      else
        echo "  ${index}) ${tunnel_id} (ports: ${port_count})"
      fi
      index=$((index + 1))
    done
    echo "  ${index}) Create a new tunnel"

    choice="$(prompt_choice "Select a tunnel [1-${index}]" "${index}")"
    if (( choice == index )); then
      create_new=true
    else
      IFS=$'\t' read -r tunnel_id port_count description <<<"${tunnel_rows[choice-1]}"
      DEVTUNNEL_ID="${tunnel_id}"
    fi
  fi

  if [[ "${create_new:-false}" == true ]]; then
    while true; do
      read -r -p "Enter a new Dev Tunnel ID: " selected_new_id || fail "prompt cancelled"
      if [[ -z "${selected_new_id}" ]]; then
        echo "Tunnel ID cannot be empty."
        continue
      fi

      if [[ ! "${selected_new_id}" =~ ^[A-Za-z0-9._-]+$ ]]; then
        echo "Tunnel ID may only contain letters, numbers, dots, underscores, and hyphens."
        continue
      fi

      DEVTUNNEL_ID="${selected_new_id}"
      if ! devtunnel create "${DEVTUNNEL_ID}" >/dev/null; then
        fail "failed to create Dev Tunnel ${DEVTUNNEL_ID}"
      fi
      break
    done
  fi
}

ensure_dev_tunnel_port() {
  if devtunnel port show "${DEVTUNNEL_ID}" -p "${FRONTEND_PORT}" >/dev/null 2>&1; then
    return 0
  fi

  if [[ "${INTERACTIVE_MODE}" != true ]]; then
    fail "dev tunnel ${DEVTUNNEL_ID} does not have port ${FRONTEND_PORT}; run 'devtunnel port create ${DEVTUNNEL_ID} -p ${FRONTEND_PORT} --protocol http'"
  fi

  if prompt_yes_no "Dev Tunnel ${DEVTUNNEL_ID} does not have port ${FRONTEND_PORT}. Create it now?" "yes"; then
    if ! devtunnel port create "${DEVTUNNEL_ID}" -p "${FRONTEND_PORT}" --protocol http >/dev/null; then
      fail "failed to create port ${FRONTEND_PORT} on Dev Tunnel ${DEVTUNNEL_ID}"
    fi
    return 0
  fi

  fail "dev tunnel ${DEVTUNNEL_ID} does not have port ${FRONTEND_PORT}"
}

start_runtime() {
  log "starting codex-runtime on ${RUNTIME_HOST}:${RUNTIME_PORT}"
  (
    cd "${RUNTIME_DIR}"
    exec env \
      HOST="${RUNTIME_HOST}" \
      PORT="${RUNTIME_PORT}" \
      CODEX_WEBUI_WORKSPACE_ROOT="${WORKSPACE_ROOT}" \
      CODEX_WEBUI_DATABASE_PATH="${DATABASE_PATH}" \
      CODEX_WEBUI_APP_SERVER_BRIDGE_ENABLED="${APP_SERVER_BRIDGE_ENABLED}" \
      CODEX_APP_SERVER_COMMAND="${CODEX_APP_SERVER_COMMAND:-codex}" \
      CODEX_APP_SERVER_ARGS="${CODEX_APP_SERVER_ARGS:-app-server}" \
      npm run dev
  ) > >(sed 's/^/[runtime] /') 2> >(sed 's/^/[runtime] /' >&2) &
  PIDS+=("$!")
}

start_frontend() {
  log "starting frontend-bff on ${FRONTEND_HOST}:${FRONTEND_PORT}"
  (
    cd "${FRONTEND_DIR}"
    exec env \
      CODEX_WEBUI_RUNTIME_BASE_URL="${RUNTIME_BASE_URL}" \
      npm run dev -- --hostname "${FRONTEND_HOST}" --port "${FRONTEND_PORT}"
  ) > >(sed 's/^/[frontend] /') 2> >(sed 's/^/[frontend] /' >&2) &
  PIDS+=("$!")
}

trap cleanup EXIT INT TERM
parse_args "$@"

if [[ "${INTERACTIVE_MODE}" == true ]]; then
  require_tty
  if prompt_yes_no "Use a Dev Tunnel for this run?" "yes"; then
    USE_DEVTUNNEL=true
  fi
elif [[ -n "${DEVTUNNEL_ID}" ]]; then
  USE_DEVTUNNEL=true
fi

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

if [[ "${USE_DEVTUNNEL}" == true ]]; then
  require_command devtunnel

  if [[ "${INTERACTIVE_MODE}" == true ]]; then
    choose_dev_tunnel
  elif [[ -z "${DEVTUNNEL_ID}" ]]; then
    fail "set CODEX_WEBUI_DEVTUNNEL_ID to an existing persistent dev tunnel id"
  fi

  ensure_dev_tunnel_port
fi

mkdir -p "${WORKSPACE_ROOT}" "$(dirname "${DATABASE_PATH}")"

start_runtime
wait_for_http "http://127.0.0.1:${RUNTIME_PORT}/api/v1/workspaces" "codex-runtime" "${PIDS[0]}"

start_frontend
wait_for_http "http://127.0.0.1:${FRONTEND_PORT}/" "frontend-bff" "${PIDS[1]}"

log "local UI: http://127.0.0.1:${FRONTEND_PORT}/"
log "runtime API: http://127.0.0.1:${RUNTIME_PORT}/api/v1/"

if [[ "${USE_DEVTUNNEL}" == true ]]; then
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

  log "press Ctrl-C to stop runtime, frontend, and tunnel"
else
  log "Dev Tunnel disabled for this run"
  log "press Ctrl-C to stop runtime and frontend"
fi

wait -n "${PIDS[@]}"
exit $?
