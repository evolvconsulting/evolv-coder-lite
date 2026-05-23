# Known issues

Things that work but need attention before publishing.

## Logo placeholder is too small

`overlay/files/assets/ecl-logo-2000.png` and `-transparent.png` are
currently the 131×39 logo from https://evolv.consulting (the only image
exposed publicly on the marketing site). Upstream ships these at
2000×2000.

Impact: when consumers of the package render the logo at its expected
size, they'll see severe upscaling artifacts.

There are no SVG variants in the placeholder set. Upstream ships SVGs
at the same paths; until evolv SVGs are dropped into
`overlay/files/assets/`, `src/assets/ecl-logo-*.svg` will contain the
upstream GSD vector under the eCL filename.

**Action**: Source proper evolv logos from your design team:
- `ecl-logo-2000.png` (≥2000×2000, opaque background)
- `ecl-logo-2000.svg` (vector, opaque)
- `ecl-logo-2000-transparent.png` (≥2000×2000, alpha)
- `ecl-logo-2000-transparent.svg` (vector, transparent)

Drop them at `overlay/files/assets/` (those exact filenames). Then
`npm run build` and commit the regenerated `src/assets/`.

## NPM token was shared in plaintext

The token `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` was pasted into a
session transcript on 2026-05-23. Treat as compromised. Revoke at
https://www.npmjs.com/settings/~/tokens and replace via:

```sh
gh secret set NPM_TOKEN --repo evolvconsulting/evolv-coder-lite
# (paste new token at the prompt; never put it in a file)
```

## Daily-sync bot needs write access to dev

The default `GITHUB_TOKEN` in Actions can push branches and open PRs
without extra config. For the auto-merge dev→main flow, the bot needs
either:

1. A `MERGE_TOKEN` secret containing a fine-grained PAT with
   "Pull requests: write" + "Contents: write" on this repo, OR
2. A repository ruleset bypass entry for `github-actions[bot]`.

Option 2 is cleaner; configure it in Settings → Rules → Rulesets after
the initial setup.
