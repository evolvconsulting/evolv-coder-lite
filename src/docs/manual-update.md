# Manual Update (Non-npm Install)

Use this procedure when `npx @evolvconsulting/evolv-coder-lite@latest` is unavailable — e.g. during a publish outage or if you are working directly from the source repo.

## Prerequisites

- Node.js installed
- This repo cloned locally (`git clone https://github.com/evolvconsulting/evolv-coder-lite`)

## Steps

```bash
# 1. Pull latest code
git pull --rebase origin main

# 2. Build the hooks dist (required — hooks/dist/ is generated, not checked in as source)
node scripts/build-hooks.js

# 3. Run the installer directly
node bin/install.js --claude --global

# 4. Clear the update cache so the statusline indicator resets
rm -f ~/.cache/ecl/ecl-update-check.json
```

**Step 5 — Restart your runtime** to pick up the new commands and agents.

## Runtime flags

Replace `--claude` with the flag for your runtime:

| Runtime | Flag |
|---|---|
| Claude Code | `--claude` |
| Gemini CLI | `--gemini` |
| OpenCode | `--opencode` |
| Kilo | `--kilo` |
| Codex | `--codex` |
| Copilot | `--copilot` |
| Cursor | `--cursor` |
| Windsurf | `--windsurf` |
| Augment | `--augment` |
| All runtimes | `--all` |

Use `--local` instead of `--global` for a project-scoped install.

## What the installer replaces

The installer performs a clean wipe-and-replace of eCL-managed directories only:

- `~/.claude/evolv-coder-lite/` — workflows, references, templates
- `~/.claude/commands/ecl/` — slash commands
- `~/.claude/agents/ecl-*.md` — eCL agents
- `~/.claude/hooks/dist/` — compiled hooks

**What is preserved:**
- Custom agents not prefixed with `ecl-`
- Custom commands outside `commands/ecl/`
- Your `CLAUDE.md` files
- Custom hooks

Locally modified eCL files are automatically backed up to `ecl-local-patches/` before the install. Run `/ecl-update --reapply` after updating to merge your modifications back in.
