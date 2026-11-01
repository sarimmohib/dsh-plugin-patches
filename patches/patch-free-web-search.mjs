// Patch dsh-free-web-search (0.1.0) for DSH runtime 0.2.1-rc.5 settings API.
// Usage: node patch-free-web-search.mjs [--check]
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const PKG = "C:/Users/Sarim/.dsh/profiles/web/node_modules/dsh-free-web-search";
const OUT = "C:/Users/Sarim/.dsh/patches/dsh-free-web-search";
const checkOnly = process.argv.includes("--check");

function patch(file, replacements) {
  const path = join(PKG, file);
  let text = readFileSync(path, "utf8");
  for (const [from, to, label] of replacements) {
    // Later patches (userlayer/unwrap) supersede the original settings-section edit.
    if (label === "settings section" && text.includes("readSettingsValue")) {
      console.log(`skip (already applied): ${file} ${label}`);
      continue;
    }
    if (!text.includes(from)) {
      if (text.includes(to)) {
        console.log(`skip (already applied): ${file} ${label}`);
        continue;
      }
      throw new Error(`pattern not found in ${file}: ${label}\n---\n${from}\n---`);
    }
    text = text.split(from).join(to);
    console.log(`patched: ${file} ${label}`);
  }
  if (!checkOnly) writeFileSync(path, text);
}

patch("lib/index.js", [
  [
    'import { SettingsConflictError, installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";',
    'import { SettingsConflictError } from "@deepseek-ai/dsh-settings";',
    "settings import",
  ],
  [
    'const FREE_SEARCH_NS = settingsNamespace("free-search");',
    '// Runtime settings namespaces are profile entry ids; this plugin entry is `web-search-free`,\n// and its Config schema is the settings form shown under Plugins.\nconst FREE_SEARCH_NS = "web-search-free";',
    "namespace",
  ],
  [
    "await settings.mutate(settingsNamespace(ns), body.ops, expectedRevision);",
    "await settings.mutate(ns, body.ops, expectedRevision);",
    "bridge mutate",
  ],
  [
    `\tinstallSettingsSection(ctx, FREE_SEARCH_NS, Config, config ?? {}, {\n\t\tsetSource: (source) => {\n\t\t\tcurrent = source;\n\t\t},\n\t\tonChange: () => {\n\t\t\tif (refreshPrompt) refreshPrompt();\n\t\t}\n\t});`,
    `\tconst readSettingsValue = () => {\n\t\ttry {\n\t\t\tconst descriptor = ctxAny.settings?.describe?.({ redactSecrets: false })?.find((d) => String(d.ns) === FREE_SEARCH_NS);\n\t\t\treturn descriptor?.value ?? {};\n\t\t} catch {\n\t\t\treturn {};\n\t\t}\n\t};\n\tcurrent = () => ({\n\t\t...(config ?? {}),\n\t\t...readSettingsValue()\n\t});\n\ttry {\n\t\tctx.on?.("settings/document-updated", (id) => {\n\t\t\tif (id !== FREE_SEARCH_NS) return;\n\t\t\tif (refreshPrompt) refreshPrompt();\n\t\t});\n\t} catch {}`,
    "settings section",
  ],
]);

patch("lib/client.js", [
  ['const NS = "free-search";', 'const NS = "web-search-free";', "client namespace"],
]);

if (!checkOnly) {
  mkdirSync(OUT, { recursive: true });
  for (const file of ["lib/index.js", "lib/client.js"]) {
    const dest = join(OUT, file.replace("/", "\\"));
    mkdirSync(join(OUT, "lib"), { recursive: true });
    copyFileSync(join(PKG, file), dest);
  }
  console.log(`copies saved under ${OUT}`);
}
console.log("done");
