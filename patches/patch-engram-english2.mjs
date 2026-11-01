// Finish the host-side English translation: the remaining rendered Chinese in
//   lib/capsule.js     — subagent-report capsule headings + footer
//   lib/push-legs.js   — the one-line `status` summary (incl. a zh-CN date locale)
//   lib/result-pack.js — the archived-middle handle and result_recall tool text
//   lib/todo-sink.js   — the sedimented-task description
//
// patch-engram-english.mjs covered index-block/settings/mental/tools; this covers
// the rest, so no user- or model-visible Chinese is left in the package.
//
// Usage: node patch-engram-english2.mjs <pkg-dir> [<pkg-dir> ...]
// Idempotent: reports "skip" for already-applied edits.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/** [file, from, to, label] */
const EDITS = [
  // ── lib/capsule.js ────────────────────────────────────────────────────────
  [
    "lib/capsule.js",
    `const OPEN_RE = /(\\?|todo|open question|unresolved|blocked|未决|待定|风险|risk)/i;`,
    `const OPEN_RE = /(\\?|todo|open question|unresolved|blocked|pending|risk)/i;`,
    "capsule: OPEN_RE",
  ],
  [
    "lib/capsule.js",
    `const NEXT_RE = /(next step|next:|下一步|建议|recommend|should (?:then|now)|follow-?up|remaining)/i;`,
    `const NEXT_RE = /(next step|next:|recommend|should (?:then|now)|follow-?up|remaining)/i;`,
    "capsule: NEXT_RE",
  ],
  [
    "lib/capsule.js",
    "    if (conclusion.length > 0) parts.push(`**结论**：${conclusion}`);\n    if (evidence.length > 0) parts.push(`**证据**：\\n${evidence.map((e) => `- ${e}`).join(\"\\n\")}`);\n    if (open.length > 0) parts.push(`**未决**：\\n${open.map((e) => `- ${e}`).join(\"\\n\")}`);\n    if (next.length > 0) parts.push(`**下一步**：\\n${next.map((e) => `- ${e}`).join(\"\\n\")}`);",
    "    if (conclusion.length > 0) parts.push(`**Conclusion**: ${conclusion}`);\n    if (evidence.length > 0) parts.push(`**Evidence**:\\n${evidence.map((e) => `- ${e}`).join(\"\\n\")}`);\n    if (open.length > 0) parts.push(`**Open**:\\n${open.map((e) => `- ${e}`).join(\"\\n\")}`);\n    if (next.length > 0) parts.push(`**Next steps**:\\n${next.map((e) => `- ${e}`).join(\"\\n\")}`);",
    "capsule: section headings",
  ],
  [
    "lib/capsule.js",
    "    parts.push(`**无结构可提炼（保留首尾）**：\\n${head}\\n…\\n${tail}`);",
    "    parts.push(`**No structure to extract (keeping head and tail)**:\\n${head}\\n…\\n${tail}`);",
    "capsule: unstructured body",
  ],
  [
    "lib/capsule.js",
    "    `\\n\\n---\\n胶囊：${source} ${full.length} → ${chars} 字符；全文在子代理会话日志里（可用 session 搜索回取）。`;",
    "    `\\n\\n---\\nCapsule: ${source} ${full.length} → ${chars} chars; the full text is in the subagent session log (recoverable via session search).`;",
    "capsule: footer",
  ],
  [
    "lib/capsule.js",
    "    body = `**无结构可提炼（保留首尾）**：\\n${head}…\\n…${tail}`;",
    "    body = `**No structure to extract (keeping head and tail)**:\\n${head}…\\n…${tail}`;",
    "capsule: unstructured fallback",
  ],

  // ── lib/push-legs.js ──────────────────────────────────────────────────────
  [
    "lib/push-legs.js",
    `  if (health === undefined) return "推送腿：还没记录（本机还没有会话装配过）";`,
    `  if (health === undefined) return "Push legs: nothing recorded yet (no session on this machine has assembled one)";`,
    "push-legs: no record",
  ],
  [
    "lib/push-legs.js",
    `  const when = new Date(health.at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });`,
    `  const when = new Date(health.at).toLocaleString("en-US");`,
    "push-legs: date locale",
  ],
  [
    "lib/push-legs.js",
    "    return `推送腿：⚠ 事件日志不可读（none）—— [RECALL]/episode/resume/todo-sink 休眠中 · ${when} · ${tally}`;",
    "    return `Push legs: ⚠ event log unreadable (none) — [RECALL]/episode/resume/todo-sink dormant · ${when} · ${tally}`;",
    "push-legs: unreadable",
  ],
  [
    "lib/push-legs.js",
    "  return `推送腿：事件日志读法 ${health.source} · 最近 ${when} · ${tally}`;",
    "  return `Push legs: event-log source ${health.source} · latest ${when} · ${tally}`;",
    "push-legs: summary",
  ],

  // ── lib/result-pack.js ────────────────────────────────────────────────────
  [
    "lib/result-pack.js",
    "    const handleText = `${HANDLE_PREFIX}${callId}) 可取]`;",
    "    const handleText = `${HANDLE_PREFIX}${callId}) recallable]`;",
    "result-pack: handle text",
  ],
  [
    "lib/result-pack.js",
    "        callId: { type: \"string\", description: \"callId from a `[middle archived: result_recall(<callId>) 可取]` handle (required)\" },",
    "        callId: { type: \"string\", description: \"callId from a `[middle archived: result_recall(<callId>) recallable]` handle (required)\" },",
    "result-pack: tool param description",
  ],
  [
    "lib/result-pack.js",
    "      const header = `result_recall ${callId} · page ${page.page}/${page.total} · ${page.totalChars} chars archived${page.hasMore ? ` · offset=${page.offset + 1} 取下一页` : \"\"}\\n\\n`;",
    "      const header = `result_recall ${callId} · page ${page.page}/${page.total} · ${page.totalChars} chars archived${page.hasMore ? ` · offset=${page.offset + 1} for the next page` : \"\"}\\n\\n`;",
    "result-pack: paging header",
  ],

  // ── lib/todo-sink.js ──────────────────────────────────────────────────────
  [
    "lib/todo-sink.js",
    `export const SINK_DESCRIPTION = "源自会话计划（会话结束自动沉淀）";`,
    `export const SINK_DESCRIPTION = "From the session plan (sedimented automatically at session end)";`,
    "todo-sink: description",
  ],
];

const CJK = /[\u4e00-\u9fff]/;
let failures = 0;

for (const dir of process.argv.slice(2)) {
  if (!existsSync(join(dir, "lib"))) {
    console.log(`skip (not a package): ${dir}`);
    continue;
  }
  /** @type {Map<string, string>} */
  const cache = new Map();
  const load = (rel) => {
    if (!cache.has(rel)) cache.set(rel, readFileSync(join(dir, rel), "utf8"));
    return cache.get(rel);
  };

  for (const [rel, from, to, label] of EDITS) {
    const text = load(rel);
    if (text.includes(from)) {
      cache.set(rel, text.split(from).join(to));
      console.log(`patched: ${rel} — ${label}`);
    } else if (text.includes(to)) {
      console.log(`skip (already applied): ${rel} — ${label}`);
    } else {
      console.log(`MISS: ${dir} ${rel} — ${label}`);
      failures += 1;
    }
  }

  for (const [rel, text] of cache) writeFileSync(join(dir, rel), text);

  // Report remaining rendered (non-comment) Chinese so a partial job is visible.
  for (const rel of ["lib/capsule.js", "lib/push-legs.js", "lib/result-pack.js", "lib/todo-sink.js"]) {
    const left = load(rel)
      .split("\n")
      .filter((line) => CJK.test(line) && !/^\s*(\/\/|\*|\/\*)/.test(line)).length;
    console.log(`remaining rendered CJK lines: ${rel} = ${left}`);
    if (left > 0) failures += 1;
  }
}

if (failures > 0) {
  console.log(`\n${failures} problem(s) remain — re-check the anchors.`);
  process.exitCode = 1;
} else {
  console.log("\nengram english patch (part 2) complete");
}
