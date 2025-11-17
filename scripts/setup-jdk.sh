#!/usr/bin/env bash
set -euo pipefail

# Download and install a JDK (Eclipse Temurin) for Linux x64/aarch64.
# Usage:
#   scripts/setup-jdk.sh <version> [install_dir]
# Example:
#   scripts/setup-jdk.sh 17 /opt/mc-panel/runtime
#
# It will create: <install_dir>/jdk-<version> and symlink <install_dir>/current -> that folder.
# Exposes JAVA_HOME and JAVA_BIN paths on success.

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <version(8|11|17|21|... )> [install_dir]" >&2
  exit 1
fi

VERSION="$1"
INSTALL_DIR="${2:-$(pwd)/runtime}"
ARCH="$(uname -m)"
case "${ARCH}" in
  x86_64|amd64) API_ARCH="x64" ;;
  aarch64|arm64) API_ARCH="aarch64" ;;
  *) echo "Unsupported architecture: ${ARCH}" >&2; exit 1 ;;
esac

mkdir -p "${INSTALL_DIR}"
cd "${INSTALL_DIR}"

TARGET_DIR="${INSTALL_DIR}/jdk-${VERSION}"
if [[ -x "${TARGET_DIR}/bin/java" ]]; then
  echo "JDK already exists: ${TARGET_DIR}"
  echo "JAVA_HOME=${TARGET_DIR}"
  echo "JAVA_BIN=${TARGET_DIR}/bin/java"
  # 进度直接标记为 100%
  echo "Progress: 100%"
  exit 0
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

URL="https://api.adoptium.net/v3/binary/latest/${VERSION}/ga/linux/${API_ARCH}/jdk/hotspot/normal/eclipse?project=jdk"
echo "Downloading JDK ${VERSION} for ${API_ARCH} ..."
echo "Source: ${URL}"

# 初始阶段：准备下载
echo "Progress: 5%"

# 下载阶段：启用 curl 自带的进度条输出，前端可看到接近命令行的效果
curl -fSL --progress-bar "${URL}" -o "${TMP_DIR}/jdk.tar.gz"
echo
echo "Downloaded archive."
echo "Progress: 60%"

echo "Extracting..."
mkdir -p "${TARGET_DIR}"
tar -xzf "${TMP_DIR}/jdk.tar.gz" -C "${TMP_DIR}"
echo "Progress: 80%"

# Move extracted folder contents into TARGET_DIR (adoptium uses a nested dir)
# Find the extracted JDK directory
EXTRACTED="$(find "${TMP_DIR}" -mindepth 1 -maxdepth 1 -type d | head -n1 || true)"

if [[ -z "${EXTRACTED}" ]]; then
  echo "Failed to locate extracted JDK directory." >&2
  exit 1
fi
shopt -s dotglob
mv "${EXTRACTED}/"* "${TARGET_DIR}/"
shopt -u dotglob

ln -sfn "${TARGET_DIR}" "${INSTALL_DIR}/current"
echo "Installed JDK to: ${TARGET_DIR}"
echo "JAVA_HOME=${TARGET_DIR}"
echo "JAVA_BIN=${TARGET_DIR}/bin/java"
echo "Progress: 100%"

