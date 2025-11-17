<template>
  <div class="resource-section">
    <h3>{{ title }}</h3>
    <div v-if="!items.length" class="resource-empty">{{ emptyText }}</div>
    <table v-else class="resource-table">
      <thead>
        <tr>
          <th>文件</th>
          <th>大小</th>
          <th>修改时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in sortedItems" :key="item.name">
          <td>
            <div class="resource-file">
              <span class="file-icon">{{ item.isDirectory ? '📁' : '📄' }}</span>
              <div class="file-details">
                <div class="file-name">{{ item.name }}</div>
                <div class="file-meta">
                  <span class="type-badge" :class="item.isDirectory ? 'dir' : 'file'">
                    {{ item.isDirectory ? '文件夹' : '文件' }}
                  </span>
                </div>
              </div>
            </div>
          </td>
          <td>{{ item.isDirectory ? '-' : formatSize(item.size) }}</td>
          <td>{{ formatDate(item.mtime) }}</td>
        </tr>
      </tbody>
    </table>
    <div v-if="dirPath" class="resource-path">
      所在目录：<code>{{ dirPath }}</code>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ResourceEntry } from '@/types/panel'
import { computed } from 'vue'

const props = defineProps<{
  title: string
  items: ResourceEntry[]
  emptyText: string
  dirPath?: string
}>()

const sortedItems = computed(() =>
  [...props.items].sort((a, b) => +new Date(b.mtime) - +new Date(a.mtime))
)

function formatSize(size: number) {
  if (size === 0) return '-'
  const mb = size / 1024 / 1024
  return `${mb.toFixed(2)} MB`
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}
</script>

