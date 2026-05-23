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

## Out of scope (follow-ups)

- Bedrock-backed lifecycle simulation (model calls).
- Multi-runtime install matrix (only `--claude` is exercised).
- CI integration — currently a local-only harness.
