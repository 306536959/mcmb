<template>
  <section class="section visible">
    <div class="card">
      <div class="card-header">
        <div class="card-title">服务器控制</div>
        <div class="card-actions" style="display: flex; gap: 8px; align-items: center">
          <span class="badge" :style="{ background: gradient }">
            Minecraft版本: {{ mcVersion || '未知' }}
          </span>
          <button class="btn primary" type="button" :disabled="disableStart" @click="$emit('start')">
            启动
          </button>
          <button class="btn ghost danger" type="button" :disabled="disableStop" @click="$emit('stop')">
            关闭
          </button>
        </div>
      </div>
      <div class="card-body">
        <div class="command">
          <input
            v-model="command"
            :disabled="commandDisabled"
            type="text"
            placeholder="输入命令并回车，例如：list 或 say 你好"
            @keydown.enter.prevent="emitCommand"
          />
          <button class="btn" type="button" :disabled="commandDisabled" @click="emitCommand">
            发送
          </button>
        </div>
        <LogViewer :logs="logs" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ServerStatus } from '@/types/panel'
import { computed, ref } from 'vue'
import LogViewer from './LogViewer.vue'

const props = defineProps<{
  status: ServerStatus
  logs: string[]
  mcVersion: string
}>()

const emit = defineEmits<{
  start: []
  stop: []
  'send-command': [command: string]
}>()

const command = ref('')
const gradient = 'linear-gradient(135deg, #76c893, #168aad)'

const commandDisabled = computed(() => !props.status.running)
const disableStart = computed(() => props.status.running || props.status.starting)
const disableStop = computed(() => !props.status.running && !props.status.starting)

function emitCommand() {
  if (!command.value.trim()) return
  emit('send-command', command.value.trim())
  command.value = ''
}
</script>

