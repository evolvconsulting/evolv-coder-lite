<purpose>
List all eCL workspaces found in ~/ecl-workspaces/ with their status.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

## 1. Setup

```bash
_GSD_SHIM_NAME="ecl-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; ECL_TOOLS="${_GSD_RUNTIME_ROOT}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; if [ -f "$ECL_TOOLS" ]; then ecl_run() { node "$ECL_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.claude/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then ECL_TOOLS="${_GSD_RUNTIME_ROOT}/.claude/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; ecl_run() { node "$ECL_TOOLS" "$@"; }; elif command -v ecl-tools >/dev/null 2>&1; then ECL_TOOLS="$(command -v ecl-tools)"; ecl_run() { "$ECL_TOOLS" "$@"; }; elif [ -f "$HOME/.claude/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then ECL_TOOLS="$HOME/.claude/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; ecl_run() { node "$ECL_TOOLS" "$@"; }; else echo "ERROR: ecl-tools.cjs not found at $ECL_TOOLS and ecl-tools is not on PATH. Run: npx -y @evolvconsulting/evolv-coder-lite@latest --claude --local" >&2; exit 1; fi
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
