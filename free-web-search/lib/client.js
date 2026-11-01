window.__ModuleLoader__.load({ id: "dsh-free-web-search", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let react = require("react");
react = __toESM(react);
let react_jsx_runtime = require("react/jsx-runtime");
react_jsx_runtime = __toESM(react_jsx_runtime);

//#region src/client/FreeSearchCard.tsx
const BRIDGE_PREFIX = "/api/dsh-free-web-search-settings";
const NS = "web-search-free";
const CSS = [
	".dshfs-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:8px;min-width:0;list-style:none;transition:border-color .16s,background .16s;overflow:hidden;margin-bottom:8px}",
	".dshfs-cardOpen{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}",
	".dshfs-header{width:100%;color:inherit;cursor:pointer;text-align:left;font:inherit;background:0 0;border:0;align-items:center;gap:8px;padding:10px 14px;display:flex}",
	".dshfs-header:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}",
	".dshfs-headText{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex;overflow:hidden}",
	".dshfs-name{color:var(--dsw-alias-label-primary);white-space:nowrap;text-overflow:ellipsis;font-weight:600;overflow:hidden}",
	".dshfs-description{color:var(--dsw-alias-label-tertiary);white-space:nowrap;text-overflow:ellipsis;font-size:12px;overflow:hidden}",
	".dshfs-pending{color:var(--dsw-alias-state-warn-primary);white-space:nowrap;flex:none;font-size:12px}",
	".dshfs-chevron{color:var(--dsw-alias-label-tertiary);flex:none;font-size:13px;transition:transform .12s}",
	".dshfs-chevronOpen{transform:rotate(180deg)}",
	".dshfs-body{flex-direction:column;gap:14px;padding:0 14px 14px;display:flex}",
	".dshfs-footer{justify-content:space-between;align-items:center;gap:8px;display:flex;flex-wrap:wrap}",
	".dshfs-footerLeft{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}",
	".dshfs-footerRight{display:flex;align-items:center;gap:8px;flex-wrap:wrap}",
	".dshfs-failed{color:var(--dsw-alias-state-error-primary);font-size:12px}",
	".dshfs-testOk{color:#7ddb9c;font-size:12px;line-height:1.5}",
	".dshfs-resultRow{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:0;margin-top:2px}",
	".dshfs-field{flex-direction:column;gap:4px;min-width:0;display:flex}",
	".dshfs-label{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500}",
	".dshfs-select{border:1px solid var(--dsw-alias-border-l2);font:inherit;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);background:var(--dsw-specific-input-major);border-radius:6px;padding:6px 8px;font-size:13px;transition:border-color .13s,box-shadow .13s;width:100%}",
	".dshfs-select:hover:not(:disabled){border-color:var(--dsw-alias-label-dimmed)}",
	".dshfs-input{border:1px solid var(--dsw-alias-border-l2);font:inherit;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);background:var(--dsw-specific-input-major);border-radius:6px;padding:6px 8px;font-size:13px;transition:border-color .13s,box-shadow .13s;width:100%}",
	".dshfs-ttl{width:88px}",
	".dshfs-input:hover:not(:disabled){border-color:var(--dsw-alias-label-dimmed)}",
	".dshfs-input:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}",
	".dshfs-input:disabled{opacity:.6;cursor:default}",
	".dshfs-hint{color:var(--dsw-alias-label-secondary);margin:0;font-size:12px}",
	".dshfs-platforms{display:flex;gap:10px;flex-wrap:wrap}",
	".dshfs-platform{display:flex;align-items:center;gap:5px;color:var(--dsw-alias-label-primary);font-size:13px;cursor:pointer}",
	".dshfs-platform input{accent-color:var(--dsw-alias-state-business-primary)}",
	".dshfs-link{color:var(--dsw-alias-state-business-primary);font-size:12px;text-decoration:none;align-self:flex-start;padding:2px 0}",
	".dshfs-link:hover{text-decoration:underline}",
	".dshfs-btn{font:inherit;cursor:pointer;border-radius:6px;padding:5px 12px;font-size:13px;transition:background-color .13s,border-color .13s,color .13s}",
	".dshfs-save{border:1px solid var(--dsw-alias-button-info-fill);background:var(--dsw-alias-button-info-fill);color:var(--dsw-alias-label-primary-foreground)}",
	".dshfs-save:hover:not(:disabled){border-color:var(--dsw-alias-button-info-hover);background:var(--dsw-alias-button-info-hover)}",
	".dshfs-save:disabled{opacity:.5;cursor:default}",
	".dshfs-badge{background:var(--dsw-alias-interactive-bg-hover-accent);color:var(--dsw-alias-state-business-primary);white-space:nowrap;border-radius:999px;flex:none;padding:1px 6px;font-size:11px}",
	".dshfs-badgeFree{background:rgba(80,200,120,.15);color:#7ddb9c;border:1px solid rgba(80,200,120,.3);white-space:nowrap;border-radius:999px;flex:none;padding:1px 6px;font-size:11px}",
	".dshfs-badgeKey{background:rgba(240,170,80,.15);color:#f0b060;border:1px solid rgba(240,170,80,.3);white-space:nowrap;border-radius:999px;flex:none;padding:1px 6px;font-size:11px}",
	".dshfs-langToggle{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);background:transparent;flex:none;padding:2px 8px;font-size:11px;border-radius:6px}",
	".dshfs-version{color:var(--dsw-alias-label-tertiary);font-size:11px;font-variant-numeric:tabular-nums;white-space:nowrap}"
].join("");
const TAG_ID = "dsh-free-web-search/card.css";
if (typeof document !== "undefined" && document.querySelector(`style[data-plugin-css=${JSON.stringify(TAG_ID)}]`) === null) {
	const tag = document.createElement("style");
	tag.dataset.plugin = "dsh-free-web-search";
	tag.dataset.pluginCss = TAG_ID;
	tag.textContent = CSS;
	document.head.appendChild(tag);
}
const ENGINES = [
	{
		id: "ddg",
		label: "DuckDuckGo · HTML",
		badge: "FREE",
		link: "https://duckduckgo.com"
	},
	{
		id: "ddg-lite",
		label: "DuckDuckGo · Lite",
		badge: "FREE",
		link: "https://duckduckgo.com"
	},
	{
		id: "bing",
		label: "Bing",
		badge: "FREE",
		link: "https://www.bing.com"
	},
	{
		id: "anysearch",
		label: "AnySearch · AI",
		badge: "FREE",
		link: "https://anysearch.com"
	},
	{
		id: "searxng",
		label: "SearXNG",
		badge: "FREE",
		link: "https://github.com/searxng/searxng"
	},
	{
		id: "exa",
		label: "Exa",
		badge: "FREE",
		link: "https://dashboard.exa.ai/api-keys"
	},
	{
		id: "tavily",
		label: "Tavily",
		badge: "FREE",
		link: "https://app.tavily.com/home"
	},
	{
		id: "keenable",
		label: "Keenable",
		badge: "FREE",
		link: "https://keenable.ai/login"
	},
	{
		id: "perplexity",
		label: "Perplexity",
		badge: "API KEY",
		link: "https://www.perplexity.ai/settings/api"
	},
	{
		id: "deepseek-official",
		label: "DeepSeek Official",
		badge: "API KEY",
		link: "https://platform.deepseek.com/api_keys"
	}
];
const I18N = {
	zh: {
		description: "免费搜索 —— 无需 API key（Bing / DuckDuckGo / AnySearch / Exa / Tavily / Keenable）",
		unsaved: "未保存",
		searchEngine: "搜索引擎",
		visit: "访问官网 →",
		getKey: "获取 API Key →",
		engineHint: "Bing 是最稳定的免费引擎。DuckDuckGo 在共享 IP 上可能限流。API KEY 引擎需在下方填写凭据。",
		apiKeys: "API 密钥（可选）",
		exaPh: (c) => c ? "Exa API 密钥（已配置）" : "Exa API 密钥（可选）",
		tavilyPh: (c) => c ? "Tavily API 密钥（已配置）" : "Tavily API 密钥（可选）",
		keenablePh: (c) => c ? "Keenable API 密钥（已配置）" : "Keenable API 密钥（可选）",
		perplexityPh: (c) => c ? "Perplexity API 密钥（已配置）" : "Perplexity API 密钥（pplx-...）",
		deepseekPh: (c) => c ? "DeepSeek API 密钥（已配置）" : "DeepSeek API 密钥（sk-...）",
		keysHint: "密钥保存在 settings.yaml（界面脱敏显示）。为某引擎填写密钥后即可使用。",
		platformSearch: "平台搜索（platform_search 工具）",
		platformHint: "为 agent 的 platform_search 工具启用平台。禁用的平台会被跳过。",
		cacheTtl: "结果缓存时长（分钟）",
		cacheTtlHint: "0 关闭缓存，最长 5 分钟。",
		unavailable: "设置不可用",
		saveFailed: "保存失败",
		testing: "测试中…",
		testEngine: "测试引擎",
		useBing: "恢复 Bing 默认",
		discard: "撤销",
		saving: "保存中…",
		save: "保存",
		testOk: (r) => `✓ ${r.count} 条结果（引擎: ${r.engine}）${r.content ? ` — ${r.content}` : ""}${r.sample ? ` · e.g. "${r.sample.slice(0, 40)}"` : ""}`,
		testFail: (e) => `✗ ${e}`,
		toggleLang: "EN"
	},
	en: {
		description: "Free web search — no API key needed (Bing / DuckDuckGo / AnySearch / Exa / Tavily / Keenable)",
		unsaved: "unsaved",
		searchEngine: "Search engine",
		visit: "Visit website →",
		getKey: "Get API Key →",
		engineHint: "Bing is the most stable FREE engine. DuckDuckGo may rate-limit on shared IPs. API KEY engines need credentials below.",
		apiKeys: "API keys (optional)",
		exaPh: (c) => c ? "Exa API key (configured)" : "Exa API key (optional, free without)",
		tavilyPh: (c) => c ? "Tavily API key (configured)" : "Tavily API key (optional, free without)",
		keenablePh: (c) => c ? "Keenable API key (configured)" : "Keenable API key (optional, free without)",
		perplexityPh: (c) => c ? "Perplexity API key (configured)" : "Perplexity API key (pplx-...)",
		deepseekPh: (c) => c ? "DeepSeek API key (configured)" : "DeepSeek API key (sk-...)",
		keysHint: "Keys are stored in settings.yaml (redacted in the UI). Enter a key for an engine to use it.",
		platformSearch: "Platform search (platform_search tool)",
		platformHint: "Enable platforms for the agent's platform_search tool. Disabled platforms are skipped.",
		cacheTtl: "Result cache TTL (minutes)",
		cacheTtlHint: "0 disables caching, max 5 minutes. Lower = fresher results, higher = less rate-limiting.",
		unavailable: "Settings unavailable — the bridge is not exposed.",
		saveFailed: "save failed",
		testing: "Testing…",
		testEngine: "Test engine",
		useBing: "Use Bing default",
		discard: "Discard",
		saving: "Saving…",
		save: "Save",
		testOk: (r) => `✓ ${r.count} results (engine: ${r.engine})${r.content ? ` — ${r.content}` : ""}${r.sample ? ` · e.g. "${r.sample.slice(0, 40)}"` : ""}`,
		testFail: (e) => `✗ ${e}`,
		toggleLang: "中文"
	}
};
function tt(lang) {
	return I18N[lang];
}
async function bridgeDescribe() {
	return (await fetch(`${BRIDGE_PREFIX}/describe`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: "{}"
	})).json();
}
async function bridgeMutate(payload) {
	return (await fetch(`${BRIDGE_PREFIX}/mutate`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(payload)
	})).json();
}
async function bridgeRawSearch(payload) {
	return (await fetch(`${BRIDGE_PREFIX}/raw-search`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(payload)
	})).json();
}
function FreeSearchCard() {
	const [open, setOpen] = (0, react.useState)(false);
	const [status, setStatus] = (0, react.useState)("loading");
	const [writable, setWritable] = (0, react.useState)(false);
	const [provider, setProvider] = (0, react.useState)("bing");
	const [exaKey, setExaKey] = (0, react.useState)("");
	const [tavilyKey, setTavilyKey] = (0, react.useState)("");
	const [keenableKey, setKeenableKey] = (0, react.useState)("");
	const [perplexityKey, setPerplexityKey] = (0, react.useState)("");
	const [deepseekKey, setDeepseekKey] = (0, react.useState)("");
	const [platforms, setPlatforms] = (0, react.useState)(["github", "reddit"]);
	const [cacheTtl, setCacheTtl] = (0, react.useState)(5);
	const [keysConfigured, setKeysConfigured] = (0, react.useState)({});
	const [lang, setLang] = (0, react.useState)("en");
	const [dirty, setDirty] = (0, react.useState)(false);
	const [saving, setSaving] = (0, react.useState)(false);
	const [failed, setFailed] = (0, react.useState)(false);
	const [testing, setTesting] = (0, react.useState)(false);
	const [testResult, setTestResult] = (0, react.useState)(null);
	const load = (0, react.useCallback)(async () => {
		try {
			const result = await bridgeDescribe();
			if (!result.ok || !result.value) {
				setStatus("unavailable");
				return;
			}
			const view = result.value.namespaces.find((n) => n.ns === NS);
			if (!view) {
				setStatus("unavailable");
				return;
			}
			const v = view.value ?? {};
			setProvider(v.provider ?? "bing");
			setLang(v.lang === "zh" ? "zh" : "en");
			setExaKey(v.exaApiKey ?? "");
			setTavilyKey(v.tavilyApiKey ?? "");
			setKeenableKey(v.keenableApiKey ?? "");
			setPerplexityKey(v.perplexityApiKey ?? "");
			setDeepseekKey(v.deepseekApiKey ?? "");
			setPlatforms(Array.isArray(v.platforms) && v.platforms.length > 0 ? v.platforms : ["github", "reddit"]);
			setCacheTtl(v.cacheTtl === void 0 ? 5 : Math.min(Math.max(Number(v.cacheTtl) || 5, 0), 5));
			const configured = {};
			for (const secret of view.secrets ?? []) {
				if (!secret.set) continue;
				const path = secret.path.join(".");
				if (path === "exaApiKey") configured.exa = true;
				if (path === "tavilyApiKey") configured.tavily = true;
				if (path === "keenableApiKey") configured.keenable = true;
				if (path === "perplexityApiKey") configured.perplexity = true;
				if (path === "deepseekApiKey") configured.deepseek = true;
			}
			setKeysConfigured(configured);
			setWritable(result.value.writable);
			setStatus("ready");
		} catch {
			setStatus("unavailable");
		}
	}, []);
	(0, react.useEffect)(() => {
		load();
	}, [load]);
	const ready = status === "ready";
	const t = tt(lang);
	const currentEngine = ENGINES.find((e) => e.id === provider) ?? ENGINES[0];
	const badgeClass = currentEngine.badge === "FREE" ? "dshfs-badge dshfs-badgeFree" : "dshfs-badge dshfs-badgeKey";
	const select = (value) => {
		setProvider(value);
		setDirty(true);
		setFailed(false);
	};
	const save = async () => {
		setSaving(true);
		setFailed(false);
		try {
			const ops = [{
				op: "set",
				path: ["provider"],
				value: provider
			}, {
				op: "set",
				path: ["lang"],
				value: lang
			}];
			if (exaKey.trim()) ops.push({
				op: "set",
				path: ["exaApiKey"],
				value: exaKey.trim()
			});
			if (tavilyKey.trim()) ops.push({
				op: "set",
				path: ["tavilyApiKey"],
				value: tavilyKey.trim()
			});
			if (keenableKey.trim()) ops.push({
				op: "set",
				path: ["keenableApiKey"],
				value: keenableKey.trim()
			});
			if (perplexityKey.trim()) ops.push({
				op: "set",
				path: ["perplexityApiKey"],
				value: perplexityKey.trim()
			});
			if (deepseekKey.trim()) ops.push({
				op: "set",
				path: ["deepseekApiKey"],
				value: deepseekKey.trim()
			});
			ops.push({
				op: "set",
				path: ["platforms"],
				value: platforms
			});
			ops.push({
				op: "set",
				path: ["cacheTtl"],
				value: Math.min(Math.max(Number(cacheTtl) || 5, 0), 5)
			});
			const result = await bridgeMutate({
				ns: NS,
				ops
			});
			if (result.ok) {
				setDirty(false);
				setFailed(false);
				if (result.value?.value) setProvider(result.value.value.provider ?? provider);
				load();
			} else setFailed(true);
		} catch {
			setFailed(true);
		} finally {
			setSaving(false);
		}
	};
	const discard = () => {
		load();
		setDirty(false);
		setFailed(false);
	};
	const runTest = async () => {
		setTesting(true);
		setTestResult(null);
		setFailed(false);
		try {
			const result = await bridgeRawSearch({
				query: "DeepSeek Harness",
				maxResults: 2,
				engine: provider
			});
			if (result.ok && result.value) {
				const sources = result.value.sources ?? [];
				setTestResult({
					ok: true,
					count: sources.length,
					engine: result.value.provider ?? provider,
					content: result.value.content ?? "",
					sample: sources[0]?.title ?? ""
				});
			} else setTestResult({
				ok: false,
				error: result.message ?? "unknown error"
			});
		} catch {
			setTestResult({
				ok: false,
				error: "request failed"
			});
		} finally {
			setTesting(false);
		}
	};
	const toggleLang = () => {
		setLang((prev) => prev === "en" ? "zh" : "en");
		setDirty(true);
		setFailed(false);
	};
	if (status === "loading") return null;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
		className: open ? "dshfs-card dshfs-cardOpen" : "dshfs-card",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
			type: "button",
			className: "dshfs-header",
			"aria-expanded": open,
			onClick: () => setOpen(!open),
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "dshfs-headText",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dshfs-name",
						children: "Free Web Search"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dshfs-description",
						children: t.description
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: badgeClass,
					children: currentEngine.badge
				}),
				dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dshfs-pending",
					children: t.unsaved
				}) : null,
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "dshfs-btn dshfs-langToggle",
					onClick: (e) => {
						e.stopPropagation();
						toggleLang();
					},
					children: t.toggleLang
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: open ? "dshfs-chevron dshfs-chevronOpen" : "dshfs-chevron",
					children: "▾"
				})
			]
		}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "dshfs-body",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dshfs-field",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dshfs-label",
							children: [t.searchEngine, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: badgeClass,
								children: currentEngine.badge
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
							className: "dshfs-select",
							value: provider,
							disabled: !ready || saving,
							onChange: (e) => select(e.target.value),
							children: ENGINES.map((engine) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
								value: engine.id,
								children: [
									engine.label,
									" (",
									engine.badge,
									")"
								]
							}, engine.id))
						}),
						currentEngine.link ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
							className: "dshfs-link",
							href: currentEngine.link,
							target: "_blank",
							rel: "noopener noreferrer",
							children: currentEngine.badge === "FREE" ? t.visit : t.getKey
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dshfs-hint",
							children: t.engineHint
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dshfs-field",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dshfs-label",
							children: t.apiKeys
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "dshfs-input",
							type: "password",
							placeholder: t.exaPh(!!keysConfigured.exa),
							value: exaKey,
							disabled: !ready || saving,
							onChange: (e) => {
								setExaKey(e.target.value);
								setDirty(true);
								setFailed(false);
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "dshfs-input",
							type: "password",
							placeholder: t.tavilyPh(!!keysConfigured.tavily),
							value: tavilyKey,
							disabled: !ready || saving,
							onChange: (e) => {
								setTavilyKey(e.target.value);
								setDirty(true);
								setFailed(false);
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "dshfs-input",
							type: "password",
							placeholder: t.keenablePh(!!keysConfigured.keenable),
							value: keenableKey,
							disabled: !ready || saving,
							onChange: (e) => {
								setKeenableKey(e.target.value);
								setDirty(true);
								setFailed(false);
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "dshfs-input",
							type: "password",
							placeholder: t.perplexityPh(!!keysConfigured.perplexity),
							value: perplexityKey,
							disabled: !ready || saving,
							onChange: (e) => {
								setPerplexityKey(e.target.value);
								setDirty(true);
								setFailed(false);
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "dshfs-input",
							type: "password",
							placeholder: t.deepseekPh(!!keysConfigured.deepseek),
							value: deepseekKey,
							disabled: !ready || saving,
							onChange: (e) => {
								setDeepseekKey(e.target.value);
								setDirty(true);
								setFailed(false);
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dshfs-hint",
							children: t.keysHint
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dshfs-field",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dshfs-label",
							children: t.platformSearch
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dshfs-platforms",
							children: [["github", "GitHub"], ["reddit", "Reddit"]].map(([id, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: "dshfs-platform",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: platforms.includes(id),
									disabled: !ready || saving,
									onChange: (e) => {
										setPlatforms((prev) => e.target.checked ? [...prev, id] : prev.filter((p) => p !== id));
										setDirty(true);
										setFailed(false);
									}
								}), label]
							}, id))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dshfs-hint",
							children: t.platformHint
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dshfs-field",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dshfs-label",
							children: t.cacheTtl
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "dshfs-input dshfs-ttl",
							type: "number",
							min: 0,
							max: 5,
							step: 1,
							value: cacheTtl,
							disabled: !ready || saving,
							onChange: (e) => {
								setCacheTtl(Number(e.target.value));
								setDirty(true);
								setFailed(false);
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dshfs-hint",
							children: t.cacheTtlHint
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dshfs-resultRow",
					children: [failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dshfs-failed",
						children: t.saveFailed
					}) : null, testResult ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: testResult.ok ? "dshfs-testOk" : "dshfs-failed",
						children: testResult.ok ? t.testOk(testResult) : t.testFail(testResult.error)
					}) : null]
				}),
				!ready ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dshfs-hint",
					children: t.unavailable
				}) : null,
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dshfs-footer",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dshfs-footerLeft",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dshfs-version",
							children: "dsh-free-web-search"
						})
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dshfs-footerRight",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "dshfs-btn",
								type: "button",
								onClick: runTest,
								disabled: testing || saving || !ready,
								children: testing ? t.testing : t.testEngine
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "dshfs-btn",
								type: "button",
								onClick: () => {
									setProvider("bing");
									setDirty(true);
									setFailed(false);
								},
								disabled: saving || !ready || provider === "bing",
								children: t.useBing
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "dshfs-btn",
								type: "button",
								onClick: discard,
								disabled: saving || !dirty,
								children: t.discard
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "dshfs-btn dshfs-save",
								type: "button",
								onClick: save,
								disabled: saving || !dirty || !ready,
								children: saving ? t.saving : t.save
							})
						]
					})]
				})
			]
		}) : null]
	});
}

//#endregion
//#region src/client/index.ts
const inject = ["slots", "commandUi"];
function apply(ctx) {
	ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
		name: "settings.plugin.item",
		key: "free-web-search",
		id: "dsh-free-web-search",
		order: 120,
		inject: () => ({})
	}, FreeSearchCard));
	ctx.inject(["commandUi"], (sctx) => {
		const command = sctx.get("commandUi");
		sctx.effect(() => {
			return command.register({
				name: "free-search-engine",
				description: "Switch web search engine",
				available: () => true,
				ui: {
					kind: "popupSelect",
					options: async () => {
						const result = await bridgeDescribe();
						const current = ((result.ok ? result.value?.namespaces.find((n) => n.ns === NS) : void 0)?.value)?.provider ?? "bing";
						return ENGINES.map((e) => ({
							id: e.id,
							label: `${e.label}${e.badge === "FREE" ? " · Free" : " · API Key"}`,
							detail: e.id === current ? "current" : void 0,
							active: e.id === current
						}));
					},
					onSelect: async (option) => {
						await bridgeMutate({
							ns: NS,
							ops: [{
								op: "set",
								path: ["provider"],
								value: option.id
							}]
						});
					}
				}
			});
		}, "free-web-search: /free-search-engine command");
	});
}

//#endregion
exports.apply = apply;
exports.inject = inject;
return module.exports; } });
//# sourceMappingURL=client.js.map