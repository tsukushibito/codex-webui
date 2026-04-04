#!/usr/bin/env bash
set -euo pipefail

EXPECTED_VSCODE_CLI_VERSION="${EXPECTED_VSCODE_CLI_VERSION:-1.109.3}"
EXPECTED_PYTHON_VERSION="${EXPECTED_PYTHON_VERSION:-3.14.3}"
EXPECTED_UV_VERSION="${EXPECTED_UV_VERSION:-0.9.21}"
EXPECTED_NODE_VERSION="${EXPECTED_NODE_VERSION:-25.6.0}"
EXPECTED_NPM_VERSION="${EXPECTED_NPM_VERSION:-11.8.0}"
EXPECTED_RUST_VERSION="${EXPECTED_RUST_VERSION:-1.93.1}"
EXPECTED_VULKAN_SDK_VERSION="${EXPECTED_VULKAN_SDK_VERSION:-1.4.341.1}"
EXPECTED_NPM_PREFIX="${EXPECTED_NPM_PREFIX:-/home/dev/.npm-global}"
DOCTOR_REQUIRE_GPU="${DOCTOR_REQUIRE_GPU:-false}"
DOCTOR_RUN_WINIT_SMOKE="${DOCTOR_RUN_WINIT_SMOKE:-false}"
DOCTOR_DEBUG="${DOCTOR_DEBUG:-false}"
DOCTOR_DEBUG_LINES="${DOCTOR_DEBUG_LINES:-120}"
EXPECTED_CARGO_VERSION_PREFIX="${EXPECTED_CARGO_VERSION_PREFIX:-${EXPECTED_RUST_VERSION%.*}}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
failures=0
tmp_files=()

cleanup() {
  if (( ${#tmp_files[@]} > 0 )); then
    rm -f "${tmp_files[@]}"
  fi
}
trap cleanup EXIT

debug_enabled() {
  [[ "${DOCTOR_DEBUG}" == "true" ]]
}

debug_log() {
  if debug_enabled; then
    echo "[debug] $*"
  fi
}

debug_dump_file() {
  local label="$1"
  local path="$2"

  if ! debug_enabled; then
    return 0
  fi

  echo "[debug] ${label} (first ${DOCTOR_DEBUG_LINES} lines)"
  sed -n "1,${DOCTOR_DEBUG_LINES}p" "${path}"
}

check_contains() {
  local label="$1"
  local actual="$2"
  local expected="$3"

  if [[ "${actual}" == *"${expected}"* ]]; then
    echo "[ok] ${label}: ${actual}"
  else
    echo "[ng] ${label}: expected contains '${expected}', got '${actual}'"
    failures=$((failures + 1))
  fi
}

check_command() {
  local label="$1"
  local command="$2"

  if command -v "${command}" >/dev/null 2>&1; then
    echo "[ok] ${label}: $(command -v "${command}")"
  else
    echo "[ng] ${label}: command '${command}' not found"
    failures=$((failures + 1))
  fi
}

if debug_enabled; then
  echo "== debug context =="
  debug_log "PATH=${PATH}"
  debug_log "VULKAN_SDK=${VULKAN_SDK:-unset}"
  debug_log "VK_LAYER_PATH=${VK_LAYER_PATH:-unset}"
  debug_log "DOCTOR_REQUIRE_GPU=${DOCTOR_REQUIRE_GPU}"
  debug_log "DOCTOR_RUN_WINIT_SMOKE=${DOCTOR_RUN_WINIT_SMOKE}"
  echo
fi

echo "== command checks =="
check_command "VS Code CLI" "code"
check_command "Codex CLI" "codex"
check_command "Dev Tunnel CLI" "devtunnel"
check_command "Python" "python"
check_command "uv" "uv"
check_command "Node.js" "node"
check_command "npm" "npm"
check_command "rustc" "rustc"
check_command "cargo" "cargo"
check_command "vulkaninfo" "vulkaninfo"

echo
echo "== version checks =="
check_contains "code --version" "$(code --version | head -n1 || true)" "${EXPECTED_VSCODE_CLI_VERSION}"
check_contains "python --version" "$(python --version 2>&1 || true)" "${EXPECTED_PYTHON_VERSION}"
check_contains "uv --version" "$(uv --version || true)" "${EXPECTED_UV_VERSION}"
check_contains "node --version" "$(node --version || true)" "v${EXPECTED_NODE_VERSION}"
check_contains "npm --version" "$(npm --version || true)" "${EXPECTED_NPM_VERSION}"
check_contains "rustc --version" "$(rustc --version || true)" "${EXPECTED_RUST_VERSION}"
check_contains "cargo --version" "$(cargo --version || true)" "${EXPECTED_CARGO_VERSION_PREFIX}"
check_contains "vulkan sdk path" "${VULKAN_SDK:-unset}" "${EXPECTED_VULKAN_SDK_VERSION}"
check_contains "npm prefix" "$(npm config get prefix || true)" "${EXPECTED_NPM_PREFIX}"

if command -v devtunnel >/dev/null 2>&1; then
  echo "[ok] devtunnel --version: $(devtunnel --version || true)"
fi

echo
echo "== vulkan validation layer check =="
vulkaninfo_log="$(mktemp)"
tmp_files+=("${vulkaninfo_log}")
vulkaninfo >"${vulkaninfo_log}" 2>&1 || true

if grep -q "VK_LAYER_KHRONOS_validation" "${vulkaninfo_log}"; then
  echo "[ok] VK_LAYER_KHRONOS_validation detected"
else
  echo "[ng] VK_LAYER_KHRONOS_validation not found in vulkaninfo output"
  failures=$((failures + 1))
  debug_dump_file "vulkaninfo output" "${vulkaninfo_log}"
fi

if [[ "${DOCTOR_REQUIRE_GPU}" == "true" ]]; then
  echo
  echo "== gpu check =="
  vulkaninfo_summary_log="$(mktemp)"
  tmp_files+=("${vulkaninfo_summary_log}")
  vulkaninfo --summary >"${vulkaninfo_summary_log}" 2>&1 || true

  if grep -qi "nvidia" "${vulkaninfo_summary_log}"; then
    echo "[ok] NVIDIA GPU detected from vulkaninfo --summary"
  else
    echo "[ng] GPU required but NVIDIA GPU not detected from vulkaninfo --summary"
    failures=$((failures + 1))
    debug_dump_file "vulkaninfo --summary output" "${vulkaninfo_summary_log}"
  fi
fi

if [[ "${DOCTOR_RUN_WINIT_SMOKE}" == "true" ]]; then
  echo
  echo "== winit smoke =="
  if "${SCRIPT_DIR}/run-winit-smoke.sh"; then
    echo "[ok] winit smoke run finished"
  else
    echo "[ng] winit smoke run failed"
    failures=$((failures + 1))
  fi
fi

echo
if [[ "${failures}" -eq 0 ]]; then
  echo "doctor: PASS"
  exit 0
fi

echo "doctor: FAIL (${failures})"
exit 1
