// Final pass for the handful of strings the main map could not reach: they sit
// inside expressions where a longer key had already consumed part of the text.
// Same decode -> replace -> re-encode approach.
//
// Usage: node patch-engram-client-english2.mjs <pkg-dir> [<pkg-dir> ...]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const MAP = [
  ["| 证据 |", "| Evidence |"],
  ["| 状态 |", "| Status |"],
  ["} supersedes（旧行保留、召回降级）", "} supersedes (old row kept, demoted in recall)"],
  [" 个未达证据门（见单卡表单补）", " below the evidence gate (fill in on each card)"],
  ["旧行保留、召回降级", "old row kept, demoted in recall"],
  ["个未达证据门", "below the evidence gate"],
  ["见单卡表单补", "fill in on each card"],
  ["证据", "Evidence"],
  ["展开", "Expand"],
  ["ESR 看板", "ESR board"],
  ["收起", "Collapse"],
];

function decodeEscapes(s) {
  return s
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function encodeNonAscii(s) {
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp < 0x7f) out += ch;
    else if (cp <= 0xffff) out += "\\u" + cp.toString(16).padStart(4, "0");
    else {
      const v = cp - 0x10000;
      const hi = 0xd800 + (v >> 10);
      const lo = 0xdc00 + (v & 0x3ff);
      out += "\\u" + hi.toString(16).padStart(4, "0") + "\\u" + lo.toString(16).padStart(4, "0");
    }
  }
  return out;
}

const sorted = [...MAP].sort((a, b) => b[0].length - a[0].length);
let failed = 0;

for (const dir of process.argv.slice(2)) {
  const file = join(dir, "lib", "client.js");
  if (!existsSync(file)) {
    console.log(`skip: ${dir}`);
    continue;
  }
  const raw = readFileSync(file, "utf8");
  let text = decodeEscapes(raw);
  const before = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  if (before === 0) {
    console.log(`skip (already English): ${file}`);
    continue;
  }
  for (const [zh, en] of sorted) text = text.split(zh).join(en);
  const after = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  writeFileSync(file, encodeNonAscii(text), "utf8");
  console.log(`${file}: CJK ${before} -> ${after}`);
  if (after > 0) {
    failed += 1;
    console.log("  left: " + [...new Set(text.match(/[\u4e00-\u9fff]+/g) || [])].join(" / "));
  }
}

console.log(failed ? "\nstill Chinese" : "\nclient english patch complete");
if (failed) process.exitCode = 1;
