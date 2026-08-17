// 媒体文件工具：文件名/MIME 处理、类型校验、唯一路径生成，以及从配置中收集引用的“裸文件名”。

import { existsSync } from 'node:fs'
import { join } from 'node:path'

/** 取路径最后一段（兼容 / 与 \ 分隔符），空结果兜底为 'file'。 */
export function basename(p: string): string {
  const s = String(p).split(/[\\/]/)
  return s[s.length - 1] || 'file'
}

/** 取文件扩展名（小写），无扩展名返回空串。 */
function extOf(name: string): string {
  const m = /\.([a-zA-Z0-9]+)$/.exec(name)
  return m ? m[1].toLowerCase() : ''
}

/** 按扩展名映射 HTTP Content-Type，未知类型回退为通用二进制流。 */
export function mimeOf(name: string): string {
  const map: Record<string, string> = {
    mp4: 'video/mp4', webm: 'video/webm', ogg: 'video/ogg', mov: 'video/quicktime', m4v: 'video/mp4',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
    svg: 'image/svg+xml', avif: 'image/avif', bmp: 'image/bmp', mp3: 'audio/mpeg',
  }
  return map[extOf(name)] || 'application/octet-stream'
}

/** 让名称成为安全的磁盘文件名 / 媒体路由键，同时保留 Unicode（中文、英文、emoji 等）。 */
export function sanitizeName(name: string): string {
  const base = basename(String(name))
  const cleaned = base
    // 去掉控制字符。
    .replace(/[\u0000-\u001f\u007f]/g, '')
    // 替换路径分隔符与常见文件系统非法字符。
    .replace(/[\\/:*?"<>|]/g, '_')
    // 避免产生隐藏名 / 点 / 点点 / 空名（Windows 还会去掉结尾的点与空格）。
    .replace(/^[. ]+/, '')
    .replace(/[. ]+$/, '')
  return cleaned || 'media'
}

/** 支持的图片扩展名集合。 */
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'svg'])
/** 支持的视频扩展名集合。 */
const VIDEO_EXTS = new Set(['mp4', 'webm', 'ogg', 'mov', 'm4v'])
/** 上传体积上限（512MB）。 */
export const MAX_UPLOAD_BYTES = 512 * 1024 * 1024

/** 校验文件名扩展名是否属于指定媒体类型（image/video）。 */
export function validExtFor(kind: 'image' | 'video', name: string): boolean {
  return (kind === 'image' ? IMAGE_EXTS : VIDEO_EXTS).has(extOf(name))
}

/** 在 dir 目录下为（已清洗的）name 生成首个不冲突的文件路径。 */
export function uniqueFilePath(dir: string, name: string): string {
  const base = basename(name)
  const ext = extOf(base)
  const stem = ext ? base.slice(0, base.length - ext.length - 1) : base
  let candidate = join(dir, base)
  let i = 1
  while (existsSync(candidate)) {
    candidate = join(dir, ext ? (stem + '-' + i + '.' + ext) : (stem + '-' + i))
    i++
  }
  return candidate
}

/** 本地媒体引用必须是“裸文件名”；URL / 空值 / 含路径分隔符的值一律排除。 */
function bareNameOf(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const s = value.trim()
  if (s === '' || s === '.' || s === '..') return null
  if (/^https?:\/\//i.test(s)) return null
  if (/[/\\]/.test(s)) return null
  return s
}

/** 收集解析后配置引用的“裸文件名”集合，按视频/图片分类，供清理孤立文件使用。 */
export function collectReferencedBareNames(cfg: any): { video: Set<string>; images: Set<string> } {
  const video = new Set<string>()
  const images = new Set<string>()
  // 先取视频路径。
  const vp = cfg && cfg.background && cfg.background.video ? cfg.background.video.path : undefined
  const vn = bareNameOf(vp)
  if (vn !== null) video.add(vn)
  // 再遍历图片路径，逐个收集“裸文件名”。
  const paths = cfg && cfg.background && cfg.background.images && Array.isArray(cfg.background.images.paths) ? cfg.background.images.paths : []
  for (const p of paths) {
    const n = bareNameOf(p)
    if (n !== null) images.add(n)
  }
  return { video, images }
}
