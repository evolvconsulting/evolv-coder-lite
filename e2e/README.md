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
| 07 | uninstall          | `--claude --global --uninstall` cleanly removes eCL-written files from `$HOME/.claude` (no `ecl-*` / `evolv-*` leaks, including `ecl-install-state.json`) |
| 08 | multi-runtime      | wizard succeeds for every supported runtime flag (`--claude`/`--gemini`/`--codex`/`--copilot`/`--antigravity`/`--cursor`/`--windsurf`/`--augment`/`--trae`/`--qwen`/`--hermes`/`--cline`/`--codebuddy`/`--opencode`/`--kilo`) and `--all` populates multiple dirs |
| 09 | profile coverage   | `--profile=core` < `--profile=standard` < `--profile=full` (strict ascending skill counts); `--minimal` matches `--profile=core` |

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
  so the post-uninstall presence was a regression. Fixed downstream via
  `overlay/text-patches.mjs` (a small surgical post-bake patch on the
  baked `bin/install.js`) — the patch mirrors the existing manifest-removal
  block for the install-state file. Drop the patch entry once the equivalent
  fix lands upstream.
- **`--profile=standard` install fails: "Failed to install agents:
  directory is empty".** Suite 09 surfaced this. Root cause: upstream's
  `parseCallsAgents()` regex literal `/\bgsd-[a-z][a-z-]*/g` was not
  rewritten by the rebrand-map (the `\b` puts a word character `b` directly
  before `gsd`, so `id:gsd-dash`'s `/\bgsd-/` rule didn't match). With the
  prefix wrong, every skill resolved to zero agent references and the
  standard profile's filtered agents stage dir came up empty. `core` and
  `full` bypass that codepath via separate fast paths in `install.js`,
  which is why only `standard` failed. Fixed downstream via
  `overlay/text-patches.mjs` (entry `install-profiles-parse-calls-agents-prefix`)
  — surgical regex rewrite to `/\becl-[a-z][a-z-]*/g`. Suite 09 now
  asserts strict `core < standard < full` ordering.

## Lifecycle (interactive, #13)

The cheap suites above intentionally don't use Bedrock or the Claude CLI.
For end-to-end coverage of the eCL skill set against a real model, there's
a separate **interactive** harness under `e2e/lifecycle/`. It runs a
12-turn flow driven by your local Claude Code session as the controller
and a containerized `claude /worker` as the worker, bridged by
[`fast-mcp-claude`](https://github.com/jeremy-newhouse/fast-mcp-claude).

```bash
cp e2e/lifecycle/.env.example e2e/lifecycle/.env  # then fill in secrets
bash e2e/lifecycle/bootstrap-tracker.sh           # one-time tracker repo
bash e2e/run-e2e.sh --lifecycle                   # bring up the worker
# then follow e2e/lifecycle/RUNBOOK.md from a fresh `claude` session
```

This is **opt-in**, **not in CI**, and **costs real Bedrock dollars**
(~$5–15/run on Sonnet 4.6; cheaper on Haiku for first-boot smokes). See
`e2e/lifecycle/RUNBOOK.md` for the full turn-by-turn.

## Out of scope (follow-ups)

- ~~Bedrock-backed lifecycle simulation~~ — see `e2e/lifecycle/` (above).
- ~~CI integration~~ — `.github/workflows/e2e.yml` runs the cheap harness on
  PRs to `dev`/`main` and via `workflow_dispatch`. Uses GHA layer cache via
  `docker/build-push-action@v5` + `e2e/docker-compose.ci.yml` override.
- ~~Multi-runtime install matrix~~ — Suite 08 covers all 15 supported runtimes.
- ~~Profile flag coverage~~ — Suite 09 covers `--profile=core/standard/full`
  and `--minimal`.
