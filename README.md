# evolv Coder Lite (eCL)

evolv-branded distribution of [GSD Redux](https://github.com/open-gsd/get-shit-done-redux),
kept in sync with upstream daily. Functionally identical to upstream — only
branding (name, banner, slash-command prefix) differs.

## Repository layout

| Path | Purpose |
| --- | --- |
| `upstream/` | Vendored copy of GSD Redux at the tag pinned in `UPSTREAM.lock`. Read-only by convention. |
| `overlay/` | The rebrand: string-replacement rules + full-file overrides + the transform script (`apply.mjs`). |
| `dist/` | Generated output. Git-ignored. This is what end users would consume. |
| `scripts/sync-upstream.mjs` | Fetches the latest GSD Redux release into `upstream/`, updates `UPSTREAM.lock`. |
| `scripts/verify-rebrand.mjs` | Asserts no upstream branding leaked into `dist/`. |
| `.github/workflows/daily-sync.yml` | Cron: sync → build → verify → open PR. |

## Build locally

```sh
npm run sync     # populate upstream/ from latest GSD Redux release
npm run build    # apply overlay → dist/
npm run verify   # check dist/ for branding leaks
```

`npm run all` chains the three.

## How updates work

A scheduled GitHub Action runs daily. If GSD Redux has a new release:
1. `upstream/` is bumped to that tag.
2. `dist/` is regenerated.
3. Verification runs.
4. A PR is opened with upstream's release notes and a rebrand-manifest diff.

PRs are **not auto-merged**. A human reviewer is the safety net against
upstream surprises (renamed files, new branded strings, layout changes).

## Why a thin overlay?

Upstream GSD Redux ships a feature-complete spec-driven development system
under MIT. eCL exists to present an evolv-branded experience without
duplicating upstream effort. A vendored-copy + rebrand-overlay design keeps
daily merges conflict-free and makes every transformation auditable in
`overlay/replacements.json` and `overlay/files/`.

## License & attribution

MIT. See `LICENSE` and `NOTICE`.
