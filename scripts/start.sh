#!/bin/bash
set -euo pipefail

# Minecraft 服务器面板启动脚本
# 使用方法: bash scripts/start.sh

echo "=========================================="
echo "Minecraft 服务器面板启动脚本"
echo "=========================================="

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js 18+"
    echo "安装方法: curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash - && sudo yum install -y nodejs"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ 错误: Node.js 版本过低，需要 18+，当前版本: $(node -v)"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到 npm"
    exit 1
fi

echo "✅ npm 版本: $(npm -v)"

# 获取脚本所在目录的父目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "📁 项目目录: $PROJECT_ROOT"

# 检查 node_modules 是否存在，如果不存在则安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装后端依赖..."
    npm install
else
    echo "✅ 后端依赖已存在"
fi

# 检查前端构建产物是否存在
if [ ! -f "public/index.html" ] || [ ! -d "public/assets" ]; then
    echo "🔨 正在构建前端..."
    
    # 检查前端依赖
    if [ ! -d "node_modules/vite" ]; then
        echo "📦 正在安装前端构建依赖..."
        npm install
    fi
    
    npm run build:frontend
    echo "✅ 前端构建完成"
else
    echo "✅ 前端构建产物已存在"
fi

# 检查 server 目录是否存在
if [ ! -d "server" ]; then
    echo "❌ 错误: 未找到 server 目录"
    exit 1
fi

# 设置端口（可通过环境变量覆盖）
export PORT=${PORT:-3000}

echo ""
echo "🚀 正在启动服务器..."
echo "   访问地址: http://localhost:${PORT}"
echo "   按 Ctrl+C 停止服务器"
echo "=========================================="
echo ""

# 启动服务器
npm start

