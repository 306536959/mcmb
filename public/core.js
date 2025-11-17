'use strict';

// 核心 DOM 引用与工具函数，供其他脚本复用
const MCPanelCore = (() => {
	const dom = {
		statusBadge: document.getElementById('status-indicator'),
		btnStart: document.getElementById('btn-start'),
		btnStop: document.getElementById('btn-stop'),
		btnSend: document.getElementById('btn-send'),
		cmdInput: document.getElementById('command-input'),
		logView: document.getElementById('log-view')
	};

	function appendLog(line) {
		if (!dom.logView) return;
		dom.logView.textContent += (dom.logView.textContent ? '\n' : '') + line;
		dom.logView.scrollTop = dom.logView.scrollHeight;
	}

	return {
		dom,
		appendLog
	};
})();


