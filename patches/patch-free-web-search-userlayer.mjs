// Fix: settings descriptor `value` is schema-defaulted, so merging it clobbers
// profile-patch config. Merge only the `user` override layer instead.
// Usage: node patch-free-web-search-userlayer.mjs <pluginDir>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dirs = process.argv.slice(2);
if (dirs.length === 0) throw new Error("usage: node patch-free-web-search-userlayer.mjs <pluginDir> [more...]");

const FROM = `\t\t\tconst descriptor = ctxAny.settings?.describe?.({ redactSecrets: false })?.find((d) => String(d.ns) === FREE_SEARCH_NS);
\t\t\treturn descriptor?.value ?? {};`;
const TO = `\t\t\tconst descriptor = ctxAny.settings?.describe?.({ redactSecrets: false })?.find((d) => String(d.ns) === FREE_SEARCH_NS);
\t\t\t// \`value\` is the live config projected through the schema, so it carries
\t\t\t// schema defaults; only the user override layer belongs over the bundle config.
\t\t\tconst user = descriptor?.user;
\t\t\treturn user !== null && typeof user === "object" ? user : {};`;

for (const dir of dirs) {
  const path = join(dir, "lib/index.js");
  let text = readFileSync(path, "utf8");
  if (text.includes(TO)) {
    console.log(`skip (already applied): ${path}`);
    continue;
  }
  if (!text.includes(FROM)) throw new Error(`anchor not found: ${path}`);
  writeFileSync(path, text.replace(FROM, TO));
  console.log(`patched: ${path}`);
}
