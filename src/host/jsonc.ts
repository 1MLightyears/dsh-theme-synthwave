// JSONC（带注释的 JSON）工具：解析、按文本定位并原地编辑配置值，供配置文件读写与后台接口复用。

/**
 * 去掉 JSONC 文本中的注释，并清理尾随逗号，返回可直接交给 JSON.parse 的纯 JSON 字符串。
 * @param text 原始 JSONC 文本。
 */
function stripJsoncComments(text: string): string {
  let out = ''
  let inString = false
  let inLine = false
  let inBlock = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const n = text[i + 1]
    // 行注释状态：遇到换行结束。
    if (inLine) { if (c === '\n') { inLine = false; out += c } continue }
    // 块注释状态：遇到 */ 结束。
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; i++ } continue }
    // 字符串内部：原样保留，并跳过转义字符。
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

/** 解析 JSONC 文本为 JS 对象（注释会被忽略）。 */
export function parseJsonc(text: string): any {
  return JSON.parse(stripJsoncComments(text))
}

/** 从下标 i 起跳过空白与 JSONC 注释，返回第一个有效字符的下标。 */
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

/** 在文本中定位 blockKey 属性对应的 `{ ... }` 对象区间（首个双引号匹配）。 */
function findBlockSpan(text: string, blockKey: string): { start: number; end: number } | null {
  const keyRe = new RegExp('"' + blockKey + '"\\s*:', 'g')
  let m
  while ((m = keyRe.exec(text)) !== null) {
    const i = skipTrivia(text, keyRe.lastIndex)
    if (text[i] !== '{') continue
    // 从 `{` 起扫描到配对的 `}`，兼顾字符串内的花括号。
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

/** 在文本中定位 propKey 属性的字符串/数组值区间，保留原始片段与类型。 */
function findPropValue(text: string, propKey: string): { start: number; end: number; raw: string; kind: 'string' | 'array' } | null {
  const keyRe = new RegExp('"' + propKey + '"\\s*:', 'g')
  let m
  while ((m = keyRe.exec(text)) !== null) {
    const i = skipTrivia(text, keyRe.lastIndex)
    const ch = text[i]
    // 字符串值：扫描到配对的引号。
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
    // 数组值：扫描到配对的 `]`，兼顾字符串内的方括号。
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

/** 在 blockKey 对象内替换一个字符串属性值，保留原有注释；找不到时返回 null。 */
function setStringProp(raw: string, blockKey: string, propKey: string, value: string): string | null {
  const block = findBlockSpan(raw, blockKey)
  if (block === null) return null
  const prop = findPropValue(raw.slice(block.start, block.end), propKey)
  if (prop === null || prop.kind !== 'string') return null
  const start = block.start + prop.start
  const end = block.start + prop.end
  return raw.slice(0, start) + JSON.stringify(value) + raw.slice(end)
}

/** 在 blockKey 对象内向数组属性追加一个值，保留原有注释；找不到时返回 null。 */
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

/** 编辑配置文本：设置 video.path 或追加 images.paths；优先原地编辑（保留注释），失败时退回解析重写。 */
export function applyConfigEdit(raw: string, kind: 'video' | 'image', value: string): string {
  if (kind === 'video') {
    const edited = setStringProp(raw, 'video', 'path', value)
    if (edited !== null) return edited
  } else {
    const edited = appendArrayProp(raw, 'images', 'paths', value)
    if (edited !== null) return edited
  }
  // 退回解析重写：注释会丢失，但值会被保留。
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

/** 在 blockKey 对象内把数组属性整体重写为 values，保留块外注释；找不到时返回 null。 */
function setArrayProp(raw: string, blockKey: string, propKey: string, values: string[]): string | null {
  const block = findBlockSpan(raw, blockKey)
  if (block === null) return null
  const prop = findPropValue(raw.slice(block.start, block.end), propKey)
  if (prop === null || prop.kind !== 'array') return null
  const start = block.start + prop.start
  const end = block.start + prop.end
  const arrText = '[' + values.map((v) => JSON.stringify(v)).join(', ') + ']'
  return raw.slice(0, start) + arrText + raw.slice(end)
}

/** 从 images.paths 中移除指定值并重写该数组（保留其他注释）；找不到或解析失败返回 null。 */
function removeImageProp(raw: string, value: string): string | null {
  const block = findBlockSpan(raw, 'images')
  if (block === null) return null
  const prop = findPropValue(raw.slice(block.start, block.end), 'paths')
  if (prop === null || prop.kind !== 'array') return null
  let paths: any
  try { paths = parseJsonc(prop.raw) } catch { return null }
  if (!Array.isArray(paths)) return null
  const next = paths.filter((p) => p !== value)
  return setArrayProp(raw, 'images', 'paths', next)
}

/** 移除配置：清除 video.path 或从 images.paths 移除指定值；优先原地编辑，失败退回解析重写。 */
export function applyConfigRemove(raw: string, kind: 'video' | 'image', value: string): string {
  if (kind === 'video') {
    const edited = setStringProp(raw, 'video', 'path', '')
    if (edited !== null) return edited
  } else {
    const edited = removeImageProp(raw, value)
    if (edited !== null) return edited
  }
  // 退回解析重写：注释会丢失，但值会被保留。
  const obj = parseJsonc(raw)
  const bg = obj.background || (obj.background = {})
  if (kind === 'video') {
    const video = bg.video || (bg.video = {})
    video.path = ''
  } else {
    const images = bg.images || (bg.images = {})
    const paths = Array.isArray(images.paths) ? images.paths.filter((p) => p !== value) : []
    images.paths = paths
  }
  return JSON.stringify(obj, null, 2) + '\n'
}

/** 从容错地提取媒体引用：即使配置文件整体解析失败，也尽量读回 video.path 与 images.paths。 */
export function extractSources(raw: string): { video: string; images: string[] } {
  const out: { video: string; images: string[] } = { video: '', images: [] }
  // 提取 video.path（字符串值）。
  const videoBlock = findBlockSpan(raw, 'video')
  if (videoBlock !== null) {
    const prop = findPropValue(raw.slice(videoBlock.start, videoBlock.end), 'path')
    if (prop !== null && prop.kind === 'string') {
      try {
        const v = JSON.parse(stripJsoncComments(prop.raw))
        if (typeof v === 'string') out.video = v
      } catch { /* 该值不是合法 JSON 字符串，忽略 */ }
    }
  }
  // 提取 images.paths（数组值）。
  const imagesBlock = findBlockSpan(raw, 'images')
  if (imagesBlock !== null) {
    const prop = findPropValue(raw.slice(imagesBlock.start, imagesBlock.end), 'paths')
    if (prop !== null && prop.kind === 'array') {
      try {
        const arr = JSON.parse(stripJsoncComments(prop.raw))
        if (Array.isArray(arr)) out.images = arr.filter((p): p is string => typeof p === 'string')
      } catch { /* 该值不是合法 JSON 数组，忽略 */ }
    }
  }
  return out
}
