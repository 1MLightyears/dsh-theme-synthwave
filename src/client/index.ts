/**
 * Browser half of dsh-theme-synthwave: neon glow, translucent surface tokens,
 * image/video background (served from /synthwave-theme-media), configurable blur,
 * and fontScale root font-size. Config comes from the host via /synthwave-theme-config.
 */
import { createElement, useEffect } from 'react'
import { OpenConfigCard } from './OpenConfigCard.ts'

function hexRgba(color: string, alpha: number): string {
  const c = String(color).trim()
  if (c.charAt(0) === '#') {
    let h = c
    if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]
    if (h.length === 7) {
      const r = parseInt(h.slice(1, 3), 16)
      const g = parseInt(h.slice(3, 5), 16)
      const b = parseInt(h.slice(5, 7), 16)
      return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')'
    }
  }
  return color
}

function hueShift(color, deg) {
  const c = String(color).trim()
  let h = c
  if (h.charAt(0) === '#') {
    if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]
    if (h.length === 7) {
      const r = parseInt(h.slice(1, 3), 16) / 255
      const g = parseInt(h.slice(3, 5), 16) / 255
      const b = parseInt(h.slice(5, 7), 16) / 255
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      let hh = 0
      let s = 0
      const l = (max + min) / 2
      if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        if (max === r) hh = ((g - b) / d + (g < b ? 6 : 0))
        else if (max === g) hh = (b - r) / d + 2
        else hh = (r - g) / d + 4
        hh *= 60
      }
      hh = (hh + deg + 360) % 360
      const cc = (1 - Math.abs(2 * l - 1)) * s
      const xx = cc * (1 - Math.abs((hh / 60) % 2 - 1))
      const m = l - cc / 2
      let rr = 0
      let gg = 0
      let bb = 0
      if (hh < 60) { rr = cc; gg = xx }
      else if (hh < 120) { rr = xx; gg = cc }
      else if (hh < 180) { gg = cc; bb = xx }
      else if (hh < 240) { gg = xx; bb = cc }
      else if (hh < 300) { rr = xx; bb = cc }
      else { rr = cc; bb = xx }
      return 'rgb(' + Math.round((rr + m) * 255) + ', ' + Math.round((gg + m) * 255) + ', ' + Math.round((bb + m) * 255) + ')'
    }
  }
  return c
}

function glowColor(color: string, alpha: number): string {
  const c = String(color).trim()
  if (c.charAt(0) === '#') {
    let h = c
    if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]
    if (h.length === 7) {
      const r = parseInt(h.slice(1, 3), 16)
      const g = parseInt(h.slice(3, 5), 16)
      const b = parseInt(h.slice(5, 7), 16)
      return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')'
    }
  }
  return 'color-mix(in srgb, ' + c + ' ' + Math.round(alpha * 100) + '%, transparent)'
}

const GLOW_SELECTORS = ['a[href]', 'button', '[role="button"]', '[role="tab"]', '[role="menuitem"]', '[role="link"]']

function buildTokens(baseAlpha: number): Record<string, { light: string; dark: string }> {
  const a = typeof baseAlpha === 'number' ? Math.max(0, Math.min(1, baseAlpha)) : 0.5
  return {
    '--dsw-alias-bg-base': { light: hexRgba('#f4f0ff', a), dark: hexRgba('#0d0221', a) },
    '--dsw-alias-bg-layer-1': { light: '#ffffff', dark: '#170733' },
    '--dsw-alias-bg-layer-2': { light: '#f0eaff', dark: '#20104a' },
    '--dsw-alias-bg-overlay': { light: '#f7f3ff', dark: '#25114f' },
    '--dsw-alias-border-l1': { light: '#d8ccf0', dark: '#342459' },
    '--dsw-alias-border-l2': { light: '#8a4bff', dark: '#8a4bff' },
    '--dsw-alias-brand-primary': { light: '#d61f5c', dark: '#ff2a6d' },
    '--dsw-alias-label-primary': { light: '#1a0a33', dark: '#f4f0ff' },
    '--dsw-alias-label-secondary': { light: '#5a4f7a', dark: '#a99fd6' },
    '--dsw-alias-state-error-primary': { light: '#d81b4a', dark: '#ff3860' },
    '--dsw-alias-state-success-primary': { light: '#00a878', dark: '#01ffc3' },
    '--dsw-alias-state-warn-primary': { light: '#c99300', dark: '#ffd319' },
    '--dsw-specific-sidebar-fill': { light: hexRgba('#ece5ff', a), dark: hexRgba('#12002e', a) },
  }
}

function buildGlowCss(g: any): string {
  if (!g || g.enabled === false) return ''
  const baseColors = (Array.isArray(g.colors) && g.colors.length ? g.colors : ['#ff2a6d']) as string[]
  const hoverColors = (Array.isArray(g.hoverColors) && g.hoverColors.length ? g.hoverColors : ['#05d9e8']) as string[]
  const alpha = typeof g.alpha === 'number' ? g.alpha : 0.6
  const hoverAlpha = typeof g.hoverAlpha === 'number' ? g.hoverAlpha : 0.85
  const blurEm = typeof g.blurEm === 'number' ? g.blurEm : 0.30
  const suppress = g.suppressHoverFill !== false

  const baseShadow = baseColors.map((c) => '0 0 ' + blurEm + 'em ' + glowColor(c, alpha)).join(', ')
  const hoverShadow = hoverColors.map((c) => '0 0 ' + (blurEm * 1.5) + 'em ' + glowColor(c, hoverAlpha)).join(', ')

  const selAll = GLOW_SELECTORS.join(', ')
  const selHover = GLOW_SELECTORS.map((s) => s + ':hover').join(', ')
  const selFocus = GLOW_SELECTORS.map((s) => s + ':focus').join(', ')
  const selHoverFocus = GLOW_SELECTORS.map((s) => s + ':hover, ' + s + ':focus').join(', ')

  let chrome = ''
  if (suppress) {
    chrome = '\n' + selHover + ' { background-color: transparent !important; }\n'
      + selFocus + ' { outline: none !important; border-color: transparent !important; box-shadow: none !important; }'
  }

  return '\n' + selAll + ' {\n  transition: text-shadow .15s ease, background-color .15s ease;\n  text-shadow: ' + baseShadow + ';\n}\n'
    + selHoverFocus + ' { text-shadow: ' + hoverShadow + '; }\n' + chrome
}

function buildAmbientCss(): string {
  return `
.dsh-synthwave-overlay, .dsh-synthwave-overlay * { pointer-events: none !important; }
.dsh-synthwave-overlay { position: fixed; inset: 0; overflow: hidden; }
.dsh-synthwave-scanlines { position: absolute; inset: 0; background: repeating-linear-gradient(to bottom, rgba(255,255,255,0) 0px, rgba(255,255,255,0) 2px, rgba(255,255,255,0.05) 3px, rgba(255,255,255,0) 4px); }
.dsh-synthwave-vignette { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(0,0,0,0) 62%, rgba(8,3,26,0.42) 100%); }
.dsh-synthwave-glow { position: absolute; inset: 0; background: radial-gradient(ellipse 70% 55% at 50% 118%, rgba(255,42,109,0.15) 0%, rgba(255,42,109,0) 60%), radial-gradient(ellipse 70% 50% at 50% -12%, rgba(5,217,232,0.10) 0%, rgba(5,217,232,0) 52%); animation: dshSynthwaveBreath 9s ease-in-out infinite; }
@keyframes dshSynthwaveBreath { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
.dsh-synthwave-bubble { position: absolute; border-radius: 50%; }
@keyframes dshBubbleLife { 0% { opacity: 0; transform: translate(0, 0) scale(0.96); } 50% { opacity: 1; transform: translate(var(--dx, 40px), var(--dy, -30px)) scale(1.05); } 100% { opacity: 0; transform: translate(0, 0) scale(0.96); } }
`
}

function injectBackground(cfg: any): () => void {
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

  if (b.video) {
    const v = document.createElement('video')
    v.autoplay = true
    v.muted = b.video.muted !== false
    v.loop = b.video.loop !== false
    v.setAttribute('playsinline', '')
    v.src = b.video.url
    Object.assign(v.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: b.video.objectFit || 'cover', background: '#000', filter: blurFilter })
    bg.appendChild(v)
  } else if (b.images && b.images.length) {
    const imgAlpha = typeof b.imagesAlpha === 'number' ? b.imagesAlpha : 0.85
    const imgs = b.images.map(function (u: string) {
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
      const slideshow = b.slideshow || {}
      const order = slideshow.order === 'random' ? 'random' : 'sequential'
      const intervalMs = slideshow.intervalMs || 8000
      const timer = setInterval(function () {
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
  } else {
    const BASE_COLORS = ['#ff8a3d', '#8a4bff', '#ff2a6d', '#ff3860', '#2a6dff', '#05d9e8']
    const MIN_SIZE = 480
    const MAX_SIZE = 720
    const MIN_LIFE = 8000
    const MAX_LIFE = 20000
    const effect = typeof b.defaultEffect === 'number' ? b.defaultEffect : 1
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
        el.style.setProperty('--dx', (Math.random() * 160 - 80).toFixed(0) + 'px')
        el.style.setProperty('--dy', (Math.random() * 160 - 80).toFixed(0) + 'px')
        el.style.animation = 'dshBubbleLife ' + life.toFixed(0) + 'ms ease-in-out infinite'
        el.style.animationDelay = (-Math.random() * life).toFixed(0) + 'ms'
      }
      bg.appendChild(el)
    }
  }

  const root = document.getElementById('root')
  document.body.insertBefore(bg, root || document.body.firstChild)

  return function () {
    for (const d of disposers) { try { d() } catch (e) { /* ignore */ } }
    try { bg.remove() } catch (e) { /* ignore */ }
  }
}

export function apply(ctx: any): void {
  const theme = ctx.get('theme')
  const slots = ctx.get('slots')
  if (theme === undefined || slots === undefined) return

  // Ambient/glow CSS injected as plugin-owned <style> tags; removed on unload.
  const ambientTag = document.createElement('style')
  ambientTag.dataset.plugin = 'dsh-theme-synthwave'
  ambientTag.dataset.pluginCss = 'ambient'
  ambientTag.textContent = buildAmbientCss()
  document.head.appendChild(ambientTag)
  ctx.effect(() => () => { ambientTag.remove() })

  function BackgroundController() {
    useEffect(() => {
      let disposed = false
      const disposers: Array<() => void> = []
      void (async () => {
        let cfg: any = { textGlow: null, background: { video: null, images: [], slideshow: {}, baseAlpha: 0.5 }, fontScale: 1 }
        try {
          const res = await fetch('/synthwave-theme-config')
          cfg = await res.json()
        } catch (e) { /* keep defaults */ }
        if (disposed) return

        disposers.push(theme.overrideTokens('dsh-theme-synthwave', buildTokens(cfg.background.baseAlpha)))

        const glowTag = document.createElement('style')
        glowTag.dataset.plugin = 'dsh-theme-synthwave'
        glowTag.dataset.pluginCss = 'glow'
        glowTag.textContent = buildGlowCss(cfg.textGlow)
        document.head.appendChild(glowTag)
        disposers.push(() => { glowTag.remove() })

        const fs2 = typeof cfg.fontScale === 'number' && cfg.fontScale > 0 ? cfg.fontScale : 1
          // Root font-size scales rem/em typography without changing layout or
          // fixed-position popup geometry in Firefox.
        const fontScaleTag = document.createElement('style')
        fontScaleTag.dataset.plugin = 'dsh-theme-synthwave'
        fontScaleTag.dataset.pluginCss = 'font-scale'
        fontScaleTag.textContent = 'html { font-size: ' + (Math.round(fs2 * 10000) / 100) + '%; }'
        document.head.appendChild(fontScaleTag)
        disposers.push(() => { fontScaleTag.remove() })

        disposers.push(injectBackground(cfg))
      })()
      return () => {
        disposed = true
        for (const d of disposers) { try { d() } catch (e) { /* ignore */ } }
      }
    }, [])
    return null
  }

  slots.inject('shell.overlay', () => slots.register(
    { name: 'shell.overlay', id: 'dsh-theme-synthwave-hud', order: -1000 },
    () => createElement(
      'div',
      { className: 'dsh-synthwave-overlay', 'aria-hidden': 'true' },
      createElement('div', { className: 'dsh-synthwave-scanlines' }),
      createElement('div', { className: 'dsh-synthwave-glow' }),
      createElement('div', { className: 'dsh-synthwave-vignette' }),
      createElement(BackgroundController),
    ),
  ))

    slots.inject('settings.plugin.item', () => slots.register(
      { name: 'settings.plugin.item', id: 'dsh-theme-synthwave-config', order: 100 },
      () => createElement(OpenConfigCard),
    ))

}
