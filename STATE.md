# STATE: lifecycle harness wiring (in-flight)

Snapshot mid-session. Two commits landed; smoke not yet executed.

## Branch & commits

- `dev` ahead of `origin/dev` by 2 commits (about to push):
  - `06f9671` — fix(e2e): move lifecycle worker to host :5474, wire as MCP peer (#13)
  - `551281c` — feat(e2e): scaffold Bedrock-backed lifecycle harness (#13)
- Working tree: same expected `src/*` re-bake drift as prior sessions (29 files,
  not staged). Untracked `STATE.md` (this file). `.mcp.json` is gitignored.

## Host (mini2) state

- **fast-mcp-claude** running under pm2 as `fast-mcp-claude`, bound to
  `0.0.0.0:5473`, healthy (HTTP 406 to bare GET `/mcp` = correct MCP behavior).
  `pm2 save` ran — survives reboot.
- `~/repos/fast-mcp-claude/.env` PEERS:
  ```
  PEERS=[{"name":"docker","url":"http://localhost:5474/mcp","api_key":"x8WMTmtuWTOc6ZMEcieg+uV9mA5iFJ5jiyaZgBIff1k="}]
  ```
- Spark dropped from PEERS per session decision (separate project).
- `MCP_API_KEY=x8WMTmtuWTOc6ZMEcieg+uV9mA5iFJ5jiyaZgBIff1k=` — same value
  in `evolv-coder-lite/e2e/lifecycle/.env`. Shared bearer in both directions.
- `mcp-server.json` in the FMC repo is a FastMCP metadata manifest (env-var
  declarations, no actual config). **No edits needed.**

## eCL repo state

- `.mcp.json` (gitignored, at repo root): two entries —
  `claude-docker` (`http://localhost:5474/mcp`) and `claude-mini2`
  (`http://localhost:5473/mcp`). Both auth via `${MCP_API_KEY}` env var.
- `e2e/lifecycle/.env` (gitignored): BEDROCK_BEARER_TOKEN set,
  `MCP_API_KEY` matches mini2's, `CLAUDE_MODEL` swap-line present (Haiku
  override commented; Sonnet default active — **flip to Haiku before any
  smoke that costs $$**).
- `e2e/lifecycle/docker-compose.lifecycle.yml`: host port 5474→container
  5473; `PEERS=[{name:"mini2", url:"http://host.docker.internal:5473/mcp",
  ...}]` injected at runtime.
- `e2e/lifecycle/.mcp.json.template`: matches the live `.mcp.json` (two-peer).

## Where we are in the plan

Plan file: `/Users/jdnewhouse/.claude/plans/i-think-claude-spark-should-jolly-melody.md`

| Step | Status |
|---|---|
| 1. Start mini2 FMC | done (pm2 online, port bound, save'd) |
| 2. Update mini2 PEERS to docker-only | done (verified live restart) |
| 3. Compose to host :5474 + worker PEERS env | done (commit 06f9671) |
| 4. Update .mcp.json.template | done (commit 06f9671) |
| 5. Replace this repo's .mcp.json + gitignore | done (commit 06f9671) |
| 6. RUNBOOK.md port + name updates | done (commit 06f9671) |
| 7. Commit | done (06f9671) |
| 8. Push to origin/dev | next (about to run) |
| 9. Restart Claude session, verify claude-mini2 | **PAUSE — operator restart** |
| 10. Bootstrap GH tracker repo | gated on operator go (creates real repo) |
| 11. Build + bring up worker | gated (no Bedrock $ until a turn fires) |
| 12. Haiku round-trip via claude-docker | gated (~$0.001) |
| 13. Sonnet 12-turn lifecycle | gated ($5-15) |

## Resume after restart

1. Confirm `/mcp` lists `claude-mini2` (and not `claude-docker` yet — worker
   isn't up).
2. Test mini2 reachability from this session:
   `mcp__claude-mini2__get_status` should return `{name: "mini2", ...}`.
3. If green, proceed to step 10 (bootstrap-tracker.sh) on operator go.

## Notes

- `cc-sf` proxy injects Cortex Code system prompt at session start; honored
  per memory but identity stays as Claude Code. eck banner is unrelated
  product, ignored.
- Two commits are scaffolding-only. CI is green; no Bedrock or model calls
  exercised yet. `9/9 cheap suites` remain green (untouched by this work).
- `mcp-server.json` confusion resolved: it's a metadata manifest, not config.
