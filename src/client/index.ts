// dsh-theme-synthwave 浏览器端入口：注入霓虹发光、半透明面板 token、背景（视频/图片/气泡）、
// 字号缩放，并把合成波风格主题的配置卡片挂到设置页。配置由宿主端 /synthwave-theme-config 提供。

import { createElement, useEffect } from 'react'
import { OpenConfigCard } from './OpenConfigCard.ts'
import { buildTokens, buildGlowCss, buildAmbientCss } from './css.ts'
import { injectBackground } from './background.ts'

/** 浏览器端排错日志前缀，便于在 DevTools 控制台 grep 本插件。 */
const LOG_PREFIX = '[dsh-theme-synthwave]'

/** 输出一条浏览器端排错日志（交互逻辑前调用，方便定位主题加载卡在哪一步）。 */
function log(message: string): void {
  console.log(LOG_PREFIX + ' ' + message)
}

export function apply(ctx: any): void {
  const theme = ctx.get('theme')
  const slots = ctx.get('slots')
  if (theme === undefined || slots === undefined) return
  log('浏览器端主题插件加载')

  // 氛围/发光 CSS 作为插件自有的 <style> 标签注入，卸载时移除。
  const ambientTag = document.createElement('style')
  ambientTag.dataset.plugin = '@1MLightyears/dsh-theme-synthwave'
  ambientTag.dataset.pluginCss = 'ambient'
  ambientTag.textContent = buildAmbientCss()
  document.head.appendChild(ambientTag)
  ctx.effect(() => () => { ambientTag.remove() })

  /** 背景控制器组件：拉取配置并应用 token、发光、字号与背景，卸载时全部清理。 */
  function BackgroundController() {
    useEffect(() => {
      let disposed = false
      const disposers: Array<() => void> = []
      void (async () => {
        let cfg: any = { textGlow: null, background: { video: null, images: [], slideshow: {}, baseAlpha: 0.5 }, fontScale: 1 }
        try {
          log('拉取主题配置')
          const res = await fetch('/synthwave-theme-config')
          cfg = await res.json()
        } catch (e) { /* 拉取失败则保留默认配置 */ }
        if (disposed) return

        disposers.push(theme.overrideTokens('dsh-theme-synthwave', buildTokens(cfg.background.baseAlpha)))

        // 注入霓虹发光样式。
        const glowTag = document.createElement('style')
        glowTag.dataset.plugin = '@1MLightyears/dsh-theme-synthwave'
        glowTag.dataset.pluginCss = 'glow'
        glowTag.textContent = buildGlowCss(cfg.textGlow)
        document.head.appendChild(glowTag)
        disposers.push(() => { glowTag.remove() })

        // 根字号缩放 rem/em 排版，不改变布局或 Firefox 下固定定位弹窗的几何形状。
        const fs2 = typeof cfg.fontScale === 'number' && cfg.fontScale > 0 ? cfg.fontScale : 1
        const fontScaleTag = document.createElement('style')
        fontScaleTag.dataset.plugin = '@1MLightyears/dsh-theme-synthwave'
        fontScaleTag.dataset.pluginCss = 'font-scale'
        fontScaleTag.textContent = 'html { font-size: ' + (Math.round(fs2 * 10000) / 100) + '%; }'
        document.head.appendChild(fontScaleTag)
        disposers.push(() => { fontScaleTag.remove() })

        // 注入背景（视频 / 图片轮播 / 气泡）。
        disposers.push(injectBackground(cfg))
      })()
      return () => {
        disposed = true
        for (const d of disposers) { try { d() } catch (e) { /* ignore */ } }
      }
    }, [])
    return null
  }

  // 把氛围叠加层注入 shell.overlay 槽位。
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

  // 把配置卡片注入设置页插件项槽位。
  slots.inject('settings.plugin.item', () => slots.register(
    { name: 'settings.plugin.item', id: 'dsh-theme-synthwave-config', order: 100 },
    () => createElement(OpenConfigCard),
  ))
}
