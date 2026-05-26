#!/usr/bin/env node
// scripts/patch-status.mjs
//
// Read overlay/text-patches.mjs and emit a Markdown patch-status table to
// stdout. For patches with upstream.status in {submitted, backport, denied}
// and a parseable GitHub issue/PR URL in upstream.detail, query the GitHub
// API to enrich the row with current state (open/closed/merged).
//
// Designed to be appended to SYNC-REPORT.md by the daily-sync workflow:
//
//   node scripts/patch-status.mjs >> SYNC-REPORT.md
//
// Uses GITHUB_TOKEN (default workflow token has read access to public repos).
// Network failures are downgraded to "(api error: <status>)" rows — the report
// is informational, never fails the workflow.
//
// See OPERATING.md "Patches" for the upstream-tracking schema.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');
const UA = 'evolv-coder-lite-patch-status/1.0';

const { PATCHES } = await import(join(REPO, 'overlay/text-patches.mjs'));

const GH_URL_RE = /https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/(issues|pull)\/(\d+)/;

function parseGithubUrl(detail) {
  if (typeof detail !== 'string') return null;
  const m = detail.match(GH_URL_RE);
  if (!m) return null;
  return { owner: m[1], repo: m[2], kind: m[3], number: m[4] };
}

function ghHeaders() {
  const h = { 'User-Agent': UA, Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function fetchIssue({ owner, repo, number }) {
  // The /issues endpoint covers PRs too — for a PR, the response carries a
  // `pull_request` field that points at /pulls/<num> for merge state.
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${number}`, {
    headers: ghHeaders(),
  });
  if (!res.ok) {
    return { error: `api ${res.status}` };
  }
  const data = await res.json();
  let merged = null;
  if (data.pull_request) {
    const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${number}`, {
      headers: ghHeaders(),
    });
    if (prRes.ok) {
      const prData = await prRes.json();
      merged = prData.merged === true;
    }
  }
  return {
    state: data.state,
    isPr: Boolean(data.pull_request),
    merged,
    title: data.title,
    htmlUrl: data.html_url,
  };
}

function formatRemoteState(remote) {
  if (!remote) return 'no URL in detail';
  if (remote.error) return `(${remote.error})`;
  if (remote.isPr && remote.merged) return 'PR merged';
  if (remote.isPr && remote.state === 'closed') return 'PR closed (not merged)';
  if (remote.isPr) return 'PR open';
  if (remote.state === 'closed') return 'issue closed';
  return 'issue open';
}

function escapePipes(s) {
  return String(s).replace(/\|/g, '\\|');
}

async function main() {
  const rows = [];
  const buckets = { pending: 0, submitted: 0, backport: 0, denied: 0, inappropriate: 0 };

  for (const patch of PATCHES) {
    const status = patch.upstream && patch.upstream.status;
    if (status in buckets) buckets[status]++;

    if (status === 'submitted' || status === 'backport' || status === 'denied') {
      const parsed = parseGithubUrl(patch.upstream.detail);
      let remote = null;
      if (parsed) {
        try {
          remote = await fetchIssue(parsed);
        } catch (err) {
          remote = { error: `fetch failed: ${err.message}` };
        }
      }
      rows.push({
        id: patch.id,
        status,
        detail: patch.upstream.detail,
        remoteState: formatRemoteState(remote),
        url: parsed ? `https://github.com/${parsed.owner}/${parsed.repo}/${parsed.kind}/${parsed.number}` : null,
      });
    }
  }

  const total = PATCHES.length;
  const out = [];
  out.push('## Patch upstream-tracking status');
  out.push('');
  out.push(`Total patches: **${total}**`);
  out.push('');
  out.push('| Status | Count |');
  out.push('|---|---|');
  out.push(`| pending | ${buckets.pending} |`);
  out.push(`| submitted | ${buckets.submitted} |`);
  out.push(`| backport | ${buckets.backport} |`);
  out.push(`| denied | ${buckets.denied} |`);
  out.push(`| inappropriate | ${buckets.inappropriate} |`);
  out.push('');

  if (rows.length === 0) {
    out.push('_No `submitted` / `backport` / `denied` patches with parseable GitHub URLs to report._');
    out.push('');
  } else {
    out.push('### Submitted / backport / denied patches');
    out.push('');
    out.push('| Patch ID | Status | Remote state | Detail |');
    out.push('|---|---|---|---|');
    for (const row of rows) {
      const detailCell = row.url
        ? `[${escapePipes(row.detail)}](${row.url})`
        : escapePipes(row.detail);
      out.push(`| \`${escapePipes(row.id)}\` | ${row.status} | ${escapePipes(row.remoteState)} | ${detailCell} |`);
    }
    out.push('');
  }

  process.stdout.write(out.join('\n'));
}

main().catch((err) => {
  // Informational report — never fail the workflow.
  process.stderr.write(`patch-status: ${err.stack ?? err.message}\n`);
  process.stdout.write(`\n## Patch upstream-tracking status\n\n_(report generation failed: ${err.message})_\n\n`);
  process.exitCode = 0;
});
