# dsh-theme-synthwave

> 📖 中文文档：[README.md](./README.md)

A Synthwave theme plugin for the DSH (DeepSeek Harness) Web UI.

One package ships both the host half (config reading, media file serving) and the client half (theme tokens, neon glow, background media, font scaling), ready to use after installation. The background supports local image slideshows or video, semi-transparent panels that let the media show through, plus configurable neon glow, blur, and global font scaling.

![showcase](showcase.png)

## ✨ Features

- **Neon glow on hover/focus**: adds layered `text-shadow` glow to links, buttons, `role="button"` and other clickable controls, switching colors on hover/focus.
- **Semi-transparent panels revealing the background**: adjust the app/sidebar background opacity with `background.baseAlpha` to let the image or video behind show through.
- **Background image slideshow**: cycle multiple images sequentially or randomly, with configurable opacity and interval.
- **Background video**: supports local video files or `http(s)` URLs, with configurable loop, mute, and `object-fit`.
- **Background media / default bubble blur**: `blur` 0–40px, applied only at the render layer without touching the source files.
- **Root font scaling `fontScale`**: scales text via the root font size, avoiding CSS `zoom` hit-target and popup-positioning issues in Firefox.
- **Light/dark adaptive tokens**: dark mode keeps the synthwave neon look; light mode automatically switches to a light background with dark text to stay readable.
- **Config card shortcut**: in the Plugins configuration page, the card offers "Open config file" and "Copy path" buttons to quickly open or copy the current profile's `config.dsh-theme-synthwave.jsonc`.
- **Removable media**: the config card can remove a configured video, and remove any single image from the image list; changes are written back to the local config immediately.
- **Editing safety**: the config file editor supports a "Cancel" action to discard unsaved changes; if the config fails to parse, the plugin falls back to defaults (without touching the file) and shows a notice in the UI.

## 🚀 Quick start

1. **Install the plugin**

   ```bash
   # Local directory
   dsh plugin --profile web add link:<repo root>

   # Git repository (after publishing to GitHub)
   dsh plugin --profile web add "git+https://github.com/<your-username>/dsh-theme-synthwave.git"

   # npm (after publishing)
   dsh plugin --profile web add dsh-theme-synthwave
   ```

   > **Git install note**: a `git+` install fetches the **source** (not built artifacts); DSH/pnpm runs this package's `prepare` script after install to build `lib/` from `src/`. pnpm ≥10 refuses to run a git dependency's `prepare` until you allow it: the first `add` fails and `dsh` prints the exact package key to copy into that profile's `pnpm-workspace.yaml`, e.g.:
   >
   > ```yaml
   > allowBuilds:
   >   dsh-theme-synthwave: true
   > ```
   >
   > Then re-run `add`. Lock the commit (`git+https://…#<sha>`) so later pushes cannot silently change what runs.
   >

   If your repository is a monorepo and the plugin lives in a subdirectory:

   ```bash
   dsh plugin --profile web add "git+https://github.com/<your-username>/<repo>.git#subdirectory=path/to/dsh-theme-synthwave"
   ```
2. **Create/edit the config**

   On first page load, the plugin automatically generates `config.dsh-theme-synthwave.jsonc` in the current profile directory (using built-in defaults). You can also create it manually by following [`config.dsh-theme-synthwave.example.jsonc`](./config.dsh-theme-synthwave.example.jsonc). The config file lives in the current profile directory, not the session workspace.
3. **Prepare background assets**

   Put images or videos in the same directory as `config.dsh-theme-synthwave.jsonc` (absolute paths and `http(s)` URLs also work).

   > **Current directory**: the base directory that `.` (or any relative path) in `background.video.path` / `background.images.paths` resolves against is the directory containing `config.dsh-theme-synthwave.jsonc` — i.e. the current profile directory (usually `$DSH_HOME/profiles/<profile>/`). It is **not** the session workspace and **not** the plugin package directory.
   >
4. **Restart and refresh**

   Restart DSH after the first install, then hard-refresh the page in the browser to see the effect. Afterwards, changing `config.dsh-theme-synthwave.jsonc` only requires a hard refresh.

## ⚙️ Configuration

You can also open or copy the current profile's config file path from the "DeepSeek Harness: 合成波风格主题" card in DSH Settings → Plugins → Plugin configuration.

![settings](settings.png)

The plugin looks for `config.dsh-theme-synthwave.jsonc` in the current profile directory (usually `$DSH_HOME/profiles/<profile>/`); if it does not exist, the plugin creates one with built-in defaults. [`config.dsh-theme-synthwave.example.jsonc`](./config.dsh-theme-synthwave.example.jsonc) is a commented reference template you can follow.

In the "DeepSeek Harness: 合成波风格主题" card you can perform the common operations directly: choose/upload an image or video, remove a video or a single image from the "Current background media" list, apply a media source via URL or bare filename, and edit the config file text ("Save" writes it, "Cancel" discards unsaved changes). If the config file fails to parse, the plugin temporarily applies defaults **without modifying the file**, and shows a notice suggesting you delete it (the plugin will recreate a default) or fix it against the example file.

A minimal example without comments:

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

	After changing `config.dsh-theme-synthwave.jsonc`, hard-refresh the page to reload the config; only installing/uninstalling the plugin itself requires a DSH restart.

## 🔌 Service endpoints

| Path                                      | Description                                                                                         |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `GET /synthwave-theme-config`           | Returns the resolved JSON config (including`configPath`) for the browser half.                    |
| `POST /synthwave-theme-config/open`     | Opens the current profile's config file with the OS default handler.                                |
| `POST /synthwave-theme-config/remove`   | Removes the video record, or removes a given image from the image list, and writes the config back. |
| `GET /synthwave-theme-media/<filename>` | Reads and returns background image/video bytes (512MB cap).                                         |

## ❓ FAQ

- **Background media doesn't show**: make sure `config.dsh-theme-synthwave.jsonc` is in the current profile directory, the media path resolves, and you have hard-refreshed the page. See [`config.dsh-theme-synthwave.example.jsonc`](./config.dsh-theme-synthwave.example.jsonc) for parameter details.
- **Video has no sound**: background video is muted by default, which is expected under browser autoplay policy; see the `video.muted` comment in `config.dsh-theme-synthwave.example.jsonc`.

## 📁 Project structure

```
.
├── src/
│   ├── host/
│   │   └── index.ts          # host half: reads config, serves media and config endpoints
│   └── client/
│       ├── index.ts          # client half: tokens / glow / background / blur / font scaling
│       └── OpenConfigCard.ts # plugin config card: open/copy the config file
├── lib/                      # build output (do not edit by hand)
│   ├── index.js
│   └── client.js
├── build/                    # vendored DSH client-bundle build preset
├── cordis.patch.yml          # bundle patch
├── tsdown.config.ts          # tsdown build entry
├── config.dsh-theme-synthwave.example.jsonc  # config template
└── package.json
```

## 🛠️ Development

```bash
pnpm install   # also runs `prepare` to build lib/
pnpm build     # tsdown → lib/index.js + lib/client.js
```

Build output goes to `lib/`; do not edit `lib/` by hand before publishing. Note: the host half loads when the DSH process starts, so changing it requires restarting `dsh --profile web`; a browser refresh only reloads the client half.

## 📄 License

[Apache-2.0](./LICENSE)
