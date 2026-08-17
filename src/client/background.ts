// 背景注入功能：在 #root 之前插入铺满视口的背景层，支持视频、多图轮播与无媒体时的默认气泡动画。
// 三种背景实现拆分为 playVideo / imageMerrygo / defaultBackground 三个函数，便于解耦与后续单独维护。

import { hueShift } from './color.ts'

/** 播放视频背景：插入自动播放、静音循环的 <video> 元素到背景层。 */
function playVideo(bg: HTMLElement, video: any, blurFilter: string): void {
  // 有视频：插入自动播放、静音循环的 <video>。
  const v = document.createElement('video')
  v.autoplay = true
  v.muted = video.muted !== false
  v.loop = video.loop !== false
  v.setAttribute('playsinline', '')
  v.src = video.url
  Object.assign(v.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: video.objectFit || 'cover', background: '#000', filter: blurFilter })
  bg.appendChild(v)
}

/** 轮播图片背景：插入多张 <img> 做淡入淡出切换；多张时启动定时轮播并把清理函数写入 disposers。 */
function imageMerrygo(bg: HTMLElement, cfg: any, blurFilter: string, disposers: Array<() => void>): void {
  // 有图片：插入多张 <img> 做淡入淡出轮播。
  const imgAlpha = typeof cfg.imagesAlpha === 'number' ? cfg.imagesAlpha : 0.85
  const imgs = cfg.images.map(function (u: string) {
    const el = document.createElement('img')
    el.src = u
    el.alt = ''
    Object.assign(el.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'cover', opacity: '0', transition: 'opacity 1.2s ease', filter: blurFilter })
    bg.appendChild(el)
    return el
  })
  let idx = 0
  function show(i: number) { for (let j = 0; j < imgs.length; j++) imgs[j].style.opacity = (j === i) ? String(imgAlpha) : '0' }
  show(0)
  if (imgs.length > 1) {
    const slideshow = cfg.slideshow || {}
    const order = slideshow.order === 'random' ? 'random' : 'sequential'
    const intervalMs = slideshow.intervalMs || 8000
    const timer = setInterval(function () {
      // 随机模式避免连续选中同一张。
      if (order === 'random') {
        let n = idx
        while (n === idx && imgs.length > 1) n = Math.floor(Math.random() * imgs.length)
        idx = n
      } else {
        idx = (idx + 1) % imgs.length
      }
      show(idx)
    }, intervalMs)
    disposers.push(() => clearInterval(timer))
  }
}

/** 绘制默认背景：生成若干随机颜色/大小/位置/寿命的漂浮气泡（effect=1 时附加位移动画）。 */
function defaultBackground(bg: HTMLElement, effect: number, blurFilter: string): void {
  // 无媒体：接下来绘制气泡 —— 生成 6 个随机颜色/大小/位置/寿命的漂浮气泡。
  const BASE_COLORS = ['#ff8a3d', '#8a4bff', '#ff2a6d', '#ff3860', '#2a6dff', '#05d9e8']
  const MIN_SIZE = 480
  const MAX_SIZE = 720
  const MIN_LIFE = 8000
  const MAX_LIFE = 20000
  for (let i = 0; i < 6; i++) {
    const el = document.createElement('div')
    el.className = 'dsh-synthwave-bubble'
    const base = BASE_COLORS[i]
    const delta = 7 + Math.random() * 11
    const size = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE)
    const life = MIN_LIFE + Math.random() * (MAX_LIFE - MIN_LIFE)
    const x = -20 + Math.random() * 80
    const y = -20 + Math.random() * 80
    el.style.width = size.toFixed(0) + 'px'
    el.style.height = size.toFixed(0) + 'px'
    el.style.left = x.toFixed(1) + '%'
    el.style.top = y.toFixed(1) + '%'
    el.style.background = 'linear-gradient(to bottom, ' + hueShift(base, -delta) + ', ' + hueShift(base, delta) + ')'
    el.style.filter = blurFilter
    if (effect === 1) {
      // 效果开启时：为每个气泡随机偏移并绑定生命周期动画。
      el.style.setProperty('--dx', (Math.random() * 160 - 80).toFixed(0) + 'px')
      el.style.setProperty('--dy', (Math.random() * 160 - 80).toFixed(0) + 'px')
      el.style.animation = 'dshBubbleLife ' + life.toFixed(0) + 'ms ease-in-out infinite'
      el.style.animationDelay = (-Math.random() * life).toFixed(0) + 'ms'
    }
    bg.appendChild(el)
  }
}

/** 在文档里注入背景层并返回清理函数（卸载时移除 DOM 与定时器）。 */
export function injectBackground(cfg: any): () => void {
  if (typeof document === 'undefined') return () => {}
  const bg = document.createElement('div')
  bg.setAttribute('data-synthwave-bg', '')
  Object.assign(bg.style, {
    position: 'fixed', inset: '0', zIndex: '-1', pointerEvents: 'none', overflow: 'hidden',
    background: 'radial-gradient(circle at 50% 86%, rgba(255,160,90,0.55) 0%, rgba(255,70,120,0.28) 22%, rgba(255,42,109,0) 55%), linear-gradient(180deg, #0d0221 0%, #150733 40%, #230a45 68%, #3c0f4f 100%)',
  })

  const disposers: Array<() => void> = []
  const b = cfg.background || {}
  const blurPx = typeof b.blur === 'number' ? Math.max(0, Math.min(40, Math.round(b.blur))) : 2
  const blurFilter = blurPx > 0 ? ('blur(' + blurPx + 'px)') : 'none'

  // 按配置优先级选择背景实现：视频 > 多图轮播 > 默认气泡。
  if (b.video) {
    playVideo(bg, b.video, blurFilter)
  } else if (b.images && b.images.length) {
    imageMerrygo(bg, b, blurFilter, disposers)
  } else {
    defaultBackground(bg, typeof b.defaultEffect === 'number' ? b.defaultEffect : 1, blurFilter)
  }

  const root = document.getElementById('root')
  document.body.insertBefore(bg, root || document.body.firstChild)

  return function () {
    for (const d of disposers) { try { d() } catch (e) { /* ignore */ } }
    try { bg.remove() } catch (e) { /* ignore */ }
  }
}
