#!/usr/bin/env bash
set -euo pipefail

# One-click installer for MC Panel on Linux (systemd)
# Usage:
#   curl -fsSL https://example.com/install.sh | bash
# or run locally:
#   chmod +x scripts/install.sh && sudo scripts/install.sh

APP_NAME="mc-panel"
INSTALL_DIR="/opt/${APP_NAME}"
SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"
USER_NAME="${SUDO_USER:-${USER}}"
NODE_PATH="$(command -v node || true)"
NPM_PATH="$(command -v npm || true)"

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root: sudo scripts/install.sh" >&2
  exit 1
fi

echo "[1/4] Copying files to ${INSTALL_DIR} ..."
rm -rf "${INSTALL_DIR}"
mkdir -p "${INSTALL_DIR}"
cp -r . "${INSTALL_DIR}/"
cd "${INSTALL_DIR}"

echo "[2/4] Installing dependencies (production only) ..."
if command -v npm >/dev/null 2>&1; then
  npm install --omit=dev
else
  echo "Warning: npm not found; assuming a packaged binary will be used." >&2
fi

echo "[3/4] Creating systemd service ..."
cat >/etc/systemd/system/${APP_NAME}.service <<EOF
[Unit]
Description=Minecraft Panel (Web console)
After=network.target

[Service]
Type=simple
WorkingDirectory=${INSTALL_DIR}
ExecStart=${NODE_PATH:-/usr/bin/node} server/index.js
Restart=on-failure
RestartSec=3
Environment=PORT=3000
User=${USER_NAME}
Group=${USER_NAME}

[Install]
WantedBy=multi-user.target
EOF

echo "[4/4] Enabling and starting service ..."
systemctl daemon-reload
systemctl enable ${APP_NAME}
systemctl restart ${APP_NAME}

echo "Done."
echo "Status:   systemctl status ${APP_NAME}"
echo "Logs:     journalctl -u ${APP_NAME} -f"
echo "Open:     http://<server-ip>:3000"

