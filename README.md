# Minecraft 服务器控制面板

一个基于 Vue 3 + Node.js 的 Minecraft 服务器控制面板，支持服务器启动/停止、日志查看、命令执行、JDK 管理、模组管理等功能。

## 功能特性

- 🖥️ **服务器控制**: 启动/停止 Minecraft 服务器
- 📝 **日志查看**: 实时查看服务器日志
- ⌨️ **命令执行**: 通过 Web 界面执行服务器命令
- ☕ **JDK 管理**: 自动下载和管理多个 JDK 版本（Linux）
- 📦 **模组管理**: 查看和删除服务器模组
- 📁 **资源管理**: 管理 JDK 和 Forge 文件

## 系统要求

- Node.js 18+ 
- npm 或 yarn
- Linux/Windows/macOS

## 快速开始

### Linux 服务器部署

#### 方法一：使用安装脚本（推荐）

```bash
# 1. 克隆或上传项目到服务器
cd /path/to/mcmb

# 2. 运行安装脚本（会自动安装 Node.js、Git 等依赖）
bash scripts/install.sh

# 3. 启动服务器
bash scripts/start.sh
```

#### 方法二：手动安装

```bash
# 1. 安装 Node.js 18+（如果未安装）
# CentOS/RHEL:
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Debian/Ubuntu:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. 进入项目目录
cd /path/to/mcmb

# 3. 安装依赖
npm install

# 4. 构建前端
npm run build:frontend

# 5. 启动服务器
npm start
```

### 开发模式

```bash
# 启动后端服务器
npm start

# 在另一个终端启动前端开发服务器（带热重载）
npm run dev:frontend
```

## 配置

服务器配置位于 `server/config.json`:

```json
{
  "port": 3000,
  "javaPath": "java",
  "javaArgs": ["-Xmx2G", "-Xms1G"],
  "serverJarPath": "server.jar",
  "serverDir": "..",
  "autoEula": true,
  "logBufferSize": 800
}
```

### 环境变量

- `PORT`: 面板服务端口（默认: 3000）
- `PANEL_JAVA`: Java 可执行文件路径（覆盖配置文件）

## 后台运行

### 使用 nohup

```bash
nohup npm start > panel.log 2>&1 &
```

### 使用 PM2（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动
pm2 start npm --name "mc-panel" -- start

# 查看状态
pm2 status

# 查看日志
pm2 logs mc-panel

# 停止
pm2 stop mc-panel

# 开机自启
pm2 startup
pm2 save
```

### 使用 systemd（推荐用于生产环境）

创建 `/etc/systemd/system/mc-panel.service`:

```ini
[Unit]
Description=Minecraft Server Panel
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/mcmb
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

然后：

```bash
sudo systemctl daemon-reload
sudo systemctl enable mc-panel
sudo systemctl start mc-panel
sudo systemctl status mc-panel
```

## 更新代码

如果使用 Git 管理代码：

```bash
# 拉取最新代码
git pull origin main

# 重新安装依赖（如果有新依赖）
npm install

# 重新构建前端
npm run build:frontend

# 重启服务
# 如果使用 PM2:
pm2 restart mc-panel

# 如果使用 systemd:
sudo systemctl restart mc-panel
```

## 项目结构

```
mcmb/
├── server/           # 后端代码
│   ├── index.js      # Express 服务器
│   └── config.json   # 服务器配置
├── src/              # 前端源码（Vue 3）
│   ├── components/   # Vue 组件
│   ├── services/     # API 服务
│   ├── composables/  # Vue Composables
│   └── styles/       # 样式文件
├── public/           # 前端构建产物（自动生成）
├── scripts/          # 脚本文件
│   ├── install.sh    # 安装脚本
│   ├── start.sh      # 启动脚本
│   └── setup-jdk.sh  # JDK 安装脚本
└── package.json      # 项目配置
```

## 访问面板

启动成功后，在浏览器访问：

```
http://your-server-ip:3000
```

## 常见问题

### 端口被占用

如果 3000 端口被占用，可以：

1. 修改 `server/config.json` 中的 `port` 值
2. 或使用环境变量: `PORT=8080 npm start`

### 前端请求失败

确保：
1. 已运行 `npm run build:frontend` 构建前端
2. `public/` 目录下有 `index.html` 和 `assets/` 目录
3. 后端服务器正在运行

### JDK 下载失败

确保：
1. 服务器可以访问外网（需要连接 api.adoptium.net）
2. 已安装 `curl` 和 `tar` 命令
3. 有足够的磁盘空间

## 许可证

MIT

