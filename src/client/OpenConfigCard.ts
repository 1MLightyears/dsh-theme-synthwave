import { createElement, useEffect, useRef, useState } from 'react'
import { IconChevronDownOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './OpenConfigCard.module.css'

type Kind = 'video' | 'image'

function jsonPost(url: string, body: unknown): Promise<any> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((res) => res.json())
}

/** Settings card: pick/upload background media, edit the config file, open it (or the example). */
export function OpenConfigCard() {
  const [expanded, setExpanded] = useState(false)
  const [path, setPath] = useState('')
  const [hint, setHint] = useState('')

  // Inline JSONC editor (dirty tracking + save).
  const [raw, setRaw] = useState('')
  const [savedRaw, setSavedRaw] = useState('')
  const [saving, setSaving] = useState(false)
  const dirty = raw !== savedRaw

  // URL / local-absolute-path source input.
  const [sourceKind, setSourceKind] = useState<Kind>('video')
  const [sourceValue, setSourceValue] = useState('')

  // Upload progress.
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const imageInput = useRef<HTMLInputElement | null>(null)
  const videoInput = useRef<HTMLInputElement | null>(null)

  const refresh = () => {
    fetch('/synthwave-theme-config/raw')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.path === 'string') setPath(data.path)
        if (data && typeof data.raw === 'string') { setRaw(data.raw); setSavedRaw(data.raw) }
      })
      .catch(() => {})
  }

  useEffect(() => {
    refresh()
  }, [])

  const copy = () => {
    const clipboard = (navigator as any).clipboard
    if (clipboard === undefined) { setHint(path); return }
    clipboard.writeText(path).then(() => setHint('路径已复制'), () => setHint('复制失败'))
  }

  const openConfig = () => {
    setHint('正在打开…')
    fetch('/synthwave-theme-config/open', { method: 'POST' })
      .then((res) => res.json())
      .then((result) => setHint(result && result.ok ? '已打开' : String((result && result.error) || '打开失败')))
      .catch(() => setHint('打开失败'))
  }

  const openExample = () => {
    setHint('正在打开示例…')
    fetch('/synthwave-theme-config/open-example', { method: 'POST' })
      .then((res) => res.json())
      .then((result) => setHint(result && result.ok ? '已打开示例配置' : String((result && result.error) || '打开失败')))
      .catch(() => setHint('打开失败'))
  }

  const save = () => {
    if (saving || !dirty) return
    setSaving(true)
    setHint('正在保存…')
    jsonPost('/synthwave-theme-config/save', { raw })
      .then((result) => {
        if (result && result.ok) { setSavedRaw(raw); setHint('已保存，硬刷新页面生效') }
        else setHint('保存失败：' + String((result && result.error) || '未知错误'))
      })
      .catch(() => setHint('保存失败'))
      .finally(() => setSaving(false))
  }

  const applySource = () => {
    const value = sourceValue.trim()
    if (!value) { setHint('请输入 URL 或本地路径'); return }
    setHint('正在应用…')
    jsonPost('/synthwave-theme-config/set', { kind: sourceKind, value })
      .then((result) => {
        if (result && result.ok) { setHint('已更新，硬刷新页面生效'); setSourceValue(''); refresh() }
        else setHint('应用失败：' + String((result && result.error) || '未知错误'))
      })
      .catch(() => setHint('应用失败'))
  }

  const upload = (kind: Kind, file: File) => {
    if (uploading) return
    setUploading(true)
    setProgress(0)
    setHint('')
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/synthwave-theme-upload?kind=' + kind + '&name=' + encodeURIComponent(file.name))
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)) }
    xhr.onload = () => {
      setUploading(false)
      let result: any = null
      try { result = JSON.parse(xhr.responseText) } catch { /* ignore */ }
      if (result && result.ok) { setHint('已上传：' + (result.path || '') + '，硬刷新页面生效'); refresh() }
      else setHint('上传失败：' + String((result && result.error) || '未知错误'))
    }
    xhr.onerror = () => { setUploading(false); setHint('上传失败') }
    xhr.send(file)
  }

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
          ),
          hint === '' ? null : createElement('div', { className: css.hint }, hint),
        )
      : null,
  )
}
