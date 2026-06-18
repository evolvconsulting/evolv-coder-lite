<purpose>
List all eCL workspaces found in ~/ecl-workspaces/ with their status.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

## 1. Setup

```bash
_GSD_SHIM_NAME="ecl-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; ECL_TOOLS="${_GSD_RUNTIME_ROOT}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; if [ -f "$ECL_TOOLS" ]; then ecl_run() { node "$ECL_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.claude/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then ECL_TOOLS="${_GSD_RUNTIME_ROOT}/.claude/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; ecl_run() { node "$ECL_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.codex/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then ECL_TOOLS="${_GSD_RUNTIME_ROOT}/.codex/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; ecl_run() { node "$ECL_TOOLS" "$@"; }; elif command -v ecl-tools >/dev/null 2>&1; then ECL_TOOLS="$(command -v ecl-tools)"; ecl_run() { "$ECL_TOOLS" "$@"; }; elif [ -f "$HOME/.claude/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then ECL_TOOLS="$HOME/.claude/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; ecl_run() { node "$ECL_TOOLS" "$@"; }; elif [ -f "${HERMES_HOME:-$HOME/.hermes}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then ECL_TOOLS="${HERMES_HOME:-$HOME/.hermes}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; ecl_run() { node "$ECL_TOOLS" "$@"; }; elif [ -f "${CURSOR_CONFIG_DIR:-$HOME/.cursor}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then ECL_TOOLS="${CURSOR_CONFIG_DIR:-$HOME/.cursor}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; ecl_run() { node "$ECL_TOOLS" "$@"; }; elif [ -f "${CODEX_HOME:-$HOME/.codex}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then ECL_TOOLS="${CODEX_HOME:-$HOME/.codex}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; ecl_run() { node "$ECL_TOOLS" "$@"; }; elif [ -f "${GEMINI_CONFIG_DIR:-$HOME/.gemini}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then ECL_TOOLS="${GEMINI_CONFIG_DIR:-$HOME/.gemini}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; ecl_run() { node "$ECL_TOOLS" "$@"; }; elif [ -f "${COPILOT_CONFIG_DIR:-$HOME/.copilot}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then ECL_TOOLS="${COPILOT_CONFIG_DIR:-$HOME/.copilot}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; ecl_run() { node "$ECL_TOOLS" "$@"; }; elif [ -f "${WINDSURF_CONFIG_DIR:-$HOME/.codeium/windsurf}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then ECL_TOOLS="${WINDSURF_CONFIG_DIR:-$HOME/.codeium/windsurf}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; ecl_run() { node "$ECL_TOOLS" "$@"; }; elif [ -f "${AUGMENT_CONFIG_DIR:-$HOME/.augment}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then ECL_TOOLS="${AUGMENT_CONFIG_DIR:-$HOME/.augment}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; ecl_run() { node "$ECL_TOOLS" "$@"; }; elif [ -f "${TRAE_CONFIG_DIR:-$HOME/.trae}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then ECL_TOOLS="${TRAE_CONFIG_DIR:-$HOME/.trae}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; ecl_run() { node "$ECL_TOOLS" "$@"; }; elif [ -f "${QWEN_CONFIG_DIR:-$HOME/.qwen}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then ECL_TOOLS="${QWEN_CONFIG_DIR:-$HOME/.qwen}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; ecl_run() { node "$ECL_TOOLS" "$@"; }; elif [ -f "${CODEBUDDY_CONFIG_DIR:-$HOME/.codebuddy}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then ECL_TOOLS="${CODEBUDDY_CONFIG_DIR:-$HOME/.codebuddy}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; ecl_run() { node "$ECL_TOOLS" "$@"; }; elif [ -f "${CLINE_CONFIG_DIR:-$HOME/.cline}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then ECL_TOOLS="${CLINE_CONFIG_DIR:-$HOME/.cline}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; ecl_run() { node "$ECL_TOOLS" "$@"; }; elif [ -f "${GROK_AGENTS_HOME:-$HOME/.agents}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then ECL_TOOLS="${GROK_AGENTS_HOME:-$HOME/.agents}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; ecl_run() { node "$ECL_TOOLS" "$@"; }; elif [ -f "${ANTIGRAVITY_CONFIG_DIR:-$HOME/.gemini/antigravity}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then ECL_TOOLS="${ANTIGRAVITY_CONFIG_DIR:-$HOME/.gemini/antigravity}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; ecl_run() { node "$ECL_TOOLS" "$@"; }; elif [ -f "${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then ECL_TOOLS="${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; ecl_run() { node "$ECL_TOOLS" "$@"; }; elif [ -f "${KILO_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/kilo}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then ECL_TOOLS="${KILO_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/kilo}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; ecl_run() { node "$ECL_TOOLS" "$@"; }; else echo "ERROR: ecl-tools.cjs not found at $ECL_TOOLS and ecl-tools is not on PATH. Run: npx -y @evolvconsulting/evolv-coder-lite@latest --claude --local" >&2; exit 1; fi; if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -n "${ECL_TOOLS:-}" ]; then printf "export PATH='%s':\"\$PATH\"\n" "${ECL_TOOLS%/*}" >> "$CLAUDE_ENV_FILE" 2>/dev/null || true; fi
INIT=$(ecl_run query init.list-workspaces)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

Parse JSON for: `workspace_base`, `workspaces`, `workspace_count`.

## 2. Display

**If `workspace_count` is 0:**

```
No workspaces found in ~/ecl-workspaces/

Create one with:
  /ecl:workspace --new --name my-workspace --repos repo1,repo2
```

Done.

**If workspaces exist:**

Display a table:

```
eCL Workspaces (~/ecl-workspaces/)

| Name | Repos | Strategy | eCL Project |
|------|-------|----------|-------------|
| feature-a | 3 | worktree | Yes |
| feature-b | 2 | clone | No |

Manage:
  cd ~/ecl-workspaces/<name>     # Enter a workspace
  /ecl:workspace --remove <name>  # Remove a workspace
```

For each workspace, show:
- **Name** — directory name
- **Repos** — count from init data
- **Strategy** — from WORKSPACE.md
- **eCL Project** — whether `.planning/PROJECT.md` exists (Yes/No)

</process>
