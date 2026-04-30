#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RUNTIME_DIR="${REPO_ROOT}/apps/codex-runtime"
FRONTEND_DIR="${REPO_ROOT}/apps/frontend-bff"

DRY_RUN=false
FORCE=false

usage() {
  cat <<'EOF'
Usage:
  scripts/stop-codex-webui.sh [--force] [--dry-run] [--help]

Options:
  --force       Send SIGKILL to processes that do not exit after SIGTERM
  --dry-run     Print matching processes without stopping them
  --help        Show this help text
EOF
}

log() {
  echo "[codex-webui] $*"
}

fail() {
  echo "[codex-webui] error: $*" >&2
  exit 1
}

parse_args() {
  while (($# > 0)); do
    case "$1" in
      --force)
        FORCE=true
        ;;
      --dry-run)
        DRY_RUN=true
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        fail "unknown argument: $1"
        ;;
    esac

    shift
  done
}

read_cmdline() {
  local pid="$1"
  tr '\0' ' ' < "/proc/${pid}/cmdline" 2>/dev/null || true
}

read_cwd() {
  local pid="$1"
  readlink "/proc/${pid}/cwd" 2>/dev/null || true
}

add_pid() {
  local pid="$1"
  local existing=""

  for existing in "${PIDS[@]}"; do
    if [[ "${existing}" == "${pid}" ]]; then
      return 0
    fi
  done

  PIDS+=("${pid}")
}

find_app_processes() {
  local proc=""
  local pid=""
  local cwd=""
  local cmd=""

  for proc in /proc/[0-9]*; do
    [[ -d "${proc}" ]] || continue
    pid="${proc##*/}"
    [[ "${pid}" != "$$" && "${pid}" != "${BASHPID}" ]] || continue

    cwd="$(read_cwd "${pid}")"
    [[ -n "${cwd}" ]] || continue
    cmd="$(read_cmdline "${pid}")"
    [[ -n "${cmd}" ]] || continue

    if [[ "${cwd}" == "${RUNTIME_DIR}" ]]; then
      case "${cmd}" in
        *"npm run dev"*|*"node ./node_modules/tsx/dist/cli.mjs src/index.ts"*|*"tsx/dist/loader.mjs src/index.ts"*)
          add_pid "${pid}"
          ;;
      esac
    fi

    if [[ "${cwd}" == "${FRONTEND_DIR}" ]]; then
      case "${cmd}" in
        *"npm run dev"*|*"node ./node_modules/next/dist/bin/next dev"*|*"next/dist/bin/next dev"*)
          add_pid "${pid}"
          ;;
      esac
    fi
  done
}

print_matches() {
  local pid=""
  local cmd=""

  for pid in "${PIDS[@]}"; do
    cmd="$(read_cmdline "${pid}")"
    log "matched pid ${pid}: ${cmd}"
  done
}

wait_for_exit() {
  local deadline=$((SECONDS + 10))
  local pid=""
  local remaining=()

  while (( SECONDS < deadline )); do
    remaining=()
    for pid in "${PIDS[@]}"; do
      if kill -0 "${pid}" 2>/dev/null; then
        remaining+=("${pid}")
      fi
    done

    if (( ${#remaining[@]} == 0 )); then
      return 0
    fi

    sleep 1
  done

  if [[ "${FORCE}" == "true" ]]; then
    log "forcing remaining processes to exit"
    kill -KILL "${remaining[@]}" 2>/dev/null || true
    return 0
  fi

  log "some processes are still running; rerun with --force if they should be killed"
  return 1
}

PIDS=()

parse_args "$@"
find_app_processes

if (( ${#PIDS[@]} == 0 )); then
  log "no matching codex-webui processes found"
  exit 0
fi

print_matches

if [[ "${DRY_RUN}" == "true" ]]; then
  log "dry run; no processes stopped"
  exit 0
fi

log "stopping ${#PIDS[@]} process(es)"
kill -TERM "${PIDS[@]}" 2>/dev/null || true
wait_for_exit
log "stop complete"
