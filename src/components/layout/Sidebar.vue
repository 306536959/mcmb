<template>
  <aside class="sidebar">
    <div class="brand">
      <div class="logo">☘️</div>
      <div class="brand-text">
        <strong>MC 面板</strong>
        <small class="muted">服务器控制</small>
      </div>
    </div>
    <nav class="nav">
      <button
        v-for="item in items"
        :key="item.key"
        class="nav-item"
        :class="{ active: modelValue === item.key }"
        type="button"
        @click="$emit('update:modelValue', item.key)"
      >
        <span class="icon">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </button>
    </nav>
    <footer class="sidebar-footer" style="margin-top: auto">
      <span class="badge muted">本机面板</span>
    </footer>
  </aside>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: 'console' | 'players' | 'settings'
}>()

defineEmits<{
  'update:modelValue': [value: 'console' | 'players' | 'settings']
}>()

const items = [
  { key: 'console', label: '控制台', icon: '🖥️' },
  { key: 'players', label: '在线玩家', icon: '👥' },
  { key: 'settings', label: '设置', icon: '⚙️' }
] as const
</script>

