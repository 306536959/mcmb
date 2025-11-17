import { io, type Socket } from 'socket.io-client'

type Handlers = {
  onLog?: (line: string) => void
  onBootstrap?: (lines: string[]) => void
  onJdkStart?: (payload: { version: string; message: string }) => void
  onJdkProgress?: (payload: { version: string; progress: number; message: string }) => void
  onJdkLog?: (payload: { version: string; message: string }) => void
  onJdkDone?: (payload: { version: string; message: string }) => void
  onJdkError?: (payload: { version: string; message: string }) => void
}

export function usePanelSocket(handlers: Handlers) {
  let socket: Socket | null = null

  function connect() {
    socket = io({ path: '/socket.io' })
    socket.on('connect', () => handlers.onLog?.('[panel] 已连接日志通道'))
    socket.on('disconnect', () => handlers.onLog?.('[panel] 日志通道断开'))
    socket.on('bootstrap', (data: { lines: string[] }) => {
      if (Array.isArray(data?.lines)) {
        handlers.onBootstrap?.(data.lines)
      }
    })
    socket.on('log', (line: string) => handlers.onLog?.(line))
    socket.on('jdk_download_start', (payload) => handlers.onJdkStart?.(payload))
    socket.on('jdk_download_progress', (payload) => handlers.onJdkProgress?.(payload))
    socket.on('jdk_download_log', (payload) => handlers.onJdkLog?.(payload))
    socket.on('jdk_download_complete', (payload) => handlers.onJdkDone?.(payload))
    socket.on('jdk_download_error', (payload) => handlers.onJdkError?.(payload))
  }

  function disconnect() {
    socket?.disconnect()
    socket = null
  }

  return { connect, disconnect }
}

