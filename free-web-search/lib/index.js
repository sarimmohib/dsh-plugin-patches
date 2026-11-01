import z from "@deepseek-ai/schemastery";
import { SettingsConflictError } from "@deepseek-ai/dsh-settings";
import { defineTool } from "@deepseek-ai/dsh-tools";

//#region src/engines/common.ts
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const ACCEPT_LANG = "en-US,en;q=0.9";
const TIME_RANGES = [
	"day",
	"week",
	"month",
	"year"
];
const DAYS_BY_RANGE = {
	day: 1,
	week: 7,
	month: 30,
	year: 365
};
function parseTimeRange(input) {
	if (input === void 0 || input === null) return void 0;
	if (typeof input === "object") {
		const obj = input;
		if (typeof obj.after === "string" && /^\d{4}-\d{2}-\d{2}$/.test(obj.after)) return { after: obj.after };
		if (typeof obj.days === "number" && Number.isFinite(obj.days) && obj.days > 0) return { days: obj.days };
		return;
	}
	const s = String(input).trim().toLowerCase();
	if (s.length === 0) return void 0;
	if (TIME_RANGES.includes(s)) return { days: DAYS_BY_RANGE[s] };
	if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return { after: s };
	const m = s.match(/^(\d+(?:\.\d+)?)\s*(h|hour|hours|d|day|days|w|week|weeks|mo|month|months|y|year|years)$/);
	if (m) {
		const n = parseFloat(m[1]);
		const unit = m[2][0];
		return { days: unit === "h" ? n / 24 : unit === "d" ? n : unit === "w" ? n * 7 : unit === "m" ? n * 30 : n * 365 };
	}
}
function approximateTimeRange(days) {
	if (days <= 2) return "day";
	if (days <= 14) return "week";
	if (days <= 90) return "month";
	return "year";
}
function isoDaysAgo(days) {
	return (/* @__PURE__ */ new Date(Date.now() - days * 864e5)).toISOString().replace(/\.\d{3}Z$/, ".000Z");
}
function decodeEntities(text) {
	return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
function stripTags(html) {
	return decodeEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}
const SNIPPET_NOISE = /\b(sign up|sign in|log in|login|subscribe( to| for)?|member[- ]?only|become a member|create (a )?free account|read more|continue reading|story continues|get started|install (the )?app|view on|medium membership|join \w+ for free|get updates from this writer|stories in your inbox|remember me for|unlock this|free to read|become a patron)\b/gi;
function cleanSnippet(text) {
	if (!text) return text;
	return text.replace(SNIPPET_NOISE, " ").replace(/^\s*(#{1,6}\s*|\[\s*x?\s*\]\s*|-\s*\[\s*x?\s*\]\s*|>\s*)/gm, " ").replace(/\s+/g, " ").trim().slice(0, 300);
}
/** Decode a base64url payload as UTF-8. `atob` keeps this free of `Buffer`. */
function fromBase64Url(value) {
	const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
	const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
	try {
		const binary = atob(padded);
		return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
	} catch {
		return null;
	}
}
/**
* Bing serves no result URLs. Every href on a SERP is its own click tracker —
* `https://www.bing.com/ck/a?…&u=a1<base64url of the target>&ntb=1` — and it
* arrives with HTML entities intact. Handed to a model unchanged, the citation
* is a `bing.com/ck/a?!&amp;&amp;…` link that answers `204` and leads nowhere.
*
* So: decode the entities, then unwrap `u=a1…`. Anything unexpected degrades to
* the entity-decoded href rather than dropping the result — a tracker link that
* at least resolves beats no source at all.
*/
function extractBingUrl(href) {
	if (!href) return null;
	const decoded = decodeEntities(href);
	let parsed;
	try {
		parsed = new URL(decoded);
	} catch {
		return decoded;
	}
	if (!/(^|\.)bing\.com$/i.test(parsed.hostname) || !parsed.pathname.startsWith("/ck/a")) return decoded;
	const wrapped = parsed.searchParams.get("u");
	if (wrapped === null || !wrapped.startsWith("a1")) return decoded;
	const target = fromBase64Url(wrapped.slice(2));
	return target !== null && /^https?:\/\//i.test(target) ? target : decoded;
}
function extractDdgUrl(rel) {
	if (!rel) return null;
	const m = decodeEntities(rel).match(/uddg=([^&]+)/);
	if (m) try {
		return decodeURIComponent(m[1]);
	} catch {
		return m[1];
	}
	if (rel.startsWith("//")) return `https:${rel}`;
	return rel;
}
function uniqueSources(sources, limit) {
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const s of sources) {
		if (s.url && !seen.has(s.url)) {
			seen.add(s.url);
			out.push(s);
		}
		if (out.length >= limit) break;
	}
	return out;
}
async function fetchHtml(url, signal) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 12e3);
	const onAbort = () => controller.abort();
	signal?.addEventListener("abort", onAbort);
	let response;
	try {
		response = await fetch(url, {
			headers: {
				"user-agent": USER_AGENT,
				"accept-language": ACCEPT_LANG
			},
			signal: controller.signal,
			redirect: "follow"
		});
	} catch (error) {
		if (signal?.aborted) throw error;
		throw new Error(`connection error: ${error instanceof Error ? error.message : String(error)}`);
	} finally {
		clearTimeout(timer);
		signal?.removeEventListener("abort", onAbort);
	}
	if (!response.ok) throw new Error(`HTTP ${response.status} from ${url.split("?")[0]}`);
	return response.text();
}
const DDG_ANTIBOT_RE = /anomaly|captcha|unusual traffic|robot check/i;
function checkDdgAntiBot(html) {
	if (DDG_ANTIBOT_RE.test(html.slice(0, 4e3))) throw new Error("DuckDuckGo is rate-limited (anti-bot challenge, usually temporary)");
}
async function fetchHtmlWithRetry(url, signal) {
	let lastError;
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			const html = await fetchHtml(url, signal);
			if (html.length > 500) return html;
			lastError = /* @__PURE__ */ new Error(`empty response (${html.length} bytes)`);
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
		}
		if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1500));
	}
	throw lastError ?? /* @__PURE__ */ new Error("fetch failed");
}

//#endregion
//#region src/engines/ddg.ts
const DDG_HTML_URL = "https://html.duckduckgo.com/html/";
const DDG_LITE_URL = "https://lite.duckduckgo.com/lite/";
async function searchDdgHtml(query, maxResults, options, signal) {
	const params = new URLSearchParams({ q: query });
	if (options?.region) params.set("kl", options.region);
	if (options?.timeRange && "days" in options.timeRange) {
		const df = {
			day: "d",
			week: "w",
			month: "m",
			year: "y"
		}[approximateTimeRange(options.timeRange.days)];
		if (df) params.set("df", df);
	}
	const html = await fetchHtmlWithRetry(`${DDG_HTML_URL}?${params}`, signal);
	checkDdgAntiBot(html);
	const blocks = html.match(/<div class="result results_links[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g) ?? [];
	const sources = [];
	for (const block of blocks) {
		const urlMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]*)"/);
		const titleMatch = block.match(/<a[^>]*class="result__a"[^>]*>(.*?)<\/a>/);
		const snippetMatch = block.match(/<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/);
		const dateMatch = block.match(/<span[^>]*>\s*([\dT:.+-]+)\s*<\/span>/);
		const url = extractDdgUrl(urlMatch?.[1]);
		if (!url) continue;
		sources.push({
			url,
			...titleMatch ? { title: stripTags(titleMatch[1]) } : {},
			...snippetMatch ? { snippet: stripTags(snippetMatch[1]) } : {},
			...dateMatch ? { publishedAt: dateMatch[1] } : {}
		});
	}
	return {
		sources: uniqueSources(sources, maxResults),
		truncated: false
	};
}
async function searchDdgLite(query, maxResults, options, signal) {
	const params = new URLSearchParams({ q: query });
	if (options?.timeRange && "days" in options.timeRange) {
		const df = {
			day: "d",
			week: "w",
			month: "m",
			year: "y"
		}[approximateTimeRange(options.timeRange.days)];
		if (df) params.set("df", df);
	}
	const html = await fetchHtmlWithRetry(`${DDG_LITE_URL}?${params}`, signal);
	checkDdgAntiBot(html);
	const linkMatches = html.match(/<a[^>]*class=['"]result-link['"][^>]*>[\s\S]*?<\/a>/g) ?? [];
	const snippetMatches = html.match(/class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/g) ?? [];
	const sources = [];
	for (let i = 0; i < linkMatches.length; i++) {
		const tag = linkMatches[i];
		const hrefMatch = tag.match(/href="([^"]*)"/);
		const titleMatch = tag.match(/class=['"]result-link['"][^>]*>(.*?)<\/a>/);
		if (!hrefMatch) continue;
		const url = extractDdgUrl(hrefMatch[1]);
		if (!url) continue;
		const snippet = snippetMatches[i]?.match(/class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/)?.[1];
		sources.push({
			url,
			...titleMatch ? { title: stripTags(titleMatch[1]) } : {},
			...snippet ? { snippet: stripTags(snippet) } : {}
		});
	}
	return {
		sources: uniqueSources(sources, maxResults),
		truncated: false
	};
}

//#endregion
//#region src/engines/bing.ts
const BING_URL = "https://www.bing.com/search";
/**
* Parse the result blocks out of a Bing SERP. Split from the fetch so the
* parsing — the half that broke, and the half that changes whenever Bing
* reshapes its markup — can be tested against a captured page instead of the
* live web.
*/
function parseBingResults(html, maxResults) {
	const blocks = html.match(/<li class="b_algo"[\s\S]*?<\/li>/g) ?? [];
	const sources = [];
	for (const block of blocks) {
		const hrefMatch = block.match(/<a[^>]*href="(https?:\/\/[^"]+)"/);
		const titleMatch = block.match(/<h2[^>]*>[\s\S]*?<a[^>]*>(.*?)<\/a>[\s\S]*?<\/h2>/);
		const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/);
		const url = extractBingUrl(hrefMatch?.[1]);
		if (url === null) continue;
		sources.push({
			url,
			...titleMatch ? { title: stripTags(titleMatch[1]) } : {},
			...snippetMatch ? { snippet: stripTags(snippetMatch[1]) } : {}
		});
	}
	return uniqueSources(sources, maxResults);
}
async function searchBing(query, maxResults, options, signal) {
	return {
		sources: parseBingResults(await fetchHtmlWithRetry(`${BING_URL}?${new URLSearchParams({
			q: query,
			mkt: options?.bingMarket ?? "en-US"
		})}`, signal), maxResults),
		truncated: false
	};
}

//#endregion
//#region src/engines/searxng.ts
const SEARXNG_DEFAULT_INSTANCES = [
	"https://opnxng.com",
	"https://priv.au",
	"https://searx.be",
	"https://searx.tiekoetter.com",
	"https://search.inetol.net",
	"https://paulgo.io"
];
const SEARXNG_TIME = {
	day: "day",
	week: "week",
	month: "month",
	year: "year"
};
async function searchSearxng(query, maxResults, options, signal) {
	const instances = options?.searxngInstances?.length ? options.searxngInstances : SEARXNG_DEFAULT_INSTANCES;
	const errors = [];
	for (const base of instances) try {
		const params = new URLSearchParams({
			q: query,
			format: "json"
		});
		if (options?.timeRange && "days" in options.timeRange) {
			const tr = SEARXNG_TIME[approximateTimeRange(options.timeRange.days)];
			if (tr) params.set("time_range", tr);
		}
		const ctrl = new AbortController();
		const timer = setTimeout(() => ctrl.abort(), 8e3);
		const onAbort = () => ctrl.abort();
		signal?.addEventListener("abort", onAbort);
		try {
			const response = await fetch(`${base}/search?${params}`, {
				headers: {
					"user-agent": USER_AGENT,
					accept: "application/json"
				},
				signal: ctrl.signal
			});
			if (!response.ok) {
				errors.push(`${base}: HTTP ${response.status}`);
				continue;
			}
			const data = await response.json().catch(() => null);
			if (!data || !Array.isArray(data.results)) {
				errors.push(`${base}: invalid JSON`);
				continue;
			}
			const sources = data.results.filter((r) => r.url).map((r) => ({
				url: r.url,
				...r.title ? { title: String(r.title) } : {},
				...r.content ? { snippet: String(r.content) } : {}
			}));
			if (sources.length > 0) return {
				sources: uniqueSources(sources, maxResults),
				truncated: false
			};
			errors.push(`${base}: 0 results`);
		} finally {
			clearTimeout(timer);
			signal?.removeEventListener("abort", onAbort);
		}
	} catch (error) {
		errors.push(`${base}: ${error instanceof Error ? error.message : String(error)}`);
	}
	const detail = errors.length > 0 ? errors.join(", ") : "no instances configured";
	throw new Error(`all SearXNG instances failed: ${detail.slice(0, 300)}`);
}

//#endregion
//#region src/engines/anysearch.ts
const ANYSEARCH_URL = "https://api.anysearch.com/v1/search";
async function searchAnysearch(query, maxResults, signal) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 12e3);
	const onAbort = () => controller.abort();
	signal?.addEventListener("abort", onAbort);
	let response;
	try {
		response = await fetch(ANYSEARCH_URL, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				query,
				max_results: maxResults
			}),
			signal: controller.signal
		});
	} catch (error) {
		if (signal?.aborted) throw error;
		throw new Error(`AnySearch request failed: ${error instanceof Error ? error.message : String(error)}`);
	} finally {
		clearTimeout(timer);
		signal?.removeEventListener("abort", onAbort);
	}
	if (!response.ok) throw new Error(`AnySearch API error (HTTP ${response.status})`);
	const data = await response.json();
	if (data.code !== 0) throw new Error(`AnySearch API error: ${data.message ?? data.code}`);
	return {
		sources: (data.data?.results ?? []).filter((r) => r.url).map((r) => ({
			url: r.url,
			...r.title ? { title: String(r.title) } : {},
			...r.snippet ? { snippet: String(r.snippet).slice(0, 300) } : {}
		})),
		truncated: false
	};
}

//#endregion
//#region src/engines/exa.ts
const EXA_MCP_URL = "https://mcp.exa.ai/mcp";
async function searchExa(query, maxResults, apiKey, timeRange, signal) {
	const body = {
		query,
		type: "auto",
		contents: { highlights: { highlightsPerUrl: 1 } },
		numResults: maxResults
	};
	if (timeRange) if ("after" in timeRange) body.startPublishedDate = timeRange.after;
	else body.startPublishedDate = isoDaysAgo(timeRange.days);
	const response = await fetch("https://api.exa.ai/search", {
		method: "POST",
		redirect: "error",
		headers: {
			authorization: `Bearer ${apiKey}`,
			"content-type": "application/json",
			accept: "application/json",
			"user-agent": "deepseek-harness/free-web-search"
		},
		body: JSON.stringify(body),
		...signal !== void 0 ? { signal } : {}
	});
	if (!response.ok) {
		const detail = await response.text().catch(() => "");
		if (response.status === 401) throw new Error("Exa API key is invalid (HTTP 401) - update it in Settings > Plugins > Free Web Search");
		throw new Error(`Exa API error (HTTP ${response.status}): ${detail.slice(0, 200)}`);
	}
	return {
		sources: uniqueSources(((await response.json()).results ?? []).filter((result) => result.url).map((result) => {
			const snippet = result.highlights?.find((h) => h.trim().length > 0);
			return {
				url: result.url,
				...result.title ? { title: result.title } : {},
				...snippet ? { snippet } : {},
				...result.publishedDate ? { publishedAt: result.publishedDate } : {}
			};
		}), maxResults),
		truncated: false
	};
}
async function searchExaMCP(query, maxResults, signal) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 2e4);
	const onAbort = () => controller.abort();
	signal?.addEventListener("abort", onAbort);
	let response;
	try {
		response = await fetch(EXA_MCP_URL, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				accept: "application/json, text/event-stream"
			},
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: Date.now(),
				method: "tools/call",
				params: {
					name: "web_search_exa",
					arguments: {
						query,
						numResults: maxResults
					}
				}
			}),
			signal: controller.signal
		});
	} catch (error) {
		if (signal?.aborted) throw error;
		throw new Error(`Exa MCP request failed: ${error instanceof Error ? error.message : String(error)}`);
	} finally {
		clearTimeout(timer);
		signal?.removeEventListener("abort", onAbort);
	}
	if (!response.ok) throw new Error(`Exa MCP error (HTTP ${response.status})`);
	const text = await response.text();
	let json = null;
	for (const line of text.split("\n")) if (line.startsWith("data: ")) try {
		json = JSON.parse(line.slice(6));
		break;
	} catch {}
	if (!json || json.error) throw new Error(`Exa MCP error: ${json?.error?.message ?? "no data"}`);
	const textBlocks = (json.result?.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
	const sources = [];
	for (const block of textBlocks.split(/\n(?=Title:)/)) {
		const title = block.match(/^Title: (.+)$/m)?.[1];
		const url = block.match(/^URL: (\S+)$/m)?.[1];
		const published = block.match(/^Published: (.+)$/m)?.[1];
		const highlights = block.split(/^Highlights:$/m)[1]?.split("\n").filter((l) => l.trim() && !l.trim().startsWith("...")).slice(0, 3).join(" ");
		if (!url) continue;
		sources.push({
			url,
			...title ? { title } : {},
			...highlights ? { snippet: highlights.slice(0, 300) } : {},
			...published && /^\d{4}-\d{2}-\d{2}/.test(published) ? { publishedAt: published } : {}
		});
	}
	return {
		sources,
		truncated: false
	};
}

//#endregion
//#region src/engines/tavily.ts
const TAVILY_URL = "https://api.tavily.com/search";
async function searchTavily(query, maxResults, apiKey, timeRange, signal) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 15e3);
	const onAbort = () => controller.abort();
	signal?.addEventListener("abort", onAbort);
	let response;
	try {
		const body = {
			query,
			max_results: Math.min(maxResults, 20),
			search_depth: "basic"
		};
		if (timeRange && "days" in timeRange) body.time_range = approximateTimeRange(timeRange.days);
		response = await fetch(TAVILY_URL, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				accept: "application/json",
				...apiKey ? { authorization: `Bearer ${apiKey}` } : { "x-tavily-access-mode": "keyless" }
			},
			body: JSON.stringify(body),
			signal: controller.signal,
			redirect: "error"
		});
	} catch (error) {
		if (signal?.aborted) throw error;
		throw new Error(`Tavily request failed: ${error instanceof Error ? error.message : String(error)}`);
	} finally {
		clearTimeout(timer);
		signal?.removeEventListener("abort", onAbort);
	}
	if (!response.ok) {
		const detail = await response.text().catch(() => "");
		if (response.status === 401) throw new Error("Tavily API key is invalid (HTTP 401) - update it in Settings > Plugins > Free Web Search");
		throw new Error(`Tavily API error (HTTP ${response.status}): ${detail.slice(0, 200)}`);
	}
	return {
		sources: uniqueSources(((await response.json()).results ?? []).filter((r) => r.url).map((r) => ({
			url: r.url,
			...r.title ? { title: String(r.title) } : {},
			...r.content ? { snippet: String(r.content).slice(0, 300) } : {}
		})), maxResults),
		truncated: false
	};
}

//#endregion
//#region src/engines/keenable.ts
const KEENABLE_URL = "https://api.keenable.ai/v1/search";
const KEENABLE_MCP_URL = "https://api.keenable.ai/mcp";
function formatKeenableRelative(days) {
	if (days <= .5) return "12h";
	if (days < 1) return `${Math.round(days * 24)}h`;
	if (days < 30) return `${Math.round(days)}d`;
	if (days < 365) return `${Math.round(days / 30)}mo`;
	return `${Math.round(days / 365)}y`;
}
function extractKeenableSources(text, maxResults) {
	const sources = [];
	for (const block of String(text).split(/\n(?=Title:)/)) {
		const title = block.match(/^Title: (.+)$/m)?.[1];
		const url = block.match(/^URL: (\S+)$/m)?.[1];
		const published = block.match(/^Published: (.+)$/m)?.[1] ?? block.match(/^Acquired: (.+)$/m)?.[1];
		const snippets = block.split(/^Snippets:$/m)[1]?.split("\n").filter((l) => l.trim()).slice(0, 3).join(" ");
		if (!url) continue;
		sources.push({
			url,
			...title ? { title } : {},
			...snippets ? { snippet: snippets.slice(0, 300) } : {},
			...published && /^\d{4}-\d{2}-\d{2}/.test(published) ? { publishedAt: published } : {}
		});
	}
	return uniqueSources(sources, maxResults);
}
async function searchKeenableREST(query, maxResults, apiKey, timeRange, signal) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 2e4);
	const onAbort = () => controller.abort();
	signal?.addEventListener("abort", onAbort);
	let response;
	try {
		const body = {
			query,
			mode: "realtime"
		};
		if (timeRange) if ("after" in timeRange) body.published_after = timeRange.after;
		else body.published_after = formatKeenableRelative(timeRange.days);
		response = await fetch(KEENABLE_URL, {
			method: "POST",
			headers: {
				"x-api-key": apiKey,
				"content-type": "application/json",
				accept: "application/json"
			},
			body: JSON.stringify(body),
			signal: controller.signal
		});
	} catch (error) {
		if (signal?.aborted) throw error;
		throw new Error(`Keenable request failed: ${error instanceof Error ? error.message : String(error)}`);
	} finally {
		clearTimeout(timer);
		signal?.removeEventListener("abort", onAbort);
	}
	if (!response.ok) {
		const detail = await response.text().catch(() => "");
		if (response.status === 401) throw new Error("Keenable API key is invalid (HTTP 401) - update it in Settings > Plugins > Free Web Search");
		throw new Error(`Keenable API error (HTTP ${response.status}): ${detail.slice(0, 200)}`);
	}
	return {
		sources: uniqueSources(((await response.json()).results ?? []).filter((r) => r.url).map((r) => ({
			url: r.url,
			...r.title ? { title: String(r.title) } : {},
			...r.snippet ?? r.description ? { snippet: String(r.snippet ?? r.description).slice(0, 300) } : {},
			...r.published_at ? { publishedAt: String(r.published_at) } : {}
		})), maxResults),
		truncated: false
	};
}
async function searchKeenableMCP(query, maxResults, timeRange, signal) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 25e3);
	const onAbort = () => controller.abort();
	signal?.addEventListener("abort", onAbort);
	let response;
	try {
		const arguments_ = { query };
		if (timeRange) if ("after" in timeRange) arguments_.published_after = timeRange.after;
		else arguments_.published_after = formatKeenableRelative(timeRange.days);
		response = await fetch(KEENABLE_MCP_URL, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				accept: "application/json, text/event-stream"
			},
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: Date.now(),
				method: "tools/call",
				params: {
					name: "search_web_pages",
					arguments: arguments_
				}
			}),
			signal: controller.signal
		});
	} catch (error) {
		if (signal?.aborted) throw error;
		throw new Error(`Keenable MCP request failed: ${error instanceof Error ? error.message : String(error)}`);
	} finally {
		clearTimeout(timer);
		signal?.removeEventListener("abort", onAbort);
	}
	if (!response.ok) throw new Error(`Keenable MCP error (HTTP ${response.status})`);
	const data = await response.json();
	if (data.error) throw new Error(`Keenable MCP error: ${data.error.message ?? "unknown"}`);
	const text = (data.result?.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
	if (data.result?.isError) throw new Error(`Keenable MCP error: ${text.slice(0, 200)}`);
	return {
		sources: extractKeenableSources(text, maxResults),
		truncated: false
	};
}
async function searchKeenable(query, maxResults, apiKey, timeRange, signal) {
	if (apiKey) return searchKeenableREST(query, maxResults, apiKey, timeRange, signal);
	return searchKeenableMCP(query, maxResults, timeRange, signal);
}

//#endregion
//#region src/engines/perplexity.ts
function extractCitationContext(text, index) {
	const marker = `[${index}]`;
	const pos = text.indexOf(marker);
	if (pos === -1) return text.slice(0, 200);
	const start = Math.max(0, pos - 80);
	const end = Math.min(text.length, pos + marker.length + 120);
	return text.slice(start, end).trim();
}
async function searchPerplexity(query, maxResults, apiKey, signal) {
	const response = await fetch("https://api.perplexity.ai/chat/completions", {
		method: "POST",
		redirect: "error",
		headers: {
			authorization: `Bearer ${apiKey}`,
			"content-type": "application/json",
			accept: "application/json"
		},
		body: JSON.stringify({
			model: "sonar",
			max_tokens: 1024,
			messages: [{
				role: "user",
				content: query
			}]
		}),
		signal: AbortSignal.any([...signal !== void 0 ? [signal] : [], AbortSignal.timeout(2e4)])
	});
	if (!response.ok) {
		const detail = await response.text().catch(() => "");
		if (response.status === 401) throw new Error("Perplexity API key is invalid (HTTP 401) - update it in Settings > Plugins > Free Web Search");
		throw new Error(`Perplexity API error (HTTP ${response.status}): ${detail.slice(0, 200)}`);
	}
	const data = await response.json();
	const answer = data.choices?.[0]?.message?.content ?? "";
	return {
		content: answer,
		sources: uniqueSources((data.citations ?? []).map((url, i) => ({
			url,
			...answer ? { snippet: extractCitationContext(answer, i + 1) } : {}
		})), maxResults),
		truncated: false
	};
}

//#endregion
//#region src/engines/deepseek.ts
async function searchDeepSeekOfficial(query, maxResults, apiKey, signal) {
	const response = await fetch("https://api.deepseek.com/anthropic/v1/messages", {
		method: "POST",
		redirect: "error",
		headers: {
			"x-api-key": apiKey,
			authorization: `Bearer ${apiKey}`,
			"anthropic-version": "2023-06-01",
			"content-type": "application/json",
			accept: "application/json",
			"user-agent": "deepseek-harness/free-web-search"
		},
		body: JSON.stringify({
			model: "deepseek-v4-flash",
			max_tokens: 4096,
			messages: [{
				role: "user",
				content: [{
					type: "text",
					text: `Perform a web search for the query: ${query}`
				}]
			}],
			tools: [{
				type: "web_search_20250305",
				name: "web_search",
				max_uses: 1
			}]
		}),
		signal: AbortSignal.any([...signal !== void 0 ? [signal] : [], AbortSignal.timeout(2e4)])
	});
	if (!response.ok) {
		const detail = await response.text().catch(() => "");
		if (response.status === 401) throw new Error("DeepSeek API key is invalid (HTTP 401) - update it in Settings > Plugins > Free Web Search");
		throw new Error(`DeepSeek API error (HTTP ${response.status}): ${detail.slice(0, 200)}`);
	}
	const blocks = (await response.json()).content ?? [];
	const resultBlocks = blocks.filter((block) => block.type === "web_search_tool_result");
	const snippets = /* @__PURE__ */ new Map();
	for (const block of blocks) {
		if (block.type !== "text") continue;
		for (const cite of block.citations ?? []) if (cite.url && cite.cited_text && !snippets.has(cite.url)) snippets.set(cite.url, cite.cited_text);
	}
	const sources = [];
	for (const block of resultBlocks) for (const item of block.content ?? []) {
		if (item.type !== "web_search_result" || !item.url) continue;
		if (sources.some((s) => s.url === item.url)) continue;
		sources.push({
			url: item.url,
			...item.title ? { title: item.title } : {},
			...snippets.get(item.url) ? { snippet: snippets.get(item.url) } : {},
			...item.page_age ? { publishedAt: item.page_age } : {}
		});
	}
	return {
		sources: uniqueSources(sources, maxResults),
		truncated: false
	};
}

//#endregion
//#region src/engines/platform.ts
async function searchGithub(query, maxResults, signal) {
	const response = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=${maxResults}`, {
		headers: {
			"user-agent": USER_AGENT,
			accept: "application/vnd.github+json"
		},
		...signal !== void 0 ? { signal } : {}
	});
	if (!response.ok) throw new Error(`GitHub API error (HTTP ${response.status})`);
	return {
		sources: ((await response.json()).items ?? []).map((item) => ({
			url: item.html_url,
			title: item.full_name ?? item.name ?? "",
			snippet: `${item.description ?? ""}${item.stargazers_count ? ` ★${item.stargazers_count}` : ""}`.trim()
		})),
		truncated: false
	};
}
async function searchReddit(query, maxResults, signal) {
	const response = await fetch(`https://old.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=${maxResults}&sort=relevance`, {
		headers: {
			"user-agent": `${USER_AGENT} (dsh-free-web-search)`,
			accept: "application/json"
		},
		...signal !== void 0 ? { signal } : {}
	});
	if (!response.ok) throw new Error(`Reddit API error (HTTP ${response.status})`);
	return {
		sources: ((await response.json()).data?.children ?? []).map((c) => c.data).filter((p) => p !== void 0 && p !== null && !!p.url).map((p) => ({
			url: p.url,
			title: p.title ?? "",
			...p.selftext ? { snippet: String(p.selftext).slice(0, 200) } : {}
		})),
		truncated: false
	};
}
async function searchPlatform(platform, query, maxResults, signal) {
	switch (platform) {
		case "github": return searchGithub(query, maxResults, signal);
		case "reddit": return searchReddit(query, maxResults, signal);
		default: throw new Error(`unknown platform: ${platform}`);
	}
}

//#endregion
//#region src/engines/web-fetch.ts
async function webFetch(url, maxLength = 5e4, signal) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 2e4);
	const onAbort = () => controller.abort();
	signal?.addEventListener("abort", onAbort);
	let response;
	try {
		response = await fetch(url, {
			headers: {
				"user-agent": USER_AGENT,
				"accept-language": ACCEPT_LANG,
				accept: "text/html, application/xhtml+xml, text/plain;q=0.9, */*;q=0.8"
			},
			signal: controller.signal,
			redirect: "follow"
		});
	} catch (error) {
		if (signal?.aborted) throw error;
		throw new Error(`fetch failed: ${error instanceof Error ? error.message : String(error)}`);
	} finally {
		clearTimeout(timer);
		signal?.removeEventListener("abort", onAbort);
	}
	if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
	const contentType = response.headers.get("content-type") ?? "";
	const raw = await response.text();
	let title = "";
	let content;
	if (contentType.includes("text/html") || contentType.includes("xhtml")) {
		title = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
		content = htmlToText(raw);
	} else content = raw;
	const truncated = content.length > maxLength;
	if (truncated) content = content.slice(0, maxLength);
	return {
		url,
		title,
		content,
		truncated
	};
}
function htmlToText(html) {
	let text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<nav[\s\S]*?<\/nav>/gi, " ").replace(/<footer[\s\S]*?<\/footer>/gi, " ").replace(/<header[\s\S]*?<\/header>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(?:p|div|h[1-6]|li|tr|blockquote)>/gi, "\n").replace(/<[^>]+>/g, " ");
	text = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
	return text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

//#endregion
//#region src/bridge/cache.ts
const MAX_ENTRIES = 50;
var SearchCache = class {
	map = /* @__PURE__ */ new Map();
	buildKey(query, maxResults, timeRangeLabel, preferred) {
		return [
			query,
			maxResults,
			timeRangeLabel,
			preferred
		].join("\0");
	}
	get(key) {
		const entry = this.map.get(key);
		if (!entry) return void 0;
		if (entry.expiresAt <= Date.now()) {
			this.map.delete(key);
			return;
		}
		this.map.delete(key);
		this.map.set(key, entry);
		return entry.value;
	}
	set(key, value, ttlMs) {
		this.map.set(key, {
			value,
			expiresAt: Date.now() + ttlMs
		});
		if (this.map.size > MAX_ENTRIES) {
			const oldest = this.map.keys().next().value;
			if (oldest !== void 0) this.map.delete(oldest);
		}
	}
};

//#endregion
//#region src/constants.ts
// Runtime settings namespaces are profile entry ids; this plugin entry is `web-search-free`,
// and its Config schema is the settings form shown under Plugins.
const FREE_SEARCH_NS = "web-search-free";
const ALL_ENGINES = [
	"ddg",
	"ddg-lite",
	"bing",
	"searxng",
	"anysearch",
	"exa",
	"tavily",
	"keenable",
	"perplexity",
	"deepseek-official"
];
const FREE_ENGINES = [
	"ddg",
	"ddg-lite",
	"bing",
	"searxng",
	"anysearch"
];

//#endregion
//#region src/bridge/routes.ts
const BRIDGE_PREFIX = "/api/dsh-free-web-search-settings";
const MAX_JSON_BODY_BYTES = 64 * 1024;
function isLoopbackRequest(request) {
	const address = request.socket.remoteAddress;
	if (address !== "127.0.0.1" && address !== "::1" && address !== "::ffff:127.0.0.1") return false;
	const host = request.headers.host;
	if (typeof host !== "string") return false;
	let hostUrl;
	try {
		hostUrl = new URL("http://" + host);
	} catch {
		return false;
	}
	if (hostUrl.hostname !== "127.0.0.1" && hostUrl.hostname !== "localhost" && hostUrl.hostname !== "[::1]") return false;
	if (request.headers["sec-fetch-site"] === "cross-site") return false;
	const origin = request.headers.origin;
	if (origin === void 0) return true;
	try {
		return new URL(origin).host === hostUrl.host;
	} catch {
		return false;
	}
}
function writeJson(res, status, body) {
	const payload = JSON.stringify(body);
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"referrer-policy": "no-referrer"
	});
	res.end(payload);
}
async function readJsonBody(req) {
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		const buffer = chunk;
		size += buffer.length;
		if (size > MAX_JSON_BODY_BYTES) {
			req.resume();
			return;
		}
		chunks.push(buffer);
	}
	try {
		return JSON.parse(Buffer.concat(chunks).toString("utf8"));
	} catch {
		return;
	}
}
function toView(descriptor) {
	return {
		ns: String(descriptor.ns),
		schema: descriptor.schema,
		value: descriptor.value,
		...descriptor.base === void 0 ? {} : { base: descriptor.base },
		...descriptor.user === void 0 ? {} : { user: descriptor.user },
		...descriptor.secrets === void 0 ? {} : { secrets: descriptor.secrets.map((s) => ({
			path: [...s.path],
			set: s.set
		})) },
		revision: descriptor.revision
	};
}
function makeBridgeRoutes(settings, search, testEngine) {
	const allowlisted = () => settings.describe({ redactSecrets: true }).filter((d) => String(d.ns) === FREE_SEARCH_NS).map((d) => String(d.ns));
	const guard = (req, res) => {
		if (!isLoopbackRequest(req)) {
			writeJson(res, 403, { error: "loopback requests only" });
			return false;
		}
		if (req.method !== "POST") {
			writeJson(res, 405, { error: "method not allowed: " + (req.method ?? "") });
			return false;
		}
		return true;
	};
	const handlers = {
		async describe() {
			const descriptors = settings.describe({ redactSecrets: true });
			return {
				ok: true,
				value: {
					namespaces: allowlisted().map((ns) => descriptors.find((d) => String(d.ns) === ns)).filter((d) => d !== void 0).map(toView),
					writable: settings.writable !== false
				}
			};
		},
		async mutate(request) {
			const body = request;
			if (body === null || typeof body !== "object" || typeof body.ns !== "string" || !Array.isArray(body.ops)) return {
				ok: false,
				code: "settings-rejected",
				message: "malformed bridge settings request"
			};
			const { ns } = body;
			if (!allowlisted().includes(ns)) return {
				ok: false,
				code: "settings-not-exposed",
				message: `settings namespace "${ns}" is not exposed`
			};
			const expectedRevision = typeof body.expectedRevision === "number" ? body.expectedRevision : void 0;
			try {
				await settings.mutate(ns, body.ops, expectedRevision);
			} catch (error) {
				if (error instanceof SettingsConflictError) return {
					ok: false,
					code: "settings-conflict",
					message: error.message
				};
				return {
					ok: false,
					code: "internal",
					message: error instanceof Error ? error.message : String(error)
				};
			}
			const descriptor = settings.describe({ redactSecrets: true }).find((c) => String(c.ns) === ns);
			if (descriptor === void 0) return {
				ok: false,
				code: "internal",
				message: `settings namespace "${ns}" was disposed after the mutate`
			};
			return {
				ok: true,
				value: toView(descriptor)
			};
		},
		async rawSearch(request) {
			if (request === null || typeof request !== "object" || typeof request.query !== "string" || request.query.length === 0) return {
				ok: false,
				code: "search-rejected",
				message: "malformed bridge search request (query is required)"
			};
			if (typeof request.engine === "string" && request.engine.length > 0) {
				if (typeof testEngine !== "function") return {
					ok: false,
					code: "search-unavailable",
					message: "engine test is not wired"
				};
				try {
					const result = await testEngine(request.engine, request.query, void 0);
					if (result.ok === false) return {
						ok: false,
						code: "engine-failed",
						message: result.error ?? `${request.engine} failed`
					};
					return {
						ok: true,
						value: {
							provider: request.engine,
							sources: result.sources ?? [],
							content: ""
						}
					};
				} catch (error) {
					return {
						ok: false,
						code: "engine-failed",
						message: error instanceof Error ? error.message : String(error)
					};
				}
			}
			try {
				const result = await search(request);
				return {
					ok: true,
					value: {
						provider: result.provider ?? request.engine ?? "bing",
						sources: result.sources ?? [],
						content: result.content ?? "",
						cache: result._cache === "hit" ? "hit" : "miss"
					}
				};
			} catch (error) {
				return {
					ok: false,
					code: "search-failed",
					message: error instanceof Error ? error.message : String(error)
				};
			}
		}
	};
	return [
		{
			kind: "exact",
			path: `${BRIDGE_PREFIX}/describe`,
			handler: async (req, res) => {
				if (!guard(req, res)) return;
				writeJson(res, 200, await handlers.describe());
			}
		},
		{
			kind: "exact",
			path: `${BRIDGE_PREFIX}/mutate`,
			handler: async (req, res) => {
				if (!guard(req, res)) return;
				const body = await readJsonBody(req);
				if (body === void 0) {
					writeJson(res, 400, {
						ok: false,
						code: "settings-rejected",
						message: "malformed JSON body"
					});
					return;
				}
				writeJson(res, 200, await handlers.mutate(body));
			}
		},
		{
			kind: "exact",
			path: `${BRIDGE_PREFIX}/raw-search`,
			handler: async (req, res) => {
				if (!guard(req, res)) return;
				const body = await readJsonBody(req);
				if (body === void 0) {
					writeJson(res, 400, {
						ok: false,
						code: "search-rejected",
						message: "malformed JSON body"
					});
					return;
				}
				writeJson(res, 200, await handlers.rawSearch(body));
			}
		}
	];
}

//#endregion
//#region src/tools/web-search.ts
function createAdvancedSearchTool(provider) {
	return defineTool({
		name: "advanced_search",
		description: "Search the web with optional time filtering. Use when the user wants results from a specific time window (e.g. \"last week\", \"this month\") or when you need to force a specific engine. Falls back across engines automatically just like web_search.",
		parameters: {
			query: {
				type: "string",
				description: "The search query."
			},
			maxResults: {
				type: "number",
				description: "Optional result count (default 5, max 10)."
			},
			timeRange: {
				type: "string",
				description: "Optional time filter. Fixed tiers: day, week, month, year. Custom: relative like 12h, 3d, 2mo, 1y, or an absolute date like 2026-07-01. Exa/Keenable apply it precisely; Tavily/SearXNG/DDG map to the nearest tier."
			},
			engine: {
				type: "string",
				description: "Optional specific engine to try first: ddg, ddg-lite, bing, searxng, anysearch, exa, tavily, keenable, perplexity, deepseek-official."
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					provider: { type: "string" },
					content: { type: "string" },
					sources: {
						type: "array",
						items: {
							type: "object",
							additionalProperties: false,
							properties: {
								url: { type: "string" },
								title: { type: "string" },
								snippet: { type: "string" },
								publishedAt: { type: "string" }
							}
						}
					}
				}
			},
			render(_args, value) {
				const v = value;
				const a = _args;
				const lines = v.sources.map((s) => `- [${s.title ?? s.url}](${s.url})${s.snippet ? ` - ${s.snippet.slice(0, 120)}` : ""}${s.publishedAt ? ` (${s.publishedAt})` : ""}`);
				return [{
					type: "text",
					text: `Search (${v.provider}${a.timeRange ? `, timeRange=${a.timeRange}` : ""}):\n${lines.join("\n") || "No results found."}${v.content ? `\n\n${v.content}` : ""}`
				}];
			}
		},
		async execute(args) {
			if (!args.query || !String(args.query).trim()) throw new Error("query is required");
			const request = {
				query: args.query,
				maxResults: Math.min(args.maxResults ?? 5, 10)
			};
			if (parseTimeRange(args.timeRange) !== void 0) request.timeRange = args.timeRange;
			if (args.engine && ALL_ENGINES.includes(args.engine)) request.engine = args.engine;
			const result = await provider.search(request);
			return {
				provider: result.provider ?? "bing",
				content: typeof result.content === "string" ? result.content : "",
				sources: (result.sources ?? []).map((s) => {
					const source = {};
					if (s.url) source.url = s.url;
					if (s.title) source.title = String(s.title);
					if (s.snippet) source.snippet = String(s.snippet);
					if (s.publishedAt) source.publishedAt = String(s.publishedAt);
					return source;
				})
			};
		}
	});
}

//#endregion
//#region src/tools/platform-search.ts
const PLATFORMS = {
	github: { name: "GitHub" },
	reddit: { name: "Reddit" }
};
function createPlatformSearchTool(getEnabledPlatforms) {
	return defineTool({
		name: "platform_search",
		description: "Search a specific platform (GitHub / Reddit) for a query. Returns source URLs with titles and snippets.",
		parameters: {
			platform: {
				type: "string",
				description: "Platform to search: github, reddit"
			},
			query: {
				type: "string",
				description: "The search query."
			},
			maxResults: {
				type: "number",
				description: "Optional result count (default 5, max 10)."
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					platform: { type: "string" },
					sources: {
						type: "array",
						items: {
							type: "object",
							additionalProperties: false,
							properties: {
								url: { type: "string" },
								title: { type: "string" },
								snippet: { type: "string" }
							}
						}
					}
				}
			},
			render(_args, value) {
				const v = value;
				const lines = v.sources.map((s) => `- [${s.title ?? s.url}](${s.url})${s.snippet ? ` - ${s.snippet.slice(0, 120)}` : ""}`);
				return [{
					type: "text",
					text: `Platform search (${v.platform}):\n${lines.join("\n") || "No results found."}`
				}];
			}
		},
		async execute(args) {
			const platform = args.platform;
			if (!PLATFORMS[platform]) throw new Error(`unknown platform "${platform}" - use one of: ${Object.keys(PLATFORMS).join(", ")}`);
			if (!getEnabledPlatforms().includes(platform)) throw new Error(`platform "${platform}" is disabled in settings`);
			if (!args.query?.trim()) throw new Error("query is required");
			const limit = Math.min(args.maxResults ?? 5, 10);
			return {
				platform,
				sources: ((await searchPlatform(platform, args.query, limit)).sources ?? []).map((s) => {
					const source = {};
					if (s.url) source.url = s.url;
					if (s.title) source.title = String(s.title);
					if (s.snippet) source.snippet = String(s.snippet);
					return source;
				})
			};
		}
	});
}

//#endregion
//#region src/tools/engine-test.ts
function createEngineTestTool(runEngineTest) {
	return defineTool({
		name: "free_search_test",
		description: "Test every configured web search engine and report which ones work. Use this to verify engine availability, diagnose search failures, or check whether an API key is configured.",
		parameters: {
			engines: {
				type: "array",
				description: "Which engines to test (default: all). Options: " + ALL_ENGINES.join(", ") + ".",
				items: { type: "string" }
			},
			query: {
				type: "string",
				description: "Optional search query for the test (default: 'DeepSeek Harness')."
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: { results: {
					type: "array",
					items: {
						type: "object",
						additionalProperties: false,
						properties: {
							engine: { type: "string" },
							status: { type: "string" },
							results: { type: "number" },
							error: { type: "string" },
							sampleTitle: { type: "string" },
							sampleUrl: { type: "string" }
						}
					}
				} }
			},
			render(_args, value) {
				return [{
					type: "text",
					text: `Search engine test:\n${value.results.map((r) => {
						if (r.status === "ok") return `- ${r.engine}: OK (${r.results} results${r.sampleTitle ? `, e.g. "${r.sampleTitle.slice(0, 40)}"` : ""})`;
						return `- ${r.engine}: FAIL - ${r.error}`;
					}).join("\n")}`
				}];
			}
		},
		async execute(args) {
			const engines = args.engines && args.engines.length > 0 ? args.engines : [...ALL_ENGINES];
			const results = [];
			for (const engine of engines) {
				const r = await runEngineTest(engine, args.query);
				if (r.ok) {
					const item = {
						engine,
						status: "ok",
						results: r.sources.length
					};
					if (r.sources[0]?.title) item.sampleTitle = String(r.sources[0].title);
					if (r.sources[0]?.url) item.sampleUrl = String(r.sources[0].url);
					results.push(item);
				} else results.push({
					engine,
					status: "fail",
					error: r.error ?? "unknown error"
				});
			}
			return { results };
		}
	});
}

//#endregion
//#region src/tools/web-fetch.ts
function createWebFetchTool() {
	return defineTool({
		name: "web_fetch",
		description: "Fetch and read the content of a single web page. Returns the page text with HTML tags stripped. Use this to read articles, documentation, or any URL the user provides.",
		parameters: {
			url: {
				type: "string",
				description: "The URL to fetch."
			},
			maxLength: {
				type: "number",
				description: "Maximum content length in characters (default 50000)."
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					url: { type: "string" },
					title: { type: "string" },
					content: { type: "string" },
					truncated: { type: "boolean" }
				}
			},
			render(_args, value) {
				const v = value;
				const header = v.title ? `# ${v.title}\n${v.url}` : v.url;
				const suffix = v.truncated ? "\n\n[content truncated]" : "";
				return [{
					type: "text",
					text: `${header}\n\n${v.content}${suffix}`
				}];
			}
		},
		async execute(args) {
			if (!args.url?.trim()) throw new Error("url is required");
			let url = args.url.trim();
			if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
			return webFetch(url, args.maxLength ?? 5e4);
		}
	});
}

//#endregion
//#region src/index.ts
const name = "web-search-free";
const inject = ["web"];
const Config = z.object({
	provider: z.string().default("bing").volatile(),
	cache: z.boolean().default(true).volatile(),
	cacheTtl: z.number().default(5).volatile(),
	lang: z.string().default("en").volatile(),
	region: z.string().volatile(),
	bingMarket: z.string().default("en-US").volatile(),
	searxngInstances: z.array(z.string()).volatile(),
	platforms: z.array(z.string()).default(["github", "reddit"]).volatile(),
	exaApiKey: z.string().role("secret").volatile(),
	tavilyApiKey: z.string().role("secret").volatile(),
	keenableApiKey: z.string().role("secret").volatile(),
	perplexityApiKey: z.string().role("secret").volatile(),
	deepseekApiKey: z.string().role("secret").volatile()
});
function toSearchOptions(cfg, timeRange) {
	return {
		...cfg.region ? { region: cfg.region } : {},
		...cfg.bingMarket ? { bingMarket: cfg.bingMarket } : {},
		...cfg.searxngInstances ? { searxngInstances: cfg.searxngInstances } : {},
		...timeRange ? { timeRange } : {}
	};
}
function apply(ctx, config) {
	let current = () => config ?? {};
	const ctxAny = ctx;
	const logger = ctxAny.logger;
	const credentials = ctxAny.get?.("credentials");
	let refreshPrompt = null;
	const searchCache = new SearchCache();
	const resolveApiKey = async (envName, settingsKey) => {
		const cfg = current();
		if (settingsKey) {
			const v = cfg[settingsKey];
			if (typeof v === "string" && v) return v;
		}
		if (credentials) try {
			const resolved = await credentials.resolve(envName);
			if (resolved?.value) return resolved.value;
		} catch (e) {
			logger.warn(`free-search: credential resolution failed for ${envName}: ${e instanceof Error ? e.message : String(e)}`);
		}
		return process.env[envName] ?? "";
	};
	const PAID_ENGINES = [
		"exa",
		"tavily",
		"keenable",
		"perplexity",
		"deepseek-official"
	];
	const SCRAPE_ENGINES = [
		"anysearch",
		"ddg",
		"ddg-lite",
		"searxng",
		"bing"
	];
	const TIME_ENGINES = [
		"tavily",
		"exa",
		"keenable",
		"searxng",
		"ddg",
		"ddg-lite"
	];
	const provider = {
		id: "ddg",
		available() {
			return true;
		},
		async search(request, signal) {
			if (!request || typeof request.query !== "string" || !request.query.trim()) throw new Error("query is required");
			const cfg = current();
			const query = request.query;
			const preferred = typeof request.engine === "string" && ALL_ENGINES.includes(request.engine) ? request.engine : ALL_ENGINES.includes(cfg.provider ?? "") ? cfg.provider : "bing";
			const timeRange = parseTimeRange(request.timeRange);
			const timeRangeLabel = typeof request.timeRange === "string" ? request.timeRange : timeRange ? "days" in timeRange ? String(timeRange.days) : timeRange.after : "";
			const cacheTtlMs = Math.min(Math.max(cfg.cacheTtl ?? 5, 0), 5) * 60 * 1e3;
			const cacheEnabled = cfg.cache !== false && cacheTtlMs > 0;
			const maxResults = Math.max(request.maxResults ?? 5, 1);
			const cacheKey = cacheEnabled ? searchCache.buildKey(query, maxResults, timeRangeLabel, preferred) : null;
			if (cacheKey) {
				const hit = searchCache.get(cacheKey);
				if (hit) {
					if (signal?.aborted) throw new Error("search aborted");
					return {
						...hit,
						sources: hit.sources.slice(),
						_cache: "hit"
					};
				}
			}
			let chain;
			let preferredSkippedReason = null;
			if (timeRange) {
				const preferredFirst = TIME_ENGINES.includes(preferred) ? [preferred] : [];
				const otherTime = TIME_ENGINES.filter((e) => e !== preferred);
				const noTime = [...PAID_ENGINES, ...SCRAPE_ENGINES].filter((e) => !TIME_ENGINES.includes(e) && e !== preferred);
				chain = [
					...preferredFirst,
					...otherTime,
					...noTime
				];
				if (!TIME_ENGINES.includes(preferred)) preferredSkippedReason = "time-filter";
			} else chain = [
				preferred,
				...PAID_ENGINES.filter((e) => e !== preferred),
				...SCRAPE_ENGINES.filter((e) => e !== preferred)
			];
			let lastError = null;
			let preferredFailure = null;
			const BUDGET_MS = 3e4;
			const deadline = Date.now() + BUDGET_MS;
			const opts = toSearchOptions(cfg, timeRange);
			for (const engine of chain) {
				const remaining = deadline - Date.now();
				if (remaining <= 0) throw new Error(`search timed out after ${BUDGET_MS / 1e3}s`);
				const effSignal = AbortSignal.any([...signal ? [signal] : [], AbortSignal.timeout(remaining)]);
				try {
					let result = await runEngine(engine, query, maxResults, opts, timeRange, effSignal);
					if (result && result.sources.length > 0) {
						result.sources = result.sources.map((s) => s.snippet ? {
							...s,
							snippet: cleanSnippet(s.snippet)
						} : s);
						if (engine !== preferred) result.content = preferredSkippedReason === "time-filter" ? `Note: ${preferred} does not support time filtering (timeRange=${timeRangeLabel}), using ${engine}.` : `Note: ${preferred} unavailable or failed${preferredFailure ? ` (${preferredFailure})` : ""}, using ${engine}.`;
						if (timeRange && !TIME_ENGINES.includes(engine)) {
							const warn = `Warning: ${engine} does not support time filtering — results are unfiltered.`;
							result.content = result.content ? `${result.content} ${warn}` : warn;
						}
						const cached = {
							...result,
							provider: engine
						};
						if (cacheKey) {
							const ttl = engine !== preferred ? Math.max(cacheTtlMs / 5, 1e3) : cacheTtlMs;
							searchCache.set(cacheKey, cached, ttl);
						}
						return {
							...cached,
							_cache: "miss"
						};
					}
					lastError = /* @__PURE__ */ new Error(`engine "${engine}" returned 0 results`);
					if (engine === preferred) preferredFailure = "returned 0 results";
					logger.warn(`free-search: ${engine} returned 0 results, trying next engine`);
				} catch (error) {
					lastError = error instanceof Error ? error : new Error(String(error));
					if (engine === preferred) preferredFailure = lastError.message;
					logger.warn(`free-search: engine "${engine}" failed (${lastError.message}), trying next engine`);
				}
			}
			throw lastError ?? /* @__PURE__ */ new Error("all search engines failed");
		}
	};
	async function runEngine(engine, query, maxResults, opts, timeRange, signal) {
		switch (engine) {
			case "ddg": return searchDdgHtml(query, maxResults, opts, signal);
			case "ddg-lite": return searchDdgLite(query, maxResults, opts, signal);
			case "bing": return searchBing(query, maxResults, opts, signal);
			case "searxng": return searchSearxng(query, maxResults, opts, signal);
			case "anysearch": return searchAnysearch(query, maxResults, signal);
			case "exa": {
				const key = await resolveApiKey("EXA_API_KEY", "exaApiKey");
				return key ? searchExa(query, maxResults, key, timeRange, signal) : searchExaMCP(query, maxResults, signal);
			}
			case "tavily": return searchTavily(query, maxResults, await resolveApiKey("TAVILY_API_KEY", "tavilyApiKey"), timeRange, signal);
			case "keenable": return searchKeenable(query, maxResults, await resolveApiKey("KEENABLE_API_KEY", "keenableApiKey"), timeRange, signal);
			case "perplexity": {
				const key = await resolveApiKey("PERPLEXITY_API_KEY", "perplexityApiKey");
				if (!key) {
					skipEngine(engine, "PERPLEXITY_API_KEY is not configured");
					return null;
				}
				return searchPerplexity(query, maxResults, key, signal);
			}
			case "deepseek-official": {
				const key = await resolveApiKey("DEEPSEEK_API_KEY", "deepseekApiKey");
				if (!key) {
					skipEngine(engine, "DEEPSEEK_API_KEY is not configured");
					return null;
				}
				return searchDeepSeekOfficial(query, maxResults, key, signal);
			}
			default: return null;
		}
	}
	function skipEngine(engine, reason) {
		logger.warn(`free-search: engine "${engine}" skipped (${reason}), trying next engine`);
	}
	const runEngineTest = async (engine, query) => {
		const cfg = current();
		const q = query || "DeepSeek Harness";
		const opts = toSearchOptions(cfg);
		const attempt = async () => {
			switch (engine) {
				case "ddg": return {
					ok: true,
					...await searchDdgHtml(q, 2, opts),
					truncated: false
				};
				case "ddg-lite": return {
					ok: true,
					...await searchDdgLite(q, 2, opts),
					truncated: false
				};
				case "bing": return {
					ok: true,
					...await searchBing(q, 2, opts),
					truncated: false
				};
				case "searxng": return {
					ok: true,
					...await searchSearxng(q, 2, opts),
					truncated: false
				};
				case "anysearch": return {
					ok: true,
					...await searchAnysearch(q, 2),
					truncated: false
				};
				case "exa": {
					const key = await resolveApiKey("EXA_API_KEY", "exaApiKey");
					return {
						ok: true,
						...key ? await searchExa(q, 2, key) : await searchExaMCP(q, 2),
						truncated: false
					};
				}
				case "tavily": return {
					ok: true,
					...await searchTavily(q, 2, await resolveApiKey("TAVILY_API_KEY", "tavilyApiKey")),
					truncated: false
				};
				case "keenable": return {
					ok: true,
					...await searchKeenable(q, 2, await resolveApiKey("KEENABLE_API_KEY", "keenableApiKey")),
					truncated: false
				};
				case "perplexity": {
					const key = await resolveApiKey("PERPLEXITY_API_KEY", "perplexityApiKey");
					if (!key) return {
						ok: false,
						error: "PERPLEXITY_API_KEY not configured"
					};
					return {
						ok: true,
						...await searchPerplexity(q, 2, key),
						truncated: false
					};
				}
				case "deepseek-official": {
					const key = await resolveApiKey("DEEPSEEK_API_KEY", "deepseekApiKey");
					if (!key) return {
						ok: false,
						error: "DEEPSEEK_API_KEY not configured"
					};
					return {
						ok: true,
						...await searchDeepSeekOfficial(q, 2, key),
						truncated: false
					};
				}
				default: return {
					ok: false,
					error: `unknown engine: ${engine}`
				};
			}
		};
		try {
			const result = await attempt();
			if (!result.ok) return result;
			if (result.sources.length === 0) {
				await new Promise((r) => setTimeout(r, 1500));
				return attempt();
			}
			return {
				ok: true,
				sources: result.sources.map((s) => s.snippet ? {
					...s,
					snippet: cleanSnippet(s.snippet)
				} : s),
				truncated: result.truncated
			};
		} catch (error) {
			return {
				ok: false,
				error: error instanceof Error ? error.message : String(error)
			};
		}
	};
	const readSettingsValue = () => {
		try {
			const descriptor = ctxAny.settings?.describe?.({ redactSecrets: false })?.find((d) => String(d.ns) === FREE_SEARCH_NS);
			// `value` is the live config projected through the schema, so it carries
			// schema defaults; only the user override layer belongs over the bundle config.
			const user = descriptor?.user;
			return user !== null && typeof user === "object" ? user : {};
		} catch {
			return {};
		}
	};
	// Volatile Config fields are Cordis refs, not plain values: read through them
	// (and drop unset ones) so the engine selection sees real strings.
	const unwrapVolatile = (value) => {
		if (value === null || typeof value !== "object") return value;
		if (typeof value.get === "function") try {
			return unwrapVolatile(value.get());
		} catch {
			return void 0;
		}
		if (Array.isArray(value)) return value.map(unwrapVolatile);
		const out = {};
		for (const [key, child] of Object.entries(value)) {
			const plain = unwrapVolatile(child);
			if (plain !== void 0) out[key] = plain;
		}
		return out;
	};
	current = () => ({
		...unwrapVolatile(config ?? {}),
		...unwrapVolatile(readSettingsValue())
	});
	try {
		ctx.on?.("settings/document-updated", (id) => {
			if (id !== FREE_SEARCH_NS) return;
			if (refreshPrompt) refreshPrompt();
		});
	} catch {}
	ctx.inject(["webServer", "settings"], (sctx) => {
		sctx.effect(() => {
			const disposers = makeBridgeRoutes(sctx.settings, (request) => provider.search(request), (engine, query) => runEngineTest(engine, query)).map((route) => sctx.webServer.register(route));
			return () => {
				for (const d of disposers) d();
			};
		}, "free-search: settings bridge");
	});
	ctxAny.web.registerSearchProvider(provider);
	ctx.inject(["tools"], (sctx) => {
		sctx.effect(() => {
			const d = sctx.tools.register(createEngineTestTool(runEngineTest));
			return () => d();
		}, "free-search: test engines tool");
	});
	ctx.inject(["tools"], (sctx) => {
		sctx.effect(() => {
			const d = sctx.tools.register(createPlatformSearchTool(() => current().platforms ?? ["github", "reddit"]));
			return () => d();
		}, "free-search: platform search tool");
	});
	ctx.inject(["tools"], (sctx) => {
		sctx.effect(() => {
			const d = sctx.tools.register(createAdvancedSearchTool(provider));
			return () => d();
		}, "free-search: advanced search tool");
	});
	ctx.inject(["tools"], (sctx) => {
		sctx.effect(() => {
			const d = sctx.tools.register(createWebFetchTool());
			return () => d();
		}, "free-search: web fetch tool");
	});
	ctx.inject(["systemPrompt"], (sctx) => {
		let disposeSection = null;
		const sp = sctx.systemPrompt;
		refreshPrompt = () => {
			if (disposeSection) {
				disposeSection();
				disposeSection = null;
			}
			disposeSection = sp.section({
				name: "free-search:engines",
				order: 500,
				text: [
					"## Available web search engines (free-web-search plugin)",
					"",
					"You have the web_search tool. Its backend engine is chosen in Settings > Plugins > Free Web Search.",
					`Current engine: ${current().provider ?? "bing"}`,
					"",
					"Available engines:",
					"- ddg (DuckDuckGo HTML) - FREE, no key",
					"- ddg-lite (DuckDuckGo Lite) - FREE, no key",
					"- bing (Bing) - FREE, no key (most stable)",
					"- searxng (meta-search) - FREE, no key",
					"- anysearch (AI search) - FREE, no key",
					"- exa - FREE keyless (MCP) or EXA_API_KEY",
					"- tavily - FREE keyless or TAVILY_API_KEY",
					"- keenable - FREE keyless (MCP) or KEENABLE_API_KEY",
					"- perplexity - requires PERPLEXITY_API_KEY",
					"- deepseek-official - requires DEEPSEEK_API_KEY",
					"",
					"If the configured engine fails, web_search automatically tries others.",
					"",
					"Use free_search_test to test engine availability.",
					"Use advanced_search with timeRange for time-filtered results.",
					"Use platform_search for GitHub/Reddit searches.",
					"Use web_fetch to read the full content of a single web page (articles, docs, any URL)."
				].join("\n")
			});
		};
		sctx.effect(() => {
			refreshPrompt();
			return () => {
				if (disposeSection) disposeSection();
				disposeSection = null;
			};
		}, "free-search: engine list prompt section");
	});
}

//#endregion
export { ALL_ENGINES, Config, FREE_ENGINES, FREE_SEARCH_NS, apply, approximateTimeRange, inject, name, parseTimeRange };