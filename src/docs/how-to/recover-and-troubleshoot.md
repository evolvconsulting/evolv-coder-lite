# How to recover and troubleshoot

**Goal:** Identify and fix common problems — from lost context and corrupted state to installation failures and permission errors — using a conditional recipe structure.

**Prerequisites:** eCL Core is installed. For install problems specifically, see [Install on your runtime](install-on-your-runtime.md).

---

## Context and session problems

### If you have lost track of where you are

```bash
/ecl-progress
```

Reads all state files and tells you exactly where you are and what to do next.

To automatically advance to the correct next step:

```bash
/ecl-progress --next
```

### If you are starting a new session and need to restore context

```bash
/ecl-resume-work
```

Restores your full session context from the last handoff, including current phase, planning decisions, and where work stopped.

### If quality is dropping during a long session

Clear your context window between major commands:

```bash
/clear
```

Then restore state:

```bash
/ecl-resume-work
```

eCL is designed around fresh contexts. Every subagent already gets a clean 200k window. The main session degrades over time — clearing it and resuming is the correct remedy, not pushing on.

### If you want to save context before stopping

```bash
/ecl-pause-work
```

Creates `.planning/HANDOFF.json` with your current position. Add `--report` to also write a post-session summary to `.planning/reports/`:

```bash
/ecl-pause-work --report
```

---

## Planning integrity problems

### If `.planning/` integrity is uncertain

```bash
/ecl-health
```

Reports status across errors, warnings, and informational notes:

| Status | Meaning |
|--------|---------|
| `HEALTHY` | All expected artefacts present and well-formed |
| `DEGRADED` | Warnings that should be addressed but work can continue |
| `BROKEN` | Critical errors that will block execution |

Common auto-repairable issues (errors E004, E005; warnings W003, W008):

```bash
/ecl-health --repair
```

This recreates missing `STATE.md`, resets a corrupt `config.json` to defaults, and adds any missing configuration keys. It will not overwrite `PROJECT.md` or `ROADMAP.md`.

### If STATE.md references a phase that does not exist

This produces warning `W002`. Use the state CLI to diagnose and repair:

```bash
node "$HOME/.claude/evolv-coder-lite/bin/ecl-tools.cjs" state validate
```

Preview what a sync would change without writing:

```bash
node "$HOME/.claude/evolv-coder-lite/bin/ecl-tools.cjs" state sync --verify
```

Apply the sync:

```bash
node "$HOME/.claude/evolv-coder-lite/bin/ecl-tools.cjs" state sync
```

These commands reconstruct `STATE.md` from actual project state on disk. They replace manual `STATE.md` editing.

### If you see "Project already initialised"

`.planning/PROJECT.md` already exists. `/ecl-new-project` is a safety check. If you genuinely want to start over, delete the `.planning/` directory first:

```bash
rm -rf .planning/
```

Then re-run `/ecl-new-project`.

### If context-window utilisation is high

```bash
/ecl-health --context
```

Probes the context-window utilisation guard. Warns at 60 %, critical at 70 %. If you are above the warning threshold, run `/clear` followed by `/ecl-resume-work` before starting the next major command.

---

## Execution problems

### If an executor gets "Permission denied" on Bash commands

eCL's `ecl-executor` subagents need write-capable Bash access. Add the required patterns to `~/.claude/settings.json` under `permissions.allow`. At minimum:

```json
"Bash(git add:*)",
"Bash(git commit:*)",
"Bash(git merge:*)",
"Bash(git checkout:*)"
```

For stack-specific patterns (Rails, Python, Node, Rust), see the full table in `docs/USER-GUIDE.md` under "Executor Subagent Gets Permission denied".

Per-project alternative: add the same block to `.claude/settings.local.json` in your project root.

### If execution fails or produces stubs

Check whether the plan is too ambitious. Plans should have two or three tasks at most. If tasks are too large they exceed what a single context window can produce reliably. Re-plan the phase with smaller scope:

```bash
/ecl-plan-phase 1
```

For systematic diagnosis of what went wrong, see [Debug a failed execution](debug-a-failed-execution.md).

### If you see "FATAL: worktree base mismatch" or the exit-42 warning

This happens when your current branch is ahead of the repository's default branch (for example, an unmerged milestone or feature branch). Claude Code forks executor worktrees from `origin/HEAD`, not your `HEAD`, so plan files that exist only on your branch are absent inside the worktree.

Since the fix landed, eCL automatically degrades to sequential execution on the main working tree and prints a one-line warning — the phase will complete without any action from you. To restore parallel execution permanently, run:

```bash
node "$HOME/.claude/evolv-coder-lite/bin/ecl-tools.cjs" worktree set-baseref
```

For a full explanation and all available options, see [Fix the worktree base-mismatch (exit 42) error](fix-worktree-base-mismatch.md).

### If parallel execution causes build lock errors or pre-commit hook failures

This is caused by multiple agents triggering build tools simultaneously. eCL handles this automatically since v1.26. If you are on an older version, or still seeing contention, disable parallel execution:

```bash
/ecl-settings
```

Set `parallelization.enabled` to `false`.

### If a subagent appears to fail but commits were made

Check git log before concluding something broke:

```bash
git log --oneline -10
```

A known Claude Code classification bug can report failure while work succeeded. eCL's orchestrators spot-check actual output, but if you see a mismatch, the commits are the ground truth.

---

## Plan and phase problems

### If plans seem wrong or misaligned with your intent

Run `/ecl-discuss-phase N` before planning. Most plan quality issues come from assumptions that `CONTEXT.md` would have prevented:

```bash
/ecl-discuss-phase 1
```

To see what assumptions eCL is currently making without starting a full session:

```bash
/ecl-discuss-phase 3 --assumptions
```

### If you need to change something after execution

Do not re-run `/ecl-execute-phase`. Use `/ecl-quick` for targeted fixes:

```bash
/ecl-quick "Fix the login button not responding on mobile Safari"
```

Or use `/ecl-verify-work N` to systematically identify and fix issues through UAT.

### If a command appears frozen at "Spawning…"

Wait. eCL subagents run in a separate context window. Their work is invisible to the parent session while in progress. The liveness note on the spawn line confirms this is expected. Research and planning agents routinely take 1–5 minutes; verification agents can take longer on large phases.

Do not interrupt the session. Killing it discards in-progress subagent work.

If it has been more than 10 minutes, check whether the agent task still shows as active in the Claude Code sidebar.

---

## Workflow state problems

### If the workflow seems corrupted or state is inconsistent

```bash
/ecl-forensics
```

Or with a description:

```bash
/ecl-forensics "Phase 3 execution stalled after wave 1"
```

`/ecl-forensics` runs a post-mortem investigation: git history anomalies, artefact integrity, STATE.md consistency, uncommitted work, and orphaned worktrees. It writes a report to `.planning/forensics/` and surfaces recommended remediation steps. It is read-only and never modifies your project files.

### If you need to roll back a phase or plan

```bash
/ecl-undo --phase 03          # Roll back all commits for phase 3
/ecl-undo --plan 03-02        # Roll back commits for plan 02 of phase 3
/ecl-undo --last 5            # Pick interactively from the 5 most recent eCL commits
```

`/ecl-undo` checks dependent phases before reverting and always shows a confirmation gate.

---

## Install and update problems

### If eCL is not recognised after install

Restart your runtime. eCL installs slash commands into your runtime's command directory (for example `~/.claude/commands/ecl/`). Most runtimes discover new commands only at startup.

If the problem persists, verify the install:

```bash
npx @evolvconsulting/evolv-coder-lite@latest --claude --local
```

For runtime-specific install paths and troubleshooting, see [Install on your runtime](install-on-your-runtime.md).

### If an update overwrote your local changes

Since v1.17, the installer backs up locally modified files to `ecl-local-patches/`. Reapply your changes:

```bash
/ecl-update --reapply
```

### If you cannot update via npm

If `npx @evolvconsulting/evolv-coder-lite` fails due to npm outages or network restrictions, see `docs/manual-update.md` for a step-by-step manual update procedure that works without npm access.

For routine updates, see [Update eCL](update-ecl.md).

---

## Cost problems

### If model costs are too high

Switch to the budget profile:

```bash
/ecl-config --profile budget
```

Disable research and plan-check agents via settings if the domain is familiar:

```bash
/ecl-settings
```

Also audit which MCP servers are enabled. Every enabled MCP server injects its tool schema into every turn. Browser and platform-specific tools can cost 20k+ tokens each. Disable any that the current phase does not need in `.claude/settings.json`:

```json
{
  "disabledMcpjsonServers": ["playwright", "mac-tools"]
}
```

---

## Recovery quick reference

| Problem | Solution |
|---------|---------|
| Lost context or new session | `/ecl-resume-work` or `/ecl-progress` |
| Don't know what step is next | `/ecl-progress --next` |
| Phase went wrong | `/ecl-undo --phase NN`, then re-plan |
| Something broke | `/ecl-debug "description"` (add `--diagnose` for analysis without fixes) |
| STATE.md out of sync | `state validate` then `state sync` |
| `.planning/` integrity uncertain | `/ecl-health`, then `/ecl-health --repair` |
| Workflow state seems corrupted | `/ecl-forensics` |
| Quick targeted fix | `/ecl-quick` |
| Plan doesn't match your vision | `/ecl-discuss-phase N` then re-plan |
| Costs running high | `/ecl-config --profile budget` and `/ecl-settings` to toggle agents off |
| Update broke local changes | `/ecl-update --reapply` |
| Want session summary | `/ecl-pause-work --report` |
| Parallel execution build errors | Update eCL or set `parallelization.enabled: false` |
| Worktree base mismatch / exit 42 | Auto-degraded to sequential (no action needed); run `worktree set-baseref` to restore parallelism |

---

## Related

- [Debug a failed execution](debug-a-failed-execution.md)
- [Fix the worktree base-mismatch (exit 42) error](fix-worktree-base-mismatch.md)
- [Install on your runtime](install-on-your-runtime.md)
- [Commands](../COMMANDS.md)
- [docs index](../README.md)
