#!/usr/bin/env node
// scripts/sync-upstream.mjs
//
// Fetch the latest release of open-gsd/get-shit-done-redux into upstream/.
// Idempotent: if UPSTREAM.lock already pins the latest tag, exits 0 without
// touching anything.
//
// Outputs (when an update happens):
//   upstream/        — extracted tarball contents at the new tag
//   UPSTREAM.lock    — { repo, ref, tarball_sha256, fetched_at }
//
// Exit codes:
//   0 — success (either already up-to-date or successfully bumped)
//   1 — fetch / verify / extract failure
//
// CI signals "did anything change?" by diffing UPSTREAM.lock in the workflow.

import { mkdir, rm, writeFile, readFile, stat } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const UPSTREAM_DIR = join(REPO_ROOT, 'upstream');
const LOCK_FILE = join(REPO_ROOT, 'UPSTREAM.lock');
const UPSTREAM_REPO = 'open-gsd/get-shit-done-redux';

const GITHUB_API = `https://api.github.com/repos/${UPSTREAM_REPO}/releases/latest`;
const UA = 'evolv-coder-lite-sync/1.0';

function ghHeaders() {
  const h = { 'User-Agent': UA, Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function readLock() {
  try {
    return JSON.parse(await readFile(LOCK_FILE, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function fetchLatestRelease() {
  const res = await fetch(GITHUB_API, { headers: ghHeaders() });
  if (!res.ok) {
    throw new Error(`GitHub releases API ${res.status}: ${await res.text()}`);
  }
  const release = await res.json();
  if (!release.tag_name) {
    throw new Error('Latest release has no tag_name');
  }
  return release;
}

async function downloadTarball(tag, dest) {
  const url = `https://codeload.github.com/${UPSTREAM_REPO}/tar.gz/refs/tags/${encodeURIComponent(tag)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`tarball download ${res.status}: ${url}`);
  }
  const hash = createHash('sha256');
  const out = createWriteStream(dest);
  await pipeline(
    res.body,
    async function* (src) {
      for await (const chunk of src) {
        hash.update(chunk);
        yield chunk;
      }
    },
    out,
  );
  return hash.digest('hex');
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...opts });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`));
    });
  });
}

async function extractTarball(tarPath, destDir) {
  // GitHub tarballs nest everything inside <repo>-<tag>/. --strip-components=1 unwraps.
  await mkdir(destDir, { recursive: true });
  await run('tar', ['-xzf', tarPath, '--strip-components=1', '-C', destDir]);
}

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function main() {
  const lock = await readLock();
  const release = await fetchLatestRelease();
  const tag = release.tag_name;

  if (lock && lock.ref === tag && (await exists(UPSTREAM_DIR))) {
    console.log(`upstream already at ${tag} — nothing to do`);
    return;
  }

  console.log(`syncing upstream to ${UPSTREAM_REPO}@${tag} (was: ${lock?.ref ?? 'none'})`);

  const tmpTar = join(tmpdir(), `gsd-redux-${tag.replace(/[^\w.-]/g, '_')}-${Date.now()}.tar.gz`);
  let sha;
  try {
    sha = await downloadTarball(tag, tmpTar);
    if (await exists(UPSTREAM_DIR)) {
      await rm(UPSTREAM_DIR, { recursive: true, force: true });
    }
    await extractTarball(tmpTar, UPSTREAM_DIR);
  } finally {
    await rm(tmpTar, { force: true });
  }

  const newLock = {
    repo: UPSTREAM_REPO,
    ref: tag,
    name: release.name ?? tag,
    published_at: release.published_at ?? null,
    tarball_sha256: sha,
    fetched_at: new Date().toISOString(),
  };
  await writeFile(LOCK_FILE, JSON.stringify(newLock, null, 2) + '\n');
  console.log(`upstream/ now at ${tag} (sha256 ${sha.slice(0, 12)}…)`);
}

main().catch((err) => {
  console.error('sync-upstream failed:', err.message);
  process.exitCode = 1;
});
