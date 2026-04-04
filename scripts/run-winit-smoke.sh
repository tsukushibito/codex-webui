#!/usr/bin/env bash
set -euo pipefail

WINIT_SMOKE_DIR="${WINIT_SMOKE_DIR:-/opt/samples/winit-smoke}"

if [[ ! -f "${WINIT_SMOKE_DIR}/Cargo.toml" ]]; then
  echo "winit smoke project not found: ${WINIT_SMOKE_DIR}"
  exit 1
fi

cd "${WINIT_SMOKE_DIR}"
cargo run --release
