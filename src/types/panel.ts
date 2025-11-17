export type ServerStatus = {
  running: boolean
  starting: boolean
}

export type PanelInfo = {
  javaPath: string
  javaVersion: string
  serverDir: string
  serverJarPath: string
  jarName: string
  jarFullPath: string
  mcVersion: string
}

export type ModEntry = {
  name: string
  size: number
  mtime: string
}

export type ResourceEntry = {
  name: string
  isDirectory: boolean
  size: number
  mtime: string
}

export type ApiResponse<T> = {
  ok: boolean
  message?: string
} & T

