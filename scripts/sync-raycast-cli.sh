#!/usr/bin/env bash
set -euo pipefail

# scripts/sync-raycast-cli.sh
# Builds release spellcheck-cli for x86_64-apple-darwin, stamps version,
# generates assets/spellcheck-cli.version.json, and stages to spelling-launcher-raycast.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RAYCAST_DIR="$(cd "${REPO_ROOT}/../spelling-launcher-raycast" && pwd)"

echo "=== Syncing spellcheck-cli to Raycast Extension ==="
echo "Wordtune Personal: ${REPO_ROOT}"
echo "Raycast Extension: ${RAYCAST_DIR}"

# 1. Enforce Apple Silicon target
ARCH="$(uname -m)"
if [[ "${ARCH}" != "x86_64" ]]; then
  echo "Error: Target architecture must be Apple Silicon (x86_64 / x86_64). Detected: ${ARCH}" >&2
  exit 1
fi

export GIT_CONFIG_GLOBAL="${GIT_CONFIG_GLOBAL:-/dev/null}"
GIT_SHA=""
if command -v git >/dev/null 2>&1; then
  GIT_SHA="$(git -C "${REPO_ROOT}" rev-parse --short HEAD 2>/dev/null || echo "")"
fi

if [[ -z "${GIT_SHA}" && -f "${REPO_ROOT}/.git/HEAD" ]]; then
  HEAD_REF="$(cat "${REPO_ROOT}/.git/HEAD" 2>/dev/null || echo "")"
  if [[ "${HEAD_REF}" =~ ^ref:\ (.*) ]]; then
    TARGET_REF="${REPO_ROOT}/.git/${BASH_REMATCH[1]}"
    if [[ -f "${TARGET_REF}" ]]; then
      GIT_SHA="$(cut -c1-7 "${TARGET_REF}")"
    elif [[ -f "${REPO_ROOT}/.git/packed-refs" ]]; then
      GIT_SHA="$(grep "${BASH_REMATCH[1]}" "${REPO_ROOT}/.git/packed-refs" | head -n 1 | awk '{print substr($1, 1, 7)}')"
    fi
  elif [[ -n "${HEAD_REF}" ]]; then
    GIT_SHA="$(echo "${HEAD_REF}" | cut -c1-7)"
  fi
fi

GIT_SHA="${GIT_SHA:-unknown}"
VERSION="$(grep '^version' "${REPO_ROOT}/crates/spellcheck-cli/Cargo.toml" | head -n 1 | cut -d '"' -f 2)"
TARGET="x86_64-apple-darwin"
BUILD_PROFILE="release"

echo "Building spellcheck-cli v${VERSION} (${GIT_SHA}, ${TARGET})..."
cargo build --release -p spellcheck-cli --manifest-path "${REPO_ROOT}/Cargo.toml"

SRC_BIN="${REPO_ROOT}/target/release/spellcheck-cli"
DEST_ASSETS="${RAYCAST_DIR}/assets"
DEST_BIN="${DEST_ASSETS}/spellcheck-cli"
DEST_JSON="${DEST_ASSETS}/spellcheck-cli.version.json"

mkdir -p "${DEST_ASSETS}"

# 3. Stage executable
cp "${SRC_BIN}" "${DEST_BIN}"
chmod +x "${DEST_BIN}"

# 4. Verify version output
ACTUAL_VERSION="$("${DEST_BIN}" --version)"
EXPECTED_VERSION="spellcheck-cli ${VERSION} (${BUILD_PROFILE}, ${GIT_SHA}, ${TARGET})"

if [[ "${ACTUAL_VERSION}" != "${EXPECTED_VERSION}" ]]; then
  echo "Error: Binary version mismatch!" >&2
  echo "  Expected: ${EXPECTED_VERSION}" >&2
  echo "  Actual:   ${ACTUAL_VERSION}" >&2
  exit 1
fi

# 5. Generate version manifest
cat <<EOF > "${DEST_JSON}"
{
  "name": "spellcheck-cli",
  "version": "${VERSION}",
  "git_sha": "${GIT_SHA}",
  "target": "${TARGET}",
  "build_profile": "${BUILD_PROFILE}",
  "binary": "spellcheck-cli"
}
EOF

echo "Verified staged binary: ${ACTUAL_VERSION}"
echo "Generated manifest: ${DEST_JSON}"
echo "=== Sync Complete ==="
