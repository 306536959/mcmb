#!/bin/bash
set -euo pipefail

require_cmd() {
    if ! command -v "$1" &> /dev/null; then
        echo "❌ 错误: 未找到命令 $1"
        exit 1
    fi
}

version_lt() {
    [ "$(printf '%s\n' "$1" "$2" | sort -V | head -n1)" = "$1" ] && [ "$1" != "$2" ]
}

install_unofficial_node() {
    local NODE_VERSION="18.20.3"
    local NODE_TAG="v${NODE_VERSION}"
    local INSTALL_DIR="/opt/node18"
    local TAR_NAME="node-${NODE_TAG}-linux-x64-glibc-217.tar.gz"
    local URL="https://unofficial-builds.nodejs.org/download/release/${NODE_TAG}/${TAR_NAME}"
    local PROFILE_FILE="/etc/profile.d/node18.sh"

    echo ""
    echo "📦 检测到 glibc < 2.28，将使用官方 glibc 2.17 兼容构建：${NODE_TAG}"
    require_cmd curl
    require_cmd tar

    ${SUDO_CMD} mkdir -p "${INSTALL_DIR}"
    cd "${INSTALL_DIR}"

    echo "⬇️  正在下载 ${URL}"
    ${SUDO_CMD} curl -fsSLO "${URL}"

    echo "📂 正在解压..."
    ${SUDO_CMD} tar -xzf "${TAR_NAME}"

    local NODE_DIR="node-${NODE_TAG}-linux-x64-glibc-217"
    if [ ! -d "${NODE_DIR}" ]; then
        echo "❌ 错误: 未找到解压目录 ${NODE_DIR}"
        exit 1
    fi

    ${SUDO_CMD} rm -rf current
    ${SUDO_CMD} mv "${NODE_DIR}" current
    ${SUDO_CMD} rm -f "${TAR_NAME}"

    echo "⚙️  配置 PATH..."
    if [ -w "${PROFILE_FILE}" ] || [ ! -f "${PROFILE_FILE}" ]; then
        ${SUDO_CMD} tee "${PROFILE_FILE}" >/dev/null <<EOF
export PATH=${INSTALL_DIR}/current/bin:\$PATH
EOF
    else
        echo "⚠️  无法写入 ${PROFILE_FILE}，请手动将 ${INSTALL_DIR}/current/bin 加入 PATH"
    fi

    export PATH=${INSTALL_DIR}/current/bin:$PATH
    hash -r
}

# Node.js 升级脚本（适用于 CentOS/RHEL）
# 使用方法: bash scripts/upgrade-node.sh

echo "=========================================="
echo "Node.js 升级脚本"
echo "=========================================="

# 检查当前 Node.js 版本
if command -v node &> /dev/null; then
    CURRENT_VERSION=$(node -v)
    echo "当前 Node.js 版本: $CURRENT_VERSION"
else
    echo "未检测到 Node.js"
fi

# 判断是否需要 sudo
if [ "$EUID" -ne 0 ]; then
    SUDO_CMD="sudo"
else
    SUDO_CMD=""
fi

# 检测系统类型
if [ -f /etc/redhat-release ]; then
    OS_TYPE="rhel"
    echo "检测到 CentOS/RHEL 系统"
elif [ -f /etc/debian_version ]; then
    OS_TYPE="debian"
    echo "检测到 Debian/Ubuntu 系统"
else
    echo "❌ 错误: 无法自动检测系统类型"
    exit 1
fi

# 卸载旧版本 Node.js（可选，如果使用 yum 安装的）
if [ "$OS_TYPE" = "rhel" ]; then
    echo ""
    echo "📦 正在移除旧版本 Node.js..."
    ${SUDO_CMD} yum remove -y nodejs npm 2>/dev/null || true
    
    # 清理可能存在的旧仓库
    if ls /etc/yum.repos.d/nodesource*.repo &>/dev/null; then
        echo "清理旧的 NodeSource 仓库..."
        ${SUDO_CMD} rm -f /etc/yum.repos.d/nodesource*.repo
    fi
fi

# 安装 Node.js 18
echo ""
echo "📦 正在安装 Node.js 18..."

if [ "$OS_TYPE" = "rhel" ]; then
    require_cmd getconf
    GLIBC_VERSION=$(getconf GNU_LIBC_VERSION | awk '{print $2}')
    echo "当前 glibc 版本: ${GLIBC_VERSION}"
    if version_lt "$GLIBC_VERSION" "2.28"; then
        install_unofficial_node
    else
        curl -fsSL https://rpm.nodesource.com/setup_18.x | ${SUDO_CMD} bash -
        ${SUDO_CMD} yum install -y nodejs
    fi
elif [ "$OS_TYPE" = "debian" ]; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | ${SUDO_CMD} bash -
    ${SUDO_CMD} apt-get install -y nodejs
fi

# 验证安装
if command -v node &> /dev/null; then
    NEW_VERSION=$(node -v)
    NPM_VERSION=$(npm -v)
    echo ""
    echo "✅ Node.js 升级成功！"
    echo "   Node.js: $NEW_VERSION"
    echo "   npm: $NPM_VERSION"
    
    # 检查版本是否符合要求
    MAJOR_VERSION=$(echo "$NEW_VERSION" | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$MAJOR_VERSION" -ge 18 ]; then
        echo "✅ 版本符合要求（18+）"
    else
        echo "⚠️  警告: 版本可能不符合要求"
    fi
else
    echo "❌ 错误: Node.js 安装失败"
    exit 1
fi

echo ""
echo "=========================================="

