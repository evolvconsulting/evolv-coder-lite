# 🚀 evolv Coder Lite (eCL) v1.5.0

A big reliability-and-capabilities release: optional features are now toggleable
**Capabilities**, planning/verification gates are stricter and harder to fool, and
there's a long list of runtime and state-handling fixes.

> Full per-item notes are on the GitHub Release page for **v1.5.0**.

## Install / Upgrade

```bash
# New install OR upgrade — the installer is idempotent, just re-run it
npx @evolvconsulting/evolv-coder-lite@latest
```

- The installer prompts for your runtime (Claude Code, Codex, Cursor, OpenCode,
  Gemini CLI, Windsurf, Kilo, Copilot, and more) and global vs. local install.
- **Slim installs:** `--profile=core` (six core-loop skills),
  `--profile=standard` (core + phase management), or default full. Profiles
  compose, e.g. `--profile=core,audit`.
- **After upgrading, restart your runtime** so new commands/skills are picked up.
- **Codex users:** minimum supported CLI is **0.130.0**.

## ✨ Highlights

- **Capabilities system** — optional planning/review features are now first-class,
  toggleable Capabilities instead of baked-in workflow branches. Turn them on/off
  and gate their hooks from one command:
  `ecl-tools capability set <id> --on|--off [--gate <key>=true|false]`.
  Enable/disable skill clusters at runtime with `/ecl:surface` (no reinstall).
- **Plan-review convergence on `/ecl-progress`** — `--next --auto --converge` now
  routes planning through review convergence (previously only on
  `/ecl-autonomous`). Supports `--cross-ai`, reviewer flags, and `--max-cycles N`.
- **`ecl-tools drift-guard`** — deterministic plan-drift severity/authority
  decisions (5-rung authority ladder, hard-block on high-confidence drift)
  instead of re-deriving rules each run.
- **MemPalace memory capability** (opt-in).
- **Async external jobs** can now legally pause an Execute step and resume later
  (`external_job_waiting`).
- **Business Context section** in the PROJECT.md template (optional four-field
  block for monetized/customer-facing projects).
- **Kimi CLI runtime support** — documented and installable.
- **Agent-teams awareness** — `ecl-tools query teams-status` plus a plan-phase
  warning detect Claude Code experimental agent-teams (which can stall
  multi-agent runs).
- **`agent_skills`** can now reference plugin-provided skills on Claude Code.

## 🛡️ Stronger gates & verification

- The **planner now blocks plans that would self-trip their own verify gate**.
- **`/ecl-progress` no longer marks a phase complete** (or auto-advances) when
  verification ended in `human_needed` or `gaps_found`.
- **Verifier is stricter** — no longer marks behavior-dependent requirements
  "VERIFIED" on symbol presence alone, and actually runs its probes.
- **Test-tier prohibitions** are now a real, machine-proven gate (proven
  fail-first), not a permanent unsatisfiable state.
- **Read-only verifier/auditor agents** ship a write-tool deny-list on Claude
  Code, so they can't make edits even if a tool grant is inherited.
- **`/ecl-code-review`** structural pre-pass now actually runs and delivers
  findings.

## 🔧 Reliability & correctness fixes

- **Planning agents always spawn** — top-level `/ecl-plan-phase` reliably
  launches the researcher/planner/plan-checker (no silent inline collapse);
  plan/execute/autonomous no longer mis-carry a forked context.
- **Skill discovery** — Claude global installs use a flat layout so all skills are
  discoverable; namespace routers nest their sub-skills on runtimes with
  non-recursive loaders.
- **STATE.md handling** — phase status advances correctly for pipe-table and
  prose STATE files, frontmatter fields (current phase/plan/progress) are
  preserved, and no more duplicate Session blocks.
- **CLAUDE.md generation** no longer clobbers a hand-crafted file; Claude output
  defaults to `./.claude/CLAUDE.md`.
- **Profiles** — `write-profile` writes `USER-PROFILE.md` to your active runtime's
  config home (not always `~/.claude`).
- **Worktrees** — executor-authored cleanup for parallel runs,
  `worktree.baseRef:"head"` is honored, and the path guard no longer blocks
  writes in unrelated git worktrees.
- **Runtime install fixes** — Codex (correct `hooks.json` shape, no duplicate
  skills in autocomplete), Cursor (no leftover bare `~/.claude` paths),
  Windsurf/Devin (`.devin/skills/`), Antigravity (`.agents/`); the launcher shim
  now probes all runtime homes before erroring.
- **Robustness** — `ecl-tools` resolves on shim-only installs and no longer
  crashes on a fresh install; the installer no longer appends a duplicate managed
  hook.

---

_Questions? Ping the eCL maintainers._
