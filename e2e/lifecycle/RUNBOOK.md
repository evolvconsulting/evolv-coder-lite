# Lifecycle E2E runbook (issue #13)

The 12 turns the operator runs interactively against a Bedrock-backed
worker container. **Real Bedrock dollars per turn** — Sonnet 4.6 at
~$5–15 for a full run. Use a Haiku smoke (`CLAUDE_MODEL=us.anthropic.claude-haiku-4-5-20251001`)
for first-boot validation before spending Sonnet money.

## What this is

The kit's `e2e/lifecycle/` runs a 12-turn FastAPI-proxied lifecycle in CI
behind a feature flag. eCL deliberately diverges:

- **No FastAPI proxy.** [`fast-mcp-claude`](https://github.com/jeremy-newhouse/fast-mcp-claude)
  is the proxy — a peer-to-peer MCP server bridging the worker (in-container
  `claude /worker`) and the controller (your local Claude Code session).
- **No CI.** This is interactive. The cheap suites (01-09) cover CI; the
  lifecycle is a manual smoke for design-level changes you can't see in
  install-and-inventory tests.
- **Phase-and-milestone, not feature.** The kit is feature-driven; eCL is
  organized around phases and milestones. Turn-mapping below preserves the
  *intent* of each kit turn against the closest eCL skill.

## Prerequisites (one-time)

1. **Bedrock access** with Sonnet 4.6 provisioned in your account. Region
   default `us-west-2` (override in `.env`).
2. **`gh auth status`** with `repo` scope — needed by the host-side
   tracker bootstrap.
3. **Docker** with the Compose plugin (same as cheap suites).
4. **`uv`** is NOT required on the host — the worker container has its own.

## Setup (per session)

```bash
cd ~/repos/evolv-coder-lite

# 1. Configure secrets and pins.
cp e2e/lifecycle/.env.example e2e/lifecycle/.env
$EDITOR e2e/lifecycle/.env
# Set BEDROCK_BEARER_TOKEN, MCP_API_KEY (openssl rand -hex 32),
# optionally swap CLAUDE_MODEL to Haiku for first-boot.

# 2. Bake src/ if you've changed upstream/ or overlay/.
node overlay/bake.mjs

# 3. Bootstrap the tracker repo on the host.
bash e2e/lifecycle/bootstrap-tracker.sh
# Idempotent: skips create if evolvconsulting/ecl-e2e-weather-app
# already exists. Use --reset to wipe and reseed.

# 4. Bring up the worker container (detached).
bash e2e/run-e2e.sh --lifecycle

# 5. Wire up the controller. In a SEPARATE shell, on a SEPARATE eCL repo
#    (or a worktree of this one — your choice; the controller doesn't have
#    to live in this repo):
cp e2e/lifecycle/.mcp.json.template <controller-repo>/.mcp.json
export MCP_API_KEY=<same value as in e2e/lifecycle/.env>
cd <controller-repo>
claude
# Inside that session, verify the bridge:
#   /mcp                       # confirms claude-worker is listed
#   "What tools do you have for the worker?"
```

## The 12 turns

Each turn below has:

- **Skill** — what the operator asks the worker to run.
- **Controller prompt** — the natural-language instruction the operator
  gives their *local* Claude Code session. The local Claude calls
  `claude-worker:send_prompt` with the body, then `wait_for_completion`.
- **Pre-turn setup** — one-shot harness state changes the operator (or
  Claude on the controller side) does *before* sending the prompt.
- **Expected outcome** — what should be true on the worker side after
  `reply` lands.

> **Permission relay:** if you've enabled the optional `PreToolUse` hook
> on the worker (see `fast-mcp-claude/.claude/settings.example.json`),
> tool calls during the worker's reply pause for controller approval via
> `claude-worker:pending_approvals` / `approve_tool`. For first runs,
> leave the hook off and let the worker auto-approve via its own
> `--dangerously-skip-permissions` setting.

### Turn 1 — new-project

| | |
|---|---|
| **Skill** | `/ecl:new-project` |
| **Pre-turn** | None (the tracker repo's `dev` branch is the empty starting state). |
| **Controller prompt** | `Run /ecl:new-project for "Weather App". Use the FRD already at docs/wa-1-weather-lookup/FRD.md as the source of truth — don't ask me for project description.` |
| **Expected** | `PROJECT.md`, `project-constitution.md`, `project-constants.md` exist on the worker's `dev` branch. Tech stack picked (Node + Express, per FRD AC-01/02). |

### Turn 2 — start-project (phase 1 lock)

| | |
|---|---|
| **Skill** | `/ecl:discuss-phase 1 --auto` |
| **Pre-turn** | None. |
| **Controller prompt** | `Run /ecl:discuss-phase 1 --auto. Lock the tech-stack and AC scope for phase 1 based on the FRD AC-01..AC-05.` |
| **Expected** | A discussion artifact under `docs/phases/phase-1/` with explicit AC mappings; no source code yet. |

### Turn 3 — create-feature → milestone

| | |
|---|---|
| **Skill** | `/ecl:new-milestone "Weather Lookup"` |
| **Pre-turn** | None. |
| **Controller prompt** | `Run /ecl:new-milestone "Weather Lookup" — this is the v1.0 milestone covering AC-01..AC-05.` |
| **Expected** | Milestone scaffolding under `docs/milestones/v1.0-weather-lookup/`; backlog entries link to AC-01..AC-05. |

### Turn 4 — spec (research mode)

| | |
|---|---|
| **Skill** | `/ecl:plan-phase 1 --research` |
| **Pre-turn** | The FRD is already at `docs/wa-1-weather-lookup/FRD.md` (seeded by `bootstrap-tracker.sh`). If you reset the tracker repo, re-run bootstrap. |
| **Controller prompt** | `Run /ecl:plan-phase 1 --research. Pull AC-01..AC-05 from the FRD and produce REQUIREMENTS.md plus the research notes the design phase will consume.` |
| **Expected** | `docs/phases/phase-1/REQUIREMENTS.md` populated; research artifacts under the same dir. |

### Turn 5 — design

| | |
|---|---|
| **Skill** | `/ecl:plan-phase 1` |
| **Pre-turn** | None — turn 4's REQUIREMENTS.md is the input. |
| **Controller prompt** | `Run /ecl:plan-phase 1 (no --research this time). Produce the design and verify the plan is internally consistent.` |
| **Expected** | `docs/phases/phase-1/PLAN.md` (or whatever the skill names it); ADRs if the skill produces them. |

### Turn 6 — develop

| | |
|---|---|
| **Skill** | `/ecl:execute-phase 1` |
| **Pre-turn** | None. |
| **Controller prompt** | `Run /ecl:execute-phase 1. Use wave-based parallel execution. Implement AC-01..AC-05 against the plan from turn 5.` |
| **Expected** | `src/`, `package.json`, `test/` populated. `npm test` passes inside the worker container. THIS IS THE LONGEST TURN — expect 5-15 minutes. |

### Turn 7 — code review

| | |
|---|---|
| **Skill** | `/ecl:code-review 1` |
| **Pre-turn** | None — uses the diff produced by turn 6. |
| **Controller prompt** | `Run /ecl:code-review 1. Review what /ecl:execute-phase 1 just produced.` |
| **Expected** | A review artifact (skill-determined location); zero P0 issues if turn 6 was clean. |

### Turn 8 — audit-uat

| | |
|---|---|
| **Skill** | `/ecl:audit-uat` |
| **Pre-turn** | None. |
| **Controller prompt** | `Run /ecl:audit-uat. Cross-phase UAT audit — confirm the implementation actually meets AC-01..AC-05 from the FRD, not just the local plan.` |
| **Expected** | An audit artifact identifying any AC drift between FRD and implementation. Should be near-zero for this canonical run. |

### Turn 9 — validate (the key turn)

| | |
|---|---|
| **Skill** | `/ecl:validate-phase 1` |
| **Pre-turn** | None. |
| **Controller prompt** | `Run /ecl:validate-phase 1. Audit Nyquist coverage of AC-01..AC-05; if anything is undertested, fill the gap and re-run.` |
| **Expected** | Coverage report exists; any gaps identified by the skill are filled in the same turn or queued explicitly. This is the keystone turn — if any earlier turn drifted, it surfaces here. |

### Turn 10 — UAT pass

| | |
|---|---|
| **Skill** | `/ecl:verify-work 1` |
| **Pre-turn** | None. |
| **Controller prompt** | `Run /ecl:verify-work 1. Conversational UAT pass — walk through each AC and confirm the user-visible behavior matches.` |
| **Expected** | UAT-pass artifact; either green-lit or with explicit follow-ups. |

### Turn 11 — merge + complete-milestone

| | |
|---|---|
| **Skill** | `git merge --no-ff` then `/ecl:complete-milestone v1.0` |
| **Pre-turn** | The operator (or controller-Claude with operator approval) does the merge prep on the worker side — `git merge dev → main`, `git tag v1.0`. The kit's lifecycle has equivalent setup hooks; eCL's `/ecl:complete-milestone` does the milestone-level work but expects the merge already done. |
| **Controller prompt** | `On the worker: switch to main, fast-forward merge dev, tag v1.0, then run /ecl:complete-milestone v1.0.` |
| **Expected** | `main` updated; `v1.0` tag points at the merge commit; milestone artifacts moved to a "completed" state per the skill's convention. |

### Turn 12 — deploy

| | |
|---|---|
| **Skill** | `/ecl:ship 1` |
| **Pre-turn** | None. |
| **Controller prompt** | `Run /ecl:ship 1. Push the branch, open a PR (the tracker repo lives at evolvconsulting/ecl-e2e-weather-app), and track the merge.` |
| **Expected** | PR open at `evolvconsulting/ecl-e2e-weather-app`; commits visible on the remote. Operator can merge it themselves or have the controller drive `gh pr merge`. |

## What "passing" looks like

A successful run is **not** "all 12 turns returned without error." Look
for these signals:

1. **Turn 6 produces working code.** The worker should run `npm test`
   itself and report pass/fail; if the controller has to nudge it, that's
   a regression in `/ecl:execute-phase`.
2. **Turn 9's coverage report is materially produced.** Empty / placeholder
   output is a regression in `/ecl:validate-phase`.
3. **Turn 11's git operations succeed without `--force`.** Force-pushes
   here suggest a branching/state assumption broke.
4. **No turn drifts into "ask the operator a question that isn't an
   acceptance-criteria gap."** The skills should be confident enough in
   their inputs (FRD, REQUIREMENTS, PLAN) to make decisions; if a turn
   asks "should I use Express or Fastify?" then `discuss-phase` /
   `plan-phase` failed to lock that decision.

## Capturing results

After turn 12, capture for HANDOVER:

```bash
# From the worker side (inside the container, or via fast-mcp-claude file
# tools):
docker exec ecl-lifecycle-worker bash -c '
  cd /home/tester/ecl-e2e-weather-app
  echo "=== git log ==="
  git log --oneline --all -20
  echo "=== docs/ tree ==="
  find docs -type f | sort
  echo "=== test results ==="
  npm test 2>&1 | tail -30
'
```

Save the output as `e2e/lifecycle/runs/<date>-<model>.md`.

## Cost log

Track real spend per run. Append rows here after each lifecycle execution.

| Date | Model | Operator | Turns completed | Cost (USD, approx) | Notes |
|------|-------|----------|-----------------|--------------------|-------|
| _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |

## Cleanup

```bash
# Stop the worker (the EXIT trap in run-e2e.sh deliberately doesn't do this).
docker compose -f e2e/lifecycle/docker-compose.lifecycle.yml down

# Wipe the tracker repo (only if you want a fresh start; --reset is destructive).
bash e2e/lifecycle/bootstrap-tracker.sh --reset
```

## Troubleshooting

- **`/mcp` in the controller doesn't list `claude-worker`.** The controller's
  shell isn't exporting `MCP_API_KEY`, or the value doesn't match
  `e2e/lifecycle/.env`. Re-export and relaunch `claude`.
- **`send_prompt` returns 401 / 403.** Same as above — auth mismatch.
- **`claude /worker` exits immediately on container start.** Check
  `docker compose -f e2e/lifecycle/docker-compose.lifecycle.yml logs`. Most
  common cause: `BEDROCK_BEARER_TOKEN` is wrong/expired or the model isn't
  provisioned in your AWS region.
- **Turn 6 (`/ecl:execute-phase`) hangs.** This is the longest turn by
  design. If it's quiet for >15 minutes, look at the worker logs — it may
  be looping on `npm install` or hitting a Bedrock rate limit.
- **Permission prompts inside the worker.** If `--dangerously-skip-permissions`
  isn't set on the in-container `claude /worker` invocation, every tool
  call pauses. Either enable the fast-mcp-claude permission relay (see
  `fast-mcp-claude/.claude/settings.example.json`) or override the worker's
  CMD in `docker-compose.lifecycle.yml` to add the flag for first runs.
