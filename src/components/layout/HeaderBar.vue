<template>
  <header class="header toolbar">
    <div class="title-wrap">
      <h1>{{ title }}</h1>
      <div class="sub muted">{{ subtitle }}</div>
    </div>
    <div class="status">
      <span :class="['badge', 'glow']" :style="{ color: statusColor }">
        {{ statusText }}
      </span>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { ServerStatus } from '@/types/panel'
import { computed } from 'vue'

const props = defineProps<{
  title: string
  subtitle: string
  status: ServerStatus
}>()

const statusColor = computed(() => {
  if (props.status.starting) return '#f0c36a'
  if (props.status.running) return '#35c36b'
  return '#9aa6b2'
})

const statusText = computed(() => {
  if (props.status.starting) return '启动中...'
  if (props.status.running) return '运行中'
  return '未运行'
})
</script>

