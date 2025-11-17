'use strict';

// 入口脚本：只负责页面导航、按钮绑定和初始化

const { statusBadge, btnStart, btnStop, btnSend, cmdInput, logView } = MCPanelCore.dom;
const navButtons = document.querySelectorAll('.nav-item');
const sections = {
	console: document.getElementById('section-console'),
	players: document.getElementById('section-players'),
	settings: document.getElementById('section-settings')
};
const uploadArea = document.querySelector('.upload-area');

const { appendLog } = MCPanelCore;

function setStatus({ running, starting }) {
	if (starting) {
		statusBadge.textContent = '启动中...';
		statusBadge.style.color = '#f0c36a';
	} else if (running) {
		statusBadge.textContent = '运行中';
		statusBadge.style.color = '#35c36b';
	} else {
		statusBadge.textContent = '未运行';
		statusBadge.style.color = '#9aa6b2';
	}
	btnStart.disabled = !!running || !!starting;
	btnStop.disabled = !running && !starting;
	cmdInput.disabled = !running;
	btnSend.disabled = !running;
}

async function refreshStatus() {
	try {
		const res = await fetch('/api/status');
		const data = await res.json();
		setStatus(data);
	} catch {
		statusBadge.textContent = '状态未知';
	}
}

function activateSection(name) {
	for (const btn of navButtons) {
		btn.classList.toggle('active', btn.dataset.section === name);
	}
	for (const key of Object.keys(sections)) {
		sections[key].classList.toggle('visible', key === name);
	}
	const headerTitle = document.querySelector('.header h1');
	if (name === 'console') headerTitle.textContent = '控制台';
	if (name === 'players') headerTitle.textContent = '在线玩家';
	if (name === 'settings') headerTitle.textContent = '设置';
}

for (const btn of navButtons) {
	btn.addEventListener('click', () => activateSection(btn.dataset.section));
}

btnStart.addEventListener('click', async () => {
	btnStart.disabled = true;
	try {
		const res = await fetch('/api/start', { method: 'POST' });
		const data = await res.json();
		appendLog(`[panel] ${data.message}`);
	} catch (e) {
		appendLog(`[panel] 启动失败：${e.message}`);
	}
	refreshStatus();
});

btnStop.addEventListener('click', async () => {
	btnStop.disabled = true;
	try {
		const res = await fetch('/api/stop', { method: 'POST' });
		const data = await res.json();
		appendLog(`[panel] ${data.message}`);
	} catch (e) {
		appendLog(`[panel] 关闭失败：${e.message}`);
	}
	refreshStatus();
});

btnSend.addEventListener('click', async () => {
	const command = cmdInput.value.trim();
	if (!command) return;
	try {
		const res = await fetch('/api/send', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ command })
		});
		const data = await res.json();
		if (!data.ok) appendLog(`[panel] 命令发送失败：${data.message}`);
	} catch (e) {
		appendLog(`[panel] 命令发送失败：${e.message}`);
	}
	cmdInput.value = '';
	cmdInput.focus();
});

cmdInput.addEventListener('keydown', (e) => {
	if (e.key === 'Enter') {
		e.preventDefault();
        btnSend.click();
	}
});

window.addEventListener('load', async () => {
	MCPanelSocket.setupSocket();
	activateSection('console');
	await refreshStatus();
	await MCPanelSettings.refreshInfo();
	await MCPanelSettings.loadModsList();
	await MCPanelSettings.loadMcDataInfo();
	MCPanelSettings.init();
	
		try {
		const res = await fetch('/api/logs');
		const data = await res.json();
		if (Array.isArray(data.lines)) {
			logView.textContent = '';
			for (const line of data.lines) appendLog(line);
		}
	} catch {}
});

