'use strict';

// 设置页相关逻辑：JDK 管理、mcdata 资源、Minecraft 版本、Mod 管理等
const MCPanelSettings = (() => {
	const {
		appendLog
	} = MCPanelCore;

	// 基础 DOM 引用
	const refs = {
		vJavaPath: document.getElementById('v-java-path'),
		vJarName: document.getElementById('v-jar-name'),
		vJavaVersion: document.getElementById('v-java-version'),
		jdkVersionSelect: document.getElementById('jdk-version'),
		btnJdkApply: document.getElementById('btn-jdk-apply'),
		jdkProgressContainer: document.getElementById('jdk-progress-container'),
		jdkProgressFill: document.getElementById('jdk-progress-fill'),
		jdkProgressText: document.getElementById('jdk-progress-text'),
		jdkLogContainer: document.getElementById('jdk-log-container'),
		jdkLogView: document.getElementById('jdk-log-view'),
		mcVersionBadge: document.getElementById('mc-version-badge'),
		modsCountBadge: document.getElementById('mods-count'),
		modsList: document.getElementById('mods-list')
	};

	function appendJdkLog(line) {
		const view = refs.jdkLogView;
		if (!view) return;
		view.textContent += line + '\n';
		view.scrollTop = view.scrollHeight;
	}

	function updateJdkProgress(progress, message) {
		if (!refs.jdkProgressFill || !refs.jdkProgressText) return;
		if (refs.jdkProgressContainer) {
			refs.jdkProgressContainer.style.display = 'block';
		}
		refs.jdkProgressFill.style.width = `${progress}%`;
		refs.jdkProgressText.textContent = message || `下载进度: ${progress}%`;
		appendJdkLog(message || `下载进度: ${progress}%`);
	}

	function resetJdkProgress() {
		if (refs.jdkProgressFill) refs.jdkProgressFill.style.width = '0%';
		if (refs.jdkProgressText) refs.jdkProgressText.textContent = '准备下载...';
		if (refs.jdkProgressContainer) refs.jdkProgressContainer.style.display = 'none';
		if (refs.jdkLogView) refs.jdkLogView.innerHTML = '';
		if (refs.jdkLogContainer) refs.jdkLogContainer.style.display = 'none';
	}

	async function refreshInfo() {
		try {
			const res = await fetch('/api/info');
			const info = await res.json();
			if (refs.vJavaPath) refs.vJavaPath.textContent = info.javaPath;
			if (refs.vJavaVersion) refs.vJavaVersion.textContent = info.javaVersion || '未知版本';
			if (refs.vJarName) refs.vJarName.textContent = `${info.serverDir} / ${info.jarName}`;
			if (refs.mcVersionBadge && info.mcVersion) {
				refs.mcVersionBadge.textContent = `Minecraft: ${info.mcVersion}`;
			}
		} catch (error) {
			console.error('刷新信息失败:', error);
		}
	}

	async function loadModsList() {
		try {
			const res = await fetch('/api/mods');
			const data = await res.json();
			if (!refs.modsList || !refs.modsCountBadge) return;

			if (data.ok) {
				refs.modsCountBadge.textContent = `${data.mods.length} 个模组`;
				if (data.mods.length === 0) {
					refs.modsList.innerHTML = `<p class="muted">暂无模组，服务器启动后会自动生成mods文件夹</p>`;
					return;
				}

				refs.modsList.innerHTML = '';
				const table = document.createElement('table');
				table.className = 'mods-table';
				table.innerHTML = `
					<thead>
						<tr>
							<th>模组名称</th>
							<th>大小</th>
							<th>修改时间</th>
							<th>操作</th>
						</tr>
					</thead>
					<tbody></tbody>
				`;

				const tbody = table.querySelector('tbody');
				data.mods.forEach((mod) => {
					const tr = document.createElement('tr');
					const sizeFormatted = (mod.size / 1024 / 1024).toFixed(2) + ' MB';
					const dateFormatted = new Date(mod.mtime).toLocaleString();
					tr.innerHTML = `
						<td>${mod.name}</td>
						<td>${sizeFormatted}</td>
						<td>${dateFormatted}</td>
						<td>
							<button class="btn small ghost danger delete-mod" data-mod="${mod.name}">删除</button>
						</td>
					`;
					tbody.appendChild(tr);
				});

				refs.modsList.appendChild(table);

				refs.modsList.querySelectorAll('.delete-mod').forEach((btn) => {
					btn.addEventListener('click', async (e) => {
						const modName = e.target.dataset.mod;
						if (!modName) return;
						if (confirm(`确定要删除模组 ${modName} 吗？`)) {
							try {
								const delRes = await fetch(`/api/mods/${encodeURIComponent(modName)}`, {
									method: 'DELETE'
								});
								const result = await delRes.json();
								if (result.ok) {
									appendLog(`[panel] 模组 ${modName} 已删除`);
									loadModsList();
								} else {
									appendLog(`[panel] 删除模组失败: ${result.message}`);
								}
							} catch (error) {
								appendLog(`[panel] 删除模组错误: ${error.message}`);
							}
						}
					});
				});
			}
		} catch (error) {
			console.error('加载模组列表失败:', error);
			if (refs.modsList) {
				refs.modsList.innerHTML = `<p class="muted">加载模组列表失败: ${error.message}</p>`;
			}
		}
	}

	async function loadMcDataInfo() {
		try {
			const jdksResponse = await fetch('/api/mcdata/jdks');
			const jdksData = await jdksResponse.json();
			displayJdksList(jdksData);

			const forgersResponse = await fetch('/api/mcdata/forgers');
			const forgersData = await forgersResponse.json();
			displayForgersList(forgersData);
		} catch (error) {
			console.error('加载mcdata信息失败:', error);
		}
	}

	function displayJdksList(data) {
		const jdksList = document.getElementById('jdks-list');
		if (!jdksList) return;
		jdksList.innerHTML = '';

		if (data.ok && data.jdks.length > 0) {
			const table = document.createElement('table');
			table.className = 'mod-table';

			const thead = document.createElement('thead');
			thead.innerHTML = `
				<tr>
					<th>名称</th>
					<th>类型</th>
					<th>大小</th>
					<th>修改时间</th>
				</tr>
			`;
			table.appendChild(thead);

			const tbody = document.createElement('tbody');
			for (const jdk of data.jdks) {
				const tr = document.createElement('tr');
				tr.innerHTML = `
					<td>${jdk.name}</td>
					<td>${jdk.isDirectory ? '文件夹' : '文件'}</td>
					<td>${formatFileSize(jdk.size)}</td>
					<td>${new Date(jdk.mtime).toLocaleString()}</td>
				`;
				tbody.appendChild(tr);
			}
			table.appendChild(tbody);
			jdksList.appendChild(table);
		} else {
			jdksList.textContent = data.message || '暂无JDK文件';
		}
	}

	function displayForgersList(data) {
		const forgersList = document.getElementById('forgers-list');
		if (!forgersList) return;
		forgersList.innerHTML = '';

		if (data.ok && data.forgers.length > 0) {
			const table = document.createElement('table');
			table.className = 'mod-table';

			const thead = document.createElement('thead');
			thead.innerHTML = `
				<tr>
					<th>名称</th>
					<th>类型</th>
					<th>大小</th>
					<th>修改时间</th>
				</tr>
			`;
			table.appendChild(thead);

			const tbody = document.createElement('tbody');
			for (const forger of data.forgers) {
				const tr = document.createElement('tr');
				tr.innerHTML = `
					<td>${forger.name}</td>
					<td>${forger.isDirectory ? '文件夹' : '文件'}</td>
					<td>${formatFileSize(forger.size)}</td>
					<td>${new Date(forger.mtime).toLocaleString()}</td>
				`;
				tbody.appendChild(tr);
			}
			table.appendChild(tbody);
			forgersList.appendChild(table);
		} else {
			forgersList.textContent = data.message || '暂无Forge文件';
		}
	}

	function formatFileSize(bytes) {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	function bindJdkDownloadButton() {
		const btn = refs.btnJdkApply;
		if (!btn) return;

		btn.addEventListener('click', async () => {
			const version = refs.jdkVersionSelect ? refs.jdkVersionSelect.value : '17';
			btn.disabled = true;
			btn.textContent = '下载中...';

			resetJdkProgress();

			try {
				const res = await fetch('/api/jdk/install', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ version })
				});
				const data = await res.json();
				if (data.ok) {
					appendLog(`[panel] ${data.message}`);
					await loadMcDataInfo();
				} else if (data.message === '已有JDK下载任务正在进行中，请稍后再试') {
					appendLog('[panel] 检测到已有 JDK 下载任务正在进行中，继续在前端显示下载进度和日志。');
					if (refs.jdkLogContainer) refs.jdkLogContainer.style.display = 'block';
					if (refs.jdkProgressContainer) refs.jdkProgressContainer.style.display = 'block';
				} else {
					appendLog(`[panel] JDK 下载失败：${data.message}`);
					appendJdkLog(`[JDK] 错误: ${data.message}`);
				}
			} catch (e) {
				appendLog(`[panel] JDK 下载异常：${e.message}`);
				appendJdkLog(`[JDK] 异常: ${e.message}`);
			} finally {
				setTimeout(() => {
					btn.disabled = false;
					btn.textContent = '下载JDK';
				}, 1000);
			}
		});
	}

	function init() {
		bindJdkDownloadButton();
		resetJdkProgress();
	}

	return {
		refs,
		appendJdkLog,
		updateJdkProgress,
		resetJdkProgress,
		refreshInfo,
		loadModsList,
		loadMcDataInfo,
		init
	};
})();


