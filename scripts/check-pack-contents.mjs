#!/usr/bin/env node
// scripts/check-pack-contents.mjs
//
// Pre-release guard: assert that every file linked from src/README.md is
// included in the npm parent tarball. Catches the class of bug where the
// README documents a doc/asset that the package files allowlist excludes,
// producing broken links on npmjs.com.
//
// Runs `npm pack --dry-run --json` from src/ and compares the link set in
// src/README.md against the entryCount file list. Fails non-zero on any
// missing file.
//
// Exit codes:
//   0 — every README-linked package-relative file ships
//   1 — at least one missing
//   2 — invocation / parse error

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');
const SRC = join(REPO, 'src');
const README = join(SRC, 'README.md');

function packContents() {
  // npm pack --json prints a JSON array on stdout. --dry-run avoids creating
  // the .tgz on disk. Must run from src/ so the parent package is packed.
  const stdout = execFileSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['pack', '--dry-run', '--json'],
    { cwd: SRC, encoding: 'utf-8', shell: process.platform === 'win32' },
  );
  const parsed = JSON.parse(stdout);
  return new Set(parsed[0].files.map((f) => f.path));
}

// Pull every package-relative reference target out of the README. We scan
// markdown links `[text](path)`, image refs `![alt](path)`, and HTML attrs
// `src="path"` / `href="path"`. We deliberately skip absolute URLs and
// fragment-only anchors (`#section`).
function readmeLinks(text) {
  const targets = new Set();
  const patterns = [
    /\]\(([^)\s]+)/g,            // markdown ](href)
    /\bsrc=["']([^"']+)["']/g,    // HTML src=""
    /\bhref=["']([^"']+)["']/g,   // HTML href=""
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const raw = m[1];
      // Drop fragments — `path#anchor` should validate `path`.
      const noFrag = raw.split('#')[0];
      if (!noFrag) continue;
      // Skip absolute URLs and protocol-relative refs.
      if (/^[a-z][a-z0-9+.-]*:/i.test(noFrag)) continue;
      if (noFrag.startsWith('//')) continue;
      // Skip fragment-only refs and email-only mailto already filtered.
      if (noFrag.startsWith('#')) continue;
      // Normalize leading ./
      targets.add(noFrag.replace(/^\.\//, ''));
    }
  }
  return targets;
}

function main() {
  let readme;
  try {
    readme = readFileSync(README, 'utf-8');
  } catch (err) {
    console.error(`check-pack-contents: cannot read ${README}: ${err.message}`);
    process.exit(2);
  }

  let pack;
  try {
    pack = packContents();
  } catch (err) {
    console.error(`check-pack-contents: \`npm pack --dry-run --json\` failed: ${err.message}`);
    if (err.stderr) console.error(err.stderr.toString());
    process.exit(2);
  }

  const links = readmeLinks(readme);
  const missing = [];
  for (const target of links) {
    if (!pack.has(target)) missing.push(target);
  }

  if (missing.length === 0) {
    console.log(`OK — all ${links.size} package-relative README link(s) are in the tarball.`);
    process.exit(0);
  }

  console.error(`FAIL — ${missing.length} README-linked file(s) missing from the parent npm tarball:`);
  for (const m of missing) console.error(`  ${m}`);
  console.error('\nFix: add the missing path(s) to src/package.json `files` (via overlay/package.patch.json), or rewrite the README link to an absolute GitHub URL.');
  process.exit(1);
}

main();
