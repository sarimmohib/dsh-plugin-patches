// The + / slash menu opened by the composer reads its candidates from the host
// `commandUi` service. That service builds each row with
//
//     ...contribution.description === void 0 ? {} : { description: contribution.description() }
//
// i.e. it CALLS `description` as a function. dsh-free-web-search registers its
// command with a plain string, so `contribution.description()` throws
//
//     TypeError: contribution.description is not a function
//
// and `candidates()` rejects. The slash controller surfaces that as
//
//     [ui-input-trigger] source "command" candidates failed: TypeError: ...
//
// and the whole candidate list dies with it — the + button opens nothing and
// typing "/" shows no menu. (Directly typing a command like /goal still works:
// it is executed without going through the candidate list.)
//
// Fix: register `description` as a thunk, matching the host contract.
// Usage: node patch-free-web-search-command-description.mjs <pluginDir> [more...]
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dirs = process.argv.slice(2);
if (dirs.length === 0) {
  throw new Error("usage: node patch-free-web-search-command-description.mjs <pluginDir> [...]");
}

const FROM = 'description: "Switch web search engine",';
const TO = 'description: () => "Switch web search engine",';

for (const dir of dirs) {
  const path = join(dir, "lib/client.js");
  const text = readFileSync(path, "utf8");

  if (text.includes(TO)) {
    console.log(`skip (already applied): ${path}`);
    continue;
  }
  if (!text.includes(FROM)) {
    throw new Error(`anchor not found in ${path}: command contribution description`);
  }

  const updated = text.replace(FROM, TO);
  writeFileSync(path, updated);

  // Read back rather than trusting the write.
  const check = readFileSync(path, "utf8");
  if (!check.includes(TO)) throw new Error(`verification failed: ${path}`);
  console.log(`patched: ${path}`);
}
