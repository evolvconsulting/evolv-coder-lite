#!/usr/bin/env node
// scripts/verify-rebrand.mjs
//
// Asserts that src/ contains no upstream branding leaks, except in files
// where attribution/history is intentionally preserved.
//
// Exit codes:
//   0 — clean
//   1 — leaks found (prints offending file + line snippets)
//   2 — invocation / I/O error

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isContentPreserved, looksLikeText } from '../overlay/rebrand-map.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');
const SRC = join(REPO, 'src');

// Files in src/ where leaks are EXPECTED (attribution + manifest + upstream
// history records). These mirror rebrand-map's CONTENT_PRESERVE_PATTERNS but
// must be evaluated against src/-relative paths (post-rename).
const SRC_ALLOWLIST = [
  /^LICENSE$/,
  /^NOTICE$/,
  /^REBRAND-MANIFEST\.json$/,
  /(^|\/)CHANGELOG(\.md)?$/i,
  /(^|\/)\.changeset\//,
];

function isAllowlisted(srcRel) {
  return SRC_ALLOWLIST.some((re) => re.test(srcRel));
}

const LEAK_PATTERNS = [
  { name: 'gsd-token',   re: /\bgsd\b/i },
  { name: 'gsd-prefix',  re: /\bgsd[-_]/i },
  { name: 'gsd-suffix',  re: /[-_]gsd\b/i },
  { name: 'get-shit-done', re: /get[- ]shit[- ]done/i },
  { name: 'opengsd',     re: /@opengsd/i },
  { name: 'taches',      re: /TÂCHES/ },
  { name: 'open-gsd-org', re: /\bopen-gsd\b/ },
  { name: 'gsd-build-org', re: /\bgsd-build\b/ },
];

async function* walk(dir, base = dir) {
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.git') continue;
      yield* walk(p, base);
    } else if (ent.isFile()) {
      yield { abs: p, rel: relative(base, p) };
    }
  }
}

async function main() {
  try { await stat(SRC); } catch {
    console.error('src/ not found. Run `npm run build` first.');
    process.exit(2);
  }

  let scanned = 0, allowlisted = 0, leaks = [];

  for await (const { abs, rel } of walk(SRC)) {
    scanned++;
    if (isAllowlisted(rel)) { allowlisted++; continue; }

    const buf = await readFile(abs);
    if (!looksLikeText(buf)) continue;
    const text = buf.toString('utf8');

    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { name, re } of LEAK_PATTERNS) {
        if (re.test(line)) {
          leaks.push({ rel, lineNo: i + 1, pattern: name, line: line.length > 200 ? line.slice(0, 200) + '…' : line });
          break;
        }
      }
    }
  }

  console.log(`scanned: ${scanned} files (${allowlisted} allowlisted)`);
  if (leaks.length === 0) {
    console.log('OK — no branding leaks in src/');
    process.exit(0);
  }

  console.error(`FAIL — ${leaks.length} leak(s) in src/:\n`);
  // Group by file for readability
  const byFile = new Map();
  for (const l of leaks) {
    if (!byFile.has(l.rel)) byFile.set(l.rel, []);
    byFile.get(l.rel).push(l);
  }
  for (const [rel, hits] of byFile) {
    console.error(`  ${rel}`);
    for (const h of hits.slice(0, 5)) {
      console.error(`    L${h.lineNo} [${h.pattern}]: ${h.line}`);
    }
    if (hits.length > 5) console.error(`    …and ${hits.length - 5} more in this file`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error('verify-rebrand crashed:', err.stack ?? err.message);
  process.exit(2);
});
