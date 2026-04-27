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
STARTUP_TIMEOUT_SECONDS="${CODEX_WEBUI_STARTUP_TIMEOUT_SECONDS:-180}"
APP_SERVER_BRIDGE_ENABLED="${CODEX_WEBUI_APP_SERVER_BRIDGE_ENABLED:-1}"
LOG_FILE="${CODEX_WEBUI_LOG_FILE:-}"
NGROK_PORT="${CODEX_WEBUI_NGROK_PORT:-${FRONTEND_PORT}}"
NGROK_API_URL="${CODEX_WEBUI_NGROK_API_URL:-http://127.0.0.1:4040/api/tunnels}"
NGROK_AUTHTOKEN_VALUE="${NGROK_AUTHTOKEN:-}"
NGROK_BASIC_AUTH_VALUE="${NGROK_BASIC_AUTH:-}"
DEBUG_LIVE_CHAT=false
INTERACTIVE=false
START_NGROK=false
NGROK_STARTED_BY_LAUNCHER=false
NGROK_REUSED_EXISTING=false
NGROK_PUBLIC_URL=""
NGROK_EXTRA_ARGS=()

usage() {
  cat <<'EOF'
Usage:
  scripts/start-codex-webui.sh [--debug-live-chat] [--interactive] [--with-ngrok] [--log-file PATH] [--ngrok-basic-auth VALUE] [--ngrok-authtoken VALUE] [--ngrok-arg ARG] [--help]

Options:
  --debug-live-chat  Enable live-chat debug logs for runtime and frontend
  --interactive      Prompt for optional ngrok launch and config before startup
  --log-file         Append combined launcher, runtime, and frontend output to PATH
  --with-ngrok       Start ngrok automatically after local startup succeeds
  --ngrok-basic-auth Set ngrok Basic Auth as user:pass for this run
  --ngrok-authtoken  Configure ngrok authtoken for this run before launch
  --ngrok-arg        Append one extra argument to the ngrok command; repeat as needed
  --help             Show this help text

Environment:
  NGROK_AUTHTOKEN=<token>                 Optional ngrok authtoken for interactive or --with-ngrok runs
  NGROK_BASIC_AUTH=user:pass              Optional Basic Auth pair for ngrok runs

Without --with-ngrok, start remote browser access separately with:
  ngrok http 3000 --basic-auth="$NGROK_BASIC_AUTH"
EOF
}

parse_args() {
  while (($# > 0)); do
    case "$1" in
      --debug-live-chat)
        DEBUG_LIVE_CHAT=true
        ;;
      --interactive)
        INTERACTIVE=true
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
      --with-ngrok)
        START_NGROK=true
        ;;
      --ngrok-basic-auth)
        shift
        if (($# == 0)); then
          fail "--ngrok-basic-auth requires a value"
        fi
        NGROK_BASIC_AUTH_VALUE="$1"
        ;;
      --ngrok-basic-auth=*)
        NGROK_BASIC_AUTH_VALUE="${1#*=}"
        if [[ -z "${NGROK_BASIC_AUTH_VALUE}" ]]; then
          fail "--ngrok-basic-auth requires a value"
        fi
        ;;
      --ngrok-authtoken)
        shift
        if (($# == 0)); then
          fail "--ngrok-authtoken requires a value"
        fi
        NGROK_AUTHTOKEN_VALUE="$1"
        ;;
      --ngrok-authtoken=*)
        NGROK_AUTHTOKEN_VALUE="${1#*=}"
        if [[ -z "${NGROK_AUTHTOKEN_VALUE}" ]]; then
          fail "--ngrok-authtoken requires a value"
        fi
        ;;
      --ngrok-arg)
        shift
        if (($# == 0)); then
          fail "--ngrok-arg requires a value"
        fi
        NGROK_EXTRA_ARGS+=("$1")
        ;;
      --ngrok-arg=*)
        NGROK_EXTRA_ARGS+=("${1#*=}")
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

mask_secret() {
  local value="$1"

  if [[ -z "${value}" ]]; then
    printf '%s' "unset"
    return 0
  fi

  if [[ "${value}" == *:* ]]; then
    printf '%s' "${value%%:*}:********"
    return 0
  fi

  printf '%s' "********"
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

prompt_yes_no() {
  local prompt="$1"
  local default_answer="$2"
  local suffix="[y/N]"
  local reply=""

  if [[ "${default_answer}" == "yes" ]]; then
    suffix="[Y/n]"
  fi

  while true; do
    read -r -p "[codex-webui] ${prompt} ${suffix} " reply || fail "interactive prompt aborted"
    reply="${reply,,}"

    if [[ -z "${reply}" ]]; then
      reply="${default_answer}"
    fi

    case "${reply}" in
      y|yes)
        return 0
        ;;
      n|no)
        return 1
        ;;
      *)
        log "please answer yes or no"
        ;;
    esac
  done
}

prompt_value() {
  local prompt="$1"
  local hidden="${2:-false}"
  local value=""

  if [[ "${hidden}" == "true" ]]; then
    read -r -s -p "[codex-webui] ${prompt} " value || fail "interactive prompt aborted"
    echo
  else
    read -r -p "[codex-webui] ${prompt} " value || fail "interactive prompt aborted"
  fi

  printf '%s' "${value}"
}

configure_ngrok_interactive() {
  local entered_value=""
  local extra_args_input=""

  if [[ ! -t 0 || ! -t 1 ]]; then
    fail "--interactive requires a TTY"
  fi

  if [[ "${START_NGROK}" != "true" ]]; then
    if prompt_yes_no "Expose frontend-bff through ngrok after local startup?" "no"; then
      START_NGROK=true
    fi
  fi

  if [[ "${START_NGROK}" != "true" ]]; then
    return 0
  fi

  prepare_existing_ngrok
  if [[ "${NGROK_REUSED_EXISTING}" == "true" ]]; then
    return 0
  fi

  if [[ -n "${NGROK_AUTHTOKEN_VALUE}" ]]; then
    if ! prompt_yes_no "Use configured ngrok authtoken ($(mask_secret "${NGROK_AUTHTOKEN_VALUE}"))?" "yes"; then
      entered_value="$(prompt_value "Enter ngrok authtoken now, or leave blank to skip:" true)"
      NGROK_AUTHTOKEN_VALUE="${entered_value}"
    fi
  else
    entered_value="$(prompt_value "Enter ngrok authtoken now, or leave blank to skip:" true)"
    NGROK_AUTHTOKEN_VALUE="${entered_value}"
  fi

  if [[ -n "${NGROK_BASIC_AUTH_VALUE}" ]]; then
    if ! prompt_yes_no "Use configured ngrok Basic Auth ($(mask_secret "${NGROK_BASIC_AUTH_VALUE}"))?" "yes"; then
      NGROK_BASIC_AUTH_VALUE=""
    fi
  fi

  while [[ -z "${NGROK_BASIC_AUTH_VALUE}" ]]; do
    entered_value="$(prompt_value "Enter ngrok Basic Auth as user:pass, or leave blank to skip:" true)"
    if [[ -n "${entered_value}" ]]; then
      NGROK_BASIC_AUTH_VALUE="${entered_value}"
      break
    fi

    if prompt_yes_no "Start ngrok without Basic Auth? This is not the supported browser path." "no"; then
      break
    fi
  done

  if ((${#NGROK_EXTRA_ARGS[@]} == 0)); then
    extra_args_input="$(prompt_value "Extra ngrok args (optional, space-separated, leave blank for none):")"
    if [[ -n "${extra_args_input}" ]]; then
      read -r -a NGROK_EXTRA_ARGS <<< "${extra_args_input}"
    fi
  fi
}

prepare_ngrok() {
  if [[ "${INTERACTIVE}" == "true" ]]; then
    configure_ngrok_interactive
  fi

  if [[ "${NGROK_REUSED_EXISTING}" == "true" ]]; then
    return 0
  fi

  if [[ "${START_NGROK}" != "true" ]]; then
    return 0
  fi

  require_command ngrok

  if [[ -n "${NGROK_AUTHTOKEN_VALUE}" ]]; then
    log "configuring ngrok authtoken for this environment"
    ngrok config add-authtoken "${NGROK_AUTHTOKEN_VALUE}" >/dev/null
  fi

  if [[ "${INTERACTIVE}" != "true" && -z "${NGROK_BASIC_AUTH_VALUE}" ]]; then
    fail "--with-ngrok requires NGROK_BASIC_AUTH or --ngrok-basic-auth; use --interactive if you want to decide at launch time"
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

get_ngrok_public_url() {
  curl --silent --fail "${NGROK_API_URL}" | node -e '
let input = "";
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  try {
    const payload = JSON.parse(input);
    const tunnels = Array.isArray(payload.tunnels) ? payload.tunnels : [];
    const preferred =
      tunnels.find((entry) => typeof entry.public_url === "string" && entry.public_url.startsWith("https://")) ??
      tunnels.find((entry) => typeof entry.public_url === "string");
    if (!preferred) {
      process.exit(1);
    }
    process.stdout.write(preferred.public_url);
  } catch {
    process.exit(1);
  }
});
'
}

get_ngrok_public_url_for_port() {
  local port="$1"

  curl --silent --fail "${NGROK_API_URL}" | node -e '
const port = process.argv[1];
let input = "";
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  try {
    const payload = JSON.parse(input);
    const tunnels = Array.isArray(payload.tunnels) ? payload.tunnels : [];
    const candidates = tunnels.filter((entry) => {
      if (typeof entry.public_url !== "string") {
        return false;
      }

      const address = typeof entry.config?.addr === "string" ? entry.config.addr : "";
      return address === port || address.endsWith(`:${port}`) || address.includes(`:${port}/`);
    });
    const preferred =
      candidates.find((entry) => entry.public_url.startsWith("https://")) ??
      candidates.find((entry) => typeof entry.public_url === "string");
    if (!preferred) {
      process.exit(1);
    }
    process.stdout.write(preferred.public_url);
  } catch {
    process.exit(1);
  }
});
' "${port}"
}

get_configured_ngrok_url() {
  local index=0
  local arg=""

  while (( index < ${#NGROK_EXTRA_ARGS[@]} )); do
    arg="${NGROK_EXTRA_ARGS[${index}]}"

    case "${arg}" in
      --url=*)
        printf '%s' "${arg#*=}"
        return 0
        ;;
      --url)
        index=$((index + 1))
        if (( index < ${#NGROK_EXTRA_ARGS[@]} )); then
          printf '%s' "${NGROK_EXTRA_ARGS[${index}]}"
          return 0
        fi
        ;;
    esac

    index=$((index + 1))
  done

  return 1
}

probe_ngrok_url_online() {
  local url="$1"
  local status=""

  status="$(curl --silent --output /dev/null --write-out "%{http_code}" --max-time 5 "${url}" || true)"
  case "${status}" in
    2*|3*|401|403)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

prepare_existing_ngrok() {
  local existing_url=""
  local configured_url=""

  if [[ "${START_NGROK}" != "true" ]]; then
    return 0
  fi

  existing_url="$(get_ngrok_public_url_for_port "${NGROK_PORT}" 2>/dev/null || true)"
  if [[ -n "${existing_url}" ]]; then
    NGROK_PUBLIC_URL="${existing_url}"
    NGROK_REUSED_EXISTING=true
    log "reusing existing local ngrok tunnel for port ${NGROK_PORT}: ${NGROK_PUBLIC_URL}"
    return 0
  fi

  configured_url="$(get_configured_ngrok_url || true)"
  if [[ -n "${configured_url}" ]] && probe_ngrok_url_online "${configured_url}"; then
    fail "ngrok endpoint is already online: ${configured_url}; stop the existing endpoint first, or add --ngrok-arg=--pooling-enabled when load balancing is intentional"
  fi
}

wait_for_ngrok_url() {
  local pid="$1"
  local attempts=0
  local url=""

  while (( attempts < STARTUP_TIMEOUT_SECONDS )); do
    if ! kill -0 "${pid}" 2>/dev/null; then
      fail "ngrok exited before a public URL became available"
    fi

    url="$(get_ngrok_public_url 2>/dev/null || true)"
    if [[ -n "${url}" ]]; then
      NGROK_PUBLIC_URL="${url}"
      log "ngrok is ready at ${NGROK_PUBLIC_URL}"
      return 0
    fi

    attempts=$((attempts + 1))
    sleep 1
  done

  fail "timed out waiting for ngrok to publish a tunnel URL"
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

start_ngrok() {
  local command=(ngrok http "${NGROK_PORT}")

  if [[ -n "${NGROK_BASIC_AUTH_VALUE}" ]]; then
    command+=("--basic-auth=${NGROK_BASIC_AUTH_VALUE}")
  fi

  if ((${#NGROK_EXTRA_ARGS[@]} > 0)); then
    command+=("${NGROK_EXTRA_ARGS[@]}")
  fi

  log "starting ngrok on port ${NGROK_PORT}"
  (
    cd "${REPO_ROOT}"
    exec "${command[@]}"
  ) > >(sed -u 's/^/[ngrok] /') 2> >(sed -u 's/^/[ngrok] /' >&2) &
  PIDS+=("$!")
  NGROK_STARTED_BY_LAUNCHER=true
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
require_command node
require_command npm
require_command codex
prepare_ngrok

prepare_existing_ngrok

mkdir -p "${WORKSPACE_ROOT}" "$(dirname "${DATABASE_PATH}")"

start_runtime
wait_for_http "http://127.0.0.1:${RUNTIME_PORT}/api/v1/workspaces" "codex-runtime" "${PIDS[0]}"

start_frontend
wait_for_http "http://127.0.0.1:${FRONTEND_PORT}/" "frontend-bff" "${PIDS[1]}"

if [[ "${START_NGROK}" == "true" ]]; then
  if [[ "${NGROK_REUSED_EXISTING}" != "true" ]]; then
    start_ngrok
    wait_for_ngrok_url "${PIDS[2]}"
  fi
fi

log "local UI: http://127.0.0.1:${FRONTEND_PORT}/"
log "runtime API: http://127.0.0.1:${RUNTIME_PORT}/api/v1/"
if [[ "${INTERACTIVE}" == "true" ]]; then
  log "launcher mode: interactive startup"
else
  log "launcher mode: non-interactive startup"
fi
if [[ "${START_NGROK}" == "true" ]]; then
  log "ngrok browser entrypoint: ${NGROK_PUBLIC_URL}"
  if [[ "${NGROK_REUSED_EXISTING}" == "true" ]]; then
    log "ngrok launch: reused existing local tunnel"
  else
    log "ngrok launch: started by this launcher"
  fi
  if [[ -n "${NGROK_BASIC_AUTH_VALUE}" ]]; then
    log "ngrok Basic Auth: enabled ($(mask_secret "${NGROK_BASIC_AUTH_VALUE}"))"
  else
    log "ngrok Basic Auth: disabled"
  fi
else
  log 'for remote browser access, run separately: ngrok http 3000 --basic-auth="$NGROK_BASIC_AUTH"'
  log "the launcher did not start ngrok in this run"
fi
if [[ "${NGROK_STARTED_BY_LAUNCHER}" == "true" ]]; then
  log "press Ctrl-C to stop runtime, frontend, and ngrok"
else
  log "press Ctrl-C to stop runtime and frontend"
fi

wait -n "${PIDS[@]}"
exit $?
