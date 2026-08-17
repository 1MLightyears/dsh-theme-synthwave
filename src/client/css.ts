// CSS 生成工具：主题 token、霓虹发光规则与氛围叠加层（扫描线/光晕/暗角）的样式文本。

import { hexRgba, glowColor } from './color.ts'

/** 需要施加霓虹发光效果的元素选择器（链接/按钮/各类 role 交互元素）。 */
const GLOW_SELECTORS = ['a[href]', 'button', '[role="button"]', '[role="tab"]', '[role="menuitem"]', '[role="link"]']

/** 生成主题 CSS 变量 token（明暗两套），alpha 控制半透明面板的透明度。 */
export function buildTokens(baseAlpha: number): Record<string, { light: string; dark: string }> {
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

/** 生成霓虹 text-shadow 的 CSS 规则；发光关闭时返回空串。 */
export function buildGlowCss(g: any): string {
  if (!g || g.enabled === false) return ''
  const baseColors = (Array.isArray(g.colors) && g.colors.length ? g.colors : ['#ff2a6d']) as string[]
  const hoverColors = (Array.isArray(g.hoverColors) && g.hoverColors.length ? g.hoverColors : ['#05d9e8']) as string[]
  const alpha = typeof g.alpha === 'number' ? g.alpha : 0.6
  const hoverAlpha = typeof g.hoverAlpha === 'number' ? g.hoverAlpha : 0.85
  const blurEm = typeof g.blurEm === 'number' ? g.blurEm : 0.30
  const suppress = g.suppressHoverFill !== false

  // 组装基础阴影与 hover 阴影（hover 时模糊半径放大 1.5 倍）。
  const baseShadow = baseColors.map((c) => '0 0 ' + blurEm + 'em ' + glowColor(c, alpha)).join(', ')
  const hoverShadow = hoverColors.map((c) => '0 0 ' + (blurEm * 1.5) + 'em ' + glowColor(c, hoverAlpha)).join(', ')

  const selAll = GLOW_SELECTORS.join(', ')
  const selHover = GLOW_SELECTORS.map((s) => s + ':hover').join(', ')
  const selFocus = GLOW_SELECTORS.map((s) => s + ':focus').join(', ')
  const selHoverFocus = GLOW_SELECTORS.map((s) => s + ':hover, ' + s + ':focus').join(', ')

  // 可选：抑制 hover 背景填充与 focus 描边，让发光成为唯一反馈。
  let chrome = ''
  if (suppress) {
    chrome = '\n' + selHover + ' { background-color: transparent !important; }\n'
      + selFocus + ' { outline: none !important; border-color: transparent !important; box-shadow: none !important; }'
  }

  return '\n' + selAll + ' {\n  transition: text-shadow .15s ease, background-color .15s ease;\n  text-shadow: ' + baseShadow + ';\n}\n'
    + selHoverFocus + ' { text-shadow: ' + hoverShadow + '; }\n' + chrome
}

/** 生成氛围叠加层 CSS：扫描线、暗角、呼吸光晕，以及气泡动画的关键帧。 */
export function buildAmbientCss(): string {
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
