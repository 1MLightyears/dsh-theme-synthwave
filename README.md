# dsh-theme-synthwave

> 📖 English documentation: [README_en.md](./README_en.md)

给 DSH（DeepSeek Harness）Web UI 用的合成波 / Synthwave 主题插件。

单包同时包含 host 端（配置读取、媒体文件服务）与 client 端（主题 token、霓虹发光、背景媒体、字号缩放），安装即用。背景支持本地图片轮播或视频，面板可半透明透出媒体，并带有可配置的霓虹 glow、模糊与全局字号缩放。

![showcase](showcase.png)

## ✨ 功能

- **霓虹发光 hover/focus**：对链接、按钮、`role="button"` 等可点击控件添加多层 text-shadow 发光，hover/focus 时切换颜色。
- **半透明面板透出背景**：通过 `background.baseAlpha` 调整应用底色/侧边栏透明度，透出背后的图片或视频。
- **背景图片轮播**：多张图片按顺序或随机轮播，可配置透明度和切换间隔。
- **背景视频**：支持本地视频或 `http(s)` 视频地址，可配置循环、静音与 `object-fit`。
- **背景媒体/默认气泡模糊**：`blur` 0~40px，只作用于渲染层，不修改源文件。
- **根字号缩放 `fontScale`**：通过根字号缩放文本，避免 Firefox 下 CSS `zoom` 导致的命中区域和弹窗定位异常。
- **深浅色自适应 token**：深色模式保持合成波霓虹观感；浅色模式自动切换为浅底深字，避免白字看不清。
- **配置卡片快捷入口**：在「插件配置」页提供「打开配置文件」「复制路径」按钮，快速打开或复制当前 profile 的 `config.dsh-theme-synthwave.jsonc`。
- **媒体记录可移除**：在配置卡片中可移除已设置的视频，并逐张移除图片列表中的任意图片，改动即时写回本地配置。
- **编辑安全**：配置文件编辑器支持「取消」撤销未保存修改；配置文件解析出错时自动兜底为默认配置（不改动原文件），并在界面给出提示。

## 🚀 快速开始

1. **安装插件**

   ```bash
   # 本地目录
   dsh plugin --profile web add link:<本仓库根目录>

   # Git 仓库（发布到 GitHub 后）
   dsh plugin --profile web add "git+https://github.com/<你的用户名>/dsh-theme-synthwave.git"

   # npm（发布后）
   dsh plugin --profile web add dsh-theme-synthwave
   ```

   > **Git 安装说明**：`git+` 安装拉取的是**源码**（不是构建产物），DSH/pnpm 会在安装后运行本包的 `prepare` 脚本，从 `src/` 构建出 `lib/`。pnpm ≥10 出于安全默认拒绝运行 git 依赖的 `prepare`：第一次 `add` 会失败，`dsh` 会提示把 pnpm 打印的**确切包键**复制进该 profile 的 `pnpm-workspace.yaml`，例如：
   >
   > ```yaml
   > allowBuilds:
   >   dsh-theme-synthwave: true
   > ```
   >
   > 然后重新执行 `add` 即可。建议锁定 commit（`git+https://…git#<sha>`），确保后续推送不会悄悄改变实际运行的代码。
   >

   如果你的仓库是 monorepo 且插件在子目录中：

   ```bash
   dsh plugin --profile web add "git+https://github.com/<你的用户名>/<repo>.git#subdirectory=path/to/dsh-theme-synthwave"
   ```
2. **创建/编辑配置**

   首次打开页面时，插件会自动在当前 profile 目录生成 `config.dsh-theme-synthwave.jsonc`（使用内置默认值）。你也可以参考 [`config.dsh-theme-synthwave.example.jsonc`](./config.dsh-theme-synthwave.example.jsonc) 手动创建。配置文件位于当前 profile 目录，而不是会话工作区。
3. **准备背景素材**

   准备好图片/视频素材后，在配置界面上传（参见下方**配置**段落）。
4. **重启并刷新**

   首次安装后重启 DSH，浏览器打开页面后硬刷新即可看到效果。之后修改 `config.dsh-theme-synthwave.jsonc` 只需硬刷新页面。

## ⚙️ 配置

也可以在 DSH 设置 → 插件配置 → 「DeepSeek Harness: 合成波风格主题」卡片中，直接打开或复制当前 profile 的配置文件路径。

![settings](settings.png)

插件会在当前 profile 目录（通常为 `$DSH_HOME/profiles/<profile>/`）查找 `config.dsh-theme-synthwave.jsonc`；不存在时自动用内置默认值创建一份。[`config.dsh-theme-synthwave.example.jsonc`](./config.dsh-theme-synthwave.example.jsonc) 是带逐项注释的参考模板，可直接照注释修改。

在「DeepSeek Harness: 合成波风格主题」卡片中可直接完成常用操作：选择/上传图片或视频、从「当前背景媒体」列表移除视频或单张图片、通过 URL / 裸文件名快速应用媒体源、以及编辑配置文件原文（「保存」写入，「取消」撤销未保存修改）。若配置文件解析失败，插件会临时套用默认配置且**不改动原文件**，并在界面提示你删除该文件让其自动重建默认配置，或参考示例文件修复。

一个不带注释的精简示例：

```jsonc
{
  "textGlow": {
    "enabled": true,
    "alpha": 0.6,
    "hoverAlpha": 0.85,
    "blurEm": 0.30,
    "colors": ["#ff2a6d"],
    "hoverColors": ["#05d9e8"],
    "suppressHoverFill": true
  },
  "fontScale": 1.15,
  "background": {
    "baseAlpha": 0.5,
    "blur": 2,
    "defaultEffect": 1,
    "video": {
      "path": "background.mp4",
      "loop": true,
      "muted": true,
      "objectFit": "cover"
    },
    "images": {
      "paths": ["background.jpg"],
      "alpha": 0.85,
      "intervalMs": 60000,
      "order": "sequential"
    }
  }
}
```

修改 `config.dsh-theme-synthwave.jsonc` 后，浏览器硬刷新页面即可重新拉取配置；安装/卸载插件本身才需要重启 DSH。

## 🔌 服务端点

| 路径                                    | 说明                                                         |
| --------------------------------------- | ------------------------------------------------------------ |
| `GET /synthwave-theme-config`         | 返回解析后的 JSON 配置（含`configPath`），供浏览器端应用。 |
| `POST /synthwave-theme-config/open`   | 使用系统默认方式打开当前 profile 的配置文件。                |
| `POST /synthwave-theme-config/remove` | 移除视频记录，或从图片列表中移除指定图片，并写回配置。       |
| `GET /synthwave-theme-media/<文件名>` | 读取并返回背景图片/视频字节（上限 512MB）。                  |

## ❓ 常见问题

- **背景媒体没有显示**：确认 `config.dsh-theme-synthwave.jsonc` 位于当前 profile 目录、媒体路径可解析，并已硬刷新页面。相关参数说明见 [`config.dsh-theme-synthwave.example.jsonc`](./config.dsh-theme-synthwave.example.jsonc)。
- **视频没有声音**：背景视频默认静音，这是浏览器自动播放策略的预期行为；详见 `config.dsh-theme-synthwave.example.jsonc` 中的 `video.muted` 注释。

## 📁 项目结构

```
.
├── src/
│   ├── host/
│   │   └── index.ts          # host 端：读取配置、服务媒体与配置端点
│   └── client/
│       ├── index.ts          # client 端：token / glow / 背景 / 模糊 / 字号缩放
│       └── OpenConfigCard.ts # 插件配置卡片：打开/复制配置文件
├── lib/                      # 构建产物（勿手改）
│   ├── index.js
│   └── client.js
├── build/                    # vendored DSH client-bundle 构建 preset
├── cordis.patch.yml          # bundle 补丁
├── tsdown.config.ts          # tsdown 构建入口
├── config.dsh-theme-synthwave.example.jsonc  # 配置模板
└── package.json
```

## 🛠️ 开发

```bash
pnpm install   # 同时会触发 prepare 脚本自动构建 lib/
pnpm build     # tsdown → lib/index.js + lib/client.js
```

构建产物输出到 `lib/`，发布前无需手动修改 `lib/` 内容。注意：host 端代码在 DSH 进程启动时加载，修改后需要重启 `dsh --profile web` 进程；仅刷新浏览器只会重载 client 端。

## 📄 License

[Apache-2.0](./LICENSE)
