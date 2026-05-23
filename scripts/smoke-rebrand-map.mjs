#!/usr/bin/env node
// Quick smoke test of the rebrand map against real upstream content.
// Runs from anywhere; prints a summary and exits 1 on obvious problems.

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rebrandPath, rebrandContent, isContentPreserved, looksLikeText, mergeHits } from '../overlay/rebrand-map.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');
const UPSTREAM = join(REPO, 'upstream');

async function* walk(dir) {
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      // Skip node_modules in the vendored sources to keep this fast
      if (ent.name === 'node_modules' || ent.name === '.git') continue;
      yield* walk(p);
    } else if (ent.isFile()) {
      yield p;
    }
  }
}

const PROBES = [
  '@opengsd/get-shit-done-redux',
  '@opengsd/gsd-sdk',
  'get-shit-done-redux',
  'Get Shit Done Redux',
  'Get Shit Done',
  'get-shit-done',
  'open-gsd',
  'gsd-build',
  'gsd-sdk',
  'gsd-tools',
  '/gsd-discuss-phase',
  '/gsd:surface',
  'gsd-tools-error.ts',
  'GSD',
  'gsd',
  'gsd2-import.cjs',
];

console.log('--- string probes ---');
for (const probe of PROBES) {
  const { text } = rebrandContent(probe, 'docs/example.md');
  console.log(`  ${JSON.stringify(probe)} -> ${JSON.stringify(text)}`);
}

console.log('\n--- path probes ---');
for (const probe of [
  'package.json',
  'commands/gsd/discuss-phase.md',
  'agents/gsd-debugger.md',
  'hooks/gsd-prompt-guard.js',
  'sdk/src/gsd-tools-error.ts',
  'sdk/src/query-gsd-tools-runtime.ts',
  'tests/bug-2543-gsd-slash-namespace.test.cjs',
  'get-shit-done/bin/gsd-tools.cjs',
  'get-shit-done/bin/lib/gsd2-import.cjs',
  'assets/gsd-logo-2000.png',
  '.changeset/3591-gsdtools-native-workstream.md',
  'LICENSE',
  'NOTICE',
]) {
  console.log(`  ${probe}\n      -> ${rebrandPath(probe)}`);
}

console.log('\n--- preserved-content paths ---');
for (const p of ['LICENSE', 'NOTICE', 'CHANGELOG.md', '.changeset/foo.md', 'README.md', 'upstream/foo.md']) {
  console.log(`  ${p}: preserved=${isContentPreserved(p)}`);
}

console.log('\n--- full upstream walk: aggregate hit counts ---');
let totalHits = {};
let textFiles = 0, binaryFiles = 0, preserved = 0;
let leakyFiles = []; // files where post-transform still contains gsd/etc.
for await (const f of walk(UPSTREAM)) {
  const rel = relative(UPSTREAM, f);
  const buf = await readFile(f);
  if (!looksLikeText(buf)) {
    binaryFiles++;
    continue;
  }
  textFiles++;
  if (isContentPreserved(rel)) preserved++;
  const { text, hits } = rebrandContent(buf.toString('utf8'), rel);
  totalHits = mergeHits(totalHits, hits);

  // Sanity: after transform, no gsd/GSD/get-shit-done should remain except
  // in preserved files.
  if (!isContentPreserved(rel)) {
    if (/\bgsd\b/i.test(text) || /get-shit-done/.test(text) || /TÂCHES/.test(text) || /@opengsd/.test(text)) {
      leakyFiles.push({ rel, sample: text.match(/.{0,40}(?:\bgsd\b|get-shit-done|TÂCHES|@opengsd).{0,40}/i)?.[0] });
    }
  }
}

console.log(`  text files scanned:    ${textFiles}`);
console.log(`  binary files skipped:  ${binaryFiles}`);
console.log(`  content-preserved:     ${preserved}`);
console.log('\n  hit counts by rule:');
for (const [k, v] of Object.entries(totalHits).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${k.padEnd(18)} ${v}`);
}
console.log(`\n  leaky files (still contain branded tokens after transform): ${leakyFiles.length}`);
for (const l of leakyFiles.slice(0, 30)) {
  console.log(`    ${l.rel}`);
  if (l.sample) console.log(`        ~ ${JSON.stringify(l.sample)}`);
}
if (leakyFiles.length > 30) console.log(`    ...and ${leakyFiles.length - 30} more`);
