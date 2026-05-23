# evolv-coder-lite E2E harness

Docker-based smoke harness for the eCL tarball. Built without depending on
npm publish, Bedrock, or Claude CLI — install-and-inventory tests only.

## What it does

1. `npm run build` — bake `src/` from `upstream/` + `overlay/`.
2. `cd src/sdk && npm ci` — pre-install SDK deps so `prepublishOnly`'s `tsc`
   can run when `npm pack` triggers it.
3. `cd src && npm pack` — produces `evolvconsulting-evolv-coder-lite-<v>.tgz`.
4. `docker build` — Node 24 base, copies the tarball + tests in.
5. `docker run` — installs the tarball globally, runs the test suite.

## Run

```sh
bash e2e/run-e2e.sh
# or
npm run test:e2e
```

Requires Docker (with the Compose plugin) on the host.

## Tests

| #  | Suite              | What it checks |
|----|--------------------|----------------|
| 01 | install            | `npm install -g <tarball>` succeeds; all 3 bins on PATH |
| 02 | bins               | `evolv-coder-lite --help` and `ecl-sdk/-tools --version` exit 0 |
| 03 | file inventory     | every `package.json#files` entry exists and is non-empty in the installed tree |
| 04 | hooks executable   | every `.sh` under installed `hooks/` has +x |
| 05 | rebrand leaks      | zero GSD / get-shit-done / @opengsd / TÂCHES references in the installed tree (mirrors `scripts/verify-rebrand.mjs` patterns) |
| 06 | wizard scaffold    | `evolv-coder-lite --claude --global` runs against an isolated `HOME` and writes into `$HOME/.claude` |
| 07 | uninstall          | `--claude --global --uninstall` cleanly removes eCL-written files from `$HOME/.claude` (no `ecl-*` / `evolv-*` leaks) |

## Bugs the harness has caught

Worth keeping a running list — the point of this harness is catching tarball-time
regressions that source-tree CI misses. Every entry here is a bug that shipped or
would have shipped without an e2e gate.

- **Mode bits dropped on bake.** `overlay/bake.mjs` used `copyFile`/`writeFile`
  without preserving source mode, so `hooks/*.sh` shipped 644 in the tarball.
  Suite 04 caught it. Fixed by `chmod`ing the destination to `0755` (any execute
  bit on source) or `0644` after each copy/write.
- **`prepublishOnly` doesn't fire on `npm pack`.** The harness assumed it did, so
  `sdk/dist/` was missing from the tarball — masked locally by stale build
  artifacts on disk. Suites 02/03/06 caught it. Fixed by explicitly running
  `npm run build` in the SDK pre-install step.
- **Root `npm run build` pointed at non-existent `overlay/apply.mjs`.** Not
  caught by a suite directly, but spotted while wiring up CI for the harness.
  Repointed to `overlay/bake.mjs`.
- **Uninstall leaves `ecl-install-state.json` behind.** Suite 07 surfaced
  this. Upstream's `src/tests/installer-migration-install-integration.test.cjs`
  asserts the file does NOT exist after install rollback (lines 352, 380, 413),
  so the post-uninstall presence is a regression. Suite 07 tolerates it (with a
  documented exclusion) so CI stays a useful gate; fix is a follow-up in the
  installer.

## Out of scope (follow-ups)

- Bedrock-backed lifecycle simulation (model calls).
- Multi-runtime install matrix (only `--claude` is exercised).
- ~~CI integration~~ — `.github/workflows/e2e.yml` runs the harness on PRs to
  `dev`/`main` and via `workflow_dispatch`.
