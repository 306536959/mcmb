#!/usr/bin/env bash
set -euo pipefail

# Simple upgrade script for MC Panel on Linux (systemd)
# Usage:
#   # In your project git directory (latest code)
#   # 1) Pull latest code
#   git pull
#   # 2) Run upgrade
#   sudo scripts/update.sh
#
# This script will:
#   - Detect existing systemd service for mc-panel
#   - Find its WorkingDirectory (install dir)
#   - Copy current project files into install dir
#   - Install production dependencies (npm ci --omit=dev)
#   - Restart the service

APP_NAME="mc-panel"
SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root: sudo scripts/update.sh" >&2
  exit 1
fi

if [[ ! -f "${SERVICE_FILE}" ]]; then
  echo "systemd service ${SERVICE_FILE} not found. Please run install.sh first." >&2
  exit 1
fi

echo "[1/4] Detecting install directory from systemd service ..."
INSTALL_DIR="$(grep -E '^WorkingDirectory=' "${SERVICE_FILE}" | head -n1 | cut -d'=' -f2- || true)"
if [[ -z "${INSTALL_DIR}" ]]; then
  echo "Failed to detect WorkingDirectory from ${SERVICE_FILE}." >&2
  echo "You can edit scripts/update.sh to hardcode INSTALL_DIR if needed." >&2
  exit 1
fi

if [[ ! -d "${INSTALL_DIR}" ]]; then
  echo "Install directory ${INSTALL_DIR} does not exist." >&2
  exit 1
fi

echo "Install directory: ${INSTALL_DIR}"

echo "[2/4] Stopping systemd service ${APP_NAME} ..."
systemctl stop "${APP_NAME}" || true

echo "[3/4] Copying current project files into install directory ..."
# Remove old files except mcdata and logs (if present)
find "${INSTALL_DIR}" -mindepth 1 -maxdepth 1 ! -name "mcdata" ! -name "logs" -exec rm -rf {} +
cp -r . "${INSTALL_DIR}/"

cd "${INSTALL_DIR}"

echo "[3.1] Installing production dependencies ..."
if command -v npm >/dev/null 2>&1; then
  if [[ -f package-lock.json ]]; then
    npm ci --omit=dev
  else
    npm install --omit=dev
  fi
else
  echo "Warning: npm not found; assuming a packaged binary will be used." >&2
fi

echo "[4/4] Restarting systemd service ${APP_NAME} ..."
systemctl daemon-reload
systemctl restart "${APP_NAME}"

echo "Upgrade finished."
echo "Status:   systemctl status ${APP_NAME}"
echo "Logs:     journalctl -u ${APP_NAME} -f"


