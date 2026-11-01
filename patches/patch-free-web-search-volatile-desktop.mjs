// Mark dsh-free-web-search Config fields volatile so DSH 0.2.1 settings forms expose them.
import { readFileSync, writeFileSync } from "node:fs";

const path = "C:/Users/Sarim/.dsh/profiles/desktop/node_modules/dsh-free-web-search/lib/index.js";
let text = readFileSync(path, "utf8");

const FROM = `const Config = z.object({
\tprovider: z.string().default("bing"),
\tcache: z.boolean().default(true),
\tcacheTtl: z.number().default(5),
\tlang: z.string().default("en"),
\tregion: z.string(),
\tbingMarket: z.string().default("en-US"),
\tsearxngInstances: z.array(z.string()),
\tplatforms: z.array(z.string()).default(["github", "reddit"]),
\texaApiKey: z.string().role("secret"),
\ttavilyApiKey: z.string().role("secret"),
\tkeenableApiKey: z.string().role("secret"),
\tperplexityApiKey: z.string().role("secret"),
\tdeepseekApiKey: z.string().role("secret")
});`;

const TO = `const Config = z.object({
\tprovider: z.string().default("bing").volatile(),
\tcache: z.boolean().default(true).volatile(),
\tcacheTtl: z.number().default(5).volatile(),
\tlang: z.string().default("en").volatile(),
\tregion: z.string().volatile(),
\tbingMarket: z.string().default("en-US").volatile(),
\tsearxngInstances: z.array(z.string()).volatile(),
\tplatforms: z.array(z.string()).default(["github", "reddit"]).volatile(),
\texaApiKey: z.string().role("secret").volatile(),
\ttavilyApiKey: z.string().role("secret").volatile(),
\tkeenableApiKey: z.string().role("secret").volatile(),
\tperplexityApiKey: z.string().role("secret").volatile(),
\tdeepseekApiKey: z.string().role("secret").volatile()
});`;

if (text.includes(TO)) console.log("skip (already applied): volatile Config");
else if (!text.includes(FROM)) throw new Error("Config block not found");
else {
  text = text.replace(FROM, TO);
  writeFileSync(path, text);
  console.log("patched: volatile Config");
}

