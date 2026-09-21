#!/usr/bin/env bash
set -euo pipefail
export GIT_CONFIG_GLOBAL="${GIT_CONFIG_GLOBAL:-/dev/null}"

# scripts/check-drift.sh
# CI drift check: Verifies that spelling-launcher-raycast/assets/spellcheck-cli
# and spellcheck-cli.version.json match the current workspace build and git commit.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RAYCAST_DIR="${RAYCAST_DIR:-$(cd "${REPO_ROOT}/../spelling-launcher-raycast" 2>/dev/null && pwd || echo "")}"

DEST_BIN="${CLI_BIN_PATH:-${RAYCAST_DIR}/assets/spellcheck-cli}"
DEST_JSON="${MANIFEST_PATH:-${RAYCAST_DIR}/assets/spellcheck-cli.version.json}"

echo "=== Checking Raycast Binary Drift ==="

if [[ ! -f "${DEST_BIN}" ]]; then
  if [[ -n "${CI:-}" && ! -d "${RAYCAST_DIR}" ]]; then
    echo "Notice: Raycast extension directory not found at ${RAYCAST_DIR} in CI environment."
    echo "Running release CLI build and version self-check instead..."
    cargo build --release --bin spellcheck-cli
    ./target/release/spellcheck-cli --version
    echo "=== Standalone CLI Check Passed ==="
    exit 0
  fi
  echo "Error: Raycast staged binary not found at ${DEST_BIN}" >&2
  echo "Run ./scripts/sync-raycast-cli.sh to build and stage the binary." >&2
  exit 1
fi

if [[ ! -x "${DEST_BIN}" ]]; then
  echo "Error: Raycast staged binary is not executable (${DEST_BIN})" >&2
  exit 1
fi

if [[ ! -f "${DEST_JSON}" ]]; then
  echo "Error: Raycast staged version manifest not found at ${DEST_JSON}" >&2
  echo "Run ./scripts/sync-raycast-cli.sh to generate the manifest." >&2
  exit 1
fi

# 1. Dynamically resolve current spellcore / workspace HEAD SHA at runtime
CURRENT_SPELLCORE_SHA=""
if command -v git >/dev/null 2>&1; then
  CURRENT_SPELLCORE_SHA="$(git -C "${REPO_ROOT}" rev-parse --short HEAD 2>/dev/null || echo "")"
fi

if [[ -z "${CURRENT_SPELLCORE_SHA}" && -f "${REPO_ROOT}/.git/HEAD" ]]; then
  HEAD_REF="$(cat "${REPO_ROOT}/.git/HEAD" 2>/dev/null || echo "")"
  if [[ "${HEAD_REF}" =~ ^ref:\ (.*) ]]; then
    TARGET_REF="${REPO_ROOT}/.git/${BASH_REMATCH[1]}"
    if [[ -f "${TARGET_REF}" ]]; then
      CURRENT_SPELLCORE_SHA="$(cut -c1-7 "${TARGET_REF}")"
    elif [[ -f "${REPO_ROOT}/.git/packed-refs" ]]; then
      CURRENT_SPELLCORE_SHA="$(grep "${BASH_REMATCH[1]}" "${REPO_ROOT}/.git/packed-refs" | head -n 1 | awk '{print substr($1, 1, 7)}')"
    fi
  elif [[ -n "${HEAD_REF}" ]]; then
    CURRENT_SPELLCORE_SHA="$(echo "${HEAD_REF}" | cut -c1-7)"
  fi
fi

CURRENT_SPELLCORE_SHA="${CURRENT_SPELLCORE_SHA:-unknown}"
VERSION="$(grep '^version' "${REPO_ROOT}/crates/spellcheck-cli/Cargo.toml" | head -n 1 | cut -d '"' -f 2)"
TARGET="${TARGET:-aarch64-apple-darwin}"
BUILD_PROFILE="release"

# 2. Extract staged binary version and manifest metadata
ACTUAL_VERSION="$("${DEST_BIN}" --version)"
JSON_SHA="$(grep '"git_sha"' "${DEST_JSON}" | cut -d '"' -f 4)"
JSON_VER="$(grep '"version"' "${DEST_JSON}" | cut -d '"' -f 4)"

# 3. Verify manifest contents and staleness against current spellcore HEAD
if [[ "${JSON_SHA}" != "${CURRENT_SPELLCORE_SHA}" ]]; then
  echo "DRIFT DETECTED: Staged Raycast binary was built from an older or different commit than current spellcore source!" >&2
  echo "  Staged binary SHA:      ${JSON_SHA}" >&2
  echo "  Current spellcore SHA:  ${CURRENT_SPELLCORE_SHA}" >&2
  echo "" >&2
  echo "Fix: Run the following command to re-build and synchronize the Raycast extension binary:" >&2
  echo "  ./scripts/sync-raycast-cli.sh" >&2
  exit 1
fi

if [[ "${JSON_VER}" != "${VERSION}" ]]; then
  echo "DRIFT DETECTED: Version mismatch in manifest (${JSON_VER}) vs Cargo.toml (${VERSION})!" >&2
  echo "Fix: Run ./scripts/sync-raycast-cli.sh" >&2
  exit 1
fi

EXPECTED_VERSION="spellcheck-cli ${VERSION} (${BUILD_PROFILE}, ${CURRENT_SPELLCORE_SHA}, ${TARGET})"
if [[ "${ACTUAL_VERSION}" != "${EXPECTED_VERSION}" ]]; then
  echo "DRIFT DETECTED: Staged binary --version does not match current spellcore HEAD:" >&2
  echo "  Expected: ${EXPECTED_VERSION}" >&2
  echo "  Actual:   ${ACTUAL_VERSION}" >&2
  echo "" >&2
  echo "Fix: Run the following command to re-build and synchronize the Raycast extension binary:" >&2
  echo "  ./scripts/sync-raycast-cli.sh" >&2
  exit 1
fi

echo "No drift detected:"
echo "  Current spellcore SHA: ${CURRENT_SPELLCORE_SHA}"
echo "  Staged binary version: ${ACTUAL_VERSION}"
echo "=== Drift Check Passed ==="
