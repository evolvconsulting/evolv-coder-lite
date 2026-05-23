#!/usr/bin/env node
// scripts/check-upstream-release.mjs
//
// Cheap poll: ask GitHub for the latest open-gsd/get-shit-done-redux
// release tag and compare to UPSTREAM.lock.ref. Prints JSON to stdout
// and writes step outputs when running under GitHub Actions.
//
// Exits 0 in both cases (no-new and new). Non-zero only on API/IO failure.
//
// Output (stdout, single-line JSON):
//   { "newRelease": true|false, "currentRef": "...", "latestRef": "...", "publishedAt": "..." }
//
// When $GITHUB_OUTPUT is set, also writes:
//   new_release=true|false
//   current_ref=<tag>
//   latest_ref=<tag>
//   published_at=<iso>
//   release_name=<name>

import { readFile, appendFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');
const LOCK_FILE = join(REPO, 'UPSTREAM.lock');
const UPSTREAM_REPO = 'open-gsd/get-shit-done-redux';
const UA = 'evolv-coder-lite-release-poll/1.0';

function ghHeaders() {
  const h = { 'User-Agent': UA, Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function main() {
  const lock = JSON.parse(await readFile(LOCK_FILE, 'utf8'));
  const res = await fetch(`https://api.github.com/repos/${UPSTREAM_REPO}/releases/latest`, { headers: ghHeaders() });
  if (!res.ok) {
    throw new Error(`GitHub releases API ${res.status}: ${await res.text()}`);
  }
  const release = await res.json();
  const latestRef = release.tag_name;
  const newRelease = latestRef !== lock.ref;

  const summary = {
    newRelease,
    currentRef: lock.ref,
    latestRef,
    publishedAt: release.published_at ?? null,
    releaseName: release.name ?? null,
  };
  console.log(JSON.stringify(summary));

  if (process.env.GITHUB_OUTPUT) {
    const lines = [
      `new_release=${newRelease}`,
      `current_ref=${lock.ref}`,
      `latest_ref=${latestRef}`,
      `published_at=${release.published_at ?? ''}`,
      `release_name=${(release.name ?? '').replace(/\n/g, ' ')}`,
    ].join('\n') + '\n';
    await appendFile(process.env.GITHUB_OUTPUT, lines);
  }
}

main().catch((err) => {
  console.error('check-upstream-release failed:', err.message);
  process.exitCode = 1;
});
