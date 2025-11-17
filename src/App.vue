<template>
  <div class="layout">
    <Sidebar v-model="section" />
    <main class="main">
      <HeaderBar
        :title="titles[section]"
        subtitle="Minecraft 服务器控制面板"
        :status="status"
      />

      <ConsoleSection
        v-if="section === 'console'"
        :status="status"
        :logs="logs"
        :mc-version="info?.mcVersion ?? '未知'"
        @start="handleStart"
        @stop="handleStop"
        @send-command="handleSendCommand"
      />

      <PlayersSection v-else-if="section === 'players'" />

      <SettingsSection
        v-else
        :info="info"
        :mods="mods"
        :jdks="jdks"
        :forgers="forgers"
        :jdks-dir="jdksDir"
        :forgers-dir="forgersDir"
        :jdk-progress="jdkState.progress"
        :jdk-progress-text="jdkState.text"
        :jdk-logs="jdkState.logs"
        :jdk-downloading="jdkState.downloading"
        @refresh-info="loadInfo"
        @download-jdk="startJdkDownload"
        @delete-mod="deleteMod"
        @refresh-resources="loadResources"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, onBeforeUnmount } from 'vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import HeaderBar from '@/components/layout/HeaderBar.vue'
import ConsoleSection from '@/components/console/ConsoleSection.vue'
import PlayersSection from '@/components/players/PlayersSection.vue'
import SettingsSection from '@/components/settings/SettingsSection.vue'
import {
  deleteMod as deleteModApi,
  fetchForgers,
  fetchInfo,
  fetchJdks,
  fetchLogs,
  fetchMods,
  fetchStatus,
  requestJdkInstall,
  sendCommand,
  startServer,
  stopServer
} from '@/services/panelApi'
import type { ModEntry, PanelInfo, ResourceEntry, ServerStatus } from '@/types/panel'
import { usePanelSocket } from '@/composables/usePanelSocket'

const section = ref<'console' | 'players' | 'settings'>('console')
const status = reactive<ServerStatus>({ running: false, starting: false })
const info = ref<PanelInfo | null>(null)
const logs = ref<string[]>([])
const mods = ref<ModEntry[]>([])
const jdks = ref<ResourceEntry[]>([])
const forgers = ref<ResourceEntry[]>([])
const jdksDir = ref<string>()
const forgersDir = ref<string>()
const titles = {
  console: '控制台',
  players: '在线玩家',
  settings: '设置'
}

const jdkState = reactive({
  progress: 0,
  text: '',
  logs: [] as string[],
  downloading: false
})

async function loadStatus() {
  try {
    const data = await fetchStatus()
    status.running = data.running
    status.starting = data.starting
  } catch (error) {
    console.error('加载状态失败', error)
  }
}

async function loadInfo() {
  try {
    info.value = await fetchInfo()
  } catch (error) {
    console.error('加载信息失败', error)
  }
}

async function loadLogs() {
  try {
    const res = await fetchLogs()
    logs.value = Array.isArray(res.lines) ? res.lines : []
  } catch (error) {
    console.error('加载日志失败', error)
  }
}

async function loadMods() {
  try {
    const data = await fetchMods()
    mods.value = data.mods || []
  } catch (error) {
    console.error('加载模组失败', error)
  }
}

async function loadResources() {
  try {
    const [jdksData, forgersData] = await Promise.all([fetchJdks(), fetchForgers()])
    jdks.value = jdksData.jdks || []
    jdksDir.value = jdksData.jdksDir
    forgers.value = forgersData.forgers || []
    forgersDir.value = forgersData.forgersDir
  } catch (error) {
    console.error('加载资源失败', error)
  }
}

async function handleStart() {
  try {
    const res = await startServer()
    appendLog(`[panel] ${res.message}`)
  } catch (error) {
    appendLog(`[panel] 启动失败：${(error as Error).message}`)
  } finally {
    await loadStatus()
  }
}

async function handleStop() {
  try {
    const res = await stopServer()
    appendLog(`[panel] ${res.message}`)
  } catch (error) {
    appendLog(`[panel] 关闭失败：${(error as Error).message}`)
  } finally {
    await loadStatus()
  }
}

async function handleSendCommand(command: string) {
  try {
    const res = await sendCommand(command)
    if (!res.ok) {
      appendLog(`[panel] 命令发送失败：${res.message}`)
    }
  } catch (error) {
    appendLog(`[panel] 命令发送失败：${(error as Error).message}`)
  }
}

async function startJdkDownload(version: string) {
  jdkState.logs = []
  jdkState.progress = 0
  jdkState.text = `准备下载 JDK ${version}...`
  jdkState.downloading = true
  try {
    const res = await requestJdkInstall(version)
    if (!res.ok) {
      appendJdkLog(`[JDK] 错误: ${res.message}`)
    }
  } catch (err) {
    appendJdkLog(`[JDK] 异常: ${(err as Error).message}`)
    jdkState.downloading = false
  }
}

async function deleteMod(name: string) {
  try {
    await deleteModApi(name)
    appendLog(`[panel] 模组 ${name} 已删除`)
    await loadMods()
  } catch (error) {
    appendLog(`[panel] 删除模组失败：${(error as Error).message}`)
  }
}

function appendLog(line: string) {
  logs.value = [...logs.value, line]
}

function appendJdkLog(line: string) {
  jdkState.logs = [...jdkState.logs, line]
}

const socket = usePanelSocket({
  onLog: appendLog,
  onBootstrap: (lines) => (logs.value = lines),
  onJdkStart: ({ message }) => {
    jdkState.downloading = true
    jdkState.progress = 0
    jdkState.text = message
    appendJdkLog(`[JDK] ${message}`)
  },
  onJdkProgress: ({ progress, message }) => {
    jdkState.downloading = progress < 100
    jdkState.progress = progress
    jdkState.text = message
    appendJdkLog(`[JDK] ${message}`)
  },
  onJdkLog: ({ message }) => appendJdkLog(`[JDK] ${message}`),
  onJdkDone: ({ message }) => {
    jdkState.progress = 100
    jdkState.downloading = false
    jdkState.text = message
    appendJdkLog(`[JDK] ${message}`)
    loadResources()
  },
  onJdkError: ({ message }) => {
    jdkState.downloading = false
    appendJdkLog(`[JDK] 错误: ${message}`)
  }
})

onMounted(async () => {
  socket.connect()
  await Promise.all([loadStatus(), loadInfo(), loadLogs(), loadMods(), loadResources()])
})

onBeforeUnmount(() => {
  socket.disconnect()
})
</script>

