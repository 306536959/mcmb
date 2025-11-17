'use strict';

const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const { spawn, exec } = require('child_process');
const { Server: SocketIOServer } = require('socket.io');

// Load config
const CONFIG_PATH = path.join(__dirname, 'config.json');
let config = {
	port: 3000,
	javaPath: 'java',
	javaArgs: ['-Xmx2G', '-Xms1G'],
	serverJarPath: 'server.jar',
	serverDir: '..',
	autoEula: true,
	logBufferSize: 500
};
try {
	if (fs.existsSync(CONFIG_PATH)) {
		const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
		const user = JSON.parse(raw);
		config = { ...config, ...user };
	}
} catch (err) {
	console.error('Failed to read config.json:', err);
}

// Allow environment override for java binary
if (process.env.PANEL_JAVA && String(process.env.PANEL_JAVA).trim().length > 0) {
	config.javaPath = process.env.PANEL_JAVA.trim();
	console.log(`[config] Using Java path from environment: ${config.javaPath}`);
}

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
	cors: { origin: false }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Process state
let mcProcess = null;
let isStarting = false;
/** @type {string[]} */
let logBuffer = [];

async function detectJavaVersion(javaPath) {
	return await new Promise((resolve) => {
		try {
			const proc = spawn(javaPath, ['-version'], { stdio: ['ignore', 'pipe', 'pipe'] });
			let out = '';
			let err = '';
			proc.stdout.on('data', (c) => (out += String(c)));
			proc.stderr.on('data', (c) => (err += String(c)));
			proc.on('close', () => {
				const s = (out || err || '').toString();
				const m = s.match(/version\s+"([^"]+)"/i);
				resolve(m ? m[1] : s.trim().split('\n')[0] || 'unknown');
			});
			proc.on('error', () => resolve('unknown'));
		} catch {
			resolve('unknown');
		}
	});
}

// 检测Minecraft服务器版本
async function detectMinecraftVersion(jarPath) {
	return await new Promise((resolve) => {
		try {
			// 尝试从JAR文件的MANIFEST.MF中读取版本信息
			const proc = spawn('jar', ['tf', jarPath]);
			let out = '';
			proc.stdout.on('data', (c) => (out += String(c)));
			proc.on('close', async (code) => {
				if (code === 0) {
					// 如果JAR命令可用，尝试读取MANIFEST.MF
					const manifestProc = spawn('jar', ['xf', jarPath, 'META-INF/MANIFEST.MF']);
					manifestProc.on('close', (code2) => {
						if (code2 === 0) {
							const manifestPath = path.join(process.cwd(), 'META-INF/MANIFEST.MF');
							if (fs.existsSync(manifestPath)) {
								try {
									const manifest = fs.readFileSync(manifestPath, 'utf-8');
									const versionMatch = manifest.match(/Implementation-Version: ([^\r\n]+)/i);
									const nameMatch = manifest.match(/Implementation-Title: ([^\r\n]+)/i);
									
									// 清理临时文件
									fs.unlinkSync(manifestPath);
									fs.rmdirSync(path.join(process.cwd(), 'META-INF'));
									
									if (versionMatch) {
										resolve(nameMatch ? `${nameMatch[1]} ${versionMatch[1]}` : versionMatch[1]);
										return;
									}
								} catch (e) {
									console.error('Error reading manifest:', e);
								}
							}
						}
						// 如果无法从MANIFEST获取，尝试从文件名猜测
						const fileName = path.basename(jarPath, '.jar');
						resolve(`未知版本 (${fileName})`);
					});
				} else {
					// 如果JAR命令不可用，从文件名猜测版本
					const fileName = path.basename(jarPath, '.jar');
					resolve(`未知版本 (${fileName})`);
				}
			});
		} catch (e) {
			console.error('Error detecting Minecraft version:', e);
			const fileName = path.basename(jarPath, '.jar');
			resolve(`未知版本 (${fileName})`);
		}
	});
}

function appendLog(line) {
	logBuffer.push(line);
	if (logBuffer.length > config.logBufferSize) {
		logBuffer.shift();
	}
	io.emit('log', line);
}

function ensureEulaIfNeeded() {
	if (!config.autoEula) return;
	const eulaPath = path.join(config.serverDir, 'eula.txt');
	try {
		if (!fs.existsSync(eulaPath)) {
			fs.writeFileSync(eulaPath, 'eula=true\r\n', 'utf-8');
			return;
		}
		const content = fs.readFileSync(eulaPath, 'utf-8');
		if (!/eula\s*=\s*true/i.test(content)) {
			fs.writeFileSync(eulaPath, 'eula=true\r\n', 'utf-8');
		}
	} catch (e) {
		console.warn('Unable to set EULA automatically. Please set eula=true in eula.txt manually.', e);
	}
}

function startServer() {
	if (mcProcess || isStarting) {
		return { ok: false, message: 'Server already running or starting' };
	}
	isStarting = true;
	ensureEulaIfNeeded();

	const cwd = path.resolve(config.serverDir);
	const jarPath = path.resolve(config.serverDir, config.serverJarPath);

	if (!fs.existsSync(jarPath)) {
		isStarting = false;
		return { ok: false, message: `Server JAR not found: ${jarPath}` };
	}

	// 检查Java是否可用
	try {
		const { spawnSync } = require('child_process');
		const javaCheck = spawnSync(config.javaPath, ['-version']);
		if (javaCheck.error) {
			isStarting = false;
			const errorMsg = `Java不可用: ${javaCheck.error.message || '无法执行Java命令'}`;
			appendLog(`[panel] ${errorMsg}`);
			return { ok: false, message: errorMsg };
		}
	} catch (e) {
		// 忽略检查过程中的错误，继续尝试启动
		console.warn(`[warning] Java检查失败: ${e.message}`);
	}

	const args = [...(config.javaArgs || []), '-jar', jarPath, 'nogui'];
	appendLog(`[panel] Starting server: ${config.javaPath} ${args.join(' ')} (cwd=${cwd})`);

	try {
		mcProcess = spawn(config.javaPath, args, {
			cwd,
			stdio: ['pipe', 'pipe', 'pipe'],
			windowsHide: true
		});
	} catch (e) {
		isStarting = false;
		appendLog(`[panel] Failed to spawn process: ${e.message}`);
		return { ok: false, message: `Failed to start: ${e.message}` };
	}

	mcProcess.stdout.setEncoding('utf-8');
	mcProcess.stderr.setEncoding('utf-8');

	mcProcess.stdout.on('data', (chunk) => {
		const lines = String(chunk).split(/\r?\n/).filter(Boolean);
		for (const line of lines) appendLog(line);
	});
	mcProcess.stderr.on('data', (chunk) => {
		const lines = String(chunk).split(/\r?\n/).filter(Boolean);
		for (const line of lines) appendLog(`[stderr] ${line}`);
	});
	mcProcess.on('spawn', () => {
		isStarting = false;
		appendLog('[panel] Server process spawned.');
	});
	mcProcess.on('exit', (code, signal) => {
		appendLog(`[panel] Server exited (code=${code}, signal=${signal}).`);
		mcProcess = null;
	});
	mcProcess.on('error', (err) => {
		isStarting = false;
		appendLog(`[panel] Process error: ${err.message}`);
	});

	return { ok: true, message: 'Starting server...' };
}

function stopServer() {
	if (!mcProcess) {
		return { ok: false, message: 'Server is not running' };
	}
	try {
		// Send "stop" command gracefully
		mcProcess.stdin.write('stop\r\n');
		appendLog('[panel] Sent stop command.');
		return { ok: true, message: 'Stopping server...' };
	} catch (e) {
		appendLog(`[panel] Failed to send stop: ${e.message}`);
		try {
			mcProcess.kill('SIGTERM');
			return { ok: true, message: 'Stopping server (SIGTERM)...' };
		} catch (e2) {
			return { ok: false, message: `Failed to stop: ${e2.message}` };
		}
	}
}

function sendCommand(cmd) {
	if (!mcProcess) return { ok: false, message: 'Server is not running' };
	try {
		mcProcess.stdin.write(String(cmd).trim() + '\r\n');
		return { ok: true, message: 'Command sent' };
	} catch (e) {
		return { ok: false, message: `Failed to send command: ${e.message}` };
	}
}

// Routes
app.get('/api/status', (_req, res) => {
	res.json({
		running: Boolean(mcProcess),
		starting: isStarting
	});
});

app.get('/api/info', async (_req, res) => {
	const jarFullPath = path.resolve(config.serverDir, config.serverJarPath);
	const javaVersion = await detectJavaVersion(config.javaPath);
	const mcVersion = fs.existsSync(jarFullPath) ? await detectMinecraftVersion(jarFullPath) : '未找到服务器文件';
	res.json({
		javaPath: config.javaPath,
		javaVersion,
		serverDir: path.resolve(config.serverDir),
		serverJarPath: config.serverJarPath,
		jarName: path.basename(config.serverJarPath),
		jarFullPath,
		mcVersion
	});
});

// Mod管理相关API
app.get('/api/mods', (_req, res) => {
	const modsDir = path.resolve(config.serverDir, 'mods');
	const mods = [];
	
	try {
		if (fs.existsSync(modsDir) && fs.lstatSync(modsDir).isDirectory()) {
			const files = fs.readdirSync(modsDir);
			for (const file of files) {
				if (file.endsWith('.jar')) {
					const filePath = path.join(modsDir, file);
					const stats = fs.statSync(filePath);
					mods.push({
						name: file,
						size: stats.size,
						mtime: stats.mtime
					});
				}
			}
		}
		res.json({ ok: true, mods, modsDir });
	} catch (e) {
		res.json({ ok: false, message: e.message, mods: [], modsDir });
	}
});

app.delete('/api/mods/:name', (req, res) => {
	const modName = req.params.name;
	const modsDir = path.resolve(config.serverDir, 'mods');
	const modPath = path.join(modsDir, modName);
	
	try {
		if (fs.existsSync(modPath)) {
			fs.unlinkSync(modPath);
			res.json({ ok: true, message: `Mod ${modName} 已删除` });
		} else {
			res.status(404).json({ ok: false, message: 'Mod文件不存在' });
		}
	} catch (e) {
		res.status(500).json({ ok: false, message: e.message });
	}
});

// mcdata目录相关API - 识别jdks文件夹
app.get('/api/mcdata/jdks', (_req, res) => {
	const mcdataDir = path.resolve(__dirname, '..', 'mcdata');
	const jdksDir = path.join(mcdataDir, 'jdks');
	const jdks = [];
	
	try {
		if (fs.existsSync(jdksDir) && fs.lstatSync(jdksDir).isDirectory()) {
			const files = fs.readdirSync(jdksDir);
			for (const file of files) {
				const filePath = path.join(jdksDir, file);
				const stats = fs.statSync(filePath);
				jdks.push({
					name: file,
					isDirectory: stats.isDirectory(),
					size: stats.isFile() ? stats.size : 0,
					mtime: stats.mtime
				});
			}
		}
		res.json({ ok: true, jdks, jdksDir });
	} catch (e) {
		res.json({ ok: false, message: e.message, jdks: [], jdksDir });
	}
});

// mcdata目录相关API - 识别forgers文件夹
app.get('/api/mcdata/forgers', (_req, res) => {
	const mcdataDir = path.resolve(__dirname, '..', 'mcdata');
	const forgersDir = path.join(mcdataDir, 'forgers');
	const forgers = [];
	
	try {
		if (fs.existsSync(forgersDir) && fs.lstatSync(forgersDir).isDirectory()) {
			const files = fs.readdirSync(forgersDir);
			for (const file of files) {
				const filePath = path.join(forgersDir, file);
				const stats = fs.statSync(filePath);
				forgers.push({
					name: file,
					isDirectory: stats.isDirectory(),
					size: stats.isFile() ? stats.size : 0,
					mtime: stats.mtime
				});
			}
		}
		res.json({ ok: true, forgers, forgersDir });
	} catch (e) {
		res.json({ ok: false, message: e.message, forgers: [], forgersDir });
	}
});

app.post('/api/mods/upload', (req, res) => {
	// 简单的上传处理，实际项目中可能需要使用multer等库
	res.json({ ok: false, message: 'Mod上传功能暂未实现' });
});

app.get('/api/jdk/candidates', (_req, res) => {
	res.json({ versions: [8, 11, 17, 21] });
});

app.post('/api/jdk/install', async (req, res) => {
	const { version } = req.body || {};
	if (!version) return res.status(400).json({ ok: false, message: 'version is required' });
	if (process.platform !== 'linux') {
		return res.status(400).json({ ok: false, message: 'JDK install is supported on Linux only from panel.' });
	}
	
	// 设置下载状态标志，避免重复下载
	if (global.jdkDownloadInProgress) {
		return res.status(400).json({ ok: false, message: '已有JDK下载任务正在进行中，请稍后再试' });
	}
	global.jdkDownloadInProgress = true;
	
	try {
		// 默认安装到mcdata/jdks目录
		const installDir = path.join(path.dirname(__dirname), 'mcdata', 'jdks');
		// 确保mcdata/jdks目录存在
		const mcdataDir = path.join(path.dirname(__dirname), 'mcdata');
		const jdksDir = path.join(mcdataDir, 'jdks');
		if (!fs.existsSync(mcdataDir)) {
			fs.mkdirSync(mcdataDir, { recursive: true });
		}
		if (!fs.existsSync(jdksDir)) {
			fs.mkdirSync(jdksDir, { recursive: true });
		}
		const scriptPath = path.join(path.dirname(__dirname), 'scripts', 'setup-jdk.sh');
		if (!fs.existsSync(scriptPath)) {
			global.jdkDownloadInProgress = false;
			return res.status(500).json({ ok: false, message: 'setup-jdk.sh not found' });
		}
		
		// 发送开始下载的通知
		io.emit('jdk_download_start', { version, message: `开始下载JDK ${version}...` });
		
		// 调用脚本下载JDK到指定目录，并捕获输出以获取进度
		await new Promise((resolve, reject) => {
			const proc = spawn('bash', [scriptPath, String(version), installDir], { 
				stdio: ['pipe', 'pipe', 'pipe'] 
			});
			
			// 处理标准输出，捕获下载进度
			proc.stdout.on('data', (chunk) => {
				const output = String(chunk);
				console.log(`[JDK下载] ${output.trim()}`);
				
				// 尝试从输出中提取进度信息（假设脚本会输出类似 "Progress: 45%" 的内容）
				const progressMatch = output.match(/Progress:\s*(\d+)%/i);
				if (progressMatch && progressMatch[1]) {
					const progress = parseInt(progressMatch[1], 10);
					io.emit('jdk_download_progress', { 
						version, 
						progress, 
						message: `下载进度: ${progress}%` 
					});
				} else {
					// 发送普通输出日志
					io.emit('jdk_download_log', { 
						version, 
						message: output.trim() 
					});
				}
			});
			
			// 处理错误输出
			proc.stderr.on('data', (chunk) => {
				const error = String(chunk);
				console.error(`[JDK下载错误] ${error.trim()}`);
				io.emit('jdk_download_log', { 
					version, 
					message: `[错误] ${error.trim()}` 
				});
			});
			
			proc.on('close', (code) => {
				if (code === 0) {
					io.emit('jdk_download_progress', { 
						version, 
						progress: 100, 
						message: '下载完成，正在安装...' 
					});
					resolve();
				} else {
					reject(new Error(`JDK下载失败，退出码: ${code}`));
				}
			});
			
			proc.on('error', (err) => {
				io.emit('jdk_download_log', { 
					version, 
					message: `[错误] 进程启动失败: ${err.message}` 
				});
				reject(err);
			});
		});
		
		// 检查是否成功下载
		const jdkDirPath = path.join(installDir, `jdk-${version}`);
		const message = fs.existsSync(jdkDirPath) ? 
			`JDK ${version} 已成功下载到 ${jdkDirPath}` : 
			`JDK ${version} 下载完成，请检查下载目录`;
			
		io.emit('jdk_download_complete', { 
			version, 
			message 
		});
		
		return res.json({ 
			ok: true, 
			message,
			downloadPath: fs.existsSync(jdkDirPath) ? jdkDirPath : installDir
		});
	} catch (e) {
		io.emit('jdk_download_error', { 
			version, 
			message: e.message 
		});
		return res.json({ ok: false, message: e.message });
	} finally {
		// 无论成功失败，都要重置下载状态
		global.jdkDownloadInProgress = false;
	}
});

app.post('/api/start', (_req, res) => {
	const result = startServer();
	res.json(result);
});

app.post('/api/stop', (_req, res) => {
	const result = stopServer();
	res.json(result);
});

app.post('/api/send', (req, res) => {
	const { command } = req.body || {};
	if (!command || typeof command !== 'string') {
		return res.status(400).json({ ok: false, message: 'command is required' });
	}
	const result = sendCommand(command);
	res.json(result);
});

app.get('/api/logs', (_req, res) => {
	res.json({ lines: logBuffer });
});

io.on('connection', (socket) => {
	socket.emit('bootstrap', { lines: logBuffer });
});

// 尝试终止占用指定端口的进程（主要用于 Linux）
function killProcessOnPort(port) {
	return new Promise((resolve, reject) => {
		if (process.platform === 'win32') {
			console.warn(`[port] 自动释放端口在 Windows 上未实现，请手动关闭占用 ${port} 的进程。`);
			return reject(new Error('Automatic port kill is not supported on Windows.'));
		}

		// 使用 lsof 或 fuser 终止占用该端口的进程
		const cmd = `lsof -ti tcp:${port} | xargs -r kill -9 || fuser -k ${port}/tcp || true`;
		exec(cmd, (error) => {
			if (error) {
				return reject(error);
			}
			resolve();
		});
	});
}

// 在指定端口启动；如果被占用则尝试杀掉占用该端口的进程后再在同一端口重新启动
function startServerWithPortCheck(port) {
	const targetPort = Number(port);

	function tryListen() {
		return new Promise((resolve, reject) => {
			server
				.listen(targetPort, () => {
					console.log(`MC Panel listening on http://localhost:${targetPort}`);
					console.log(`[info] Java path configured: ${config.javaPath}`);
					console.log(`[info] Server directory: ${path.resolve(config.serverDir)}`);
					console.log(`[info] Server JAR: ${config.serverJarPath}`);
					resolve(targetPort);
				})
				.on('error', (err) => {
					reject(err);
				});
		});
	}

	return tryListen().catch((err) => {
		if (err.code !== 'EADDRINUSE') {
			throw err;
		}

		console.error(`端口 ${targetPort} 已被占用，尝试终止占用该端口的进程后重新启动面板...`);
		return killProcessOnPort(targetPort)
			.then(() => {
				console.log(`已尝试终止占用端口 ${targetPort} 的进程，正在重新监听端口 ${targetPort}...`);
				return tryListen();
			})
			.catch((killErr) => {
				console.error(`自动释放端口 ${targetPort} 失败，请手动检查并释放该端口: ${killErr.message}`);
				throw err;
			});
	});
}

// 确保mcdata目录存在
function ensureMcdataDirectory() {
	const mcdataPath = path.join(__dirname, '..', 'mcdata');
	try {
		if (!fs.existsSync(mcdataPath)) {
			console.log(`[init] 创建mcdata目录: ${mcdataPath}`);
			fs.mkdirSync(mcdataPath, { recursive: true });
			
			// 创建默认的子目录
			const jdksPath = path.join(mcdataPath, 'jdks');
			const forgersPath = path.join(mcdataPath, 'forgers');
			
			fs.mkdirSync(jdksPath, { recursive: true });
			fs.mkdirSync(forgersPath, { recursive: true });
			console.log('[init] 已创建mcdata及其子目录');
		}
	} catch (err) {
		console.error('创建mcdata目录失败:', err.message);
	}
}

// 初始化mcdata目录
ensureMcdataDirectory();

// 启动服务器，处理端口冲突
const startPort = Number(process.env.PORT || config.port || 3000);
startServerWithPortCheck(startPort).catch((err) => {
	console.error('服务器启动失败:', err.message);
	process.exit(1);
});

// 捕获未处理的异常，确保面板不会意外崩溃
process.on('uncaughtException', (error) => {
	console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
	console.error('未处理的Promise拒绝:', reason);
});

