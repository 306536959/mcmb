<template>
  <section class="section visible">
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">服务器信息</div>
          <p class="muted">管理你的 Minecraft 服务器配置与资源</p>
        </div>
        <button class="btn ghost" type="button" @click="$emit('refresh-info')">刷新信息</button>
      </div>
      <div class="card-body">
        <div class="grid two" style="display: grid; gap: 16px">
          <div class="kv">
            <div class="k">Java 路径</div>
            <div class="v">{{ info?.javaPath || '未知' }}</div>
          </div>
          <div class="kv">
            <div class="k">Java 版本</div>
            <div class="v">{{ info?.javaVersion || '未知' }}</div>
          </div>
          <div class="kv">
            <div class="k">服务器目录</div>
            <div class="v">{{ info?.serverDir }}</div>
          </div>
          <div class="kv">
            <div class="k">JAR 文件</div>
            <div class="v">{{ info?.serverJarPath }}</div>
          </div>
        </div>
      </div>
    </div>

    <JdkManager
      :java-version="info?.javaVersion ?? ''"
      :java-path="info?.javaPath ?? ''"
      :progress="jdkProgress"
      :progress-text="jdkProgressText"
      :log-lines="jdkLogs"
      :downloading="jdkDownloading"
      @download="$emit('download-jdk', $event)"
    />

    <ModsTable :mods="mods" @delete="$emit('delete-mod', $event)" />

    <div class="card">
      <div class="card-header">
        <div class="card-title">资源管理</div>
        <div class="card-actions">
          <button class="btn ghost" type="button" @click="$emit('refresh-resources')">
            刷新
          </button>
        </div>
      </div>
      <div class="card-body">
        <ResourceList
          title="JDK 文件列表"
          :items="jdks"
          empty-text="暂无 JDK 文件"
          :dir-path="jdksDir"
        />
        <ResourceList
          title="Forge 文件列表"
          :items="forgers"
          empty-text="暂无 Forge 文件"
          :dir-path="forgersDir"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ModEntry, PanelInfo, ResourceEntry } from '@/types/panel'
import JdkManager from './JdkManager.vue'
import ModsTable from './ModsTable.vue'
import ResourceList from './ResourceList.vue'

defineProps<{
  info: PanelInfo | null
  mods: ModEntry[]
  jdks: ResourceEntry[]
  forgers: ResourceEntry[]
  jdksDir?: string
  forgersDir?: string
  jdkProgress: number
  jdkProgressText: string
  jdkLogs: string[]
  jdkDownloading: boolean
}>()

defineEmits<{
  'refresh-info': []
  'download-jdk': [version: string]
  'delete-mod': [name: string]
  'refresh-resources': []
}>()
</script>

