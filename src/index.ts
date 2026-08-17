/**
 * Host half of dsh-theme-synthwave: ensures `config.dsh-theme-synthwave.jsonc`
 * exists in the current profile directory, then serves
 *   - /synthwave-theme-media/*   image/video bytes (fs.readBytes, direct source)
 *   - /synthwave-theme-config    resolved JSON consumed by the browser half
 *   - /synthwave-theme-config/open  opens the current profile config file
 */


import { existsSync } from 'node:fs'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

function stripJsoncComments(text: string): string {
  let out = ''
  let inString = false
  let inLine = false
  let inBlock = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const n = text[i + 1]
    if (inLine) { if (c === '\n') { inLine = false; out += c } continue }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; i++ } continue }
    if (inString) {
      out += c
      if (c === '\\' && n !== undefined) { out += n; i++; continue }
      if (c === '"') inString = false
      continue
    }
    if (c === '"') { inString = true; out += c; continue }
    if (c === '/' && n === '/') { inLine = true; i++; continue }
    if (c === '/' && n === '*') { inBlock = true; i++; continue }
    out += c
  }
  return out.replace(/,\s*([}\]])/g, '$1')
}

function parseJsonc(text: string): any {
  return JSON.parse(stripJsoncComments(text))
}

function basename(p: string): string {
  const s = String(p).split(/[\\/]/)
  return s[s.length - 1] || 'file'
}

function extOf(name: string): string {
  const m = /\.([a-zA-Z0-9]+)$/.exec(name)
  return m ? m[1].toLowerCase() : ''
}

function mimeOf(name: string): string {
  const map: Record<string, string> = {
    mp4: 'video/mp4', webm: 'video/webm', ogg: 'video/ogg', mov: 'video/quicktime', m4v: 'video/mp4',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
    svg: 'image/svg+xml', avif: 'image/avif', bmp: 'image/bmp', mp3: 'audio/mpeg',
  }
  return map[extOf(name)] || 'application/octet-stream'
}

/** Make a name safe for a disk filename / media-route key while preserving Unicode (中文、英文、emoji 等). */
function sanitizeName(name: string): string {
  const base = basename(String(name))
  const cleaned = base
    // Strip control characters entirely.
    .replace(/[\u0000-\u001f\u007f]/g, '')
    // Replace path separators and characters illegal on common filesystems.
    .replace(/[\\/:*?"<>|]/g, '_')
    // Never yield a hidden / dot / dot-dot / empty name (Windows also strips trailing dots/spaces).
    .replace(/^[. ]+/, '')
    .replace(/[. ]+$/, '')
  return cleaned || 'media'
}

/** Package root (one level above lib/) and the shipped example config path. */
const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const EXAMPLE_CONFIG_PATH = join(PACKAGE_ROOT, 'config.dsh-theme-synthwave.example.jsonc')

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'svg'])
const VIDEO_EXTS = new Set(['mp4', 'webm', 'ogg', 'mov', 'm4v'])
const MAX_UPLOAD_BYTES = 512 * 1024 * 1024

function validExtFor(kind: 'image' | 'video', name: string): boolean {
  return (kind === 'image' ? IMAGE_EXTS : VIDEO_EXTS).has(extOf(name))
}

/** Stream a request body into one buffer, capped at `maxBytes`; null means exceeded/error. */
async function readBody(req: any, maxBytes: number): Promise<Buffer | null> {
  const chunks: Buffer[] = []
  let total = 0
  try {
    for await (const chunk of req as AsyncIterable<Buffer | string>) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
      total += buf.length
      if (total > maxBytes) return null
      chunks.push(buf)
    }
  } catch { return null }
  return Buffer.concat(chunks)
}

async function readJsonBody(req: any): Promise<any | null> {
  const buf = await readBody(req, 1024 * 1024)
  if (buf === null) return null
  try { return JSON.parse(buf.toString('utf8')) } catch { return null }
}

/** First non-colliding file path inside `dir` for the given (already sanitized) name. */
function uniqueFilePath(dir: string, name: string): string {
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

/** Advance `i` past whitespace and JSONC comments. */
function skipTrivia(text: string, i: number): number {
  while (i < text.length) {
    const c = text[i]
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue }
    if (c === '/' && text[i + 1] === '/') { i += 2; while (i < text.length && text[i] !== '\n') i++; continue }
    if (c === '/' && text[i + 1] === '*') { const e = text.indexOf('*/', i + 2); if (e < 0) return text.length; i = e + 2; continue }
    break
  }
  return i
}

/** Locate the `{ ... }` span of the property `blockKey` (first double-quoted match). */
function findBlockSpan(text: string, blockKey: string): { start: number; end: number } | null {
  const keyRe = new RegExp('"' + blockKey + '"\\s*:', 'g')
  let m
  while ((m = keyRe.exec(text)) !== null) {
    const i = skipTrivia(text, keyRe.lastIndex)
    if (text[i] !== '{') continue
    let j = i + 1
    let depth = 1
    let inStr = false
    let strCh = ''
    while (j < text.length && depth > 0) {
      const c = text[j]
      if (inStr) {
        if (c === '\\') { j += 2; continue }
        if (c === strCh) inStr = false
        j++
        continue
      }
      if (c === '"' || c === "'") { inStr = true; strCh = c; j++; continue }
      if (c === '{') depth++
      else if (c === '}') depth--
      j++
    }
    return { start: i, end: j }
  }
  return null
}

/** Locate a string/array value span for property `propKey` within `text`. */
function findPropValue(text: string, propKey: string): { start: number; end: number; raw: string; kind: 'string' | 'array' } | null {
  const keyRe = new RegExp('"' + propKey + '"\\s*:', 'g')
  let m
  while ((m = keyRe.exec(text)) !== null) {
    const i = skipTrivia(text, keyRe.lastIndex)
    const ch = text[i]
    if (ch === '"' || ch === "'") {
      let j = i + 1
      while (j < text.length) {
        const c = text[j]
        if (c === '\\') { j += 2; continue }
        if (c === ch) { j++; break }
        j++
      }
      return { start: i, end: j, raw: text.slice(i, j), kind: 'string' }
    }
    if (ch === '[') {
      let j = i + 1
      let depth = 1
      let inStr = false
      let strCh = ''
      while (j < text.length && depth > 0) {
        const c = text[j]
        if (inStr) { if (c === '\\') { j += 2; continue } if (c === strCh) inStr = false; j++; continue }
        if (c === '"' || c === "'") { inStr = true; strCh = c; j++; continue }
        if (c === '[') depth++
        else if (c === ']') depth--
        j++
      }
      return { start: i, end: j, raw: text.slice(i, j), kind: 'array' }
    }
  }
  return null
}

/** Replace a string property value inside `blockKey`'s object, preserving comments. */
function setStringProp(raw: string, blockKey: string, propKey: string, value: string): string | null {
  const block = findBlockSpan(raw, blockKey)
  if (block === null) return null
  const prop = findPropValue(raw.slice(block.start, block.end), propKey)
  if (prop === null || prop.kind !== 'string') return null
  const start = block.start + prop.start
  const end = block.start + prop.end
  return raw.slice(0, start) + JSON.stringify(value) + raw.slice(end)
}

/** Append a value to an array property inside `blockKey`'s object, preserving comments. */
function appendArrayProp(raw: string, blockKey: string, propKey: string, value: string): string | null {
  const block = findBlockSpan(raw, blockKey)
  if (block === null) return null
  const prop = findPropValue(raw.slice(block.start, block.end), propKey)
  if (prop === null || prop.kind !== 'array') return null
  const inner = prop.raw.slice(1, -1).trim()
  const arrText = inner ? '[' + inner + ', ' + JSON.stringify(value) + ']' : '[' + JSON.stringify(value) + ']'
  const start = block.start + prop.start
  const end = block.start + prop.end
  return raw.slice(0, start) + arrText + raw.slice(end)
}

/** Edit the config: set video.path or append to images.paths, targeted-first, parse-fallback. */
function applyConfigEdit(raw: string, kind: 'video' | 'image', value: string): string {
  if (kind === 'video') {
    const edited = setStringProp(raw, 'video', 'path', value)
    if (edited !== null) return edited
  } else {
    const edited = appendArrayProp(raw, 'images', 'paths', value)
    if (edited !== null) return edited
  }
  // Fallback: rewrite via parse (comments are lost, values are preserved).
  const obj = parseJsonc(raw)
  const bg = obj.background || (obj.background = {})
  if (kind === 'video') {
    const video = bg.video || (bg.video = {})
    video.path = value
  } else {
    const images = bg.images || (bg.images = {})
    const paths = Array.isArray(images.paths) ? images.paths.slice() : []
    if (paths.indexOf(value) === -1) paths.push(value)
    images.paths = paths
  }
  return JSON.stringify(obj, null, 2) + '\n'
}

/** A local media reference must be a bare filename; URLs / empty / paths are excluded. */
function bareNameOf(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const s = value.trim()
  if (s === '' || s === '.' || s === '..') return null
  if (/^https?:\/\//i.test(s)) return null
  if (/[/\\]/.test(s)) return null
  return s
}

/** Collect the set of bare filenames referenced by a parsed config, split by kind. */
function collectReferencedBareNames(cfg: any): { video: Set<string>; images: Set<string> } {
  const video = new Set<string>()
  const images = new Set<string>()
  const vp = cfg && cfg.background && cfg.background.video ? cfg.background.video.path : undefined
  const vn = bareNameOf(vp)
  if (vn !== null) video.add(vn)
  const paths = cfg && cfg.background && cfg.background.images && Array.isArray(cfg.background.images.paths) ? cfg.background.images.paths : []
  for (const p of paths) {
    const n = bareNameOf(p)
    if (n !== null) images.add(n)
  }
  return { video, images }
}

const CONFIG_FILENAME = 'config.dsh-theme-synthwave.jsonc'

/** Default JSONC written to a new profile config file. */
const DEFAULT_CONFIG_JSONC = `{
  // dsh-theme-synthwave 配置。
  // background.video.path / background.images.paths 填“裸文件名”或 http(s) URL。
  // 裸文件名解析到 <profile>/dsh-theme-synthwave/video/ 与
  // <profile>/dsh-theme-synthwave/images/（当前 profile 目录，通常为
  // $DSH_HOME/profiles/<profile>/）。不支持本地绝对路径；URL 直接使用、不复制。
  "textGlow": {
    "enabled": true,
    "alpha": 0.6,
    "hoverAlpha": 0.85,
    "blurEm": 0.30,
    "colors": ["#ff2a6d"],
    "hoverColors": ["#05d9e8"],
    "suppressHoverFill": true
  },
  "fontScale": 1.06,
  "background": {
    "baseAlpha": 0.5,
    "blur": 2,
    "defaultEffect": 1,
    "video": {
      "path": "",
      "loop": true,
      "muted": true,
      "objectFit": "cover"
    },
    "images": {
      "paths": [],
      "alpha": 0.85,
      "intervalMs": 8000,
      "order": "sequential"
    }
  }
}
`



/** Resolve the profile directory from a Cordis `baseUrl` (a file URL to the profile config directory). */
function profileDirFromBaseUrl(baseUrl: unknown): string | null {
  if (typeof baseUrl !== 'string' || baseUrl === '') return null
  try {
    if (/^[a-zA-Z]:[\\/]/.test(baseUrl) || baseUrl.startsWith('/') || baseUrl.startsWith('\\\\')) return baseUrl
    return fileURLToPath(baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl)
  } catch { /* not a file URL */ }
  return null
}

/** Open a file with the OS default handler; resolves false when no opener exists. */
function openPath(file: string): Promise<boolean> {
  const platform = process.platform
  const command = platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open'
  const args = platform === 'win32' ? ['/c', 'start', '', file] : [file]
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'ignore' })
    child.once('error', () => resolve(false))
    child.once('exit', (code) => resolve(code === 0))
  })
}





const DEFAULTS = {
  textGlow: {
    enabled: true, alpha: 0.6, hoverAlpha: 0.85, blurEm: 0.30,
    colors: ['#ff2a6d'], hoverColors: ['#05d9e8'], suppressHoverFill: true,
  },
  background: {
    baseAlpha: 0.5, blur: 2, defaultEffect: 1,
    video: { path: '', loop: true, muted: true, objectFit: 'cover' },
    images: { paths: [], alpha: 0.85, intervalMs: 8000, order: 'sequential' },
  },
  fontScale: 1.06,
}

export function apply(ctx: any): void {
  ctx.inject(['webServer', 'fs'], (c: any) => {
    const fs = c.fs
    const webServer = c.webServer

      const profileDir = profileDirFromBaseUrl(c.root?.baseUrl ?? ctx.root?.baseUrl ?? c.baseUrl ?? ctx.baseUrl)
      const configPath = profileDir ? join(profileDir, CONFIG_FILENAME) : null

    const nameToTarget = new Map<string, any>()
    const MEDIA_ROOT = profileDir ? join(profileDir, 'dsh-theme-synthwave') : null
    const KIND_DIR: Record<'video' | 'image', string> = { video: 'video', image: 'images' }

    function mediaDirOf(kind: 'video' | 'image'): string | null {
      return MEDIA_ROOT ? join(MEDIA_ROOT, KIND_DIR[kind]) : null
    }

    async function resolveExisting(path: string, cwdOpts: any): Promise<any> {
      try {
        const t = await fs.resolve(String(path), cwdOpts)
        if (await fs.stat(t)) return t
      } catch (e) { /* ignore */ }
      return null
    }

      async function ensureConfigFile(): Promise<string | null> {
        if (configPath === null) return null
        const example = DEFAULT_CONFIG_JSONC
        try {
            await mkdir(dirname(configPath), { recursive: true })
          // Exclusive create: an existing user config is never overwritten.
          await writeFile(configPath, example, { flag: 'wx' })
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== 'EEXIST') {
            console.error('dsh-theme-synthwave: config create failed:', (e as Error)?.message)
          }
        }
        return configPath
      }


    async function readConfig(): Promise<any> {
      let cfg = DEFAULTS
      try {
        const file = await ensureConfigFile()
        if (file !== null) {
          const parsed = parseJsonc(await readFile(file, 'utf8'))
          cfg = {
            ...DEFAULTS, ...parsed,
            textGlow: { ...DEFAULTS.textGlow, ...(parsed.textGlow || {}) },
            background: {
              ...DEFAULTS.background, ...(parsed.background || {}),
              video: { ...DEFAULTS.background.video, ...((parsed.background && parsed.background.video) || {}) },
              images: { ...DEFAULTS.background.images, ...((parsed.background && parsed.background.images) || {}) },
            },
          }
        }
      } catch (e) {
        console.error('dsh-theme-synthwave: config read failed:', (e as Error)?.message)
      }
      return cfg
    }

    /** Resolve one media reference for a kind: URL as-is, bare name against the kind dir. */
    async function resolveMedia(kind: 'video' | 'image', p: string): Promise<any> {
      const s = String(p).trim()
      if (/^https?:\/\//i.test(s)) return s
      const dir = mediaDirOf(kind)
      if (!dir) return null
      return resolveExisting(s, { cwd: dir })
    }

    async function registerMedia(cfg: any): Promise<{ video: any; images: string[] }> {
      nameToTarget.clear()
      const resolveOne = async (kind: 'video' | 'image', p: string): Promise<string | null> => {
        const t = await resolveMedia(kind, p)
        if (t === null) return null
        if (typeof t === 'string') return t
        const name = sanitizeName(basename(fs.processPath(t)))
        const seg = KIND_DIR[kind]
        nameToTarget.set(seg + ':' + name, t)
        return '/synthwave-theme-media/' + seg + '/' + encodeURIComponent(name)
      }

      let video: any = null
      const vpath = cfg.background.video.path
      if (vpath) {
        const url = await resolveOne('video', vpath)
        if (url) {
          video = {
            url,
            loop: cfg.background.video.loop !== false,
            muted: cfg.background.video.muted !== false,
            objectFit: cfg.background.video.objectFit || 'cover',
          }
        }
      }

      const images: string[] = []
      for (const p of (cfg.background.images.paths || [])) {
        const url = await resolveOne('image', p)
        if (url) images.push(url)
      }

      return { video, images }
    }

    async function buildMediaConfig(): Promise<any> {
      const cfg = await readConfig()
      const { video, images } = await registerMedia(cfg)
      return {
          configPath,
        textGlow: cfg.textGlow,
        background: {
          video,
          images,
          imagesAlpha: typeof cfg.background.images.alpha === 'number' ? cfg.background.images.alpha : 0.85,
          slideshow: {
            intervalMs: cfg.background.images.intervalMs || 8000,
            order: cfg.background.images.order === 'random' ? 'random' : 'sequential',
          },
          baseAlpha: typeof cfg.background.baseAlpha === 'number' ? cfg.background.baseAlpha : 0.5,
          blur: typeof cfg.background.blur === 'number' ? cfg.background.blur : 2,
          defaultEffect: typeof cfg.background.defaultEffect === 'number' ? cfg.background.defaultEffect : 1,
        },
        fontScale: typeof cfg.fontScale === 'number' ? cfg.fontScale : 1.06,
      }
    }

    /** Delete media files that dropped out of the config's bare-name references (Option A cleanup). */
    async function reconcileMedia(oldRaw: string, newRaw: string): Promise<void> {
      if (!profileDir) return
      let before: any = null
      let after: any = null
      try { before = collectReferencedBareNames(parseJsonc(oldRaw)) } catch { before = null }
      try { after = collectReferencedBareNames(parseJsonc(newRaw)) } catch { after = null }
      if (before === null || after === null) return
      for (const kind of ['video', 'images'] as const) {
        const dir = join(profileDir, 'dsh-theme-synthwave', kind)
        const otherKind = kind === 'video' ? 'images' : 'video'
        for (const name of before[kind]) {
          if (after[kind].has(name) || after[otherKind].has(name)) continue
          try { await unlink(join(dir, name)) } catch { /* ignore */ }
        }
      }
    }

    const unregisterMedia = webServer.register({
      kind: 'prefix',
      path: '/synthwave-theme-media',
      handler: async (req: any, res: any) => {
        try {
          const raw = String(req.url || '').split('?')[0]
          const rest = raw.slice('/synthwave-theme-media/'.length)
          const slash = rest.indexOf('/')
          const seg = slash === -1 ? rest : rest.slice(0, slash)
          const name = decodeURIComponent(slash === -1 ? '' : rest.slice(slash + 1))
          const target = nameToTarget.get(seg + ':' + name)
          if (!target) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found'); return }
          // Conditional cache: revalidate by ETag (fs version = dev:ino:size:mtimeNs:ctimeNs),
          // so unchanged media answers 304 instead of re-downloading (important for large files).
          const info = await fs.stat(target)
          const etag = info ? '"' + String(info.version) + '"' : null
          const inm = req.headers && req.headers['if-none-match']
          if (etag !== null && typeof inm === 'string' && inm === etag) {
            res.writeHead(304, { ETag: etag, 'Cache-Control': 'no-cache' })
            res.end()
            return
          }
          const bytes = await fs.readBytes(target, undefined, 512 * 1024 * 1024)
          const headers: Record<string, string> = {
            'Content-Type': mimeOf(name),
            'Content-Length': String(bytes.length),
            'Cache-Control': 'no-cache',
          }
          if (etag !== null) headers.ETag = etag
          res.writeHead(200, headers)
          res.end(bytes)
        } catch (e) {
          try { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end(String((e as Error)?.message || e)) } catch (e2) { /* ignore */ }
        }
      },
    })
    c.effect(() => unregisterMedia)

    const unregisterConfig = webServer.register({
      kind: 'prefix',
      path: '/synthwave-theme-config',
      handler: async (_req: any, res: any) => {
        try {
          const cfg = await buildMediaConfig()
          res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
          res.end(JSON.stringify(cfg))
        } catch (e) {
          try {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ configPath, textGlow: DEFAULTS.textGlow, background: { video: null, images: [], imagesAlpha: 0.85, slideshow: { intervalMs: 8000, order: 'sequential' }, baseAlpha: 0.5, blur: 2 }, fontScale: 1.06 }))
          } catch (e2) { /* ignore */ }
        }
      },
    })

      const unregisterOpenConfig = webServer.register({
        kind: 'prefix',
        path: '/synthwave-theme-config/open',
        handler: async (_req: any, res: any) => {
          try {
            const file = await ensureConfigFile()
            if (file === null) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: 'profile config path unavailable' }))
              return
            }
            const ok = await openPath(file)
            res.writeHead(ok ? 200 : 500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(ok ? { ok: true, path: file } : { ok: false, error: 'OS opener failed', path: file }))
          } catch (e) {
            try {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: String((e as Error)?.message || e) }))
            } catch (e2) { /* ignore */ }
          }
        },
      })
      c.effect(() => unregisterOpenConfig)

      // ---- config editor / media picker endpoints ----

      const unregisterRawConfig = webServer.register({
        kind: 'prefix',
        path: '/synthwave-theme-config/raw',
        handler: async (_req: any, res: any) => {
          try {
            const file = await ensureConfigFile()
            if (file === null) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: 'profile config path unavailable' }))
              return
            }
            const raw = await readFile(file, 'utf8')
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
            res.end(JSON.stringify({ ok: true, path: file, raw }))
          } catch (e) {
            try { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: false, error: String((e as Error)?.message || e) })) } catch (e2) { /* ignore */ }
          }
        },
      })
      c.effect(() => unregisterRawConfig)

      const unregisterSaveConfig = webServer.register({
        kind: 'prefix',
        path: '/synthwave-theme-config/save',
        handler: async (req: any, res: any) => {
          try {
            const body = await readJsonBody(req)
            if (body === null || typeof body.raw !== 'string') {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: 'invalid body' }))
              return
            }
            try { parseJsonc(body.raw) } catch (e) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: 'JSONC 解析失败：' + String((e as Error)?.message || e) }))
              return
            }
            const file = await ensureConfigFile()
            if (file === null) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: 'profile config path unavailable' }))
              return
            }
            const oldRaw = await readFile(file, 'utf8')
            await writeFile(file, body.raw, 'utf8')
            await reconcileMedia(oldRaw, body.raw)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true, path: file }))
          } catch (e) {
            try { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: false, error: String((e as Error)?.message || e) })) } catch (e2) { /* ignore */ }
          }
        },
      })
      c.effect(() => unregisterSaveConfig)

      const unregisterSetSource = webServer.register({
        kind: 'prefix',
        path: '/synthwave-theme-config/set',
        handler: async (req: any, res: any) => {
          try {
            const body = await readJsonBody(req)
            const kind = body && (body.kind === 'video' || body.kind === 'image') ? body.kind : null
            const value = body && typeof body.value === 'string' ? body.value.trim() : ''
            if (kind === null || value === '') {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: '参数无效：需要 kind（video|image）与非空 value' }))
              return
            }
            const isUrl = /^https?:\/\//i.test(value)
            const isBare = !/[\/\\]/.test(value) && value !== '.' && value !== '..'
            if (!isUrl && !isBare) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: '只接受 http(s) URL 或裸文件名（文件需位于 dsh-theme-synthwave/images 或 video 目录）' }))
              return
            }
            const file = await ensureConfigFile()
            if (file === null) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: 'profile config path unavailable' }))
              return
            }
            const raw = await readFile(file, 'utf8')
            const next = applyConfigEdit(raw, kind, value)
            await writeFile(file, next, 'utf8')
            await reconcileMedia(raw, next)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true, path: file }))
          } catch (e) {
            try { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: false, error: String((e as Error)?.message || e) })) } catch (e2) { /* ignore */ }
          }
        },
      })
      c.effect(() => unregisterSetSource)

      const unregisterOpenExample = webServer.register({
        kind: 'prefix',
        path: '/synthwave-theme-config/open-example',
        handler: async (_req: any, res: any) => {
          try {
            if (!existsSync(EXAMPLE_CONFIG_PATH)) {
              res.writeHead(404, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: '示例配置文件不存在：' + EXAMPLE_CONFIG_PATH }))
              return
            }
            const ok = await openPath(EXAMPLE_CONFIG_PATH)
            res.writeHead(ok ? 200 : 500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(ok ? { ok: true, path: EXAMPLE_CONFIG_PATH } : { ok: false, error: 'OS opener failed', path: EXAMPLE_CONFIG_PATH }))
          } catch (e) {
            try { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: false, error: String((e as Error)?.message || e) })) } catch (e2) { /* ignore */ }
          }
        },
      })
      c.effect(() => unregisterOpenExample)

      const unregisterUpload = webServer.register({
        kind: 'prefix',
        path: '/synthwave-theme-upload',
        handler: async (req: any, res: any) => {
          try {
            const url = new URL(String(req.url || ''), 'http://x')
            const kindParam = url.searchParams.get('kind')
            const kind = kindParam === 'image' ? 'image' : kindParam === 'video' ? 'video' : null
            const name = url.searchParams.get('name') || ''
            if (kind === null || name === '') {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: '参数无效：需要 kind（image|video）与 name' }))
              return
            }
            if (!validExtFor(kind, name)) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: '不支持的文件类型：' + name }))
              return
            }
            const bytes = await readBody(req, MAX_UPLOAD_BYTES)
            if (bytes === null) {
              res.writeHead(413, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: '文件超过 512MB 上限' }))
              return
            }
            const file = await ensureConfigFile()
            if (file === null) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: 'profile config path unavailable' }))
              return
            }
            const dir = mediaDirOf(kind)
            if (dir === null) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: 'profile config path unavailable' }))
              return
            }
            await mkdir(dir, { recursive: true })
            const dest = uniqueFilePath(dir, sanitizeName(name))
            await writeFile(dest, bytes)
            const raw = await readFile(file, 'utf8')
            const next = applyConfigEdit(raw, kind, basename(dest))
            await writeFile(file, next, 'utf8')
            await reconcileMedia(raw, next)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true, path: dest }))
          } catch (e) {
            try { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: false, error: String((e as Error)?.message || e) })) } catch (e2) { /* ignore */ }
          }
        },
      })
      c.effect(() => unregisterUpload)

      // Materialize the profile config as soon as the host plugin loads, so the
      // file exists even before the first browser config request.
      void ensureConfigFile()


    c.effect(() => unregisterConfig)
  })
}
