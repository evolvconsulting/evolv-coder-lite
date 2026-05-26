# Operating eCL

Day-to-day mechanics for maintaining evolv Coder Lite.

## Local pipeline

```sh
npm run sync     # fetch latest upstream release into upstream/
npm run build    # bake upstream/ → src/ (full regeneration; usually only run if rebrand rules changed)
npm run verify   # assert no branding leaks in src/
```

`npm run all` chains the three.

For incremental upstream updates (the normal path), use:

```sh
node scripts/sync-and-patch.mjs
```

This computes the upstream diff since `UPSTREAM.lock`, translates each
change through the rebrand map, applies the result to `src/` surgically,
and writes `SYNC-REPORT.md`.

## Tests

```sh
node scripts/smoke-rebrand-map.mjs    # exercises the rebrand map against the full upstream tree
node scripts/test-sync-synthetic.mjs  # synthetic OLD→NEW upstream; asserts patched src/ matches a fresh bake
```

Both are deterministic, hit no external services, and run in seconds.

## Daily GitHub Action

`.github/workflows/daily-sync.yml` runs `sync-and-patch.mjs` daily at
13:17 UTC and opens a PR titled `chore(sync): bump upstream to <tag>`
when upstream has a new release. PRs land on a branch named
`upstream-sync/<tag>` and are labeled `upstream-sync` and
`needs-review`. They are **never auto-merged** — branch protection
should require human approval.

`workflow_dispatch` is enabled for manual runs.

## Reviewing a daily-sync PR

The PR body is `SYNC-REPORT.md`. Pay attention to the **"Files needing
extra review"** section: those files' translated patches did not apply
cleanly and were overwritten with the rebranded NEW content wholesale.
The conflict almost always means one of:

1. Someone made an eCL-specific edit to `src/<file>`, and upstream also
   changed the same file. The fallback dropped the eCL edit. Re-apply
   it on the PR branch before merging.
2. The rebrand map needs a new rule. If a fallback has reason
   `no-patch` but the upstream change looks routine, inspect the file
   for a branded string the map missed.

For each modified file, both the diff against `main`'s `src/` and the
underlying upstream release notes (also in the report) tell you whether
the change is a feature, a bug fix, or a rename you need to mirror.

## Adding a rebrand rule

Edit `overlay/rebrand-map.mjs` (the `RULES` array). Order matters —
longer/more-specific patterns first.

After editing, validate:

```sh
node scripts/smoke-rebrand-map.mjs    # full-tree probe with hit counts
npm run build && npm run verify       # full re-bake; no leaks in src/
```

Then commit both `overlay/rebrand-map.mjs` and the regenerated `src/`
together. Re-baking changes thousands of files; reviewers should expect
that.

## Changing the upstream pin

Manually:

```sh
node scripts/sync-upstream.mjs    # always fetches "latest"; respects UPSTREAM.lock idempotency
```

To pin an older tag explicitly, edit `UPSTREAM.lock` (set `ref`) and
remove `upstream/`, then re-run sync. There is no flag for "fetch this
specific tag" yet — add one if it becomes a recurring need.

## Bumping eCL itself

eCL ships two versioned package.json files and they MUST move in lockstep:

- `src/package.json` — the parent `@evolvconsulting/evolv-coder-lite` package
- `src/sdk/package.json` — the SDK subpackage `@evolvconsulting/ecl-sdk`,
  invoked at runtime as the `ecl-sdk` shim

Upstream keeps both at the same version. The postinstall version-mismatch
detector compares parent `pkg.version` against `ecl-sdk --version` (which
reads `sdk/package.json`); if they drift, it prints a misleading "stale
SDK" warning on every clean install (issue #44 — present silently from
v1.1.1 through v1.1.5).

To cut a release:

1. Bump `version` in `overlay/package.patch.json` (parent).
2. Bump `version` in `overlay/sdk-package.patch.json` (SDK) to the SAME value.
3. Run `node overlay/bake.mjs` and verify `git status` shows only the
   expected files (the two `overlay/*.patch.json` you edited, plus the
   regenerated `src/package.json`, `src/sdk/package.json`, and
   `src/REBRAND-MANIFEST.json`, plus any source files you actually changed).
4. Commit, push to `dev`, wait for the `ci` workflow's `build-and-verify`
   job to go green. That job includes an "Assert parent and SDK package
   versions match" step that fails the build if you forgot step 2.
5. Publish from `src/` once `promote-dev-to-main` has merged to main.

The CI parity guard is a safety net, not a substitute for step 2 — a
red CI is faster than a red CI plus a panicked diagnosis.

## Patches (`overlay/text-patches.mjs`)

Text patches are surgical post-bake string replacements against files in
`src/`. Each patch has a brittle single-match anchor (`find`); if the
anchor doesn't match exactly once, the bake fails loudly. That
brittleness is intentional — it surfaces upstream drift the next time
we sync.

### Upstream-tracking schema

Every patch carries an `upstream: { status, detail }` object describing
how it relates to upstream:

| Status | Meaning | `detail` required? |
|---|---|---|
| `pending` | No upstream issue filed yet. | Optional |
| `submitted` | Upstream PR/issue open. | **Yes** — GitHub URL |
| `backport` | Fix landed upstream but not yet in our UPSTREAM.lock pin. | **Yes** — PR URL or commit ref |
| `denied` | Upstream rejected the change; we keep the patch. | **Yes** — URL or denial reason |
| `inappropriate` | eCL-specific; will never be submitted upstream. | **Yes** — classification tag |

Bake-time validation enforces the schema — if you forget the
`upstream` field or leave `detail` empty on a status that requires it,
`node overlay/bake.mjs` throws before writing anything.

### Classification rules for `inappropriate`

Use one of these `detail` tags:

- **`rebrand-artifact: <pattern>`** — upstream regex literal that the
  rebrand-map can't transform (e.g. `\bgsd-` preceded by `\b` literal).
- **`test-fixture-rebrand-adjustment`** — test threshold, sort order, or
  require-path adjustment caused by name-length expansion.
- **`brand: <what>`** — cosmetic rebrand (banner, color, link, README
  preamble, CI badge).
- **`release-tarball-smoke-prune: <what>`** — upstream feature pruned
  from eCL because it fires false positives on rebranded text.

### Retirement procedure

When you believe upstream has fixed an issue and the patch is no longer
needed:

1. **Delete the patch entry** from `overlay/text-patches.mjs`.
2. Run `node overlay/bake.mjs`.
3. **If the bake fails** with anchor-mismatch: upstream DID change the
   surrounding code (good). The patch is retired. Commit the deletion.
4. **If the bake succeeds** after deletion: upstream has NOT actually
   fixed it — the anchor still matches, meaning the old code is still
   there. Restore the patch entry (git checkout) and investigate.

This inversion makes deletions safe: you can only successfully retire a
patch when the underlying code it patches has actually changed.

### The daily-sync patch-status report

On every upstream-sync PR, the `daily-sync.yml` workflow appends a
patch-status table to `SYNC-REPORT.md` (which becomes the PR body).
The table:

- Summarizes all patches by status bucket (pending / submitted /
  backport / denied / inappropriate).
- For `submitted` / `backport` / `denied` patches with a parseable
  GitHub URL in `detail`: queries the GitHub API and reports current
  remote state (PR open / PR merged / issue closed / etc.).
- Gracefully degrades on API errors — never fails the workflow.

To run it locally:

```
node scripts/patch-status.mjs
```

Output is Markdown suitable for appending to a report or piping to a
pager.

## Files you can safely delete

None of these matter to the build:

- `SYNC-REPORT.md` — regenerated by every sync; gitignored
- `node_modules/` — gitignored

Everything else is load-bearing.
