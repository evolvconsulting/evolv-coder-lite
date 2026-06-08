# How to install eCL Core on your runtime

Install eCL Core (`@evolvconsulting/evolv-coder-lite`) into the AI coding runtime you use every day. This guide gives you the standard installer path for each supported runtime, then covers the manual path for machines without Node.js.

**What you need:** Node.js 18+ and npm (or npx). If you do not have Node.js, jump to [Installing without Node.js](#installing-without-nodejs).

---

## Why the installer is required

eCL Core ships agent and command files in Claude Code's native frontmatter format. Each supported runtime expects a different schema, directory layout, and command-invocation syntax. The installer performs the necessary transformations — for example, converting tool lists and colour values for OpenCode, writing TOML agent entries for Codex, and rewriting every command body from hyphen form (`/ecl-update`) to colon form (`/ecl:update`) for Gemini CLI.

**Do not copy files from `agents/` or `commands/` directly.** Doing so bypasses the transformations and produces schema-validation errors or missing commands.

---

## Standard install

Run the installer from any directory. It prompts for your runtime and whether to install globally (all projects) or locally (this project only).

```bash
npx @evolvconsulting/evolv-coder-lite@latest
```

That is the only command you need for a fresh install or to re-run the installer after switching runtimes.

---

## Per-runtime instructions

### Claude Code

```bash
npx @evolvconsulting/evolv-coder-lite@latest --claude --global
```

Skills land in `~/.claude/`. Commands appear as `/ecl-*` slash commands in your next Claude Code session. Restart Claude Code to pick them up.

**Override the install directory:**

```bash
CLAUDE_CONFIG_DIR=~/.claude-alt npx @evolvconsulting/evolv-coder-lite@latest --claude --global
```

**Hook coverage**

eCL registers the following Claude Code hook events automatically on install:

| Event | Hook | Purpose |
|---|---|---|
| `SessionStart` | `ecl-check-update.js`, `ecl-session-state.sh` | Update check, session orientation |
| `PostToolUse` | `ecl-context-monitor.js`, `ecl-read-injection-scanner.js`, `ecl-phase-boundary.sh`, `ecl-graphify-update.sh` | Context monitoring, read-time scan, phase boundary detection |
| `PreToolUse` | `ecl-prompt-guard.js`, `ecl-read-guard.js`, `ecl-workflow-guard.js`, `ecl-worktree-path-guard.js`, `ecl-validate-commit.sh` | Prompt guard, read-before-edit, workflow + worktree safety, commit validation |
| `SubagentStop` | `ecl-context-monitor.js` | Context headroom tracking after subagent completion |
| `Stop` | `ecl-context-monitor.js` | Context headroom tracking before model stop |
| `PreCompact` | `ecl-context-monitor.js` | Context awareness before conversation compaction |
| `FileChanged` (matcher: `config.json`) | `ecl-config-reload.js` | Hot-reloads `.planning/config.json` context mid-session when you edit your eCL config — no session restart required |

The `FileChanged` hook is always-on and a no-op when `.planning/config.json` does not exist in the project. Editing that file while a session is running injects an `additionalContext` summary of the new configuration so the agent picks up model overrides, workflow toggles, and hook settings immediately.

---

### Claude Code — native plugin install

eCL Core ships a `.claude-plugin/plugin.json` manifest, which enables installation and lifecycle management through the Claude Code plugin system. This path is **additive** — the npm installer above remains fully supported, and the two approaches differ in namespace and lifecycle only.

**Install paths**

*Option A — marketplace or git install (once listed):*

```bash
claude plugin install evolv-coder-lite
```

*Option B — zero-friction skills-dir load:* Claude Code automatically discovers any directory under `~/.claude/skills/` that contains a `.claude-plugin/plugin.json` as a plugin. To use evolv-coder-lite this way, place (or symlink) the evolv-coder-lite package directory there:

```bash
# Example: place the package under ~/.claude/skills/evolv-coder-lite/
# Claude Code loads it as evolv-coder-lite@skills-dir on the next session start.
# No explicit install step required.
```

**Command namespace**

Plugin commands are namespaced as `/evolv-coder-lite:<command>` — for example, `/evolv-coder-lite:plan-phase`. This is distinct from the classic npm/file-copy installer, which exposes commands as `/ecl:<command>`. Use whichever namespace corresponds to your install method.

**Lifecycle**

```bash
claude plugin enable evolv-coder-lite
claude plugin disable evolv-coder-lite
claude plugin update evolv-coder-lite
```

**Hooks**

The plugin wires evolv-coder-lite's always-on guard and update hooks automatically via `hooks/hooks.json`. No manual hook registration is required.

**Prerequisites**

The `ecl-tools` binary (installed as part of the `@evolvconsulting/evolv-coder-lite` npm package) must be available on your `PATH` for ecl commands to execute their backing logic. The plugin delivers the command, agent, and hook surface; the npm package delivers the runtime CLI.

Node.js (`node`) must also be available on your `PATH`. The plugin's always-on guard hooks (wired in `hooks/hooks.json`) are invoked as `node "${CLAUDE_PLUGIN_ROOT}/hooks/<script>"`. Some Claude Code distributions ship as a standalone binary and do not expose a `node` executable on `PATH`; in those environments the plugin's hooks will not run. Verify with `node --version` before relying on the plugin hooks.

---

### Gemini CLI

```bash
npx @evolvconsulting/evolv-coder-lite@latest --gemini --global
```

Skills land in `~/.gemini/`. The installer rewrites all command bodies to Gemini's colon namespace (`/ecl:update`, `/ecl:config`, etc.). Restart Gemini CLI after install.

The installer also enriches the generated TOML commands with two native Gemini custom-command features:

- **`{{args}}` interpolation** — every command that references arguments inline is emitted with Gemini's `{{args}}` placeholder (translated from Claude's `$ARGUMENTS`), so flags and free-text you type after the command name are interpolated into the prompt body rather than ignored.
- **`!{...}` live-state injection** — `/ecl:progress` injects the current contents of `.planning/STATE.md` via a fixed `!{cat .planning/STATE.md 2>/dev/null}` shell block, giving Gemini live project state without relying on session memory. The shell block contains no interpolated input, so there is no injection risk; Gemini still shows its standard confirmation dialog the first time the command runs in a session.

**Override the install directory:**

```bash
GEMINI_CONFIG_DIR=~/.gemini-alt npx @evolvconsulting/evolv-coder-lite@latest --gemini --global
```

**Hook coverage**

eCL registers the following hook events automatically on install:

| Event | Hook | Purpose |
|---|---|---|
| `SessionStart` | `ecl-check-update.js`, `ecl-session-state.sh` | Update check, session orientation |
| `BeforeTool` | `ecl-prompt-guard.js`, `ecl-read-guard.js`, `ecl-workflow-guard.js`, `ecl-worktree-path-guard.js`, `ecl-validate-commit.sh` | Prompt guard, read-before-edit, workflow + worktree safety, commit validation |
| `AfterTool` | `ecl-context-monitor.js`, `ecl-read-injection-scanner.js`, `ecl-phase-boundary.sh`, `ecl-graphify-update.sh` | Context monitoring, read-time scan, phase boundary detection |
| `BeforeAgent` | `ecl-context-monitor.js` | Context headroom awareness before the agent begins planning each prompt |
| `AfterAgent` | `ecl-context-monitor.js` | Context headroom tracking after each agent turn's final response |
| `BeforeModel` | `ecl-context-monitor.js` | Per-turn context injection before each LLM call |

> **`hooksConfig.enabled: false` warning.** If your Gemini `settings.json` contains `hooksConfig.enabled: false`, the Gemini CLI silently disables all hook execution — eCL hooks are registered but will never run. The installer detects this and emits a warning. To enable hooks, set `hooksConfig.enabled: true` in `~/.gemini/settings.json` (or the directory matching your `GEMINI_CONFIG_DIR`).

---

### Gemini CLI — native extension install (#775)

eCL also ships a `gemini-extension.json` extension manifest, so you can manage eCL through Gemini's own extension lifecycle and see it in `gemini extensions list`:

```bash
gemini extensions install https://github.com/evolvconsulting/evolv-coder-lite   # install
gemini extensions update evolv-coder-lite                                # update
gemini extensions uninstall evolv-coder-lite                             # remove
gemini extensions link /path/to/evolv-coder-lite                         # dev: symlink a checkout
```

The extension loads eCL's operating context (`GEMINI.md`) into every session and gives you the discoverable install/update/remove lifecycle. The `/ecl:*` slash commands, agents, and hooks are installed separately by `npx @evolvconsulting/evolv-coder-lite --gemini --global` (above). The two paths are complementary and additive — neither replaces the other, and slash-command projection into the extension is a planned follow-up.

---

### OpenCode

```bash
npx @evolvconsulting/evolv-coder-lite@latest --opencode --global
```

The installer writes three surfaces under `~/.config/opencode/` (XDG) or `~/.opencode/`: flat slash commands in `command/`, file-based subagents in `agents/`, and on-demand skills in `skills/<name>/SKILL.md`. It converts agent frontmatter to OpenCode's schema — removing the `tools:` field and converting colour values to hex — and emits each skill with spec-compliant frontmatter (`name` matching the skill directory plus a `description`). Skills are loaded on demand via OpenCode's native skill tool; commands remain invokable as `/ecl-*`. See [Installing without Node.js — OpenCode transformations](#opencode--required-transformations) if you need to understand what changes.

**Override the install directory:**

```bash
OPENCODE_CONFIG_DIR=~/.config/opencode-alt npx @evolvconsulting/evolv-coder-lite@latest --opencode --global
```

---

### Kilo

```bash
npx @evolvconsulting/evolv-coder-lite@latest --kilo --global
```

The installer writes the same three surfaces under `~/.config/kilo/` (XDG) or `~/.kilo/` as for OpenCode — flat commands in `command/`, subagents in `agents/`, and skills in `skills/<name>/SKILL.md` — since Kilo derives from OpenCode and shares its config schema and skill layout.

**Override the install directory:**

```bash
KILO_CONFIG_DIR=~/.config/kilo-alt npx @evolvconsulting/evolv-coder-lite@latest --kilo --global
```

---

### Codex

```bash
npx @evolvconsulting/evolv-coder-lite@latest --codex --global
```

Skills land in `~/.codex/skills/ecl-*/SKILL.md`. Agents are written with per-agent TOML entries in `config.toml`. Restart Codex (or run `codex --reload`) after install.

**Minimum supported version:** Codex CLI 0.130.0. Earlier versions had additional skill-root scanning that can produce duplicate listings.

**Hook coverage**

eCL registers the following Codex hook events automatically on install (requires Codex CLI 0.137.0+ for the stable hook-event schema):

| Event | Hook | Purpose |
|---|---|---|
| `SessionStart` | `ecl-check-update.js` | Update check at session open; Windows installs also emit a `commandWindows` field pointing to the `.cmd` shim so Codex picks the correct executor on Windows without requiring per-OS config regeneration |
| `SubagentStart` | `ecl-context-monitor.js` | Inject context / ECL_AGENT_NAME awareness at subagent open |
| `Stop` | `ecl-context-monitor.js` | Context headroom tracking before model stop |
| `PostToolUse` | `ecl-context-monitor.js` | Mirror the context-monitor coverage available in Claude Code |

All registered hooks are managed by eCL and are removed cleanly on `--uninstall`.

---

### GitHub Copilot

```bash
npx @evolvconsulting/evolv-coder-lite@latest --copilot --global
```

Skills land in `~/.copilot/`. eCL installs as agent `.md` files and repository instruction files.

eCL also wires Copilot's lifecycle hooks and instruction files:

- **`AGENTS.md`** (local installs) — written at the repository root, which GitHub Copilot CLI reads as primary instructions, alongside `copilot-instructions.md`.
- **Lifecycle hook** — a `sessionStart` hook config is written to `.github/hooks/ecl-session.json` (local) or `~/.copilot/hooks/ecl-session.json` (global). It is a self-contained inline `command` hook (no separate hook script to install), so it can never reference a missing script. The hook is advisory-only: at session start it surfaces whether the project has a `.planning/` workflow.

Both are removed (and any user-authored content preserved) on `--uninstall`.

**Override the install directory:**

```bash
COPILOT_CONFIG_DIR=~/.copilot-alt npx @evolvconsulting/evolv-coder-lite@latest --copilot --global
```

---

### Cursor

```bash
npx @evolvconsulting/evolv-coder-lite@latest --cursor --global
```

Skills land in `~/.cursor/`. eCL installs skills, agents, and rule references.

**Override the install directory:**

```bash
CURSOR_CONFIG_DIR=~/.cursor-alt npx @evolvconsulting/evolv-coder-lite@latest --cursor --global
```

---

### Windsurf

```bash
npx @evolvconsulting/evolv-coder-lite@latest --windsurf --global
```

Skills land in `~/.codeium/windsurf/`. eCL installs skills, agents, and workspace rules.

**Override the install directory:**

```bash
WINDSURF_CONFIG_DIR=~/.codeium/windsurf-alt npx @evolvconsulting/evolv-coder-lite@latest --windsurf --global
```

---

### Cline

eCL gives Cline both skills (≥ v3.48.0) and the `.clinerules/` directory integration — no custom slash commands are registered.

```bash
# Global install (all projects — skills + rules directory)
npx @evolvconsulting/evolv-coder-lite@latest --cline --global

# Local install (this project only — rules directory only)
npx @evolvconsulting/evolv-coder-lite@latest --cline --local
```

eCL writes the [`.clinerules/` directory form](https://docs.cline.bot/customization/cline-rules):

- **`.clinerules/ecl.md`** — the eCL rule file. Cline loads every `.md`/`.txt` file in
  the `.clinerules/` directory automatically; no custom slash commands are registered.
- **`.clinerules/hooks/PreToolUse`** — a [lifecycle hook](https://cline.bot/blog/cline-v3-36-hooks)
  (Cline v3.36+). It is an executable script that receives the tool-call context as JSON on
  stdin and returns a JSON decision (`cancel` / `errorMessage` / `contextModification`). The
  eCL hook guards `.planning/` artifacts from direct edits and otherwise allows the operation;
  it fails open, so a hook error never blocks you. Cline runs hooks on macOS and Linux only.

**Global install additionally:**

- Emits each eCL command as **`~/.cline/skills/<name>/SKILL.md`**. Cline ≥ v3.48.0 loads
  skills from `~/.cline/skills/` automatically — no configuration needed.
- Merges eCL instructions into **`~/.agents/AGENTS.md`**, the cross-tool global instruction
  file Cline reads. The block is marker-delimited, so your own `AGENTS.md` content (and other
  tools' entries) is preserved, and `--uninstall` strips only the eCL block.

**Local install** writes the `.clinerules/` directory into the current project only. No skills
directory is created for local scope.

> Cline's *global* hook directory (`~/Documents/Cline/Rules/Hooks/`) is not yet populated by the
> installer — project-scope hooks (`.clinerules/hooks/`) and the global `AGENTS.md` instruction
> target cover the common cases.

---

### CodeBuddy

```bash
npx @evolvconsulting/evolv-coder-lite@latest --codebuddy --global
```

eCL installs four surfaces. Slash command definitions land in `~/.codebuddy/commands/ecl-*.md` and appear as `/ecl-help`, `/ecl-phase`, `/ecl-ship`, etc. in the `/` menu. Subagents land in `~/.codebuddy/agents/ecl-*.md`. Skills land in `~/.codebuddy/skills/ecl-*/SKILL.md` — emitted with `user-invocable: false` so they stay out of the `/` menu (the commands surface is the sole `/` entry point) and remain available for model invocation. CodeBuddy hooks are written to `settings.json`. No `mcp.json` is written: eCL ships no MCP server.

---

### Qwen Code

Qwen Code uses the same open skills standard as Claude Code 2.1.88+.

```bash
npx @evolvconsulting/evolv-coder-lite@latest --qwen --global
```

Skills land in `~/.qwen/skills/ecl-*/SKILL.md`.

eCL's main-loop skills are emitted with Qwen's optional numeric `priority` frontmatter field so the most-used workflows surface first in the `/skills` TUI list. Higher values sort earlier (per Qwen's skills spec), so core commands such as `/skills` for `new-project` (100), `plan-phase` (90), and `execute-phase` (85) appear above utility skills, which are left unset (default 0). This affects only the `/skills` list order — slash-command completion and `/help` remain alphabetical.

**Override the install directory:**

```bash
QWEN_CONFIG_DIR=~/.qwen-alt npx @evolvconsulting/evolv-coder-lite@latest --qwen --global
```

**Hook coverage**

Qwen Code supports 15 hook events. eCL registers the following events automatically on install:

| Event | Hook | Purpose |
|---|---|---|
| `SessionStart` | `ecl-check-update.js`, `ecl-session-state.sh` | Update check, session orientation |
| `PostToolUse` | `ecl-context-monitor.js`, `ecl-read-injection-scanner.js`, `ecl-phase-boundary.sh`, `ecl-graphify-update.sh` | Context monitoring, read-time scan, phase boundary detection |
| `PreToolUse` | `ecl-prompt-guard.js`, `ecl-read-guard.js`, `ecl-workflow-guard.js`, `ecl-worktree-path-guard.js`, `ecl-validate-commit.sh` | Prompt guard, read-before-edit, workflow + worktree safety, commit validation |
| `SubagentStop` | `ecl-context-monitor.js` | Context headroom tracking after subagent completion |
| `Stop` | `ecl-context-monitor.js` | Context headroom tracking before model stop |
| `PreCompact` | `ecl-context-monitor.js` | Context awareness before conversation compaction |

---

### Augment Code

```bash
npx @evolvconsulting/evolv-coder-lite@latest --augment --global
```

Skills land in `~/.augment/skills/` and slash command definitions land in `~/.augment/commands/`. eCL installs skills, agents, and commands (`/ecl-phase`, `/ecl-ship`, etc.). No hook or statusline ownership.

---

### Antigravity

```bash
npx @evolvconsulting/evolv-coder-lite@latest --antigravity --global
```

The installer auto-detects the Antigravity config directory (`~/.gemini/antigravity`, `~/.gemini/antigravity-ide`, or `~/.gemini/antigravity-cli`). Uses Gemini-compatible settings policy.

**Override the install directory:**

```bash
ANTIGRAVITY_CONFIG_DIR=~/.gemini/antigravity-alt npx @evolvconsulting/evolv-coder-lite@latest --antigravity --global
```

---

### Trae

```bash
npx @evolvconsulting/evolv-coder-lite@latest --trae --global
```

Skills land in `~/.trae/`. eCL installs skills, agents, and rule references.

---

## Local vs global install

All examples above use `--global`, which installs eCL once for your user account. To scope an install to a single project, replace `--global` with `--local`:

```bash
npx @evolvconsulting/evolv-coder-lite@latest --claude --local
```

A local install writes into the `.claude/` directory at your project root. Local install settings take precedence over global ones when both exist.

---

## Installing prerelease editions (Next / Nightly / Insiders / Preview)

Prerelease editions of runtimes (Windsurf Next, Cursor Nightly, VS Code Insiders, Codex preview channels, etc.) read from a sibling config directory. Set the matching `*_CONFIG_DIR` env var before running the installer:

```bash
WINDSURF_CONFIG_DIR=~/.codeium/windsurf-next npx @evolvconsulting/evolv-coder-lite@latest --windsurf --global
```

Select the corresponding stable runtime in the installer prompt. eCL does not enumerate prerelease editions as separate named runtimes — they are best-effort via this env-var mechanism and are not separately tested in release CI.

---

## Installing without Node.js

If you cannot run `npx` (for example, on a Windows machine without Node.js), you have two options.

**Option A — Use a machine that has Node.js.** Any machine with Node.js will do: WSL, a Linux VM, a CI runner, or a Docker container. Run the installer there, then copy the output directory to your target machine. For OpenCode:

```bash
npx @evolvconsulting/evolv-coder-lite@latest --opencode --global
# Then copy ~/.config/opencode/agents/ to the Windows machine
```

**Option B — Manually transform the source files.** The agent source files live in `agents/` in the eCL Core repository and are in Claude Code's native frontmatter format. Each runtime expects a different shape. For the exact field transformations per runtime, see [Manual install / no-Node.js setup](../USER-GUIDE.md#manual-install--no-nodejs-setup) in the User Guide, which covers the OpenCode transformations in full detail and points to the installer's `convert*Frontmatter` functions for other runtimes.

---

## After install

Restart your runtime to pick up new commands and agents. Then start your first project:

```bash
/ecl-new-project
```

If the command is not found after restart, verify the install directory matches the runtime's expected config path. The prerelease-editions section above covers the most common mismatch.

---

## Related

- [Your first project](../tutorials/your-first-project.md)
- [Update eCL Core](update-ecl.md)
- [Configuration](../CONFIGURATION.md)
- [Docs index](../README.md)
