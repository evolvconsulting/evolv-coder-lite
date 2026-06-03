# --auto mode — fully autonomous discuss-phase

> **Lazy-loaded.** Read this file from `workflows/discuss-phase.md` when
> `--auto` is present in `$ARGUMENTS`. After the discussion completes, the
> parent's `auto_advance` step also reads `modes/chain.md` to drive the
> auto-advance to plan-phase.

## Effect across steps

- **`check_existing`**: if CONTEXT.md exists, auto-select "Update it" — load
  existing context and continue to `analyze_phase` (matches the parent step's
  documented `--auto` branch). If no context exists, continue without
  prompting. For interrupted checkpoints, auto-select "Resume". For existing
  plans, auto-select "Continue and replan after". Log every decision so the
  user can audit.
- **`cross_reference_todos`**: fold all todos with relevance score >= 0.4
  automatically. Log the selection.
- **`present_gray_areas`**: auto-select ALL gray areas. Log:
  `[--auto] Selected all gray areas: [list area names].`
- **`discuss_areas`**: for each discussion question, choose the recommended
  option (first option, or the one explicitly marked "recommended") **without
  using AskUserQuestion**. Skip interactive prompts entirely. Log each
  auto-selected choice inline so the user can review decisions in the
  context file:
  ```
  [auto] [Area] — Q: "[question text]" → Selected: "[chosen option]" (recommended default)
  ```
- After all areas are auto-resolved, skip the "Explore more gray areas"
  prompt and proceed directly to `write_context`.
- After `write_context`, **auto-advance** to plan-phase via `modes/chain.md`.

## CRITICAL — Auto-mode pass cap

In `--auto` mode, the discuss step MUST complete in a **single pass**. After
writing CONTEXT.md once, you are DONE — proceed immediately to
`write_context` and then auto_advance. Do NOT re-read your own CONTEXT.md to
find "gaps", "undefined types", or "missing decisions" and run additional
passes. This creates a self-feeding loop where each pass generates references
that the next pass treats as gaps, consuming unbounded time and resources.

Check the pass cap from config:
```bash
_GSD_SHIM_NAME="ecl-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; ECL_TOOLS="${_GSD_RUNTIME_ROOT}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; if [ -f "$ECL_TOOLS" ]; then ecl_run() { node "$ECL_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.claude/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then ECL_TOOLS="${_GSD_RUNTIME_ROOT}/.claude/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; ecl_run() { node "$ECL_TOOLS" "$@"; }; elif command -v ecl-tools >/dev/null 2>&1; then ECL_TOOLS="$(command -v ecl-tools)"; ecl_run() { "$ECL_TOOLS" "$@"; }; elif [ -f "$HOME/.claude/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then ECL_TOOLS="$HOME/.claude/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"; ecl_run() { node "$ECL_TOOLS" "$@"; }; else echo "ERROR: ecl-tools.cjs not found at $ECL_TOOLS and ecl-tools is not on PATH. Run: npx -y @evolvconsulting/evolv-coder-lite@latest --claude --local" >&2; exit 1; fi
MAX_PASSES=$(ecl_run query config-get workflow.max_discuss_passes 2>/dev/null || echo "3")
```

If you have already written and committed CONTEXT.md, the discuss step is
complete. Move on.

## Combination rules

- `--auto --text` / `--auto --batch`: text/batch overlays are no-ops in
  auto mode (no user prompts to render).
- `--auto --analyze`: trade-off tables can still be logged for the audit
  trail; selection still uses the recommended option.
- `--auto --power`: `--power` wins (power mode generates files for offline
  answering — incompatible with autonomous selection).
