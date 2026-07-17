#!/usr/bin/env bash
set -euo pipefail

VERSION="3.9.4"
BIN_DIR="${HOME}/.local/bin"
BIN_PATH="${BIN_DIR}/sops"

if [ -x "${BIN_PATH}" ] && "${BIN_PATH}" --version 2>/dev/null | grep -q "${VERSION}"; then
  echo "sops ${VERSION} already installed at ${BIN_PATH}"
  exit 0
fi

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH="amd64"
if [ "$(uname -m)" = "aarch64" ]; then
  ARCH="arm64"
fi

URL="https://github.com/getsops/sops/releases/download/v${VERSION}/sops-v${VERSION}.${OS}.${ARCH}"
echo "Downloading sops v${VERSION} from ${URL}..."

mkdir -p "${BIN_DIR}"
curl -fsSL "${URL}" -o "${BIN_PATH}"
chmod +x "${BIN_PATH}"

echo "sops ${VERSION} installed to ${BIN_PATH}"
echo "Make sure ${BIN_DIR} is in your PATH: export PATH=\"\${HOME}/.local/bin:\$PATH\""
