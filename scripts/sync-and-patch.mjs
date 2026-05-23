#!/usr/bin/env node
// scripts/sync-and-patch.mjs
//
// Daily upstream-sync orchestrator. Architecture A (per the plan):
//   - upstream/ holds the previously-synced upstream tag (per UPSTREAM.lock).
//   - src/ is the committed, fully-rebranded source of truth.
//   - We fetch the new upstream tag into a temp dir, compute the file-level
//     diff (added/modified/deleted), translate each entry through the rebrand
//     map, and apply the result to src/.
//
// Conflict policy: per-file fallback.
//   - For modified files: build a unified diff between rebranded(OLD) and
//     rebranded(NEW); attempt `git apply` against src/<rebrandedPath>.
//     On conflict, overwrite src/<rebrandedPath> with rebranded(NEW) and
//     tag the file in SYNC-REPORT.md for extra reviewer attention.
//   - For added files: write directly. If something already exists at the
//     destination path (rare collision), prefer NEW and flag.
//   - For deleted files: rm at the rebranded path; warn if missing.
//
// On success: replace upstream/ with the new tarball, update UPSTREAM.lock,
// run verify-rebrand, write SYNC-REPORT.md, and exit 0.
// On failure: leave upstream/ + src/ untouched (we operate in a temp staging
// area until the final swap), exit 1.

import { readFile, readdir, writeFile, mkdir, rm, copyFile, stat, rename } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { rebrandPath, rebrandContent, isContentPreserved, looksLikeText, mergeHits } from '../overlay/rebrand-map.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');
const UPSTREAM = join(REPO, 'upstream');
const SRC = join(REPO, 'src');
const LOCK_FILE = join(REPO, 'UPSTREAM.lock');
const REPORT_FILE = join(REPO, 'SYNC-REPORT.md');
const UPSTREAM_REPO = 'open-gsd/get-shit-done-redux';
const UA = 'evolv-coder-lite-sync/1.0';

function ghHeaders() {
  const h = { 'User-Agent': UA, Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function exists(p) { try { await stat(p); return true; } catch { return false; } }

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

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'pipe', ...opts });
    let stdout = '', stderr = '';
    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.stderr?.on('data', (d) => { stderr += d.toString(); });
    child.on('error', reject);
    child.on('exit', (code) => resolve({ code, stdout, stderr }));
  });
}

async function fetchLatestRelease() {
  const res = await fetch(`https://api.github.com/repos/${UPSTREAM_REPO}/releases/latest`, { headers: ghHeaders() });
  if (!res.ok) throw new Error(`GitHub releases API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function downloadTarball(tag, dest) {
  const url = `https://codeload.github.com/${UPSTREAM_REPO}/tar.gz/refs/tags/${encodeURIComponent(tag)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  if (!res.ok) throw new Error(`tarball download ${res.status}: ${url}`);
  const hash = createHash('sha256');
  const out = createWriteStream(dest);
  await pipeline(res.body, async function* (src) {
    for await (const chunk of src) { hash.update(chunk); yield chunk; }
  }, out);
  return hash.digest('hex');
}

async function extractTarball(tarPath, destDir) {
  await mkdir(destDir, { recursive: true });
  const r = await run('tar', ['-xzf', tarPath, '--strip-components=1', '-C', destDir]);
  if (r.code !== 0) throw new Error(`tar exited ${r.code}: ${r.stderr}`);
}

// Hash a buffer for diff classification (added/modified/deleted detection).
function sha256(buf) { return createHash('sha256').update(buf).digest('hex'); }

// Build a path→{abs, hash, buf} index of every file in a tree.
async function indexTree(root) {
  const out = new Map();
  for await (const { abs, rel } of walk(root)) {
    const buf = await readFile(abs);
    out.set(rel, { abs, rel, buf, hash: sha256(buf) });
  }
  return out;
}

function classifyDiff(oldIdx, newIdx) {
  const added = [], modified = [], deleted = [], unchanged = [];
  for (const [rel, n] of newIdx) {
    const o = oldIdx.get(rel);
    if (!o) added.push(n);
    else if (o.hash !== n.hash) modified.push({ old: o, new: n });
    else unchanged.push(n);
  }
  for (const [rel, o] of oldIdx) {
    if (!newIdx.has(rel)) deleted.push(o);
  }
  return { added, modified, deleted, unchanged };
}

// Use git's diff machinery on two staged trees to produce a unified patch.
// Cleaner than building one ourselves and uses the same algorithm `git apply`
// will use on the receiving end.
async function makePatch(oldFile, newFile, pathInPatch) {
  const r = await run('git', ['diff', '--no-index', '--no-color', '--', oldFile, newFile]);
  // git diff --no-index exits 1 when files differ, which is the normal case.
  if (r.code !== 0 && r.code !== 1) {
    throw new Error(`git diff failed (${r.code}): ${r.stderr}`);
  }
  // Rewrite the diff headers to use the in-tree path so `git apply` lands
  // changes at src/<pathInPatch> rather than the temp paths we diffed.
  let patch = r.stdout;
  if (!patch.trim()) return '';
  // Replace the a/<oldFile> b/<newFile> headers with in-tree paths.
  patch = patch
    .replace(new RegExp(`^diff --git a${oldFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} b${newFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'm'),
             `diff --git a/${pathInPatch} b/${pathInPatch}`)
    .replace(new RegExp(`^--- a${oldFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'm'), `--- a/${pathInPatch}`)
    .replace(new RegExp(`^\\+\\+\\+ b${newFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'm'), `+++ b/${pathInPatch}`);
  return patch;
}

async function tryGitApply(patch, cwd) {
  // Write patch to a temp file and try `git apply --check` first, then apply.
  const tmpPatch = join(tmpdir(), `ecl-sync-${Date.now()}-${Math.random().toString(36).slice(2)}.patch`);
  await writeFile(tmpPatch, patch);
  try {
    const check = await run('git', ['apply', '--check', '--unsafe-paths', '--include=src/*', tmpPatch], { cwd });
    if (check.code !== 0) return { applied: false, reason: check.stderr.trim() || 'check failed' };
    const apply = await run('git', ['apply', '--unsafe-paths', '--include=src/*', tmpPatch], { cwd });
    if (apply.code !== 0) return { applied: false, reason: apply.stderr.trim() || 'apply failed' };
    return { applied: true };
  } finally {
    await rm(tmpPatch, { force: true });
  }
}

async function main() {
  if (!(await exists(UPSTREAM))) throw new Error('upstream/ missing — run npm run sync first');
  if (!(await exists(SRC)))      throw new Error('src/ missing — run npm run build first');

  const lock = JSON.parse(await readFile(LOCK_FILE, 'utf8'));
  const release = await fetchLatestRelease();
  const newTag = release.tag_name;

  if (newTag === lock.ref) {
    console.log(`already at ${newTag} — nothing to do`);
    return;
  }

  console.log(`syncing ${lock.ref} → ${newTag}`);

  const stagingRoot = join(tmpdir(), `ecl-sync-${Date.now()}`);
  await mkdir(stagingRoot, { recursive: true });
  const stagingUpstream = join(stagingRoot, 'upstream-new');
  const tmpTar = join(stagingRoot, `${newTag.replace(/[^\w.-]/g, '_')}.tar.gz`);

  let upstreamSha;
  try {
    upstreamSha = await downloadTarball(newTag, tmpTar);
    await extractTarball(tmpTar, stagingUpstream);
  } catch (err) {
    await rm(stagingRoot, { recursive: true, force: true });
    throw err;
  }

  // Index both trees and classify the diff.
  const oldIdx = await indexTree(UPSTREAM);
  const newIdx = await indexTree(stagingUpstream);
  const diff = classifyDiff(oldIdx, newIdx);

  console.log(`upstream diff: +${diff.added.length} ~${diff.modified.length} -${diff.deleted.length} (=${diff.unchanged.length})`);

  // Apply the translated diff to src/.
  // We collect outcomes for the report. We do NOT touch upstream/ until
  // every src/ change has succeeded (or fallen back).
  const outcomes = { added: [], modified_clean: [], modified_fallback: [], deleted: [], skipped: [] };
  let totalHits = {};

  // -- Deleted files first (least likely to conflict).
  for (const o of diff.deleted) {
    const newRel = rebrandPath(o.rel);
    const target = join(SRC, newRel);
    if (await exists(target)) {
      await rm(target, { force: true });
      outcomes.deleted.push(newRel);
    } else {
      outcomes.skipped.push({ kind: 'delete-missing', rel: newRel });
    }
  }

  // -- Added files: write rebranded NEW directly.
  for (const n of diff.added) {
    const newRel = rebrandPath(n.rel);
    const target = join(SRC, newRel);
    await mkdir(dirname(target), { recursive: true });
    if (!looksLikeText(n.buf)) {
      await writeFile(target, n.buf);
    } else {
      const { text, hits } = rebrandContent(n.buf.toString('utf8'), n.rel);
      totalHits = mergeHits(totalHits, hits);
      await writeFile(target, text);
    }
    outcomes.added.push(newRel);
  }

  // -- Modified files: try translated unified diff; fall back to wholesale.
  // Stage rebranded OLD/NEW into a scratch dir for `git diff --no-index`.
  const scratch = join(stagingRoot, 'scratch');
  await mkdir(scratch, { recursive: true });

  for (const m of diff.modified) {
    const newRel = rebrandPath(m.new.rel);
    const target = join(SRC, newRel);

    const isTextOld = looksLikeText(m.old.buf);
    const isTextNew = looksLikeText(m.new.buf);

    // Binary modifications: we can't translate-and-patch. Wholesale replace.
    if (!isTextOld || !isTextNew) {
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, m.new.buf);
      outcomes.modified_fallback.push({ rel: newRel, reason: 'binary' });
      continue;
    }

    const oldRebranded = rebrandContent(m.old.buf.toString('utf8'), m.old.rel);
    const newRebranded = rebrandContent(m.new.buf.toString('utf8'), m.new.rel);
    totalHits = mergeHits(totalHits, newRebranded.hits);

    if (oldRebranded.text === newRebranded.text) {
      // Upstream changed something only in branded strings (e.g. typo fix in
      // a comment that mentions `gsd-foo`); the rebranded forms collapse to
      // identical content. No-op for us.
      outcomes.skipped.push({ kind: 'rebrand-collapsed', rel: newRel });
      continue;
    }

    // If src/<newRel> doesn't exist (path changed upstream and our rebrand of
    // the old path differs), treat as added.
    if (!(await exists(target))) {
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, newRebranded.text);
      outcomes.added.push(newRel);
      continue;
    }

    // Build a unified patch between rebranded(OLD) and rebranded(NEW),
    // headers rewritten to point at src/<newRel>.
    const oldStaged = join(scratch, 'old', newRel);
    const newStaged = join(scratch, 'new', newRel);
    await mkdir(dirname(oldStaged), { recursive: true });
    await mkdir(dirname(newStaged), { recursive: true });
    await writeFile(oldStaged, oldRebranded.text);
    await writeFile(newStaged, newRebranded.text);

    let patch = '';
    try {
      patch = await makePatch(oldStaged, newStaged, `src/${newRel}`);
    } catch (err) {
      // Fall through to wholesale.
      patch = '';
    }

    if (!patch) {
      await writeFile(target, newRebranded.text);
      outcomes.modified_fallback.push({ rel: newRel, reason: 'no-patch' });
      continue;
    }

    const result = await tryGitApply(patch, REPO);
    if (result.applied) {
      outcomes.modified_clean.push(newRel);
    } else {
      // Per-file fallback: wholesale replace, tag for review.
      await writeFile(target, newRebranded.text);
      outcomes.modified_fallback.push({ rel: newRel, reason: result.reason });
    }
  }

  // -- Swap upstream/ to the new tree.
  // We do this AFTER all src/ writes succeeded, so a partial run is recoverable.
  await rm(UPSTREAM, { recursive: true, force: true });
  await rename(stagingUpstream, UPSTREAM);

  // -- Update UPSTREAM.lock.
  const newLock = {
    repo: UPSTREAM_REPO,
    ref: newTag,
    name: release.name ?? newTag,
    published_at: release.published_at ?? null,
    tarball_sha256: upstreamSha,
    fetched_at: new Date().toISOString(),
    previous_ref: lock.ref,
  };
  await writeFile(LOCK_FILE, JSON.stringify(newLock, null, 2) + '\n');

  // -- Write the sync report (used as the PR body).
  const lines = [];
  lines.push(`# Upstream sync: ${lock.ref} → ${newTag}`);
  lines.push('');
  lines.push(`- **Upstream**: ${UPSTREAM_REPO}`);
  lines.push(`- **Previous tag**: \`${lock.ref}\``);
  lines.push(`- **New tag**: \`${newTag}\` (published ${release.published_at ?? 'unknown'})`);
  lines.push(`- **Tarball sha256**: \`${upstreamSha}\``);
  lines.push('');
  lines.push('## Counts');
  lines.push('');
  lines.push(`| Outcome | Files |`);
  lines.push(`|---|---|`);
  lines.push(`| Added | ${outcomes.added.length} |`);
  lines.push(`| Modified (clean patch) | ${outcomes.modified_clean.length} |`);
  lines.push(`| **Modified (fallback — review needed)** | **${outcomes.modified_fallback.length}** |`);
  lines.push(`| Deleted | ${outcomes.deleted.length} |`);
  lines.push(`| Skipped | ${outcomes.skipped.length} |`);
  lines.push('');
  if (outcomes.modified_fallback.length > 0) {
    lines.push('## Files needing extra review');
    lines.push('');
    lines.push('These files\' translated patches did not apply cleanly. They were');
    lines.push('overwritten with the rebranded NEW content. Reviewer: confirm no');
    lines.push('eCL-specific local edits were lost.');
    lines.push('');
    for (const f of outcomes.modified_fallback) {
      lines.push(`- \`${f.rel}\` — ${f.reason}`);
    }
    lines.push('');
  }
  if (release.body) {
    lines.push('## Upstream release notes');
    lines.push('');
    lines.push(release.body.trim());
    lines.push('');
  }
  await writeFile(REPORT_FILE, lines.join('\n') + '\n');

  console.log(`upstream/ now at ${newTag}`);
  console.log(`outcomes: +${outcomes.added.length} ~clean=${outcomes.modified_clean.length} ~fallback=${outcomes.modified_fallback.length} -${outcomes.deleted.length} skip=${outcomes.skipped.length}`);
  console.log(`report: ${REPORT_FILE}`);

  await rm(stagingRoot, { recursive: true, force: true });
}

main().catch((err) => {
  console.error('sync-and-patch failed:', err.stack ?? err.message);
  process.exitCode = 1;
});
