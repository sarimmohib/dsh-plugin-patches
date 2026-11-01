// Repair pass: a translation inserted raw double quotes into a string literal
// that is itself double-quoted, which terminated the literal early. Rewrite those
// inner quotes as single quotes so the bundle parses again.
//
// Usage: node fix-engram-client-quotes.mjs <pkg-dir> [<pkg-dir> ...]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const FIXES = [
  [
    'detect "don\'t use X / switch to Y / prefer / never use" phrasing',
    "detect 'don't use X / switch to Y / prefer / never use' phrasing",
  ],
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

for (const dir of process.argv.slice(2)) {
  const file = join(dir, "lib", "client.js");
  if (!existsSync(file)) continue;
  const raw = readFileSync(file, "utf8");
  let text = decodeEscapes(raw);
  let changed = 0;
  for (const [from, to] of FIXES) {
    if (text.includes(from)) {
      text = text.split(from).join(to);
      changed += 1;
    }
  }
  if (changed === 0) {
    console.log(`skip (nothing to repair): ${file}`);
    continue;
  }
  writeFileSync(file, encodeNonAscii(text), "utf8");
  console.log(`repaired ${changed} quote issue(s): ${file}`);
}
