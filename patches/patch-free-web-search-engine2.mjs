// Reorder SCRAPE_ENGINES so anysearch (reliable, keyless) precedes bing (unreliable scrape).
// Usage: node patch-free-web-search-engine2.mjs <pluginDir> [more...]
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dirs = process.argv.slice(2);
if (dirs.length === 0) throw new Error("usage: node patch-free-web-search-engine2.mjs <pluginDir> [...]");

const WANT = ['"anysearch"', '"ddg"', '"ddg-lite"', '"searxng"', '"bing"'];

for (const dir of dirs) {
  const path = join(dir, "lib/index.js");
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const start = lines.findIndex((l) => l.includes("const SCRAPE_ENGINES = ["));
  if (start < 0) throw new Error(`SCRAPE_ENGINES not found in ${path}`);
  const end = lines.findIndex((l, i) => i > start && l.trim() === "];");
  if (end < 0) throw new Error(`SCRAPE_ENGINES end not found in ${path}`);
  const body = lines.slice(start + 1, end);
  const indented = body.map((l) => l.replace(/\s+$/, ""));
  const current = indented.map((l) => l.trim().replace(/,$/, ""));
  const already = JSON.stringify(current) === JSON.stringify(WANT);
  if (already) {
    console.log(`skip (already applied): ${path}`);
    continue;
  }
  const indent = (indented[0].match(/^[\t ]+/) ?? ["\t"])[0];
  const rebuilt = WANT.map((v, i) => `${indent}${v}${i === WANT.length - 1 ? "" : ","}`);
  lines.splice(start + 1, end - start - 1, ...rebuilt);
  writeFileSync(path, lines.join("\n"));
  console.log(`patched: ${path}`);
}
