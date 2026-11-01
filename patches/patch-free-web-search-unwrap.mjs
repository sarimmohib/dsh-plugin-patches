// `.volatile()` Config fields arrive in `apply()` as Cordis volatile refs, not
// plain values, so `cfg.provider` was never a string and the engine selection
// silently fell back to "bing". Unwrap every ref in `current()`.
// Usage: node patch-free-web-search-unwrap.mjs <pluginDir> [more...]
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dirs = process.argv.slice(2);
if (dirs.length === 0) throw new Error("usage: node patch-free-web-search-unwrap.mjs <pluginDir> [...]");

const FROM = `	current = () => ({
		...(config ?? {}),
		...readSettingsValue()
	});`;

const TO = `	// Volatile Config fields are Cordis refs, not plain values: read through them
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
	});`;

for (const dir of dirs) {
  const path = join(dir, "lib/index.js");
  let text = readFileSync(path, "utf8");
  if (text.includes("unwrapVolatile")) {
    console.log(`skip (already applied): ${path}`);
    continue;
  }
  if (!text.includes(FROM)) throw new Error(`anchor not found: ${path}`);
  writeFileSync(path, text.replace(FROM, TO));
  console.log(`patched: ${path}`);
}
