#!/usr/bin/env node
// overlay/bake.mjs
//
// Initial full bake: transforms upstream/ into src/ via the rebrand map.
//
// Run once after the initial upstream sync to establish src/. After that,
// daily updates apply translated patches via scripts/sync-and-patch.mjs;
// you only re-run bake.mjs if the rebrand rules themselves change.
//
// Usage:
//   node overlay/bake.mjs            # bake into src/
//   node overlay/bake.mjs --check    # dry-run, exit non-zero if src/ would differ

import { readFile, readdir, writeFile, mkdir, rm, copyFile, stat, chmod } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rebrandPath, rebrandContent, isContentPreserved, looksLikeText, mergeHits } from './rebrand-map.mjs';
import { applyTextPatches } from './text-patches.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');
const UPSTREAM = join(REPO, 'upstream');
const SRC = join(REPO, 'src');
const OVERLAY_FILES = join(__dirname, 'files');
const PACKAGE_PATCH = join(__dirname, 'package.patch.json');
const LOCK_FILE = join(REPO, 'UPSTREAM.lock');

const args = new Set(process.argv.slice(2));
const CHECK_ONLY = args.has('--check');

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

function modeFor(srcMode) {
  return (srcMode & 0o111) ? 0o755 : 0o644;
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

function deepMerge(target, patch) {
  if (Array.isArray(patch)) return patch;
  if (typeof patch !== 'object' || patch === null) return patch;
  const out = { ...(target ?? {}) };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function main() {
  if (!(await exists(UPSTREAM))) {
    throw new Error('upstream/ not found. Run `npm run sync` first.');
  }

  console.log(CHECK_ONLY ? 'baking (check-only)…' : 'baking src/ from upstream/…');

  if (!CHECK_ONLY) {
    if (await exists(SRC)) await rm(SRC, { recursive: true, force: true });
    await mkdir(SRC, { recursive: true });
  }

  let textCount = 0, binaryCount = 0, preservedCount = 0;
  let totalHits = {};

  for await (const { abs, rel } of walk(UPSTREAM)) {
    const newRel = rebrandPath(rel);
    const dest = join(SRC, newRel);
    if (!CHECK_ONLY) await mkdir(dirname(dest), { recursive: true });
    const srcStat = await stat(abs);

    const buf = await readFile(abs);
    if (!looksLikeText(buf)) {
      binaryCount++;
      if (!CHECK_ONLY) {
        await copyFile(abs, dest);
        await chmod(dest, modeFor(srcStat.mode));
      }
      continue;
    }

    textCount++;
    const preserved = isContentPreserved(rel);
    if (preserved) preservedCount++;

    const { text, hits } = rebrandContent(buf.toString('utf8'), rel);
    totalHits = mergeHits(totalHits, hits);
    if (!CHECK_ONLY) {
      await writeFile(dest, text);
      await chmod(dest, modeFor(srcStat.mode));
    }
  }

  let overrideCount = 0;
  if (await exists(OVERLAY_FILES)) {
    for await (const { abs, rel } of walk(OVERLAY_FILES)) {
      overrideCount++;
      const dest = join(SRC, rel);
      const srcStat = await stat(abs);
      if (!CHECK_ONLY) {
        await mkdir(dirname(dest), { recursive: true });
        await copyFile(abs, dest);
        await chmod(dest, modeFor(srcStat.mode));
      }
    }
  }

  let textPatchesApplied = [];
  if (!CHECK_ONLY) {
    textPatchesApplied = await applyTextPatches(SRC);
  }

  let patched = false;
  if ((await exists(PACKAGE_PATCH)) && (await exists(join(SRC, 'package.json')))) {
    const base = JSON.parse(await readFile(join(SRC, 'package.json'), 'utf8'));
    const patch = JSON.parse(await readFile(PACKAGE_PATCH, 'utf8'));
    const merged = deepMerge(base, patch);
    if (!CHECK_ONLY) {
      await writeFile(join(SRC, 'package.json'), JSON.stringify(merged, null, 2) + '\n');
    }
    patched = true;
  }

  let upstreamRef = 'unknown';
  let upstreamSha = 'unknown';
  if (await exists(LOCK_FILE)) {
    const lock = JSON.parse(await readFile(LOCK_FILE, 'utf8'));
    upstreamRef = lock.ref ?? upstreamRef;
    upstreamSha = lock.tarball_sha256 ?? upstreamSha;
  }

  const manifest = {
    bakedAt: new Date().toISOString(),
    upstream: { repo: 'open-gsd/get-shit-done-redux', ref: upstreamRef, tarball_sha256: upstreamSha },
    counts: { textFiles: textCount, binaryFiles: binaryCount, contentPreserved: preservedCount, overlayOverrides: overrideCount, packagePatched: patched, textPatchesApplied: textPatchesApplied.length },
    ruleHits: totalHits,
  };

  if (!CHECK_ONLY) {
    await writeFile(join(SRC, 'REBRAND-MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
  }

  console.log(`  text files transformed: ${textCount}`);
  console.log(`  binary files copied:    ${binaryCount}`);
  console.log(`  content-preserved:      ${preservedCount}`);
  console.log(`  overlay overrides:      ${overrideCount}`);
  console.log(`  text patches applied:   ${textPatchesApplied.length}${textPatchesApplied.length ? ' (' + textPatchesApplied.join(', ') + ')' : ''}`);
  console.log(`  package.json patched:   ${patched}`);
  console.log(`  total rule hits:        ${Object.values(totalHits).reduce((a, b) => a + b, 0)}`);
  if (CHECK_ONLY) {
    console.log('(check-only mode; no files written)');
  } else {
    console.log(`src/ baked at ${SRC}`);
  }
}

main().catch((err) => {
  console.error('bake failed:', err.stack ?? err.message);
  process.exitCode = 1;
});
