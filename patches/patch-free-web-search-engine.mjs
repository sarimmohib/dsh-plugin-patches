// Make the keyless AnySearch engine the built-in default and demote Bing
// (its scraped SERP returns unrelated pages) to last resort in the fallback chain.
// Usage: node patch-free-web-search-engine.mjs <pluginDir> [more...]
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dirs = process.argv.slice(2);
if (dirs.length === 0) throw new Error("usage: node patch-free-web-search-engine.mjs <pluginDir> [...]");

const EDITS = [
  [
    'ALL_ENGINES.includes(cfg.provider ?? "") ? cfg.provider : "bing"',
    'ALL_ENGINES.includes(cfg.provider ?? "") ? cfg.provider : "anysearch"',
    "default engine fallback",
  ],
  [
    'const SCRAPE_ENGINES = [\n\t"bing",\n\t"anysearch",\n\t"ddg",\n\t"ddg-lite",\n\t"searxng"\n];',
    'const SCRAPE_ENGINES = [\n\t"anysearch",\n\t"ddg",\n\t"ddg-lite",\n\t"searxng",\n\t"bing"\n];',
    "fallback order",
  ],
];

for (const dir of dirs) {
  const path = join(dir, "lib/index.js");
  let text = readFileSync(path, "utf8");
  for (const [from, to, label] of EDITS) {
    if (text.includes(to) && !text.includes(from)) {
      console.log(`skip (already applied): ${path} ${label}`);
      continue;
    }
    if (!text.includes(from)) throw new Error(`anchor not found in ${path}: ${label}`);
    text = text.replace(from, to);
    console.log(`patched: ${path} ${label}`);
  }
  writeFileSync(path, text);
}
