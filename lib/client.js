window.__ModuleLoader__.load({
	id: "dsh-theme-synthwave",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region \0dsh-css:/mnt/e/DeepSeek/dsh-theme-synthwave/src/client/OpenConfigCard.module.css.mjs
		const css = ".fRws-W_card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;list-style:none;transition:border-color .16s,background .16s}.fRws-W_card:hover{border-color:var(--dsw-alias-label-dimmed)}.fRws-W_cardOpen{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}.fRws-W_header{appearance:none;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:12px;align-items:center;gap:12px;padding:14px 16px;display:flex}.fRws-W_header:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}.fRws-W_headText{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}.fRws-W_name{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4}.fRws-W_description{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}.fRws-W_chevron{color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .16s}.fRws-W_chevronOpen{transform:rotate(180deg)}.fRws-W_body{border-top:1px solid var(--dsw-alias-border-l2);flex-direction:column;gap:10px;margin:0 16px;padding:12px 0;display:flex}.fRws-W_path{color:var(--dsw-alias-label-secondary);word-break:break-all;user-select:text;font-size:12px;line-height:18px}.fRws-W_actions{flex-wrap:wrap;gap:8px;display:flex}.fRws-W_button{appearance:none;border:1px solid var(--dsw-alias-border-l2);font:inherit;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border-radius:8px;padding:5px 14px;font-size:13px;line-height:1.5}.fRws-W_button:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-dimmed)}.fRws-W_button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}.fRws-W_hint{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5}.fRws-W_sectionTitle{color:var(--dsw-alias-label-secondary);margin-top:6px;font-size:13px;font-weight:600}.fRws-W_sourceRow{align-items:center;gap:8px;display:flex}.fRws-W_select,.fRws-W_input{font:inherit;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:5px 10px;font-size:13px;line-height:1.5}.fRws-W_input{flex:1;min-width:0}.fRws-W_select:focus-visible,.fRws-W_input:focus-visible,.fRws-W_textarea:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}.fRws-W_editorHeader{align-items:center;gap:10px;display:flex}.fRws-W_dirty{color:var(--dsw-alias-state-warn-primary);font-size:12px}.fRws-W_textarea{resize:vertical;box-sizing:border-box;width:100%;min-height:220px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);white-space:pre;border-radius:8px;padding:10px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.5}.fRws-W_progressRow{align-items:center;gap:10px;display:flex}.fRws-W_progressBar{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:999px;flex:1;height:8px;overflow:hidden}.fRws-W_progressFill{background:var(--dsw-alias-brand-primary);height:100%;transition:width .15s}.fRws-W_progressText{color:var(--dsw-alias-label-secondary);text-align:right;min-width:3em;font-size:12px}";
		const tagId = "dsh-theme-synthwave/OpenConfigCard.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-theme-synthwave";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var OpenConfigCard_module_css_default = {
			"actions": "fRws-W_actions",
			"body": "fRws-W_body",
			"button": "fRws-W_button",
			"card": "fRws-W_card",
			"cardOpen": "fRws-W_cardOpen",
			"chevron": "fRws-W_chevron",
			"chevronOpen": "fRws-W_chevronOpen",
			"description": "fRws-W_description",
			"dirty": "fRws-W_dirty",
			"editorHeader": "fRws-W_editorHeader",
			"headText": "fRws-W_headText",
			"header": "fRws-W_header",
			"hint": "fRws-W_hint",
			"input": "fRws-W_input",
			"name": "fRws-W_name",
			"path": "fRws-W_path",
			"progressBar": "fRws-W_progressBar",
			"progressFill": "fRws-W_progressFill",
			"progressRow": "fRws-W_progressRow",
			"progressText": "fRws-W_progressText",
			"sectionTitle": "fRws-W_sectionTitle",
			"select": "fRws-W_select",
			"sourceRow": "fRws-W_sourceRow",
			"textarea": "fRws-W_textarea"
		};
		//#endregion
		//#region src/client/OpenConfigCard.ts
		function jsonPost(url, body) {
			return fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body)
			}).then((res) => res.json());
		}
		/** Settings card: pick/upload background media, edit the config file, open it (or the example). */
		function OpenConfigCard() {
			const [expanded, setExpanded] = (0, react.useState)(false);
			const [path, setPath] = (0, react.useState)("");
			const [hint, setHint] = (0, react.useState)("");
			const [raw, setRaw] = (0, react.useState)("");
			const [savedRaw, setSavedRaw] = (0, react.useState)("");
			const [saving, setSaving] = (0, react.useState)(false);
			const dirty = raw !== savedRaw;
			const [sourceKind, setSourceKind] = (0, react.useState)("video");
			const [sourceValue, setSourceValue] = (0, react.useState)("");
			const [uploading, setUploading] = (0, react.useState)(false);
			const [progress, setProgress] = (0, react.useState)(0);
			const imageInput = (0, react.useRef)(null);
			const videoInput = (0, react.useRef)(null);
			const refresh = () => {
				fetch("/synthwave-theme-config/raw").then((res) => res.json()).then((data) => {
					if (data && typeof data.path === "string") setPath(data.path);
					if (data && typeof data.raw === "string") {
						setRaw(data.raw);
						setSavedRaw(data.raw);
					}
				}).catch(() => {});
			};
			(0, react.useEffect)(() => {
				refresh();
			}, []);
			const copy = () => {
				const clipboard = navigator.clipboard;
				if (clipboard === void 0) {
					setHint(path);
					return;
				}
				clipboard.writeText(path).then(() => setHint("路径已复制"), () => setHint("复制失败"));
			};
			const openConfig = () => {
				setHint("正在打开…");
				fetch("/synthwave-theme-config/open", { method: "POST" }).then((res) => res.json()).then((result) => setHint(result && result.ok ? "已打开" : String(result && result.error || "打开失败"))).catch(() => setHint("打开失败"));
			};
			const openExample = () => {
				setHint("正在打开示例…");
				fetch("/synthwave-theme-config/open-example", { method: "POST" }).then((res) => res.json()).then((result) => setHint(result && result.ok ? "已打开示例配置" : String(result && result.error || "打开失败"))).catch(() => setHint("打开失败"));
			};
			const save = () => {
				if (saving || !dirty) return;
				setSaving(true);
				setHint("正在保存…");
				jsonPost("/synthwave-theme-config/save", { raw }).then((result) => {
					if (result && result.ok) {
						setSavedRaw(raw);
						setHint("已保存，硬刷新页面生效");
					} else setHint("保存失败：" + String(result && result.error || "未知错误"));
				}).catch(() => setHint("保存失败")).finally(() => setSaving(false));
			};
			const applySource = () => {
				const value = sourceValue.trim();
				if (!value) {
					setHint("请输入 URL 或本地路径");
					return;
				}
				setHint("正在应用…");
				jsonPost("/synthwave-theme-config/set", {
					kind: sourceKind,
					value
				}).then((result) => {
					if (result && result.ok) {
						setHint("已更新，硬刷新页面生效");
						setSourceValue("");
						refresh();
					} else setHint("应用失败：" + String(result && result.error || "未知错误"));
				}).catch(() => setHint("应用失败"));
			};
			const upload = (kind, file) => {
				if (uploading) return;
				setUploading(true);
				setProgress(0);
				setHint("");
				const xhr = new XMLHttpRequest();
				xhr.open("POST", "/synthwave-theme-upload?kind=" + kind + "&name=" + encodeURIComponent(file.name));
				xhr.upload.onprogress = (e) => {
					if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100));
				};
				xhr.onload = () => {
					setUploading(false);
					let result = null;
					try {
						result = JSON.parse(xhr.responseText);
					} catch {}
					if (result && result.ok) {
						setHint("已上传：" + (result.path || "") + "，硬刷新页面生效");
						refresh();
					} else setHint("上传失败：" + String(result && result.error || "未知错误"));
				};
				xhr.onerror = () => {
					setUploading(false);
					setHint("上传失败");
				};
				xhr.send(file);
			};
			const onFileChange = (kind) => (e) => {
				const file = e && e.target && e.target.files && e.target.files[0];
				if (file) upload(kind, file);
				if (e && e.target) e.target.value = "";
			};
			return (0, react.createElement)("li", { className: expanded ? `${OpenConfigCard_module_css_default.card} ${OpenConfigCard_module_css_default.cardOpen}` : OpenConfigCard_module_css_default.card }, (0, react.createElement)("button", {
				type: "button",
				className: OpenConfigCard_module_css_default.header,
				"aria-expanded": expanded,
				onClick: () => {
					setExpanded(!expanded);
				}
			}, (0, react.createElement)("span", { className: OpenConfigCard_module_css_default.headText }, (0, react.createElement)("span", { className: OpenConfigCard_module_css_default.name }, "DeepSeek Harness: 合成波风格主题"), (0, react.createElement)("span", { className: OpenConfigCard_module_css_default.description }, "霓虹、背景媒体与字号缩放配置")), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: expanded ? `${OpenConfigCard_module_css_default.chevron} ${OpenConfigCard_module_css_default.chevronOpen}` : OpenConfigCard_module_css_default.chevron })), expanded ? (0, react.createElement)("div", { className: OpenConfigCard_module_css_default.body }, (0, react.createElement)("div", { className: OpenConfigCard_module_css_default.path }, path || "未找到配置文件"), (0, react.createElement)("div", { className: OpenConfigCard_module_css_default.actions }, (0, react.createElement)("button", {
				className: OpenConfigCard_module_css_default.button,
				onClick: openConfig
			}, "打开配置文件"), (0, react.createElement)("button", {
				className: OpenConfigCard_module_css_default.button,
				onClick: openExample
			}, "打开示例配置"), (0, react.createElement)("button", {
				className: OpenConfigCard_module_css_default.button,
				onClick: copy
			}, "复制路径")), (0, react.createElement)("div", { className: OpenConfigCard_module_css_default.sectionTitle }, "选择背景媒体"), (0, react.createElement)("div", { className: OpenConfigCard_module_css_default.actions }, (0, react.createElement)("button", {
				className: OpenConfigCard_module_css_default.button,
				onClick: () => imageInput.current && imageInput.current.click(),
				disabled: uploading
			}, "选择图片"), (0, react.createElement)("button", {
				className: OpenConfigCard_module_css_default.button,
				onClick: () => videoInput.current && videoInput.current.click(),
				disabled: uploading
			}, "选择视频")), (0, react.createElement)("input", {
				ref: imageInput,
				type: "file",
				accept: "image/*",
				style: { display: "none" },
				onChange: onFileChange("image")
			}), (0, react.createElement)("input", {
				ref: videoInput,
				type: "file",
				accept: "video/*",
				style: { display: "none" },
				onChange: onFileChange("video")
			}), uploading ? (0, react.createElement)("div", { className: OpenConfigCard_module_css_default.progressRow }, (0, react.createElement)("div", { className: OpenConfigCard_module_css_default.progressBar }, (0, react.createElement)("div", {
				className: OpenConfigCard_module_css_default.progressFill,
				style: { width: progress + "%" }
			})), (0, react.createElement)("span", { className: OpenConfigCard_module_css_default.progressText }, progress + "%")) : null, (0, react.createElement)("div", { className: OpenConfigCard_module_css_default.sourceRow }, (0, react.createElement)("select", {
				className: OpenConfigCard_module_css_default.select,
				value: sourceKind,
				onChange: (e) => setSourceKind(e.target.value)
			}, (0, react.createElement)("option", { value: "video" }, "视频"), (0, react.createElement)("option", { value: "image" }, "图片")), (0, react.createElement)("input", {
				className: OpenConfigCard_module_css_default.input,
				value: sourceValue,
				placeholder: "http(s) URL 或裸文件名",
				onChange: (e) => setSourceValue(e.target.value)
			}), (0, react.createElement)("button", {
				className: OpenConfigCard_module_css_default.button,
				onClick: applySource
			}, "应用")), (0, react.createElement)("div", { className: OpenConfigCard_module_css_default.editorHeader }, (0, react.createElement)("span", { className: OpenConfigCard_module_css_default.sectionTitle }, "配置文件（JSONC）"), dirty ? (0, react.createElement)("span", { className: OpenConfigCard_module_css_default.dirty }, "● 未保存") : null), (0, react.createElement)("textarea", {
				className: OpenConfigCard_module_css_default.textarea,
				value: raw,
				spellCheck: false,
				onChange: (e) => setRaw(e.target.value)
			}), (0, react.createElement)("div", { className: OpenConfigCard_module_css_default.actions }, (0, react.createElement)("button", {
				className: OpenConfigCard_module_css_default.button,
				onClick: save,
				disabled: !dirty || saving
			}, saving ? "保存中…" : "保存")), hint === "" ? null : (0, react.createElement)("div", { className: OpenConfigCard_module_css_default.hint }, hint)) : null);
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* Browser half of dsh-theme-synthwave: neon glow, translucent surface tokens,
		* image/video background (served from /synthwave-theme-media), configurable blur,
		* and fontScale root font-size. Config comes from the host via /synthwave-theme-config.
		*/
		function hexRgba(color, alpha) {
			const c = String(color).trim();
			if (c.charAt(0) === "#") {
				let h = c;
				if (h.length === 4) h = "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
				if (h.length === 7) {
					const r = parseInt(h.slice(1, 3), 16);
					const g = parseInt(h.slice(3, 5), 16);
					const b = parseInt(h.slice(5, 7), 16);
					return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
				}
			}
			return color;
		}
		function hueShift(color, deg) {
			const c = String(color).trim();
			let h = c;
			if (h.charAt(0) === "#") {
				if (h.length === 4) h = "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
				if (h.length === 7) {
					const r = parseInt(h.slice(1, 3), 16) / 255;
					const g = parseInt(h.slice(3, 5), 16) / 255;
					const b = parseInt(h.slice(5, 7), 16) / 255;
					const max = Math.max(r, g, b);
					const min = Math.min(r, g, b);
					let hh = 0;
					let s = 0;
					const l = (max + min) / 2;
					if (max !== min) {
						const d = max - min;
						s = l > .5 ? d / (2 - max - min) : d / (max + min);
						if (max === r) hh = (g - b) / d + (g < b ? 6 : 0);
						else if (max === g) hh = (b - r) / d + 2;
						else hh = (r - g) / d + 4;
						hh *= 60;
					}
					hh = (hh + deg + 360) % 360;
					const cc = (1 - Math.abs(2 * l - 1)) * s;
					const xx = cc * (1 - Math.abs(hh / 60 % 2 - 1));
					const m = l - cc / 2;
					let rr = 0;
					let gg = 0;
					let bb = 0;
					if (hh < 60) {
						rr = cc;
						gg = xx;
					} else if (hh < 120) {
						rr = xx;
						gg = cc;
					} else if (hh < 180) {
						gg = cc;
						bb = xx;
					} else if (hh < 240) {
						gg = xx;
						bb = cc;
					} else if (hh < 300) {
						rr = xx;
						bb = cc;
					} else {
						rr = cc;
						bb = xx;
					}
					return "rgb(" + Math.round((rr + m) * 255) + ", " + Math.round((gg + m) * 255) + ", " + Math.round((bb + m) * 255) + ")";
				}
			}
			return c;
		}
		function glowColor(color, alpha) {
			const c = String(color).trim();
			if (c.charAt(0) === "#") {
				let h = c;
				if (h.length === 4) h = "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
				if (h.length === 7) {
					const r = parseInt(h.slice(1, 3), 16);
					const g = parseInt(h.slice(3, 5), 16);
					const b = parseInt(h.slice(5, 7), 16);
					return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
				}
			}
			return "color-mix(in srgb, " + c + " " + Math.round(alpha * 100) + "%, transparent)";
		}
		const GLOW_SELECTORS = [
			"a[href]",
			"button",
			"[role=\"button\"]",
			"[role=\"tab\"]",
			"[role=\"menuitem\"]",
			"[role=\"link\"]"
		];
		function buildTokens(baseAlpha) {
			const a = typeof baseAlpha === "number" ? Math.max(0, Math.min(1, baseAlpha)) : .5;
			return {
				"--dsw-alias-bg-base": {
					light: hexRgba("#f4f0ff", a),
					dark: hexRgba("#0d0221", a)
				},
				"--dsw-alias-bg-layer-1": {
					light: "#ffffff",
					dark: "#170733"
				},
				"--dsw-alias-bg-layer-2": {
					light: "#f0eaff",
					dark: "#20104a"
				},
				"--dsw-alias-bg-overlay": {
					light: "#f7f3ff",
					dark: "#25114f"
				},
				"--dsw-alias-border-l1": {
					light: "#d8ccf0",
					dark: "#342459"
				},
				"--dsw-alias-border-l2": {
					light: "#8a4bff",
					dark: "#8a4bff"
				},
				"--dsw-alias-brand-primary": {
					light: "#d61f5c",
					dark: "#ff2a6d"
				},
				"--dsw-alias-label-primary": {
					light: "#1a0a33",
					dark: "#f4f0ff"
				},
				"--dsw-alias-label-secondary": {
					light: "#5a4f7a",
					dark: "#a99fd6"
				},
				"--dsw-alias-state-error-primary": {
					light: "#d81b4a",
					dark: "#ff3860"
				},
				"--dsw-alias-state-success-primary": {
					light: "#00a878",
					dark: "#01ffc3"
				},
				"--dsw-alias-state-warn-primary": {
					light: "#c99300",
					dark: "#ffd319"
				},
				"--dsw-specific-sidebar-fill": {
					light: hexRgba("#ece5ff", a),
					dark: hexRgba("#12002e", a)
				}
			};
		}
		function buildGlowCss(g) {
			if (!g || g.enabled === false) return "";
			const baseColors = Array.isArray(g.colors) && g.colors.length ? g.colors : ["#ff2a6d"];
			const hoverColors = Array.isArray(g.hoverColors) && g.hoverColors.length ? g.hoverColors : ["#05d9e8"];
			const alpha = typeof g.alpha === "number" ? g.alpha : .6;
			const hoverAlpha = typeof g.hoverAlpha === "number" ? g.hoverAlpha : .85;
			const blurEm = typeof g.blurEm === "number" ? g.blurEm : .3;
			const suppress = g.suppressHoverFill !== false;
			const baseShadow = baseColors.map((c) => "0 0 " + blurEm + "em " + glowColor(c, alpha)).join(", ");
			const hoverShadow = hoverColors.map((c) => "0 0 " + blurEm * 1.5 + "em " + glowColor(c, hoverAlpha)).join(", ");
			const selAll = GLOW_SELECTORS.join(", ");
			const selHover = GLOW_SELECTORS.map((s) => s + ":hover").join(", ");
			const selFocus = GLOW_SELECTORS.map((s) => s + ":focus").join(", ");
			const selHoverFocus = GLOW_SELECTORS.map((s) => s + ":hover, " + s + ":focus").join(", ");
			let chrome = "";
			if (suppress) chrome = "\n" + selHover + " { background-color: transparent !important; }\n" + selFocus + " { outline: none !important; border-color: transparent !important; box-shadow: none !important; }";
			return "\n" + selAll + " {\n  transition: text-shadow .15s ease, background-color .15s ease;\n  text-shadow: " + baseShadow + ";\n}\n" + selHoverFocus + " { text-shadow: " + hoverShadow + "; }\n" + chrome;
		}
		function buildAmbientCss() {
			return `
.dsh-synthwave-overlay, .dsh-synthwave-overlay * { pointer-events: none !important; }
.dsh-synthwave-overlay { position: fixed; inset: 0; overflow: hidden; }
.dsh-synthwave-scanlines { position: absolute; inset: 0; background: repeating-linear-gradient(to bottom, rgba(255,255,255,0) 0px, rgba(255,255,255,0) 2px, rgba(255,255,255,0.05) 3px, rgba(255,255,255,0) 4px); }
.dsh-synthwave-vignette { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(0,0,0,0) 62%, rgba(8,3,26,0.42) 100%); }
.dsh-synthwave-glow { position: absolute; inset: 0; background: radial-gradient(ellipse 70% 55% at 50% 118%, rgba(255,42,109,0.15) 0%, rgba(255,42,109,0) 60%), radial-gradient(ellipse 70% 50% at 50% -12%, rgba(5,217,232,0.10) 0%, rgba(5,217,232,0) 52%); animation: dshSynthwaveBreath 9s ease-in-out infinite; }
@keyframes dshSynthwaveBreath { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
.dsh-synthwave-bubble { position: absolute; border-radius: 50%; }
@keyframes dshBubbleLife { 0% { opacity: 0; transform: translate(0, 0) scale(0.96); } 50% { opacity: 1; transform: translate(var(--dx, 40px), var(--dy, -30px)) scale(1.05); } 100% { opacity: 0; transform: translate(0, 0) scale(0.96); } }
`;
		}
		function injectBackground(cfg) {
			if (typeof document === "undefined") return () => {};
			const bg = document.createElement("div");
			bg.setAttribute("data-synthwave-bg", "");
			Object.assign(bg.style, {
				position: "fixed",
				inset: "0",
				zIndex: "-1",
				pointerEvents: "none",
				overflow: "hidden",
				background: "radial-gradient(circle at 50% 86%, rgba(255,160,90,0.55) 0%, rgba(255,70,120,0.28) 22%, rgba(255,42,109,0) 55%), linear-gradient(180deg, #0d0221 0%, #150733 40%, #230a45 68%, #3c0f4f 100%)"
			});
			const disposers = [];
			const b = cfg.background || {};
			const blurPx = typeof b.blur === "number" ? Math.max(0, Math.min(40, Math.round(b.blur))) : 2;
			const blurFilter = blurPx > 0 ? "blur(" + blurPx + "px)" : "none";
			if (b.video) {
				const v = document.createElement("video");
				v.autoplay = true;
				v.muted = b.video.muted !== false;
				v.loop = b.video.loop !== false;
				v.setAttribute("playsinline", "");
				v.src = b.video.url;
				Object.assign(v.style, {
					position: "absolute",
					inset: "0",
					width: "100%",
					height: "100%",
					objectFit: b.video.objectFit || "cover",
					background: "#000",
					filter: blurFilter
				});
				bg.appendChild(v);
			} else if (b.images && b.images.length) {
				const imgAlpha = typeof b.imagesAlpha === "number" ? b.imagesAlpha : .85;
				const imgs = b.images.map(function(u) {
					const el = document.createElement("img");
					el.src = u;
					el.alt = "";
					Object.assign(el.style, {
						position: "absolute",
						inset: "0",
						width: "100%",
						height: "100%",
						objectFit: "cover",
						opacity: "0",
						transition: "opacity 1.2s ease",
						filter: blurFilter
					});
					bg.appendChild(el);
					return el;
				});
				let idx = 0;
				function show(i) {
					for (let j = 0; j < imgs.length; j++) imgs[j].style.opacity = j === i ? String(imgAlpha) : "0";
				}
				show(0);
				if (imgs.length > 1) {
					const slideshow = b.slideshow || {};
					const order = slideshow.order === "random" ? "random" : "sequential";
					const intervalMs = slideshow.intervalMs || 8e3;
					const timer = setInterval(function() {
						if (order === "random") {
							let n = idx;
							while (n === idx && imgs.length > 1) n = Math.floor(Math.random() * imgs.length);
							idx = n;
						} else idx = (idx + 1) % imgs.length;
						show(idx);
					}, intervalMs);
					disposers.push(() => clearInterval(timer));
				}
			} else {
				const BASE_COLORS = [
					"#ff8a3d",
					"#8a4bff",
					"#ff2a6d",
					"#ff3860",
					"#2a6dff",
					"#05d9e8"
				];
				const MIN_SIZE = 480;
				const MIN_LIFE = 8e3;
				const effect = typeof b.defaultEffect === "number" ? b.defaultEffect : 1;
				for (let i = 0; i < 6; i++) {
					const el = document.createElement("div");
					el.className = "dsh-synthwave-bubble";
					const base = BASE_COLORS[i];
					const delta = 7 + Math.random() * 11;
					const size = MIN_SIZE + Math.random() * 240;
					const life = MIN_LIFE + Math.random() * 12e3;
					const x = -20 + Math.random() * 80;
					const y = -20 + Math.random() * 80;
					el.style.width = size.toFixed(0) + "px";
					el.style.height = size.toFixed(0) + "px";
					el.style.left = x.toFixed(1) + "%";
					el.style.top = y.toFixed(1) + "%";
					el.style.background = "linear-gradient(to bottom, " + hueShift(base, -delta) + ", " + hueShift(base, delta) + ")";
					el.style.filter = blurFilter;
					if (effect === 1) {
						el.style.setProperty("--dx", (Math.random() * 160 - 80).toFixed(0) + "px");
						el.style.setProperty("--dy", (Math.random() * 160 - 80).toFixed(0) + "px");
						el.style.animation = "dshBubbleLife " + life.toFixed(0) + "ms ease-in-out infinite";
						el.style.animationDelay = (-Math.random() * life).toFixed(0) + "ms";
					}
					bg.appendChild(el);
				}
			}
			const root = document.getElementById("root");
			document.body.insertBefore(bg, root || document.body.firstChild);
			return function() {
				for (const d of disposers) try {
					d();
				} catch (e) {}
				try {
					bg.remove();
				} catch (e) {}
			};
		}
		function apply(ctx) {
			const theme = ctx.get("theme");
			const slots = ctx.get("slots");
			if (theme === void 0 || slots === void 0) return;
			const ambientTag = document.createElement("style");
			ambientTag.dataset.plugin = "dsh-theme-synthwave";
			ambientTag.dataset.pluginCss = "ambient";
			ambientTag.textContent = buildAmbientCss();
			document.head.appendChild(ambientTag);
			ctx.effect(() => () => {
				ambientTag.remove();
			});
			function BackgroundController() {
				(0, react.useEffect)(() => {
					let disposed = false;
					const disposers = [];
					(async () => {
						let cfg = {
							textGlow: null,
							background: {
								video: null,
								images: [],
								slideshow: {},
								baseAlpha: .5
							},
							fontScale: 1
						};
						try {
							cfg = await (await fetch("/synthwave-theme-config")).json();
						} catch (e) {}
						if (disposed) return;
						disposers.push(theme.overrideTokens("dsh-theme-synthwave", buildTokens(cfg.background.baseAlpha)));
						const glowTag = document.createElement("style");
						glowTag.dataset.plugin = "dsh-theme-synthwave";
						glowTag.dataset.pluginCss = "glow";
						glowTag.textContent = buildGlowCss(cfg.textGlow);
						document.head.appendChild(glowTag);
						disposers.push(() => {
							glowTag.remove();
						});
						const fs2 = typeof cfg.fontScale === "number" && cfg.fontScale > 0 ? cfg.fontScale : 1;
						const fontScaleTag = document.createElement("style");
						fontScaleTag.dataset.plugin = "dsh-theme-synthwave";
						fontScaleTag.dataset.pluginCss = "font-scale";
						fontScaleTag.textContent = "html { font-size: " + Math.round(fs2 * 1e4) / 100 + "%; }";
						document.head.appendChild(fontScaleTag);
						disposers.push(() => {
							fontScaleTag.remove();
						});
						disposers.push(injectBackground(cfg));
					})();
					return () => {
						disposed = true;
						for (const d of disposers) try {
							d();
						} catch (e) {}
					};
				}, []);
				return null;
			}
			slots.inject("shell.overlay", () => slots.register({
				name: "shell.overlay",
				id: "dsh-theme-synthwave-hud",
				order: -1e3
			}, () => (0, react.createElement)("div", {
				className: "dsh-synthwave-overlay",
				"aria-hidden": "true"
			}, (0, react.createElement)("div", { className: "dsh-synthwave-scanlines" }), (0, react.createElement)("div", { className: "dsh-synthwave-glow" }), (0, react.createElement)("div", { className: "dsh-synthwave-vignette" }), (0, react.createElement)(BackgroundController))));
			slots.inject("settings.plugin.item", () => slots.register({
				name: "settings.plugin.item",
				id: "dsh-theme-synthwave-config",
				order: 100
			}, () => (0, react.createElement)(OpenConfigCard)));
		}
		//#endregion
		exports.apply = apply;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map