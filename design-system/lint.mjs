// Bible self-conformance lint. Checks every artboard in this directory
// against the laws DESIGN_SYSTEM.md sets, so the next drift is caught by
// a tool rather than by whoever happens to look.
//
//   node design-system/lint.mjs
//
// Exit 1 on any violation. Checks:
//   1. No em dashes, no en dashes (section 7 rule 8).
//   2. No emoji (same rule).
//   3. Every font-size is on the type ladder (3.5), with a display
//      allowlist for cover art and specimens.
//   4. Distinct sizes per artboard stays inside the 3.5 budget.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));

// The ladder (px at the 14px root) plus sanctioned display sizes:
// 96 = the Type artboard's cap-height specimen glyph, 44 = the cover
// hero, 22 = swatch "Aa" glyphs. Display sizes are cover/specimen only,
// never row content.
const LADDER = new Set(['10.08', '11.2', '12.25', '12.88', '14', '17.5', '28']);
const DISPLAY = new Set(['22', '44', '96']);
const MAX_DISTINCT = 9; // 3.5: six or seven pairs; 9 sizes is the hard stop

const files = readdirSync(dir).filter((f) => f.endsWith('.dc.html'));
let failed = false;
const fail = (msg) => { failed = true; console.error('FAIL ' + msg); };

for (const f of files) {
  const src = readFileSync(join(dir, f), 'utf8');

  for (const [ch, name] of [['—', 'em dash'], ['–', 'en dash']]) {
    const n = src.split(ch).length - 1;
    if (n) fail(`${f}: ${n} ${name}(es)`);
  }

  const emoji = src.match(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu);
  if (emoji) fail(`${f}: emoji found: ${[...new Set(emoji)].join(' ')}`);

  const sizes = new Map();
  for (const m of src.matchAll(/font-size:\s*([0-9.]+)px/g)) {
    sizes.set(m[1], (sizes.get(m[1]) ?? 0) + 1);
  }
  for (const [px, n] of sizes) {
    if (!LADDER.has(px) && !DISPLAY.has(px)) {
      fail(`${f}: off-ladder font-size ${px}px (${n} use${n > 1 ? 's' : ''})`);
    }
  }
  if (sizes.size > MAX_DISTINCT) {
    fail(`${f}: ${sizes.size} distinct sizes (budget ${MAX_DISTINCT})`);
  }
}

if (failed) process.exit(1);
console.log(`ok: ${files.length} artboards conform`);
