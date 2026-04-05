#!/usr/bin/env bash
set -euo pipefail

if [[ "$#" -eq 0 ]]; then
  echo "usage: $0 <command> [args...]" >&2
  exit 2
fi

find_nvidia_graphics_library() {
  local candidate

  if [[ -n "${VULKAN_NVIDIA_LIBRARY_OVERRIDE:-}" ]]; then
    printf '%s\n' "${VULKAN_NVIDIA_LIBRARY_OVERRIDE}"
    return 0
  fi

  for candidate in libGLX_nvidia.so.0 libEGL_nvidia.so.0; do
    if ldconfig -p 2>/dev/null | grep -Fq "${candidate}"; then
      printf '%s\n' "${candidate}"
      return 0
    fi
  done

  return 1
}

has_nvidia_icd_manifest() {
  find /etc/vulkan /usr/share/vulkan -maxdepth 3 -type f -iname '*nvidia*.json' 2>/dev/null | grep -q .
}

append_driver_file() {
  local manifest_path="$1"

  if [[ -n "${VK_ADD_DRIVER_FILES:-}" ]]; then
    export VK_ADD_DRIVER_FILES="${VK_ADD_DRIVER_FILES}:${manifest_path}"
  else
    export VK_ADD_DRIVER_FILES="${manifest_path}"
  fi
}

if ! has_nvidia_icd_manifest; then
  if library_name="$(find_nvidia_graphics_library)"; then
    helper_dir="$(mktemp -d)"
    trap 'rm -rf "${helper_dir}"' EXIT
    helper_manifest="${helper_dir}/nvidia_icd.json"

    cat >"${helper_manifest}" <<EOF
{
  "ICD": {
    "api_version": "${VULKAN_ICD_API_VERSION:-1.3.0}",
    "library_path": "${library_name}"
  },
  "file_format_version": "1.0.1"
}
EOF

    append_driver_file "${helper_manifest}"
  fi
fi

exec "$@"
