import type { ModEntry, PanelInfo, ResourceEntry, ServerStatus } from '@/types/panel'

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  if (!res.ok) {
    throw new Error(await res.text())
  }
  return res.json()
}

export function fetchStatus() {
  return request<ServerStatus>('/api/status')
}

export function startServer() {
  return request<{ ok: boolean; message: string }>('/api/start', { method: 'POST' })
}

export function stopServer() {
  return request<{ ok: boolean; message: string }>('/api/stop', { method: 'POST' })
}

export function sendCommand(command: string) {
  return request<{ ok: boolean; message: string }>('/api/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command })
  })
}

export function fetchInfo() {
  return request<PanelInfo>('/api/info')
}

export function fetchLogs() {
  return request<{ lines: string[] }>('/api/logs')
}

export function fetchMods() {
  return request<{ ok: boolean; mods: ModEntry[] }>('/api/mods')
}

export function deleteMod(name: string) {
  return request<{ ok: boolean; message: string }>(`/api/mods/${encodeURIComponent(name)}`, {
    method: 'DELETE'
  })
}

export function fetchJdks() {
  return request<{ ok: boolean; jdks: ResourceEntry[]; jdksDir: string }>('/api/mcdata/jdks')
}

export function fetchForgers() {
  return request<{ ok: boolean; forgers: ResourceEntry[]; forgersDir: string }>(
    '/api/mcdata/forgers'
  )
}

export function requestJdkInstall(version: string) {
  return request<{ ok: boolean; message: string }>('/api/jdk/install', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version })
  })
}

