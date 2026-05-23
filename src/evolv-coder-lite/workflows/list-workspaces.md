<purpose>
List all eCL workspaces found in ~/ecl-workspaces/ with their status.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

## 1. Setup

```bash
# SDK resolution: prefer local ecl-tools.cjs, fall back to global ecl-sdk (#3668)
ECL_TOOLS="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}/evolv-coder-lite/bin/ecl-tools.cjs"
if [ -f "$ECL_TOOLS" ]; then
  ECL_SDK="node $ECL_TOOLS"
elif command -v ecl-sdk >/dev/null 2>&1; then
  ECL_SDK="ecl-sdk"
else
  echo "ERROR: ecl-sdk not found on PATH and $ECL_TOOLS does not exist." >&2
  echo "Run: npx evolv-coder-lite-cc@latest --claude --local" >&2
  exit 1
fi
INIT=$($ECL_SDK query init.list-workspaces)
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
  /ecl-remove-workspace <name>   # Remove a workspace
```

For each workspace, show:
- **Name** — directory name
- **Repos** — count from init data
- **Strategy** — from WORKSPACE.md
- **eCL Project** — whether `.planning/PROJECT.md` exists (Yes/No)

</process>
