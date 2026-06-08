---
name: ecl:import
description: Ingest external plans with conflict detection against project decisions before writing anything.
argument-hint: "--from <filepath> | --from-ecl2"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - Agent
---

<objective>
Import external plan files into the eCL planning system with conflict detection against PROJECT.md decisions.

- **--from**: Import an external plan file, detect conflicts, write as eCL PLAN.md, validate via ecl-plan-checker.
- **--from-ecl2**: Reverse-migrate a eCL-2 project (`.ecl/` directory) back to eCL v1 (`.planning/`) format. Runs `ecl-tools.cjs from-ecl2`. Pass `--path <dir>` to migrate a project at a different path.
</objective>

<execution_context>
@~/.claude/evolv-coder-lite/workflows/import.md
@~/.claude/evolv-coder-lite/references/ui-brand.md
@~/.claude/evolv-coder-lite/references/gate-prompts.md
@~/.claude/evolv-coder-lite/references/doc-conflict-engine.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
If `--from-ecl2` is in $ARGUMENTS:
Run the reverse-migration (append `--path <dir>` if provided):
```bash
_GSD_SHIM_NAME="ecl-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; ECL_TOOLS="${_GSD_RUNTIME_ROOT}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; if [ -f "$ECL_TOOLS" ]; then ecl_run() { node "$ECL_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.claude/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then ECL_TOOLS="${_GSD_RUNTIME_ROOT}/.claude/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; ecl_run() { node "$ECL_TOOLS" "$@"; }; elif command -v ecl-tools >/dev/null 2>&1; then ECL_TOOLS="$(command -v ecl-tools)"; ecl_run() { "$ECL_TOOLS" "$@"; }; elif [ -f "$HOME/.claude/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then ECL_TOOLS="$HOME/.claude/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; ecl_run() { node "$ECL_TOOLS" "$@"; }; else echo "ERROR: ecl-tools.cjs not found at $ECL_TOOLS and ecl-tools is not on PATH. Run: npx -y @evolvconsulting/evolv-coder-lite@latest --claude --local" >&2; exit 1; fi
ecl_run from-ecl2
```
Present the migration result to the user.
Stop here (do not run the standard import workflow).

Otherwise, execute the import workflow end-to-end.
</process>
