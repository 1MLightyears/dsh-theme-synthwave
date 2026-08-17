// 宿主系统交互工具：解析 profile 目录、用操作系统默认程序打开文件。

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/** 从 Cordis 的 baseUrl（指向 profile 配置目录的 file URL）解析出 profile 目录路径。 */
export function profileDirFromBaseUrl(baseUrl: unknown): string | null {
  if (typeof baseUrl !== 'string' || baseUrl === '') return null
  try {
    // Windows 盘符 / POSIX 绝对路径 / UNC 路径直接使用。
    if (/^[a-zA-Z]:[\\/]/.test(baseUrl) || baseUrl.startsWith('/') || baseUrl.startsWith('\\\\')) return baseUrl
    return fileURLToPath(baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl)
  } catch { /* 不是 file URL，忽略 */ }
  return null
}

/** 用操作系统默认程序打开文件；没有可用的打开器时 resolve(false)。 */
export function openPath(file: string): Promise<boolean> {
  const platform = process.platform
  const command = platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open'
  const args = platform === 'win32' ? ['/c', 'start', '', file] : [file]
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'ignore' })
    child.once('error', () => resolve(false))
    child.once('exit', (code) => resolve(code === 0))
  })
}
