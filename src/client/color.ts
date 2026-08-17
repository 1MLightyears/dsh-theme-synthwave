// 颜色计算工具：十六进制转 rgba、HSL 色相旋转、生成霓虹发光色，供主题 CSS 与气泡背景复用。

/** 把 #hex 颜色转为 rgba() 并附加透明度；非 hex 输入原样返回。 */
export function hexRgba(color: string, alpha: number): string {
  const c = String(color).trim()
  if (c.charAt(0) === '#') {
    // 支持 #rgb 缩写，先展开为 #rrggbb。
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

/** 对 #hex 颜色做 HSL 色相旋转（deg 度），返回 rgb()；非 hex 输入原样返回。 */
export function hueShift(color: string, deg: number): string {
  const c = String(color).trim()
  let h = c
  if (h.charAt(0) === '#') {
    // 支持 #rgb 缩写，先展开为 #rrggbb。
    if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]
    if (h.length === 7) {
      // Step 1. 解析 RGB 并归一化到 0..1。
      const r = parseInt(h.slice(1, 3), 16) / 255
      const g = parseInt(h.slice(3, 5), 16) / 255
      const b = parseInt(h.slice(5, 7), 16) / 255
      // Step 2. 转 HSL，计算色相 hh、饱和度 s、亮度 l。
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
      // Step 3. 叠加旋转角度，再转回 RGB。
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

/** 生成霓虹发光色：hex 转 rgba()，其他颜色转 color-mix() 半透明写法。 */
export function glowColor(color: string, alpha: number): string {
  const c = String(color).trim()
  if (c.charAt(0) === '#') {
    // 支持 #rgb 缩写，先展开为 #rrggbb。
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
