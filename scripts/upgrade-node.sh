#!/bin/bash
set -euo pipefail

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
    yum remove -y nodejs npm 2>/dev/null || true
    
    # 清理可能存在的旧仓库
    if [ -f /etc/yum.repos.d/nodesource*.repo ]; then
        echo "清理旧的 NodeSource 仓库..."
        rm -f /etc/yum.repos.d/nodesource*.repo
    fi
fi

# 安装 Node.js 18
echo ""
echo "📦 正在安装 Node.js 18..."

if [ "$OS_TYPE" = "rhel" ]; then
    # CentOS/RHEL
    curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
    yum install -y nodejs
elif [ "$OS_TYPE" = "debian" ]; then
    # Debian/Ubuntu
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
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

