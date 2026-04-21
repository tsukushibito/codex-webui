#!/usr/bin/env bash
set -euo pipefail

EXPECTED_PYTHON_VERSION="${EXPECTED_PYTHON_VERSION:-3.14.3}"
EXPECTED_UV_VERSION="${EXPECTED_UV_VERSION:-0.9.21}"
EXPECTED_NODE_VERSION="${EXPECTED_NODE_VERSION:-25.6.0}"
EXPECTED_NPM_VERSION="${EXPECTED_NPM_VERSION:-11.8.0}"
EXPECTED_RUST_VERSION="${EXPECTED_RUST_VERSION:-1.93.1}"
EXPECTED_VULKAN_SDK_VERSION="${EXPECTED_VULKAN_SDK_VERSION:-1.4.341.0}"
EXPECTED_NPM_PREFIX="${EXPECTED_NPM_PREFIX:-/home/dev/.npm-global}"
DOCTOR_REQUIRE_GPU="${DOCTOR_REQUIRE_GPU:-false}"
DOCTOR_RUN_WINIT_SMOKE="${DOCTOR_RUN_WINIT_SMOKE:-false}"
DOCTOR_DEBUG="${DOCTOR_DEBUG:-false}"
DOCTOR_DEBUG_LINES="${DOCTOR_DEBUG_LINES:-120}"
EXPECTED_CARGO_VERSION_PREFIX="${EXPECTED_CARGO_VERSION_PREFIX:-${EXPECTED_RUST_VERSION%.*}}"
NGROK_AUTHTOKEN="${NGROK_AUTHTOKEN:-}"
NGROK_BASIC_AUTH="${NGROK_BASIC_AUTH:-}"

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

has_nvidia_gpu() {
  command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi -L >/dev/null 2>&1
}

has_nvidia_graphics_libraries() {
  ldconfig -p 2>/dev/null | grep -Eq 'libGLX_nvidia\.so\.0|libEGL_nvidia\.so\.0'
}

has_nvidia_vulkan_manifest() {
  find /etc/vulkan /usr/share/vulkan -maxdepth 3 -type f -iname '*nvidia*.json' 2>/dev/null | grep -q .
}

print_gpu_diagnostic() {
  if ! has_nvidia_gpu; then
    return 0
  fi

  echo "[info] NVIDIA GPU is visible to nvidia-smi."

  if ! has_nvidia_graphics_libraries; then
    echo "[info] NVIDIA graphics driver libraries are not mounted in the container."
  fi

  if ! has_nvidia_vulkan_manifest; then
    echo "[info] NVIDIA Vulkan ICD manifest was not found under /etc/vulkan or /usr/share/vulkan."
  fi

  if [[ -e /dev/dxg ]] && ! compgen -G '/dev/nvidia*' >/dev/null; then
    echo "[info] /dev/dxg is present without /dev/nvidia*; this looks like a WSL GPU-P runtime."
  fi
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

check_required_env() {
  local label="$1"
  local value="$2"

  if [[ -n "${value}" ]]; then
    echo "[ok] ${label}: set"
  else
    echo "[ng] ${label}: required for the supported ngrok remote-browser path"
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
check_command "ngrok CLI" "ngrok"
check_command "Python" "python"
check_command "uv" "uv"
check_command "Node.js" "node"
check_command "npm" "npm"
check_command "rustc" "rustc"
check_command "cargo" "cargo"
check_command "vulkaninfo" "vulkaninfo"

echo
echo "== version checks =="
check_contains "python --version" "$(python --version 2>&1 || true)" "${EXPECTED_PYTHON_VERSION}"
check_contains "uv --version" "$(uv --version || true)" "${EXPECTED_UV_VERSION}"
check_contains "node --version" "$(node --version || true)" "v${EXPECTED_NODE_VERSION}"
check_contains "npm --version" "$(npm --version || true)" "${EXPECTED_NPM_VERSION}"
check_contains "rustc --version" "$(rustc --version || true)" "${EXPECTED_RUST_VERSION}"
check_contains "cargo --version" "$(cargo --version || true)" "${EXPECTED_CARGO_VERSION_PREFIX}"
check_contains "vulkan sdk path" "${VULKAN_SDK:-unset}" "${EXPECTED_VULKAN_SDK_VERSION}"
check_contains "npm prefix" "$(npm config get prefix || true)" "${EXPECTED_NPM_PREFIX}"

echo
echo "== ngrok prerequisites =="
check_required_env "NGROK_AUTHTOKEN" "${NGROK_AUTHTOKEN}"
check_required_env "NGROK_BASIC_AUTH" "${NGROK_BASIC_AUTH}"

echo
echo "== legacy launcher note =="
if command -v devtunnel >/dev/null 2>&1; then
  echo "[info] devtunnel is still installed as temporary legacy tooling for scripts/start-codex-webui.sh; cleanup is deferred to #154."
  echo "[info] devtunnel --version: $(devtunnel --version || true)"
else
  echo "[info] devtunnel is not required for the supported ngrok path; launcher migration/removal is deferred to #154."
fi

echo
echo "== vulkan validation layer check =="
vulkaninfo_log="$(mktemp)"
tmp_files+=("${vulkaninfo_log}")
"${SCRIPT_DIR}/with-vulkan-driver.sh" vulkaninfo >"${vulkaninfo_log}" 2>&1 || true

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
  "${SCRIPT_DIR}/with-vulkan-driver.sh" vulkaninfo --summary >"${vulkaninfo_summary_log}" 2>&1 || true

  if grep -qi "nvidia" "${vulkaninfo_summary_log}"; then
    echo "[ok] NVIDIA GPU detected from vulkaninfo --summary"
  else
    echo "[ng] GPU required but NVIDIA GPU not detected from vulkaninfo --summary"
    failures=$((failures + 1))
    print_gpu_diagnostic
    debug_dump_file "vulkaninfo --summary output" "${vulkaninfo_summary_log}"
  fi
fi

if [[ "${DOCTOR_RUN_WINIT_SMOKE}" == "true" ]]; then
  echo
  echo "== winit smoke =="
  if "${SCRIPT_DIR}/with-vulkan-driver.sh" "${SCRIPT_DIR}/run-winit-smoke.sh"; then
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
