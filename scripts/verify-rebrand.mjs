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

// Lines in the leak scan that are ALLOWED to contain branding tokens because
// they are deliberate eCL-attribution sentences explaining the rebrand. Any
// match must include the entire deliberate phrase, so accidental drift in
// adjacent prose is still caught.
const LINE_ATTRIBUTION_ALLOWLIST = [
  /evolv Consulting rebrand of the upstream `@opengsd\/get-shit-done-redux` project/,
  /eCL is the \[evolv Consulting\]\([^)]+\) rebrand of the upstream \[`@opengsd\/get-shit-done-redux`\]/,
];

const LEAK_PATTERNS = [
  { name: 'gsd-token',   re: /\bgsd\b/i },
  { name: 'gsd-prefix',  re: /\bgsd[-_]/i },
  { name: 'gsd-suffix',  re: /[-_]gsd\b/i },
  // PascalCase / CamelCase embedding — e.g. GsdSdk, parseGsdToken.
  // The plain \bgsd\b/i regex above misses these because in `GsdSdk`
  // there is no word boundary between `Gsd` and the following `Sdk`.
  { name: 'gsd-camel',   re: /(?<![A-Za-z])Gsd[A-Z]/ },
  { name: 'get-shit-done', re: /get[- ]shit[- ]done/i },
  { name: 'opengsd',     re: /@opengsd/i },
  // URL-encoded scope, often appears in shields.io badge URLs.
  // %40 is `@` and %2F is `/` — together they encode `@opengsd/<pkg>`.
  { name: 'opengsd-encoded', re: /%40opengsd/i },
  { name: 'taches',      re: /TÂCHES/ },
  { name: 'open-gsd-org', re: /\bopen-gsd\b/ },
  { name: 'gsd-build-org', re: /\bgsd-build\b/ },
  // Regex literals targeting gsd identifiers in JS/TS source. These usually
  // hide from the simple word-boundary leak rules above because the leading
  // `\b` of the literal puts a word character (b) immediately before `gsd`,
  // which prevents \bgsd[-_] from matching during the bake. The leak still
  // ships in src/ as `\bgsd-` or `\bgsd:`. Detect both kebab and colon forms.
  { name: 'gsd-regex-literal', re: /\\b[Gg]sd[-_:]/ },
];

// Source-code files that may legitimately contain a small number of literal
// null bytes inside string fixtures (test inputs that exercise null-byte
// handling). The bake's `looksLikeText` rejects any file with a null byte in
// the first 8KB as binary, copying it through unrebranded — so leaks inside
// these files would never be transformed by rebrand-map. Flagging them here
// is the safety net that surfaces the upstream-test-fixture-with-embedded-null
// pattern as a release blocker.
const TEXT_LIKE_EXTS = new Set([
  '.cjs', '.mjs', '.js', '.ts', '.tsx', '.jsx',
  '.md', '.json', '.yml', '.yaml', '.toml', '.txt',
  '.sh', '.bash', '.py',
]);

// Files that are SUPPOSED to contain literal null bytes (adversarial parser
// fixtures, etc.) and have been verified to contain no branding tokens. The
// null-byte hybrid check would otherwise flag them as release blockers.
const NULL_BYTE_FIXTURE_ALLOWLIST = [
  /^tests\/fixtures\/adversarial\/.*null-byte/,
  // The property-style parser test embeds a single \x00 byte in one of its
  // generator fragments to exercise the parser's null-byte robustness. The
  // require path on line 24 was rebranded by overlay/text-patches.mjs entry
  // `feat-3594-parser-test-require-path`, and the file is otherwise free of
  // branding tokens. Allowlist after that patch lands.
  /^tests\/feat-3594-parser-property-style\.test\.cjs$/,
];

function isTextLikeExtension(rel) {
  const lower = rel.toLowerCase();
  for (const ext of TEXT_LIKE_EXTS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

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
  let nullByteHybrids = [];

  for await (const { abs, rel } of walk(SRC)) {
    scanned++;
    if (isAllowlisted(rel)) { allowlisted++; continue; }

    const buf = await readFile(abs);
    const isText = looksLikeText(buf);

    // Surface text-like source files that the bake classifies as binary
    // because of an embedded null byte. The bake skips rebranding for these,
    // so any branding token inside them would ship unrewritten. Flag them
    // before — and independently of — the leak scan. Allowlist files known
    // to be parser fixtures with no branding content.
    if (!isText && isTextLikeExtension(rel) && buf.includes(0)) {
      const allowed = NULL_BYTE_FIXTURE_ALLOWLIST.some((re) => re.test(rel));
      if (!allowed) {
        nullByteHybrids.push({ rel, nullCount: countNullBytes(buf), size: buf.length });
      }
    }

    if (!isText) continue;
    const text = buf.toString('utf8');

    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (LINE_ATTRIBUTION_ALLOWLIST.some((re) => re.test(line))) continue;
      for (const { name, re } of LEAK_PATTERNS) {
        if (re.test(line)) {
          leaks.push({ rel, lineNo: i + 1, pattern: name, line: line.length > 200 ? line.slice(0, 200) + '…' : line });
          break;
        }
      }
    }
  }

  console.log(`scanned: ${scanned} files (${allowlisted} allowlisted)`);

  if (nullByteHybrids.length > 0) {
    console.error(`FAIL — ${nullByteHybrids.length} text-like file(s) in src/ contain literal null bytes; the bake skipped rebranding them:\n`);
    for (const h of nullByteHybrids) {
      console.error(`  ${h.rel} (${h.size} bytes, ${h.nullCount} null byte(s))`);
    }
    console.error('\nFix: add an overlay/text-patches.mjs entry for each, or remove the null bytes upstream so looksLikeText() admits the file.');
  }

  if (leaks.length === 0 && nullByteHybrids.length === 0) {
    console.log('OK — no branding leaks in src/');
    process.exit(0);
  }

  if (leaks.length > 0) {
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
  }
  process.exit(1);
}

function countNullBytes(buf) {
  let n = 0;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0) n++;
  }
  return n;
}

main().catch((err) => {
  console.error('verify-rebrand crashed:', err.stack ?? err.message);
  process.exit(2);
});
