<template>
  <div class="card">
    <div class="card-header">
      <div class="card-title">模组(Mod)管理</div>
      <span class="badge muted">{{ mods.length }} 个模组</span>
    </div>
    <div class="card-body">
      <div class="upload-area">
        <p>📁 点击或拖拽上传 Mod 文件 (.jar)</p>
        <p class="muted">注意：上传功能暂未实现</p>
      </div>
      <div v-if="!mods.length" class="resource-empty">暂无模组，服务器启动后会自动生成 mods 文件夹</div>
      <table v-else class="mods-table">
        <thead>
          <tr>
            <th>模组名称</th>
            <th>大小</th>
            <th>修改时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="mod in mods" :key="mod.name">
            <td>{{ mod.name }}</td>
            <td>{{ formatSize(mod.size) }}</td>
            <td>{{ formatDate(mod.mtime) }}</td>
            <td>
              <button class="btn ghost danger" type="button" @click="$emit('delete', mod.name)">
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ModEntry } from '@/types/panel'

defineProps<{
  mods: ModEntry[]
}>()

defineEmits<{
  delete: [name: string]
}>()

function formatSize(size: number) {
  const mb = size / 1024 / 1024
  return `${mb.toFixed(2)} MB`
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}
</script>

