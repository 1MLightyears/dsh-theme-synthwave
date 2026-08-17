import { existsSync } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
//#region src/host/jsonc.ts
/**
* 去掉 JSONC 文本中的注释，并清理尾随逗号，返回可直接交给 JSON.parse 的纯 JSON 字符串。
* @param text 原始 JSONC 文本。
*/
function stripJsoncComments(text) {
	let out = "";
	let inString = false;
	let inLine = false;
	let inBlock = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		const n = text[i + 1];
		if (inLine) {
			if (c === "\n") {
				inLine = false;
				out += c;
			}
			continue;
		}
		if (inBlock) {
			if (c === "*" && n === "/") {
				inBlock = false;
				i++;
			}
			continue;
		}
		if (inString) {
			out += c;
			if (c === "\\" && n !== void 0) {
				out += n;
				i++;
				continue;
			}
			if (c === "\"") inString = false;
			continue;
		}
		if (c === "\"") {
			inString = true;
			out += c;
			continue;
		}
		if (c === "/" && n === "/") {
			inLine = true;
			i++;
			continue;
		}
		if (c === "/" && n === "*") {
			inBlock = true;
			i++;
			continue;
		}
		out += c;
	}
	return out.replace(/,\s*([}\]])/g, "$1");
}
/** 解析 JSONC 文本为 JS 对象（注释会被忽略）。 */
function parseJsonc(text) {
	return JSON.parse(stripJsoncComments(text));
}
/** 从下标 i 起跳过空白与 JSONC 注释，返回第一个有效字符的下标。 */
function skipTrivia(text, i) {
	while (i < text.length) {
		const c = text[i];
		if (c === " " || c === "	" || c === "\n" || c === "\r") {
			i++;
			continue;
		}
		if (c === "/" && text[i + 1] === "/") {
			i += 2;
			while (i < text.length && text[i] !== "\n") i++;
			continue;
		}
		if (c === "/" && text[i + 1] === "*") {
			const e = text.indexOf("*/", i + 2);
			if (e < 0) return text.length;
			i = e + 2;
			continue;
		}
		break;
	}
	return i;
}
/** 在文本中定位 blockKey 属性对应的 `{ ... }` 对象区间（首个双引号匹配）。 */
function findBlockSpan(text, blockKey) {
	const keyRe = new RegExp("\"" + blockKey + "\"\\s*:", "g");
	while (keyRe.exec(text) !== null) {
		const i = skipTrivia(text, keyRe.lastIndex);
		if (text[i] !== "{") continue;
		let j = i + 1;
		let depth = 1;
		let inStr = false;
		let strCh = "";
		while (j < text.length && depth > 0) {
			const c = text[j];
			if (inStr) {
				if (c === "\\") {
					j += 2;
					continue;
				}
				if (c === strCh) inStr = false;
				j++;
				continue;
			}
			if (c === "\"" || c === "'") {
				inStr = true;
				strCh = c;
				j++;
				continue;
			}
			if (c === "{") depth++;
			else if (c === "}") depth--;
			j++;
		}
		return {
			start: i,
			end: j
		};
	}
	return null;
}
/** 在文本中定位 propKey 属性的字符串/数组值区间，保留原始片段与类型。 */
function findPropValue(text, propKey) {
	const keyRe = new RegExp("\"" + propKey + "\"\\s*:", "g");
	while (keyRe.exec(text) !== null) {
		const i = skipTrivia(text, keyRe.lastIndex);
		const ch = text[i];
		if (ch === "\"" || ch === "'") {
			let j = i + 1;
			while (j < text.length) {
				const c = text[j];
				if (c === "\\") {
					j += 2;
					continue;
				}
				if (c === ch) {
					j++;
					break;
				}
				j++;
			}
			return {
				start: i,
				end: j,
				raw: text.slice(i, j),
				kind: "string"
			};
		}
		if (ch === "[") {
			let j = i + 1;
			let depth = 1;
			let inStr = false;
			let strCh = "";
			while (j < text.length && depth > 0) {
				const c = text[j];
				if (inStr) {
					if (c === "\\") {
						j += 2;
						continue;
					}
					if (c === strCh) inStr = false;
					j++;
					continue;
				}
				if (c === "\"" || c === "'") {
					inStr = true;
					strCh = c;
					j++;
					continue;
				}
				if (c === "[") depth++;
				else if (c === "]") depth--;
				j++;
			}
			return {
				start: i,
				end: j,
				raw: text.slice(i, j),
				kind: "array"
			};
		}
	}
	return null;
}
/** 在 blockKey 对象内替换一个字符串属性值，保留原有注释；找不到时返回 null。 */
function setStringProp(raw, blockKey, propKey, value) {
	const block = findBlockSpan(raw, blockKey);
	if (block === null) return null;
	const prop = findPropValue(raw.slice(block.start, block.end), propKey);
	if (prop === null || prop.kind !== "string") return null;
	const start = block.start + prop.start;
	const end = block.start + prop.end;
	return raw.slice(0, start) + JSON.stringify(value) + raw.slice(end);
}
/** 在 blockKey 对象内向数组属性追加一个值，保留原有注释；找不到时返回 null。 */
function appendArrayProp(raw, blockKey, propKey, value) {
	const block = findBlockSpan(raw, blockKey);
	if (block === null) return null;
	const prop = findPropValue(raw.slice(block.start, block.end), propKey);
	if (prop === null || prop.kind !== "array") return null;
	const inner = prop.raw.slice(1, -1).trim();
	const arrText = inner ? "[" + inner + ", " + JSON.stringify(value) + "]" : "[" + JSON.stringify(value) + "]";
	const start = block.start + prop.start;
	const end = block.start + prop.end;
	return raw.slice(0, start) + arrText + raw.slice(end);
}
/** 编辑配置文本：设置 video.path 或追加 images.paths；优先原地编辑（保留注释），失败时退回解析重写。 */
function applyConfigEdit(raw, kind, value) {
	if (kind === "video") {
		const edited = setStringProp(raw, "video", "path", value);
		if (edited !== null) return edited;
	} else {
		const edited = appendArrayProp(raw, "images", "paths", value);
		if (edited !== null) return edited;
	}
	const obj = parseJsonc(raw);
	const bg = obj.background || (obj.background = {});
	if (kind === "video") {
		const video = bg.video || (bg.video = {});
		video.path = value;
	} else {
		const images = bg.images || (bg.images = {});
		const paths = Array.isArray(images.paths) ? images.paths.slice() : [];
		if (paths.indexOf(value) === -1) paths.push(value);
		images.paths = paths;
	}
	return JSON.stringify(obj, null, 2) + "\n";
}
/** 在 blockKey 对象内把数组属性整体重写为 values，保留块外注释；找不到时返回 null。 */
function setArrayProp(raw, blockKey, propKey, values) {
	const block = findBlockSpan(raw, blockKey);
	if (block === null) return null;
	const prop = findPropValue(raw.slice(block.start, block.end), propKey);
	if (prop === null || prop.kind !== "array") return null;
	const start = block.start + prop.start;
	const end = block.start + prop.end;
	const arrText = "[" + values.map((v) => JSON.stringify(v)).join(", ") + "]";
	return raw.slice(0, start) + arrText + raw.slice(end);
}
/** 从 images.paths 中移除指定值并重写该数组（保留其他注释）；找不到或解析失败返回 null。 */
function removeImageProp(raw, value) {
	const block = findBlockSpan(raw, "images");
	if (block === null) return null;
	const prop = findPropValue(raw.slice(block.start, block.end), "paths");
	if (prop === null || prop.kind !== "array") return null;
	let paths;
	try {
		paths = parseJsonc(prop.raw);
	} catch {
		return null;
	}
	if (!Array.isArray(paths)) return null;
	return setArrayProp(raw, "images", "paths", paths.filter((p) => p !== value));
}
/** 移除配置：清除 video.path 或从 images.paths 移除指定值；优先原地编辑，失败退回解析重写。 */
function applyConfigRemove(raw, kind, value) {
	if (kind === "video") {
		const edited = setStringProp(raw, "video", "path", "");
		if (edited !== null) return edited;
	} else {
		const edited = removeImageProp(raw, value);
		if (edited !== null) return edited;
	}
	const obj = parseJsonc(raw);
	const bg = obj.background || (obj.background = {});
	if (kind === "video") {
		const video = bg.video || (bg.video = {});
		video.path = "";
	} else {
		const images = bg.images || (bg.images = {});
		images.paths = Array.isArray(images.paths) ? images.paths.filter((p) => p !== value) : [];
	}
	return JSON.stringify(obj, null, 2) + "\n";
}
/** 从容错地提取媒体引用：即使配置文件整体解析失败，也尽量读回 video.path 与 images.paths。 */
function extractSources(raw) {
	const out = {
		video: "",
		images: []
	};
	const videoBlock = findBlockSpan(raw, "video");
	if (videoBlock !== null) {
		const prop = findPropValue(raw.slice(videoBlock.start, videoBlock.end), "path");
		if (prop !== null && prop.kind === "string") try {
			const v = JSON.parse(stripJsoncComments(prop.raw));
			if (typeof v === "string") out.video = v;
		} catch {}
	}
	const imagesBlock = findBlockSpan(raw, "images");
	if (imagesBlock !== null) {
		const prop = findPropValue(raw.slice(imagesBlock.start, imagesBlock.end), "paths");
		if (prop !== null && prop.kind === "array") try {
			const arr = JSON.parse(stripJsoncComments(prop.raw));
			if (Array.isArray(arr)) out.images = arr.filter((p) => typeof p === "string");
		} catch {}
	}
	return out;
}
//#endregion
//#region src/host/media.ts
/** 取路径最后一段（兼容 / 与 \ 分隔符），空结果兜底为 'file'。 */
function basename(p) {
	const s = String(p).split(/[\\/]/);
	return s[s.length - 1] || "file";
}
/** 取文件扩展名（小写），无扩展名返回空串。 */
function extOf(name) {
	const m = /\.([a-zA-Z0-9]+)$/.exec(name);
	return m ? m[1].toLowerCase() : "";
}
/** 按扩展名映射 HTTP Content-Type，未知类型回退为通用二进制流。 */
function mimeOf(name) {
	return {
		mp4: "video/mp4",
		webm: "video/webm",
		ogg: "video/ogg",
		mov: "video/quicktime",
		m4v: "video/mp4",
		png: "image/png",
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		gif: "image/gif",
		webp: "image/webp",
		svg: "image/svg+xml",
		avif: "image/avif",
		bmp: "image/bmp",
		mp3: "audio/mpeg"
	}[extOf(name)] || "application/octet-stream";
}
/** 让名称成为安全的磁盘文件名 / 媒体路由键，同时保留 Unicode（中文、英文、emoji 等）。 */
function sanitizeName(name) {
	return basename(String(name)).replace(/[\u0000-\u001f\u007f]/g, "").replace(/[\\/:*?"<>|]/g, "_").replace(/^[. ]+/, "").replace(/[. ]+$/, "") || "media";
}
/** 支持的图片扩展名集合。 */
const IMAGE_EXTS = /* @__PURE__ */ new Set([
	"png",
	"jpg",
	"jpeg",
	"gif",
	"webp",
	"avif",
	"bmp",
	"svg"
]);
/** 支持的视频扩展名集合。 */
const VIDEO_EXTS = /* @__PURE__ */ new Set([
	"mp4",
	"webm",
	"ogg",
	"mov",
	"m4v"
]);
/** 上传体积上限（512MB）。 */
const MAX_UPLOAD_BYTES = 536870912;
/** 校验文件名扩展名是否属于指定媒体类型（image/video）。 */
function validExtFor(kind, name) {
	return (kind === "image" ? IMAGE_EXTS : VIDEO_EXTS).has(extOf(name));
}
/** 在 dir 目录下为（已清洗的）name 生成首个不冲突的文件路径。 */
function uniqueFilePath(dir, name) {
	const base = basename(name);
	const ext = extOf(base);
	const stem = ext ? base.slice(0, base.length - ext.length - 1) : base;
	let candidate = join(dir, base);
	let i = 1;
	while (existsSync(candidate)) {
		candidate = join(dir, ext ? stem + "-" + i + "." + ext : stem + "-" + i);
		i++;
	}
	return candidate;
}
/** 本地媒体引用必须是“裸文件名”；URL / 空值 / 含路径分隔符的值一律排除。 */
function bareNameOf(value) {
	if (typeof value !== "string") return null;
	const s = value.trim();
	if (s === "" || s === "." || s === "..") return null;
	if (/^https?:\/\//i.test(s)) return null;
	if (/[/\\]/.test(s)) return null;
	return s;
}
/** 收集解析后配置引用的“裸文件名”集合，按视频/图片分类，供清理孤立文件使用。 */
function collectReferencedBareNames(cfg) {
	const video = /* @__PURE__ */ new Set();
	const images = /* @__PURE__ */ new Set();
	const vn = bareNameOf(cfg && cfg.background && cfg.background.video ? cfg.background.video.path : void 0);
	if (vn !== null) video.add(vn);
	const paths = cfg && cfg.background && cfg.background.images && Array.isArray(cfg.background.images.paths) ? cfg.background.images.paths : [];
	for (const p of paths) {
		const n = bareNameOf(p);
		if (n !== null) images.add(n);
	}
	return {
		video,
		images
	};
}
//#endregion
//#region src/host/http.ts
/** 把请求体流式读入单个 Buffer，超过 maxBytes 或出错时返回 null。 */
async function readBody(req, maxBytes) {
	const chunks = [];
	let total = 0;
	try {
		for await (const chunk of req) {
			const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
			total += buf.length;
			if (total > maxBytes) return null;
			chunks.push(buf);
		}
	} catch {
		return null;
	}
	return Buffer.concat(chunks);
}
/** 读取并解析 JSON 请求体（上限 1MB），失败返回 null。 */
async function readJsonBody(req) {
	const buf = await readBody(req, 1048576);
	if (buf === null) return null;
	try {
		return JSON.parse(buf.toString("utf8"));
	} catch {
		return null;
	}
}
//#endregion
//#region src/host/system.ts
/** 从 Cordis 的 baseUrl（指向 profile 配置目录的 file URL）解析出 profile 目录路径。 */
function profileDirFromBaseUrl(baseUrl) {
	if (typeof baseUrl !== "string" || baseUrl === "") return null;
	try {
		if (/^[a-zA-Z]:[\\/]/.test(baseUrl) || baseUrl.startsWith("/") || baseUrl.startsWith("\\\\")) return baseUrl;
		return fileURLToPath(baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl);
	} catch {}
	return null;
}
/** 用操作系统默认程序打开文件；没有可用的打开器时 resolve(false)。 */
function openPath(file) {
	const platform = process.platform;
	const command = platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
	const args = platform === "win32" ? [
		"/c",
		"start",
		"",
		file
	] : [file];
	return new Promise((resolve) => {
		const child = spawn(command, args, { stdio: "ignore" });
		child.once("error", () => resolve(false));
		child.once("exit", (code) => resolve(code === 0));
	});
}
//#endregion
//#region src/host/config.ts
/** 包根目录（lib/ 的上一级）与随包发布的示例配置路径。 */
const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const EXAMPLE_CONFIG_PATH = join(PACKAGE_ROOT, "config.dsh-theme-synthwave.example.jsonc");
/** 当前 profile 下的配置文件文件名。 */
const CONFIG_FILENAME = "config.dsh-theme-synthwave.jsonc";
/** 新建 profile 配置时写入的默认 JSONC 模板。 */
const DEFAULT_CONFIG_JSONC = `{
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
`;
/** 读取配置失败 / 未配置字段时的运行时默认值（作为合并基底）。 */
const DEFAULTS = {
	textGlow: {
		enabled: true,
		alpha: .6,
		hoverAlpha: .85,
		blurEm: .3,
		colors: ["#ff2a6d"],
		hoverColors: ["#05d9e8"],
		suppressHoverFill: true
	},
	background: {
		baseAlpha: .5,
		blur: 2,
		defaultEffect: 1,
		video: {
			path: "",
			loop: true,
			muted: true,
			objectFit: "cover"
		},
		images: {
			paths: [],
			alpha: .85,
			intervalMs: 8e3,
			order: "sequential"
		}
	},
	fontScale: 1.06
};
//#endregion
//#region src/host/index.ts
/** 输出一条宿主端排错日志（交互逻辑前调用，方便定位请求卡在哪一步）。 */
function log(message) {
	console.log("[dsh-theme-synthwave] " + message);
}
function apply(ctx) {
	ctx.inject(["webServer", "fs"], (c) => {
		const fs = c.fs;
		const webServer = c.webServer;
		const profileDir = profileDirFromBaseUrl(c.root?.baseUrl ?? ctx.root?.baseUrl ?? c.baseUrl ?? ctx.baseUrl);
		const configPath = profileDir ? join(profileDir, CONFIG_FILENAME) : null;
		log("插件加载，profile 目录：" + (profileDir || "未知"));
		const nameToTarget = /* @__PURE__ */ new Map();
		const MEDIA_ROOT = profileDir ? join(profileDir, "dsh-theme-synthwave") : null;
		const KIND_DIR = {
			video: "video",
			image: "images"
		};
		/** 返回某媒体类型（video/image）在 profile 下的存储目录。 */
		function mediaDirOf(kind) {
			return MEDIA_ROOT ? join(MEDIA_ROOT, KIND_DIR[kind]) : null;
		}
		/** 尝试把 path 解析为已存在的本地文件；不存在则返回 null。 */
		async function resolveExisting(path, cwdOpts) {
			try {
				const t = await fs.resolve(String(path), cwdOpts);
				if (await fs.stat(t)) return t;
			} catch (e) {}
			return null;
		}
		/** 确保 profile 配置文件存在：不存在则以示例为模板新建（wx 独占创建，绝不覆盖已有配置）。 */
		async function ensureConfigFile() {
			if (configPath === null) return null;
			const example = DEFAULT_CONFIG_JSONC;
			try {
				await mkdir(dirname(configPath), { recursive: true });
				await writeFile(configPath, example, { flag: "wx" });
				log("已新建配置文件：" + configPath);
			} catch (e) {
				if (e.code !== "EEXIST") console.error("dsh-theme-synthwave: config create failed:", e?.message);
			}
			return configPath;
		}
		/** 读取并合并配置：以 DEFAULTS 为基底，逐层覆盖用户配置；同时返回原文供容错提取媒体引用。 */
		async function readConfig() {
			let cfg = DEFAULTS;
			let raw = null;
			try {
				const file = await ensureConfigFile();
				if (file !== null) {
					raw = await readFile(file, "utf8");
					const parsed = parseJsonc(raw);
					cfg = {
						...DEFAULTS,
						...parsed,
						textGlow: {
							...DEFAULTS.textGlow,
							...parsed.textGlow || {}
						},
						background: {
							...DEFAULTS.background,
							...parsed.background || {},
							video: {
								...DEFAULTS.background.video,
								...parsed.background && parsed.background.video || {}
							},
							images: {
								...DEFAULTS.background.images,
								...parsed.background && parsed.background.images || {}
							}
						}
					};
				}
			} catch (e) {
				console.error("dsh-theme-synthwave: config read failed:", e?.message);
			}
			return {
				cfg,
				raw
			};
		}
		/** 解析单个媒体引用：URL 原样返回，裸文件名解析到对应媒体目录。 */
		async function resolveMedia(kind, p) {
			const s = String(p).trim();
			if (/^https?:\/\//i.test(s)) return s;
			const dir = mediaDirOf(kind);
			if (!dir) return null;
			return resolveExisting(s, { cwd: dir });
		}
		/** 把配置里的媒体引用注册到 nameToTarget，并生成浏览器可访问的 /synthwave-theme-media URL。 */
		async function registerMedia(cfg) {
			nameToTarget.clear();
			const resolveOne = async (kind, p) => {
				const t = await resolveMedia(kind, p);
				if (t === null) return null;
				if (typeof t === "string") return t;
				const name = sanitizeName(basename(fs.processPath(t)));
				const seg = KIND_DIR[kind];
				nameToTarget.set(seg + ":" + name, t);
				return "/synthwave-theme-media/" + seg + "/" + encodeURIComponent(name);
			};
			let video = null;
			const vpath = cfg.background.video.path;
			if (vpath) {
				const url = await resolveOne("video", vpath);
				if (url) video = {
					url,
					loop: cfg.background.video.loop !== false,
					muted: cfg.background.video.muted !== false,
					objectFit: cfg.background.video.objectFit || "cover"
				};
			}
			const images = [];
			for (const p of cfg.background.images.paths || []) {
				const url = await resolveOne("image", p);
				if (url) images.push(url);
			}
			return {
				video,
				images
			};
		}
		/** 组装浏览器端 /synthwave-theme-config 返回的完整配置。 */
		async function buildMediaConfig() {
			const { cfg, raw } = await readConfig();
			const { video, images } = await registerMedia(cfg);
			const sources = raw !== null ? extractSources(raw) : {
				video: "",
				images: []
			};
			return {
				configPath,
				textGlow: cfg.textGlow,
				background: {
					video,
					images,
					imagesAlpha: typeof cfg.background.images.alpha === "number" ? cfg.background.images.alpha : .85,
					slideshow: {
						intervalMs: cfg.background.images.intervalMs || 8e3,
						order: cfg.background.images.order === "random" ? "random" : "sequential"
					},
					baseAlpha: typeof cfg.background.baseAlpha === "number" ? cfg.background.baseAlpha : .5,
					blur: typeof cfg.background.blur === "number" ? cfg.background.blur : 2,
					defaultEffect: typeof cfg.background.defaultEffect === "number" ? cfg.background.defaultEffect : 1
				},
				fontScale: typeof cfg.fontScale === "number" ? cfg.fontScale : 1.06,
				sources
			};
		}
		/** 删除从配置“裸文件名”引用中消失的媒体文件（Option A 清理策略）。 */
		async function reconcileMedia(oldRaw, newRaw) {
			if (!profileDir) return;
			let before = null;
			let after = null;
			try {
				before = collectReferencedBareNames(parseJsonc(oldRaw));
			} catch {
				before = null;
			}
			try {
				after = collectReferencedBareNames(parseJsonc(newRaw));
			} catch {
				after = null;
			}
			if (before === null || after === null) return;
			for (const kind of ["video", "images"]) {
				const dir = join(profileDir, "dsh-theme-synthwave", kind);
				const otherKind = kind === "video" ? "images" : "video";
				for (const name of before[kind]) {
					if (after[kind].has(name) || after[otherKind].has(name)) continue;
					try {
						await unlink(join(dir, name));
					} catch {}
				}
			}
		}
		const unregisterMedia = webServer.register({
			kind: "prefix",
			path: "/synthwave-theme-media",
			handler: async (req, res) => {
				log("媒体请求：" + req.url);
				try {
					const rest = String(req.url || "").split("?")[0].slice(23);
					const slash = rest.indexOf("/");
					const seg = slash === -1 ? rest : rest.slice(0, slash);
					const name = decodeURIComponent(slash === -1 ? "" : rest.slice(slash + 1));
					const target = nameToTarget.get(seg + ":" + name);
					if (!target) {
						res.writeHead(404, { "Content-Type": "text/plain" });
						res.end("not found");
						return;
					}
					const info = await fs.stat(target);
					const etag = info ? "\"" + String(info.version) + "\"" : null;
					const inm = req.headers && req.headers["if-none-match"];
					if (etag !== null && typeof inm === "string" && inm === etag) {
						res.writeHead(304, {
							ETag: etag,
							"Cache-Control": "no-cache"
						});
						res.end();
						return;
					}
					const bytes = await fs.readBytes(target, void 0, 536870912);
					const headers = {
						"Content-Type": mimeOf(name),
						"Content-Length": String(bytes.length),
						"Cache-Control": "no-cache"
					};
					if (etag !== null) headers.ETag = etag;
					res.writeHead(200, headers);
					res.end(bytes);
				} catch (e) {
					try {
						res.writeHead(500, { "Content-Type": "text/plain" });
						res.end(String(e?.message || e));
					} catch (e2) {}
				}
			}
		});
		c.effect(() => unregisterMedia);
		const unregisterConfig = webServer.register({
			kind: "prefix",
			path: "/synthwave-theme-config",
			handler: async (_req, res) => {
				log("配置请求：/synthwave-theme-config");
				try {
					const cfg = await buildMediaConfig();
					res.writeHead(200, {
						"Content-Type": "application/json",
						"Cache-Control": "no-store"
					});
					res.end(JSON.stringify(cfg));
				} catch (e) {
					try {
						res.writeHead(200, { "Content-Type": "application/json" });
						res.end(JSON.stringify({
							configPath,
							textGlow: DEFAULTS.textGlow,
							background: {
								video: null,
								images: [],
								imagesAlpha: .85,
								slideshow: {
									intervalMs: 8e3,
									order: "sequential"
								},
								baseAlpha: .5,
								blur: 2
							},
							fontScale: 1.06,
							sources: {
								video: "",
								images: []
							}
						}));
					} catch (e2) {}
				}
			}
		});
		const unregisterOpenConfig = webServer.register({
			kind: "prefix",
			path: "/synthwave-theme-config/open",
			handler: async (_req, res) => {
				log("交互：打开当前 profile 配置文件");
				try {
					const file = await ensureConfigFile();
					if (file === null) {
						res.writeHead(500, { "Content-Type": "application/json" });
						res.end(JSON.stringify({
							ok: false,
							error: "profile config path unavailable"
						}));
						return;
					}
					const ok = await openPath(file);
					res.writeHead(ok ? 200 : 500, { "Content-Type": "application/json" });
					res.end(JSON.stringify(ok ? {
						ok: true,
						path: file
					} : {
						ok: false,
						error: "OS opener failed",
						path: file
					}));
				} catch (e) {
					try {
						res.writeHead(500, { "Content-Type": "application/json" });
						res.end(JSON.stringify({
							ok: false,
							error: String(e?.message || e)
						}));
					} catch (e2) {}
				}
			}
		});
		c.effect(() => unregisterOpenConfig);
		const unregisterRawConfig = webServer.register({
			kind: "prefix",
			path: "/synthwave-theme-config/raw",
			handler: async (_req, res) => {
				log("交互：读取配置原文");
				try {
					const file = await ensureConfigFile();
					if (file === null) {
						res.writeHead(500, { "Content-Type": "application/json" });
						res.end(JSON.stringify({
							ok: false,
							error: "profile config path unavailable"
						}));
						return;
					}
					const raw = await readFile(file, "utf8");
					let parseError = false;
					try {
						parseJsonc(raw);
					} catch {
						parseError = true;
					}
					res.writeHead(200, {
						"Content-Type": "application/json",
						"Cache-Control": "no-store"
					});
					res.end(JSON.stringify({
						ok: true,
						path: file,
						raw,
						parseError
					}));
				} catch (e) {
					try {
						res.writeHead(500, { "Content-Type": "application/json" });
						res.end(JSON.stringify({
							ok: false,
							error: String(e?.message || e)
						}));
					} catch (e2) {}
				}
			}
		});
		c.effect(() => unregisterRawConfig);
		const unregisterSaveConfig = webServer.register({
			kind: "prefix",
			path: "/synthwave-theme-config/save",
			handler: async (req, res) => {
				log("交互：保存配置原文");
				try {
					const body = await readJsonBody(req);
					if (body === null || typeof body.raw !== "string") {
						res.writeHead(400, { "Content-Type": "application/json" });
						res.end(JSON.stringify({
							ok: false,
							error: "invalid body"
						}));
						return;
					}
					try {
						parseJsonc(body.raw);
					} catch (e) {
						res.writeHead(400, { "Content-Type": "application/json" });
						res.end(JSON.stringify({
							ok: false,
							error: "JSONC 解析失败：" + String(e?.message || e)
						}));
						return;
					}
					const file = await ensureConfigFile();
					if (file === null) {
						res.writeHead(500, { "Content-Type": "application/json" });
						res.end(JSON.stringify({
							ok: false,
							error: "profile config path unavailable"
						}));
						return;
					}
					const oldRaw = await readFile(file, "utf8");
					await writeFile(file, body.raw, "utf8");
					await reconcileMedia(oldRaw, body.raw);
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({
						ok: true,
						path: file
					}));
				} catch (e) {
					try {
						res.writeHead(500, { "Content-Type": "application/json" });
						res.end(JSON.stringify({
							ok: false,
							error: String(e?.message || e)
						}));
					} catch (e2) {}
				}
			}
		});
		c.effect(() => unregisterSaveConfig);
		const unregisterSetSource = webServer.register({
			kind: "prefix",
			path: "/synthwave-theme-config/set",
			handler: async (req, res) => {
				log("交互：设置媒体源");
				try {
					const body = await readJsonBody(req);
					const kind = body && (body.kind === "video" || body.kind === "image") ? body.kind : null;
					const value = body && typeof body.value === "string" ? body.value.trim() : "";
					if (kind === null || value === "") {
						res.writeHead(400, { "Content-Type": "application/json" });
						res.end(JSON.stringify({
							ok: false,
							error: "参数无效：需要 kind（video|image）与非空 value"
						}));
						return;
					}
					const isUrl = /^https?:\/\//i.test(value);
					const isBare = !/[\/\\]/.test(value) && value !== "." && value !== "..";
					if (!isUrl && !isBare) {
						res.writeHead(400, { "Content-Type": "application/json" });
						res.end(JSON.stringify({
							ok: false,
							error: "只接受 http(s) URL 或裸文件名（文件需位于 dsh-theme-synthwave/images 或 video 目录）"
						}));
						return;
					}
					const file = await ensureConfigFile();
					if (file === null) {
						res.writeHead(500, { "Content-Type": "application/json" });
						res.end(JSON.stringify({
							ok: false,
							error: "profile config path unavailable"
						}));
						return;
					}
					const raw = await readFile(file, "utf8");
					const next = applyConfigEdit(raw, kind, value);
					await writeFile(file, next, "utf8");
					await reconcileMedia(raw, next);
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({
						ok: true,
						path: file
					}));
				} catch (e) {
					try {
						res.writeHead(500, { "Content-Type": "application/json" });
						res.end(JSON.stringify({
							ok: false,
							error: String(e?.message || e)
						}));
					} catch (e2) {}
				}
			}
		});
		c.effect(() => unregisterSetSource);
		const unregisterRemove = webServer.register({
			kind: "prefix",
			path: "/synthwave-theme-config/remove",
			handler: async (req, res) => {
				log("交互：移除媒体记录");
				try {
					const body = await readJsonBody(req);
					const kind = body && (body.kind === "video" || body.kind === "image") ? body.kind : null;
					const value = body && typeof body.value === "string" ? body.value : "";
					if (kind === null || kind === "image" && value === "") {
						res.writeHead(400, { "Content-Type": "application/json" });
						res.end(JSON.stringify({
							ok: false,
							error: "参数无效：需要 kind（video|image）；image 还需要非空 value"
						}));
						return;
					}
					const file = await ensureConfigFile();
					if (file === null) {
						res.writeHead(500, { "Content-Type": "application/json" });
						res.end(JSON.stringify({
							ok: false,
							error: "profile config path unavailable"
						}));
						return;
					}
					const raw = await readFile(file, "utf8");
					const next = applyConfigRemove(raw, kind, value);
					await writeFile(file, next, "utf8");
					await reconcileMedia(raw, next);
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({
						ok: true,
						path: file
					}));
				} catch (e) {
					try {
						res.writeHead(500, { "Content-Type": "application/json" });
						res.end(JSON.stringify({
							ok: false,
							error: String(e?.message || e)
						}));
					} catch (e2) {}
				}
			}
		});
		c.effect(() => unregisterRemove);
		const unregisterOpenExample = webServer.register({
			kind: "prefix",
			path: "/synthwave-theme-config/open-example",
			handler: async (_req, res) => {
				log("交互：打开示例配置");
				try {
					if (!existsSync(EXAMPLE_CONFIG_PATH)) {
						res.writeHead(404, { "Content-Type": "application/json" });
						res.end(JSON.stringify({
							ok: false,
							error: "示例配置文件不存在：" + EXAMPLE_CONFIG_PATH
						}));
						return;
					}
					const ok = await openPath(EXAMPLE_CONFIG_PATH);
					res.writeHead(ok ? 200 : 500, { "Content-Type": "application/json" });
					res.end(JSON.stringify(ok ? {
						ok: true,
						path: EXAMPLE_CONFIG_PATH
					} : {
						ok: false,
						error: "OS opener failed",
						path: EXAMPLE_CONFIG_PATH
					}));
				} catch (e) {
					try {
						res.writeHead(500, { "Content-Type": "application/json" });
						res.end(JSON.stringify({
							ok: false,
							error: String(e?.message || e)
						}));
					} catch (e2) {}
				}
			}
		});
		c.effect(() => unregisterOpenExample);
		const unregisterUpload = webServer.register({
			kind: "prefix",
			path: "/synthwave-theme-upload",
			handler: async (req, res) => {
				log("交互：上传媒体");
				try {
					const url = new URL(String(req.url || ""), "http://x");
					const kindParam = url.searchParams.get("kind");
					const kind = kindParam === "image" ? "image" : kindParam === "video" ? "video" : null;
					const name = url.searchParams.get("name") || "";
					if (kind === null || name === "") {
						res.writeHead(400, { "Content-Type": "application/json" });
						res.end(JSON.stringify({
							ok: false,
							error: "参数无效：需要 kind（image|video）与 name"
						}));
						return;
					}
					if (!validExtFor(kind, name)) {
						res.writeHead(400, { "Content-Type": "application/json" });
						res.end(JSON.stringify({
							ok: false,
							error: "不支持的文件类型：" + name
						}));
						return;
					}
					const bytes = await readBody(req, MAX_UPLOAD_BYTES);
					if (bytes === null) {
						res.writeHead(413, { "Content-Type": "application/json" });
						res.end(JSON.stringify({
							ok: false,
							error: "文件超过 512MB 上限"
						}));
						return;
					}
					const file = await ensureConfigFile();
					if (file === null) {
						res.writeHead(500, { "Content-Type": "application/json" });
						res.end(JSON.stringify({
							ok: false,
							error: "profile config path unavailable"
						}));
						return;
					}
					const dir = mediaDirOf(kind);
					if (dir === null) {
						res.writeHead(500, { "Content-Type": "application/json" });
						res.end(JSON.stringify({
							ok: false,
							error: "profile config path unavailable"
						}));
						return;
					}
					await mkdir(dir, { recursive: true });
					const dest = uniqueFilePath(dir, sanitizeName(name));
					await writeFile(dest, bytes);
					const raw = await readFile(file, "utf8");
					const next = applyConfigEdit(raw, kind, basename(dest));
					await writeFile(file, next, "utf8");
					await reconcileMedia(raw, next);
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({
						ok: true,
						path: dest
					}));
				} catch (e) {
					try {
						res.writeHead(500, { "Content-Type": "application/json" });
						res.end(JSON.stringify({
							ok: false,
							error: String(e?.message || e)
						}));
					} catch (e2) {}
				}
			}
		});
		c.effect(() => unregisterUpload);
		ensureConfigFile();
		c.effect(() => unregisterConfig);
	});
}
//#endregion
export { apply };
