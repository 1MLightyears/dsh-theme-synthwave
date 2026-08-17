// dsh-theme-synthwave 宿主（Node）端入口：注册 HTTP 路由，负责配置文件的创建/读取/编辑、
// 媒体文件的上传与静态服务，以及“打开配置文件”等系统交互。浏览器端见 src/client/index.ts。

import { existsSync } from 'node:fs'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { parseJsonc, applyConfigEdit } from './jsonc.ts'
import {
  basename,
  collectReferencedBareNames,
  MAX_UPLOAD_BYTES,
  mimeOf,
  sanitizeName,
  uniqueFilePath,
  validExtFor,
} from './media.ts'
import { readBody, readJsonBody } from './http.ts'
import { profileDirFromBaseUrl, openPath } from './system.ts'
import { CONFIG_FILENAME, DEFAULT_CONFIG_JSONC, DEFAULTS, EXAMPLE_CONFIG_PATH } from './config.ts'

/** 宿主端排错日志前缀，便于在宿主进程输出中 grep 本插件。 */
const LOG_PREFIX = '[dsh-theme-synthwave]'

/** 输出一条宿主端排错日志（交互逻辑前调用，方便定位请求卡在哪一步）。 */
function log(message: string): void {
  console.log(LOG_PREFIX + ' ' + message)
}

export function apply(ctx: any): void {
  ctx.inject(['webServer', 'fs'], (c: any) => {
    const fs = c.fs
    const webServer = c.webServer

    // Step 1. 先确认本地文件情况：profile 目录与配置文件路径。
    const profileDir = profileDirFromBaseUrl(c.root?.baseUrl ?? ctx.root?.baseUrl ?? c.baseUrl ?? ctx.baseUrl)
    const configPath = profileDir ? join(profileDir, CONFIG_FILENAME) : null
    log('插件加载，profile 目录：' + (profileDir || '未知'))

    const nameToTarget = new Map<string, any>()
    const MEDIA_ROOT = profileDir ? join(profileDir, 'dsh-theme-synthwave') : null
    const KIND_DIR: Record<'video' | 'image', string> = { video: 'video', image: 'images' }

    /** 返回某媒体类型（video/image）在 profile 下的存储目录。 */
    function mediaDirOf(kind: 'video' | 'image'): string | null {
      return MEDIA_ROOT ? join(MEDIA_ROOT, KIND_DIR[kind]) : null
    }

    /** 尝试把 path 解析为已存在的本地文件；不存在则返回 null。 */
    async function resolveExisting(path: string, cwdOpts: any): Promise<any> {
      try {
        const t = await fs.resolve(String(path), cwdOpts)
        if (await fs.stat(t)) return t
      } catch (e) { /* 文件不存在或解析失败，忽略 */ }
      return null
    }

    /** 确保 profile 配置文件存在：不存在则以示例为模板新建（wx 独占创建，绝不覆盖已有配置）。 */
    async function ensureConfigFile(): Promise<string | null> {
      if (configPath === null) return null
      const example = DEFAULT_CONFIG_JSONC
      try {
        await mkdir(dirname(configPath), { recursive: true })
        // 独占创建：已有用户配置时写入会被拒绝，从而保留用户修改。
        await writeFile(configPath, example, { flag: 'wx' })
        log('已新建配置文件：' + configPath)
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'EEXIST') {
          console.error('dsh-theme-synthwave: config create failed:', (e as Error)?.message)
        }
      }
      return configPath
    }

    /** 读取并合并配置：以 DEFAULTS 为基底，逐层覆盖用户配置。 */
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

    /** 解析单个媒体引用：URL 原样返回，裸文件名解析到对应媒体目录。 */
    async function resolveMedia(kind: 'video' | 'image', p: string): Promise<any> {
      const s = String(p).trim()
      if (/^https?:\/\//i.test(s)) return s
      const dir = mediaDirOf(kind)
      if (!dir) return null
      return resolveExisting(s, { cwd: dir })
    }

    /** 把配置里的媒体引用注册到 nameToTarget，并生成浏览器可访问的 /synthwave-theme-media URL。 */
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

      // 视频：解析 path 字段，成功则组装视频播放配置。
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

      // 图片：由于可能有多张，逐一解析 path 并收集可用 URL。
      const images: string[] = []
      for (const p of (cfg.background.images.paths || [])) {
        const url = await resolveOne('image', p)
        if (url) images.push(url)
      }

      return { video, images }
    }

    /** 组装浏览器端 /synthwave-theme-config 返回的完整配置。 */
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

    /** 删除从配置“裸文件名”引用中消失的媒体文件（Option A 清理策略）。 */
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
          try { await unlink(join(dir, name)) } catch { /* 文件可能已不存在，忽略 */ }
        }
      }
    }

    // Step 2. 注册静态媒体服务：按 seg:name 路由返回图片/视频字节。
    const unregisterMedia = webServer.register({
      kind: 'prefix',
      path: '/synthwave-theme-media',
      handler: async (req: any, res: any) => {
        log('媒体请求：' + req.url)
        try {
          const raw = String(req.url || '').split('?')[0]
          const rest = raw.slice('/synthwave-theme-media/'.length)
          const slash = rest.indexOf('/')
          const seg = slash === -1 ? rest : rest.slice(0, slash)
          const name = decodeURIComponent(slash === -1 ? '' : rest.slice(slash + 1))
          const target = nameToTarget.get(seg + ':' + name)
          if (!target) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found'); return }
          // 条件缓存：用 ETag（fs version = dev:ino:size:mtimeNs:ctimeNs）做重验证，
          // 未变化的媒体直接回 304，避免大文件重复下载。
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

    // Step 3. 注册配置读取服务：向浏览器返回合并后的媒体配置。
    const unregisterConfig = webServer.register({
      kind: 'prefix',
      path: '/synthwave-theme-config',
      handler: async (_req: any, res: any) => {
        log('配置请求：/synthwave-theme-config')
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

    // Step 4. 注册交互接口：打开配置、读取原文、保存、设置媒体源、打开示例、上传媒体。
    const unregisterOpenConfig = webServer.register({
      kind: 'prefix',
      path: '/synthwave-theme-config/open',
      handler: async (_req: any, res: any) => {
        log('交互：打开当前 profile 配置文件')
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

    const unregisterRawConfig = webServer.register({
      kind: 'prefix',
      path: '/synthwave-theme-config/raw',
      handler: async (_req: any, res: any) => {
        log('交互：读取配置原文')
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
        log('交互：保存配置原文')
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
        log('交互：设置媒体源')
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
        log('交互：打开示例配置')
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

    // 上传文件功能，给上传视频和图片用。
    const unregisterUpload = webServer.register({
      kind: 'prefix',
      path: '/synthwave-theme-upload',
      handler: async (req: any, res: any) => {
        log('交互：上传媒体')
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
          // 接下来写文件：先建目录，再用不冲突的路径落盘，并回写配置。
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

    // Step 5. 宿主插件加载时立即落地 profile 配置，确保文件在浏览器首次请求前就存在。
    void ensureConfigFile()

    c.effect(() => unregisterConfig)
  })
}
