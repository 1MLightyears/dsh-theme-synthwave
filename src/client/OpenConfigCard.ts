// 合成波主题的配置卡片：在设置页提供选择/上传背景媒体、移除媒体记录、编辑配置文件（含保存/取消）等交互。

import { createElement, useEffect, useRef, useState } from 'react'
import { IconChevronDownOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './OpenConfigCard.module.css'

type Kind = 'video' | 'image'

/** 日志前缀，便于在 DevTools 控制台 grep 本卡片的排错日志。 */
const LOG_PREFIX = '[dsh-theme-synthwave]'

/** 输出一条浏览器端排错日志（交互逻辑前调用）。 */
function log(message: string): void {
  console.log(LOG_PREFIX + ' ' + message)
}

/** 发送一个 JSON POST 请求并解析 JSON 响应。 */
function jsonPost(url: string, body: unknown): Promise<any> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((res) => res.json())
}

/** 设置页配置卡片：挑选/上传背景媒体、移除媒体记录、编辑配置文件、打开当前配置或示例。 */
export function OpenConfigCard() {
  const [expanded, setExpanded] = useState(false)
  const [path, setPath] = useState('')
  const [hint, setHint] = useState('')

  // 内联 JSONC 编辑器状态（脏检查 + 保存 + 取消）。
  const [raw, setRaw] = useState('')
  const [savedRaw, setSavedRaw] = useState('')
  const [saving, setSaving] = useState(false)
  const [parseError, setParseError] = useState(false)
  const dirty = raw !== savedRaw

  // URL / 本地路径来源输入。
  const [sourceKind, setSourceKind] = useState<Kind>('video')
  const [sourceValue, setSourceValue] = useState('')

  // 当前媒体记录（原始引用），用于展示与移除。
  const [videoPath, setVideoPath] = useState('')
  const [imagePaths, setImagePaths] = useState<string[]>([])
  const [removing, setRemoving] = useState(false)

  // 上传进度。
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const imageInput = useRef<HTMLInputElement | null>(null)
  const videoInput = useRef<HTMLInputElement | null>(null)

  /** 拉取配置原文（含解析状态）与当前媒体记录，回填到编辑器与媒体列表。 */
  const refresh = () => {
    log('刷新配置原文与媒体记录')
    fetch('/synthwave-theme-config/raw')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.path === 'string') setPath(data.path)
        if (data && typeof data.raw === 'string') { setRaw(data.raw); setSavedRaw(data.raw) }
        if (data && typeof data.parseError === 'boolean') setParseError(data.parseError)
      })
      .catch(() => {})
    fetch('/synthwave-theme-config')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.sources) {
          setVideoPath(typeof data.sources.video === 'string' ? data.sources.video : '')
          setImagePaths(Array.isArray(data.sources.images) ? data.sources.images.filter((p: any) => typeof p === 'string') : [])
        }
      })
      .catch(() => {})
  }

  // 卡片挂载时先拉取一次配置。
  useEffect(() => {
    refresh()
  }, [])

  /** 复制配置路径到剪贴板；不可用时退化为直接展示路径。 */
  const copy = () => {
    log('复制配置路径')
    const clipboard = (navigator as any).clipboard
    if (clipboard === undefined) { setHint(path); return }
    clipboard.writeText(path).then(() => setHint('路径已复制'), () => setHint('复制失败'))
  }

  /** 请求宿主端打开当前 profile 配置文件。 */
  const openConfig = () => {
    log('打开配置文件')
    setHint('正在打开…')
    fetch('/synthwave-theme-config/open', { method: 'POST' })
      .then((res) => res.json())
      .then((result) => setHint(result && result.ok ? '已打开' : String((result && result.error) || '打开失败')))
      .catch(() => setHint('打开失败'))
  }

  /** 请求宿主端打开随包发布的示例配置。 */
  const openExample = () => {
    log('打开示例配置')
    setHint('正在打开示例…')
    fetch('/synthwave-theme-config/open-example', { method: 'POST' })
      .then((res) => res.json())
      .then((result) => setHint(result && result.ok ? '已打开示例配置' : String((result && result.error) || '打开失败')))
      .catch(() => setHint('打开失败'))
  }

  /** 保存编辑器里的配置原文到宿主端。 */
  const save = () => {
    if (saving || !dirty) return
    log('保存配置')
    setSaving(true)
    setHint('正在保存…')
    jsonPost('/synthwave-theme-config/save', { raw })
      .then((result) => {
        if (result && result.ok) { setSavedRaw(raw); setHint('已保存，硬刷新页面生效'); refresh() }
        else setHint('保存失败：' + String((result && result.error) || '未知错误'))
      })
      .catch(() => setHint('保存失败'))
      .finally(() => setSaving(false))
  }

  /** 取消未保存的文本修改：把编辑器还原到上次保存/加载的状态。 */
  const cancel = () => {
    if (!dirty) return
    log('取消未保存的修改')
    setRaw(savedRaw)
    setHint('已取消未保存的修改')
  }

  /** 把输入的 URL / 裸文件名应用到对应媒体源（video 或 image）。 */
  const applySource = () => {
    const value = sourceValue.trim()
    if (!value) { setHint('请输入 URL 或本地路径'); return }
    log('应用媒体源：' + sourceKind + ' -> ' + value)
    setHint('正在应用…')
    jsonPost('/synthwave-theme-config/set', { kind: sourceKind, value })
      .then((result) => {
        if (result && result.ok) { setHint('已更新，硬刷新页面生效'); setSourceValue(''); refresh() }
        else setHint('应用失败：' + String((result && result.error) || '未知错误'))
      })
      .catch(() => setHint('应用失败'))
  }

  /** 移除视频记录（清空 video.path），成功后刷新配置与媒体列表。 */
  const removeVideo = () => {
    if (removing) return
    log('移除视频记录')
    setRemoving(true)
    setHint('正在移除视频…')
    jsonPost('/synthwave-theme-config/remove', { kind: 'video', value: '' })
      .then((result) => {
        if (result && result.ok) { setHint('已移除视频，硬刷新页面生效'); refresh() }
        else setHint('移除失败：' + String((result && result.error) || '未知错误'))
      })
      .catch(() => setHint('移除失败'))
      .finally(() => setRemoving(false))
  }

  /** 移除指定图片记录，成功后刷新配置与媒体列表。 */
  const removeImage = (value: string) => {
    if (removing) return
    log('移除图片：' + value)
    setRemoving(true)
    setHint('正在移除图片…')
    jsonPost('/synthwave-theme-config/remove', { kind: 'image', value })
      .then((result) => {
        if (result && result.ok) { setHint('已移除图片，硬刷新页面生效'); refresh() }
        else setHint('移除失败：' + String((result && result.error) || '未知错误'))
      })
      .catch(() => setHint('移除失败'))
      .finally(() => setRemoving(false))
  }

  /** 通过 XHR 上传媒体文件（带进度），成功后刷新配置与媒体列表。 */
  const upload = (kind: Kind, file: File) => {
    if (uploading) return
    log('上传媒体：' + kind + ' -> ' + file.name)
    setUploading(true)
    setProgress(0)
    setHint('')
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/synthwave-theme-upload?kind=' + kind + '&name=' + encodeURIComponent(file.name))
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)) }
    xhr.onload = () => {
      setUploading(false)
      let result: any = null
      try { result = JSON.parse(xhr.responseText) } catch { /* 响应不是合法 JSON，忽略 */ }
      if (result && result.ok) { setHint('已上传：' + (result.path || '') + '，硬刷新页面生效'); refresh() }
      else setHint('上传失败：' + String((result && result.error) || '未知错误'))
    }
    xhr.onerror = () => { setUploading(false); setHint('上传失败') }
    xhr.send(file)
  }

  /** 文件选择框 change 回调：取首个文件并触发上传，随后清空选择以便重复选择同一文件。 */
  const onFileChange = (kind: Kind) => (e: any) => {
    const file = e && e.target && e.target.files && e.target.files[0]
    if (file) upload(kind, file)
    if (e && e.target) e.target.value = ''
  }

  return createElement('li', {
    className: expanded ? `${css.card} ${css.cardOpen}` : css.card,
  },
    createElement('button', {
      type: 'button',
      className: css.header,
      'aria-expanded': expanded,
      onClick: () => { setExpanded(!expanded) },
    },
      createElement('span', { className: css.headText },
        createElement('span', { className: css.name }, 'DeepSeek Harness: 合成波风格主题'),
        createElement('span', { className: css.description }, '霓虹、背景媒体与字号缩放配置'),
      ),
      createElement(IconChevronDownOutline14, { className: expanded ? `${css.chevron} ${css.chevronOpen}` : css.chevron }),
    ),
    expanded
      ? createElement('div', { className: css.body },
          createElement('div', { className: css.path }, path || '未找到配置文件'),
          createElement('div', { className: css.actions },
            createElement('button', { className: css.button, onClick: openConfig }, '打开配置文件'),
            createElement('button', { className: css.button, onClick: openExample }, '打开示例配置'),
            createElement('button', { className: css.button, onClick: copy }, '复制路径'),
          ),
          parseError
            ? createElement('div', { className: css.warning },
                '⚠ 配置文件解析失败：当前已临时套用默认配置（未修改原文件）。建议删除该配置文件让插件自动重建默认配置，或参考 config.dsh-theme-synthwave.example.jsonc 修复。')
            : null,
          createElement('div', { className: css.sectionTitle }, '当前背景媒体'),
          videoPath === '' && imagePaths.length === 0
            ? createElement('div', { className: css.mediaEmpty }, '未设置背景媒体')
            : createElement('div', { className: css.mediaList },
                videoPath === ''
                  ? null
                  : createElement('div', { className: css.mediaRow, key: 'video' },
                      createElement('span', { className: css.mediaKind }, '视频'),
                      createElement('span', { className: css.mediaName }, videoPath),
                      createElement('button', { className: css.buttonDanger, onClick: removeVideo, disabled: removing }, '移除'),
                    ),
                ...imagePaths.map((p, i) =>
                  createElement('div', { className: css.mediaRow, key: 'img-' + i },
                    createElement('span', { className: css.mediaKind }, '图片'),
                    createElement('span', { className: css.mediaName }, p),
                    createElement('button', { className: css.buttonDanger, onClick: () => removeImage(p), disabled: removing }, '移除'),
                  ),
                ),
              ),
          createElement('div', { className: css.sectionTitle }, '选择背景媒体'),
          createElement('div', { className: css.actions },
            createElement('button', { className: css.button, onClick: () => imageInput.current && imageInput.current.click(), disabled: uploading }, '选择图片'),
            createElement('button', { className: css.button, onClick: () => videoInput.current && videoInput.current.click(), disabled: uploading }, '选择视频'),
          ),
          createElement('input', { ref: imageInput, type: 'file', accept: 'image/*', style: { display: 'none' }, onChange: onFileChange('image') }),
          createElement('input', { ref: videoInput, type: 'file', accept: 'video/*', style: { display: 'none' }, onChange: onFileChange('video') }),
          uploading
            ? createElement('div', { className: css.progressRow },
                createElement('div', { className: css.progressBar },
                  createElement('div', { className: css.progressFill, style: { width: progress + '%' } }),
                ),
                createElement('span', { className: css.progressText }, progress + '%'),
              )
            : null,
          createElement('div', { className: css.sourceRow },
            createElement('select', { className: css.select, value: sourceKind, onChange: (e: any) => setSourceKind(e.target.value) },
              createElement('option', { value: 'video' }, '视频'),
              createElement('option', { value: 'image' }, '图片'),
            ),
            createElement('input', { className: css.input, value: sourceValue, placeholder: 'http(s) URL 或裸文件名', onChange: (e: any) => setSourceValue(e.target.value) }),
            createElement('button', { className: css.button, onClick: applySource }, '应用'),
          ),
          createElement('div', { className: css.editorHeader },
            createElement('span', { className: css.sectionTitle }, '配置文件（JSONC）'),
            dirty ? createElement('span', { className: css.dirty }, '● 未保存') : null,
          ),
          createElement('textarea', { className: css.textarea, value: raw, spellCheck: false, onChange: (e: any) => setRaw(e.target.value) }),
          createElement('div', { className: css.actions },
            createElement('button', { className: css.button, onClick: save, disabled: !dirty || saving }, saving ? '保存中…' : '保存'),
            createElement('button', { className: css.button, onClick: cancel, disabled: !dirty || saving }, '取消'),
          ),
          hint === '' ? null : createElement('div', { className: css.hint }, hint),
        )
      : null,
  )
}
