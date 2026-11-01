// Translate dsh-engram's user- and model-visible Chinese strings to English.
//
// What it covers:
//   lib/index-block.js  — the [ESR] methodology block injected into the system
//                         prompt every turn (the text the user actually sees).
//   lib/settings.js     — the settings-card field descriptions.
//   lib/mental.js       — the standing-summary headings + brief one-liner.
//   lib/tools.js        — two rendered output strings (observations, freshness).
//
// Comments are left alone: they are never rendered. Pure-code identifiers are
// untouched, so behaviour is identical.
//
// Usage: node patch-engram-english.mjs <pkg-dir> [<pkg-dir> ...]
// Idempotent: re-running reports "skip" for every already-applied edit.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/** [file, from, to, label] */
const EDITS = [
  // ── lib/index-block.js: the injected [ESR] protocol block ──────────────────
  [
    "lib/index-block.js",
    `    "ESR（工程状态）操作协议 —— 多步工作建任务、用证据闭环：",
    "  1. 动工前：esr_ready 看可认领工作；esr_status 拿实时状态（本块是会话开始快照，不会自动刷新）。",
    "  2. 多步工作 → esr_task(name=\\"…\\", entity=…) 建任务（draft 起步）；重复对象 → esr_node；关系 → esr_link。",
    "  3. 动工 → esr_claim（draft → active）。",
    "  4. 收工 → esr_close（artifact + evaluation + memory_ref 三证齐才算数；不齐的活继续挂着，别硬关）。",
    "  state 是唯一真相：拿不准 state 就 call esr_status。",`,
    `    "ESR (engineering state) protocol — create a task for multi-step work, close it with evidence:",
    "  1. Before starting: esr_ready lists claimable work; esr_status gives live state (this block is a session-start snapshot and will NOT auto-refresh).",
    "  2. Multi-step work → esr_task(name=\\"…\\", entity=…) creates a task (starts as draft); a recurring object → esr_node; a relation → esr_link.",
    "  3. Start work → esr_claim (draft → active).",
    "  4. Finish → esr_close (needs all three of artifact + evaluation + memory_ref; anything incomplete stays open — do not force-close).",
    "  state is the only source of truth: when unsure, call esr_status.",`,
    "ESR methodology block",
  ],

  // ── lib/settings.js: settings-card descriptions ────────────────────────────
  [
    "lib/settings.js",
    `.description("用户纠正/偏好学习（零 LLM）：检测用户消息里的显式 prefer/avoid/switch-to 句式，自动沉淀为 preference 记忆并置顶 [ENGRAM] 索引（correx/PAHF 式偏好提取；关掉=只靠手动 engram_store）")`,
    `.description("User-correction / preference learning (zero LLM): detect explicit prefer/avoid/switch-to phrasing in user messages and sediment it as a preference memory at the top of the [ENGRAM] index (correx/PAHF-style extraction; off = manual engram_store only)")`,
    "settings: autoCapturePreferences",
  ],
  [
    "lib/settings.js",
    `.description("ResultPack L1（BoundaryPrune 边界剪枝）：在 todo 完成推进 / goal 终态这些子任务边界，主动调用 DSH 的确定性 toolResultPruner 剪掉超阈值旧工具结果（SoL-Pi Online Context Compact；默认开，false=关）")`,
    `.description("ResultPack L1 (BoundaryPrune): at subtask boundaries — a todo advancing to done, a goal reaching a terminal state — proactively call DSH's deterministic toolResultPruner to trim old tool results past the threshold (SoL-Pi online context compaction; on by default, false = off)")`,
    "settings: boundaryPrune",
  ],
  [
    "lib/settings.js",
    `.description("剪枝自适应（账本否决）：当 Context Ledger 显示该 workspace 在真实剪枝后净收益为负（≥3 次剪枝）时自动停止继续剪；证据只能关、不会自行开；关掉=只受偿还门约束")`,
    `.description("Adaptive pruning (ledger veto): stop pruning automatically once the Context Ledger shows this workspace's net benefit is negative after real prunes (≥3 prunes). Evidence can only turn it off, never on. Off = governed by the repayment gate alone")`,
    "settings: boundaryPruneAdaptive",
  ],
  [
    "lib/settings.js",
    `.description("边界剪枝阈值覆盖（字符）：宿主 pruner 固定 8192；设更低（如 2048）可更早开剪——L0 仿真显示 T2048 净收益最高（+61.6Mc），前提是 L2 归档已开启可找回被剪中段；0=用宿主 8192")`,
    `.description("Boundary-prune threshold override (characters): the host pruner is fixed at 8192; a lower value (e.g. 2048) prunes earlier — L0 simulation shows T2048 has the highest net benefit (+61.6Mc), provided L2 archiving is on so trimmed middles can be recalled. 0 = use the host's 8192")`,
    "settings: boundaryPruneThresholdChars",
  ],
  [
    "lib/settings.js",
    `.description("空闲步数边界（请求计数）：最多每 N 个请求触发一次剪枝，覆盖无 todo/goal 的会话（约 62% 会话永不触发事件边界）；仍受偿还门约束；0=仅事件边界")`,
    `.description("Idle-step boundary (request count): trigger pruning at most once every N requests, covering sessions with no todo/goal (about 62% of sessions never hit an event boundary). Still subject to the repayment gate. 0 = event boundaries only")`,
    "settings: boundaryPruneIdleCadence",
  ],
  [
    "lib/settings.js",
    `.description("ResultPack L2（结果归档召回）：BoundaryPrune 剪掉的中段脱敏归档到本地，剪枝节点尾部追加 handle，模型可用 result_recall(callId) 按页召回（完整 ObservationPack；默认开，保证默认剪枝无损；需与 boundaryPrune 一起开）")`,
    `.description("ResultPack L2 (archived-result recall): the middle that BoundaryPrune trimmed is redacted and archived locally; a handle is appended to the pruned node's tail so the model can page it back with result_recall(callId) (full ObservationPack; on by default so default pruning is lossless; requires boundaryPrune)")`,
    "settings: resultPack",
  ],
  [
    "lib/settings.js",
    `.description("召回范围：workspace=严格按当前工作区隔离（默认、token 纪律）；global=本工作区命中弱/空时，从其它工作区池按 recency/origin 加权召回并标 [W:<workspace>] 来源。开启会打破跨工作区隔离，请按需选用")`,
    `.description("Recall scope: workspace = strictly isolated to the current workspace (default, token discipline); global = when this workspace's hits are weak/empty, recall from other workspace pools weighted by recency/origin and mark the origin as [W:<workspace>]. Turning this on breaks cross-workspace isolation — opt in deliberately")`,
    "settings: recallScope",
  ],
  [
    "lib/settings.js",
    `.description("新会话开始时，宿主按首条消息对工作区做确定性召回，把命中记忆直接注入 [RECALL] 块（无需模型自己想起调 engram_recall；关掉=回到纯拉取）")`,
    `.description("At the start of a new session the host runs a deterministic recall against the workspace using the first message and injects the hits as a [RECALL] block (the model does not have to remember to call engram_recall; off = pure pull mode)")`,
    "settings: autoRecallOnStart",
  ],
  [
    "lib/settings.js",
    `.description("[RECALL] 块最多注入的记忆条数（agentmemory 候选①：少而准）")`,
    `.description("Maximum memories injected into the [RECALL] block (agentmemory candidate 1: few and precise)")`,
    "settings: autoRecallLimit",
  ],
  [
    "lib/settings.js",
    `.description("Context GC 接管 DSH 自动 compact（指针摘要替代有损 LLM 摘要）；默认关=保留宿主 summarizer。改写宿主预设是最高维护风险，需显式开启")`,
    `.description("Context GC takes over DSH's automatic compaction (pointer summaries instead of lossy LLM summaries); off by default = keep the host summarizer. Rewriting host presets is the highest maintenance risk, so this needs an explicit opt-in")`,
    "settings: gcReplacesCompaction",
  ],
  [
    "lib/settings.js",
    `.description("ESR 闭环时校验 artifact 路径真实存在")`,
    `.description("On ESR close, verify the artifact path actually exists on disk")`,
    "settings: verifyArtifact",
  ],
  [
    "lib/settings.js",
    `.description("实体锚定 + 替换式更新（改用/不再…）自动把旧记忆标为 superseded（默认关）")`,
    `.description("Entity anchoring + replacement-style updates (switched to / no longer…) automatically mark the old memory superseded (off by default)")`,
    "settings: autoSupersede",
  ],
  [
    "lib/settings.js",
    `.description("会话结束时把仍 pending 的 todo 自动沉淀为 ESR draft 任务（去重、受容量上限约束；关掉=会话结束即弃）")`,
    `.description("At session end, sediment still-pending todos as ESR draft tasks (deduped and capacity-capped; off = discarded when the session ends)")`,
    "settings: autoSinkTodosOnEnd",
  ],
  [
    "lib/settings.js",
    `.description("web 面启动时把全部 stock 布局的 agent 预设（shipped + 用户根）的 compaction 组自动换成 dsh-engram/compaction（带备份、幂等、不碰自定义/无 compaction 预设）。默认关（opt-in）：不主动改写任何预设；已接管的预设保持 Context GC、需 npm run web-compaction:revert 还原，host 面不受影响")`,
    `.description("On web startup, swap the compaction group of every stock-layout agent preset (shipped + user root) to dsh-engram/compaction (backed up, idempotent, never touches custom or compaction-less presets). Off by default (opt-in): never rewrites a preset on its own. A preset already taken over keeps Context GC and needs npm run web-compaction:revert to restore; the host plane is unaffected")`,
    "settings: autoWebCompaction",
  ],
  [
    "lib/settings.js",
    `.description("上下文账本：按会话统计注入成本、剪枝/压缩节省与前缀重写罚金，输出净 token（/stats.ledger 与概览）；关掉=不记账、零写入")`,
    `.description("Context ledger: per session, tally injection cost, pruning/compaction savings and prefix-rewrite penalties, and report net tokens (/stats.ledger and the overview). Off = no accounting, zero writes")`,
    "settings: ledgerEnabled",
  ],
  [
    "lib/settings.js",
    `.description("账本缓存折价（0..1）：被剪枝前缀的重写按 (1−该系数) 计罚金；0.1 = 缓存命中只付 10%，重写付 90%（L0 保守假设）")`,
    `.description("Ledger cache discount (0..1): a rewritten pruned prefix is charged (1 − this factor); 0.1 = a cache hit costs only 10% while a rewrite costs 90% (conservative L0 assumption)")`,
    "settings: ledgerCacheDiscount",
  ],
  [
    "lib/settings.js",
    `.description("JIT 推送：错误复发 / 文件焦点 / goal 完成时把已有记忆压成一行推进上下文（append-only、每会话最多 3 行、无命中沉默；每次推送按前缀重写计入账本）")`,
    `.description("JIT push: on a recurring error, a file coming into focus, or goal completion, compress an existing memory into one line and push it into context (append-only, at most 3 lines per session, silent when nothing matches; each push is charged to the ledger as a prefix rewrite)")`,
    "settings: jitEnabled",
  ],
  [
    "lib/settings.js",
    `.description("会话 episode：会话结束时用零 LLM 规则生成一条紧凑纪要（文件/命令/失败→修复/决策/未闭环），不进 [ENGRAM] 索引，供 resume brief 与实体页使用")`,
    `.description("Session episode: at session end, generate one compact digest with zero-LLM rules (files / commands / failure→fix / decisions / open loops). Not part of the [ENGRAM] index; feeds the resume brief and entity pages")`,
    "settings: episodeEnabled",
  ],
  [
    "lib/settings.js",
    `.description("恢复简报：新会话启动时注入最近 7 天的最新 episode（≤240 字符，含 engram_detail 指针），让隔天继续的项目不用重新交代背景")`,
    `.description("Resume brief: when a new session starts, inject the newest episode from the last 7 days (≤240 chars, with an engram_detail pointer) so a project continued the next day needs no background re-explaining")`,
    "settings: resumeBriefEnabled",
  ],
  [
    "lib/settings.js",
    `.description("实体卡：[ENGRAM] 索引为活跃实体（有锚定记忆或未闭环任务）渲染一行「当前真相 + 打开任务 + engram_detail(entity=…) 指针」，替代平铺记忆行；最多 2 张")`,
    `.description("Entity cards: the [ENGRAM] index renders one line per active entity (one with anchored memories or open tasks) — current truth + open tasks + an engram_detail(entity=…) pointer — instead of flat memory lines; at most 2")`,
    "settings: entityCardsEnabled",
  ],

  // ── lib/mental.js: standing-summary headings + brief ───────────────────────
  [
    "lib/mental.js",
    `  const label = ws ? String(ws).replace(/^.*[\\\\/]/, "") : "全部工作区";`,
    `  const label = ws ? String(ws).replace(/^.*[\\\\/]/, "") : "all workspaces";`,
    "mental: all-workspaces label",
  ],
  [
    "lib/mental.js",
    `      risky.push(\`- \${mdCell(t.name)} · \${gaps.join("/")} · \${ageDays}天\`);`,
    `      risky.push(\`- \${mdCell(t.name)} · \${gaps.join("/")} · \${ageDays}d\`);`,
    "mental: task age suffix",
  ],
  [
    "lib/mental.js",
    `    \`## \${label} · 常驻摘要\`,
    \`- 任务：\${active.length} 进行中（\${ready} 就绪）· \${stable} 已闭环\`,
    \`- 实体图：\${scope.nodes ?? 0} 节点 · \${scope.links ?? 0} 链接\`,
    \`- 观测：\${obs.length} 条信念（累计 \${obsEvidence} 证据）\`,
    \`- 记忆：\${scope.memories ?? 0} 条\${kindHist ? \`（\${kindHist}）\` : ""}\`,`,
    `    \`## \${label} · standing summary\`,
    \`- Tasks: \${active.length} in progress (\${ready} ready) · \${stable} closed\`,
    \`- Entity graph: \${scope.nodes ?? 0} nodes · \${scope.links ?? 0} links\`,
    \`- Observations: \${obs.length} beliefs (\${obsEvidence} evidence total)\`,
    \`- Memories: \${scope.memories ?? 0}\${kindHist ? \` (\${kindHist})\` : ""}\`,`,
    "mental: summary headings",
  ],
  [
    "lib/mental.js",
    `    lines.push("", "重点信念：");`,
    `    lines.push("", "Top beliefs:");`,
    "mental: top-beliefs heading",
  ],
  [
    "lib/mental.js",
    `    lines.push("", "未闭环风险：");`,
    `    lines.push("", "Open risks:");`,
    "mental: open-risks heading",
  ],
  [
    "lib/mental.js",
    `  for (const prefix of ["- 任务：", "- 实体图：", "- 观测："]) {`,
    `  for (const prefix of ["- Tasks:", "- Entity graph:", "- Observations:"]) {`,
    "mental: brief prefixes",
  ],
  [
    "lib/mental.js",
    `    if (lines[i].trim().startsWith("未闭环风险")) {`,
    `    if (lines[i].trim().startsWith("Open risks")) {`,
    "mental: brief risk scan",
  ],
  [
    "lib/mental.js",
    `  bits.push(risks > 0 ? \`风险 \${risks}\` : "无未闭环风险");`,
    `  bits.push(risks > 0 ? \`risks \${risks}\` : "no open risks");`,
    "mental: brief risk tail",
  ],

  // ── lib/tools.js: rendered output strings ─────────────────────────────────
  [
    "lib/tools.js",
    "`• ${o.text} — ×${o.proof.count} ${o.trend}${o.negations > 0 ? ` · 反证${o.negations}` : \"\"}`",
    "`• ${o.text} — ×${o.proof.count} ${o.trend}${o.negations > 0 ? ` · counter-evidence ${o.negations}` : \"\"}`",
    "tools: observation line",
  ],
  [
    "lib/tools.js",
    "(生成于 ${mins} 分钟前 · ${model.fresh ? \"本次重算\" : \"缓存命中\"} · mode=${args.mode ?? \"full\"} · ws=${ws})",
    "(generated ${mins} min ago · ${model.fresh ? \"recomputed\" : \"cache hit\"} · mode=${args.mode ?? \"full\"} · ws=${ws})",
    "tools: model freshness footer",
  ],
];

/** Still-Chinese guard: any remaining CJK in a rendered (non-comment) line. */
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
      console.log(`patched: ${dir} ${rel} — ${label}`);
    } else if (text.includes(to)) {
      console.log(`skip (already applied): ${rel} — ${label}`);
    } else {
      console.log(`MISS: ${dir} ${rel} — ${label}`);
      failures += 1;
    }
  }

  for (const [rel, text] of cache) {
    writeFileSync(join(dir, rel), text);
  }

  // Report what Chinese remains, so a partial translation is visible rather
  // than silently claimed complete.
  for (const rel of ["lib/index-block.js", "lib/settings.js", "lib/mental.js", "lib/tools.js"]) {
    const text = load(rel);
    const left = text
      .split("\n")
      .filter((line) => CJK.test(line) && !/^\s*(\/\/|\*|\/\*)/.test(line))
      .length;
    console.log(`remaining CJK lines: ${rel} = ${left}`);
  }
}

if (failures > 0) {
  console.log(`\n${failures} anchor(s) not found — the package changed; re-check the source.`);
  process.exitCode = 1;
} else {
  console.log("\nengram english patch complete");
}
