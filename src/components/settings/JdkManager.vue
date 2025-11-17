<template>
  <div class="card">
    <div class="card-header">
      <div>
        <div class="card-title">JDK 管理（Linux）</div>
        <div class="muted">当前 JAVA 版本：{{ javaVersion || '未知' }}</div>
      </div>
      <span class="badge muted" v-if="javaPath">{{ javaPath }}</span>
    </div>
    <div class="card-body">
      <div class="command" style="margin-bottom: 12px">
        <select v-model="selected" class="btn" style="min-width: 140px">
          <option v-for="item in versions" :key="item" :value="item">
            JDK {{ item }}
          </option>
        </select>
        <span class="badge success" style="margin: 0 10px">下载到 mcdata/jdks</span>
        <button class="btn primary" type="button" :disabled="downloading" @click="download">
          {{ downloading ? '下载中...' : '下载JDK' }}
        </button>
      </div>

      <div v-if="progressVisible" class="progress-container">
        <div class="progress-header">
          <span>下载进度：</span>
          <span>{{ progressText }}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>
      </div>

      <div v-if="logLines.length" class="logs" style="max-height: 150px; margin-top: 12px">
        <pre>{{ logLines.join('\n') }}</pre>
      </div>

      <p class="muted">
        在 Linux 环境下将自动下载所选 JDK 到 <code>mcdata/jdks</code> 目录中的
        <code>jdk-版本</code> 文件夹。
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  javaVersion: string
  javaPath: string
  progress: number
  progressText: string
  logLines: string[]
  downloading: boolean
}>()

const emit = defineEmits<{
  download: [version: string]
}>()

const versions = ['17', '21', '11', '8']
const selected = ref('17')

const progressVisible = computed(() => props.downloading || props.progress > 0)
const progress = computed(() => props.progress)

function download() {
  emit('download', selected.value)
}
</script>

