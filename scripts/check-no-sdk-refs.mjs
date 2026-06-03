#!/usr/bin/env node
// scripts/check-no-sdk-refs.mjs
//
// Regression guard for the v1.2.0 SDK retirement (ADR-0174).
//
// v1.2.0 retired the standalone @opengsd/gsd-sdk → @evolvconsulting/ecl-sdk
// package boundary: there is no more src/sdk/ workspace, no sdk/dist build
// output, and no ecl-sdk bin. The tools binary now ships inside the main
// package at evolv-coder-lite/bin/ecl-tools.cjs. The original v1.2.0 sync left
// stale references behind; three of them broke CI / the release. This guard
// fails fast if any retired-SDK artifact reappears in the HAND-MAINTAINED
// tooling (CI workflows, repo scripts, the overlay, and the e2e harness) on a
// future sync — exactly the class of regression this fixup addressed.
//
// Scope notes:
//   - It deliberately does NOT scan the generated src/ tree. Rebranded upstream
//     content can legitimately mention `ecl-sdk` (the rebrand of an upstream
//     gsd-sdk reference); verify-rebrand.mjs + the bake drift check cover src/.
//   - It skips docs/prose (.md etc.) — those don't break a run; a stale doc is
//     a separate, non-blocking concern.
//   - A handful of files legitimately carry the gsd-sdk → ecl-sdk rebrand as
//     DATA (the rule that performs it, the smoke probe + synthetic test that
//     exercise it, and the text-patches that rewrite gsd-sdk regex literals in
//     baked upstream tests). Those are allowlisted by path.
//
// Mirrors the patterns in the PR's manual sweep:
//   grep -rnE "src/sdk|ecl-sdk|gsd-sdk|sdk/dist" .github/ scripts/ overlay/ e2e/
//
// Exit codes: 0 clean · 1 stale refs found · 2 I/O error.

import { readFile, readdir } from 'node:fs/promises';
import { join, relative, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');

// Hand-maintained trees to scan. (src/ is generated — see header.)
const SCAN_DIRS = ['.github', 'scripts', 'overlay', 'e2e'];

// Retired-SDK artifacts. Path forms (src/sdk, sdk/dist) are always bugs in
// these trees; the bin/pkg tokens (ecl-sdk, gsd-sdk) are bugs everywhere except
// the allowlisted rebrand machinery below.
const PATTERNS = [
  { name: 'src/sdk path',    re: /src\/sdk/ },
  { name: 'sdk/dist path',   re: /sdk\/dist/ },
  { name: 'ecl-sdk bin/pkg', re: /\becl-sdk\b/ },
  { name: 'gsd-sdk token',   re: /\bgsd-sdk\b/ },
];

// Files that legitimately reference the retired-SDK tokens as DATA, not as live
// paths/bins. Repo-relative (POSIX). Keep this list tight and documented.
const ALLOWLIST = [
  /^overlay\/rebrand-map\.mjs$/,        // the gsd-sdk → ecl-sdk rebrand rule
  /^scripts\/smoke-rebrand-map\.mjs$/,  // probes that exercise the rule
  /^overlay\/text-patches\.mjs$/,       // patches that rewrite gsd-sdk regex literals
  /^scripts\/test-sync-synthetic\.mjs$/,// asserts the ecl-sdk bin is ABSENT
  /^scripts\/check-no-sdk-refs\.mjs$/,  // this guard (defines the patterns)
];

// Skip prose/docs and binaries — the guard targets executable/config files,
// where a stale path actually breaks a run.
const SKIP_EXTS = new Set([
  '.md', '.markdown', '.txt', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
  '.lock', '.tgz', '.gz', '.zip',
]);

function isAllowlisted(rel) {
  return ALLOWLIST.some((re) => re.test(rel));
}

async function* walk(dir, base) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // dir may legitimately not exist in some checkouts
  }
  for (const ent of entries) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.git') continue;
      yield* walk(p, base);
    } else if (ent.isFile()) {
      yield { abs: p, rel: relative(base, p).split('\\').join('/') };
    }
  }
}

async function main() {
  const hits = [];
  for (const d of SCAN_DIRS) {
    for await (const { abs, rel } of walk(join(REPO, d), REPO)) {
      if (SKIP_EXTS.has(extname(rel).toLowerCase())) continue;
      if (isAllowlisted(rel)) continue;
      let text;
      try {
        text = await readFile(abs, 'utf8');
      } catch {
        continue; // unreadable / binary
      }
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        for (const { name, re } of PATTERNS) {
          if (re.test(lines[i])) {
            hits.push({ rel, lineNo: i + 1, pattern: name, line: lines[i].trim().slice(0, 160) });
            break;
          }
        }
      }
    }
  }

  if (hits.length === 0) {
    console.log('OK — no retired-SDK references in .github/ scripts/ overlay/ e2e/');
    process.exit(0);
  }

  console.error(`FAIL — ${hits.length} retired-SDK reference(s) found (v1.2.0 / ADR-0174):\n`);
  const byFile = new Map();
  for (const h of hits) {
    if (!byFile.has(h.rel)) byFile.set(h.rel, []);
    byFile.get(h.rel).push(h);
  }
  for (const [rel, fileHits] of byFile) {
    console.error(`  ${rel}`);
    for (const h of fileHits) {
      console.error(`    L${h.lineNo} [${h.pattern}]: ${h.line}`);
    }
  }
  console.error('\nThe standalone SDK was retired in v1.2.0. Use the in-package tools binary');
  console.error('(evolv-coder-lite/bin/ecl-tools.cjs) instead. If a hit is a legitimate rebrand');
  console.error('rule/probe/patch, add its file to ALLOWLIST in scripts/check-no-sdk-refs.mjs.');
  process.exit(1);
}

main().catch((err) => {
  console.error('check-no-sdk-refs crashed:', err.stack ?? err.message);
  process.exit(2);
});
