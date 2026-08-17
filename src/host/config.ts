// 配置常量：包根目录、示例配置路径、默认 JSONC 模板与运行时默认值。

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 包根目录（lib/ 的上一级）与随包发布的示例配置路径。 */
export const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
export const EXAMPLE_CONFIG_PATH = join(PACKAGE_ROOT, 'config.dsh-theme-synthwave.example.jsonc')

/** 当前 profile 下的配置文件文件名。 */
export const CONFIG_FILENAME = 'config.dsh-theme-synthwave.jsonc'

/** 新建 profile 配置时写入的默认 JSONC 模板。 */
export const DEFAULT_CONFIG_JSONC = `{
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

/** 读取配置失败 / 未配置字段时的运行时默认值（作为合并基底）。 */
export const DEFAULTS = {
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
