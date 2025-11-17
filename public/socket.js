'use strict';

// 日志 Socket.IO 连接和 JDK 下载事件绑定
const MCPanelSocket = (() => {
	const { appendLog } = MCPanelCore;
	let socket;

	function setupSocket() {
		socket = io({ path: '/socket.io' });

		socket.on('connect', () => {
			appendLog('[panel] 已连接日志通道');
		});

		socket.on('bootstrap', (data) => {
			if (!data || !Array.isArray(data.lines)) return;
			const view = MCPanelCore.dom.logView;
			if (view) view.textContent = '';
			for (const line of data.lines) appendLog(line);
		});

		socket.on('log', (line) => {
			appendLog(line);
		});

		socket.on('disconnect', () => {
			appendLog('[panel] 日志通道断开');
		});

		// JDK 下载相关事件转发到 Settings 模块
		socket.on('jdk_download_start', (data) => {
			if (MCPanelSettings.refs.jdkLogContainer) {
				MCPanelSettings.refs.jdkLogContainer.style.display = 'block';
			}
			MCPanelSettings.appendJdkLog(`[JDK] ${data.message}`);
			MCPanelSettings.updateJdkProgress(0, data.message);
		});

		socket.on('jdk_download_progress', (data) => {
			MCPanelSettings.updateJdkProgress(data.progress, `[JDK] ${data.message}`);
		});

		socket.on('jdk_download_log', (data) => {
			MCPanelSettings.appendJdkLog(`[JDK] ${data.message}`);
		});

		socket.on('jdk_download_complete', (data) => {
			MCPanelSettings.updateJdkProgress(100, `[JDK] ${data.message}`);
		});

		socket.on('jdk_download_error', (data) => {
			MCPanelSettings.appendJdkLog(`[JDK] 错误: ${data.message}`);
			const btn = MCPanelSettings.refs.btnJdkApply;
			if (btn) {
				btn.disabled = false;
				btn.textContent = '下载JDK';
			}
		});
	}

	return {
		setupSocket
	};
})();


