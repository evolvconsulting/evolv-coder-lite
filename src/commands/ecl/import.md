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
Run: `node "$HOME/.claude/evolv-coder-lite/bin/ecl-tools.cjs" from-ecl2`
Pass `--path <dir>` if provided. Present the migration result to the user.
Stop here (do not run the standard import workflow).

Otherwise, execute the import workflow end-to-end.
</process>
