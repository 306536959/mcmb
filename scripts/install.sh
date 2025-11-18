#!/bin/bash
set -euo pipefail

# Minecraft 服务器面板安装脚本
# 使用方法: bash scripts/install.sh

echo "=========================================="
echo "Minecraft 服务器面板安装脚本"
echo "=========================================="

# 检查是否为 root 用户（某些操作可能需要）
if [ "$EUID" -eq 0 ]; then 
   echo "⚠️  警告: 不建议使用 root 用户运行此脚本"
fi

# 检查并安装 Node.js
if ! command -v node &> /dev/null; then
    echo "📦 正在安装 Node.js 18..."
    
    # 检测系统类型
    if [ -f /etc/redhat-release ]; then
        # CentOS/RHEL
        echo "检测到 CentOS/RHEL 系统"
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
    elif [ -f /etc/debian_version ]; then
        # Debian/Ubuntu
        echo "检测到 Debian/Ubuntu 系统"
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        echo "❌ 错误: 无法自动检测系统类型，请手动安装 Node.js 18+"
        echo "访问: https://nodejs.org/"
        exit 1
    fi
    
    echo "✅ Node.js 安装完成: $(node -v)"
else
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo "❌ 错误: Node.js 版本过低，需要 18+，当前版本: $(node -v)"
        echo "请升级 Node.js 到 18 或更高版本"
        exit 1
    fi
    echo "✅ Node.js 已安装: $(node -v)"
fi

# 检查并安装 Git（如果需要从 Git 克隆）
if ! command -v git &> /dev/null; then
    echo "📦 正在安装 Git..."
    if [ -f /etc/redhat-release ]; then
        sudo yum install -y git
    elif [ -f /etc/debian_version ]; then
        sudo apt-get install -y git
    fi
    echo "✅ Git 安装完成"
else
    echo "✅ Git 已安装: $(git --version)"
fi

# 获取脚本所在目录的父目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "📁 项目目录: $PROJECT_ROOT"

# 安装依赖
echo "📦 正在安装项目依赖..."
npm install

# 构建前端
echo "🔨 正在构建前端..."
npm run build:frontend

echo ""
echo "✅ 安装完成！"
echo ""
echo "启动方法:"
echo "  1. 直接启动: npm start"
echo "  2. 使用启动脚本: bash scripts/start.sh"
echo "  3. 后台运行: nohup npm start > panel.log 2>&1 &"
echo ""

