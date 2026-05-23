# eCL CLI Tools Reference

> Surface-area reference for `evolv-coder-lite/bin/ecl-tools.cjs` (legacy Node CLI). Workflows and agents should prefer `ecl-sdk query` or `@evolvconsulting/ecl-sdk` where a handler exists — see [SDK and programmatic access](#sdk-and-programmatic-access). For slash commands and user flows, see [Command Reference](COMMANDS.md).

---

## Overview

`ecl-tools.cjs` centralizes config parsing, model resolution, phase lookup, git commits, summary verification, state management, and template operations across eCL commands, workflows, and agents.


|                    |                                                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Shipped path**   | `evolv-coder-lite/bin/ecl-tools.cjs`                                                                                                                                                                      |
| **Implementation** | 20 domain modules under `evolv-coder-lite/bin/lib/` (the directory is authoritative)                                                                                                                        |
| **Status**         | Maintained for parity tests and CJS-only entrypoints; `ecl-sdk query` / SDK registry are the supported path for new orchestration (see [QUERY-HANDLERS.md](../sdk/src/query/QUERY-HANDLERS.md)). |


**Usage (CJS):**

```bash
node ecl-tools.cjs <command> [args] [--raw] [--cwd <path>]
```

**Global flags (CJS):**


| Flag           | Description                                                                  |
| -------------- | ---------------------------------------------------------------------------- |
| `--raw`        | Machine-readable output (JSON or plain text, no formatting)                  |
| `--cwd <path>` | Override working directory (for sandboxed subagents)                         |
| `--ws <name>`  | Workstream context (also honored when the SDK spawns this binary; see below) |


---

## SDK and programmatic access

Use this when authoring workflows, not when you only need the command list below.

**1. CLI — `ecl-sdk query <argv…>`**

- Resolves argv with the same **longest-prefix** rules as the typed registry (`resolveQueryArgv` in `sdk/src/query/registry.ts`). Unregistered commands **fail fast** — use `node …/ecl-tools.cjs` only for handlers not in the registry.
- Full matrix (CJS command → registry key, CLI-only tools, aliases, golden tiers): [sdk/src/query/QUERY-HANDLERS.md](../sdk/src/query/QUERY-HANDLERS.md).

**2. TypeScript — `@evolvconsulting/ecl-sdk` (`GSDTools`, `createRegistry`)**

- `GSDTools` now routes through the **SDK Runtime Bridge Module** (`sdk/src/query-runtime-bridge.ts`). Native registry dispatch is preferred; subprocess fallback is explicit policy (`allowFallbackToSubprocess`) and can be disabled for strict SDK-only execution.
- `strictSdk` mode fails fast when a command has no native adapter, making SDK publish/readiness checks deterministic.
- Structured bridge observability is available via `onDispatchEvent` (dispatch mode, fallback reason, duration, outcome, error kind).
- For direct typed dispatch without `GSDTools`, use `createRegistry()` from `sdk/src/query/index.ts`, or invoke `ecl-sdk query` (see [QUERY-HANDLERS.md](../sdk/src/query/QUERY-HANDLERS.md)).
- Conventions: mutation event wiring, `GSDError` vs `{ data: { error } }`, locks, and stubs — [QUERY-HANDLERS.md](../sdk/src/query/QUERY-HANDLERS.md).

**CJS → SDK examples (same project directory):**


| Legacy CJS                               | Preferred `ecl-sdk query` (examples) |
| ---------------------------------------- | ------------------------------------ |
| `node ecl-tools.cjs init phase-op 12`    | `ecl-sdk query init phase-op 12`     |
| `node ecl-tools.cjs phase-plan-index 12` | `ecl-sdk query phase-plan-index 12`  |
| `node ecl-tools.cjs state json`          | `ecl-sdk query state json`           |
| `node ecl-tools.cjs roadmap analyze`     | `ecl-sdk query roadmap analyze`      |


**SDK state reads:** `state.json` and `state.load` are both registered query handlers with parity coverage. You can invoke them through `ecl-sdk query …` and through the SDK Runtime Bridge (`GSDTools` → `sdk/src/query-runtime-bridge.ts`), honoring `allowFallbackToSubprocess` / `strictSdk` and emitting `onDispatchEvent` observability. For direct typed dispatch, use `createRegistry()` from `sdk/src/query/index.ts`. Full routing and golden rules: [QUERY-HANDLERS.md](../sdk/src/query/QUERY-HANDLERS.md).

**CLI-only (not in registry):** e.g. **graphify**, **from-ecl2** / **ecl2-import** — call `ecl-tools.cjs` until registered.

**Mutation events (SDK):** `QUERY_MUTATION_COMMANDS` in `sdk/src/query/index.ts` lists commands that may emit structured events after a successful dispatch. Exceptions called out in QUERY-HANDLERS: `state validate` (read-only), `skill-manifest` (writes only with `--write`), `intel update` (stub).

**Golden parity:** Policy and CJS↔SDK test categories are documented under **Golden parity** in [QUERY-HANDLERS.md](../sdk/src/query/QUERY-HANDLERS.md).

---

## State Commands

Manage `.planning/STATE.md` — the project's living memory.

```bash
# Load full project config + state as JSON
node ecl-tools.cjs state load

# Output STATE.md frontmatter as JSON
node ecl-tools.cjs state json

# Update a single field
node ecl-tools.cjs state update <field> <value>

# Get STATE.md content or a specific section
node ecl-tools.cjs state get [section]

# Batch update multiple fields
node ecl-tools.cjs state patch --field1 val1 --field2 val2

# Increment plan counter
node ecl-tools.cjs state advance-plan

# Record execution metrics
node ecl-tools.cjs state record-metric --phase N --plan M --duration Xmin [--tasks N] [--files N]

# Recalculate progress bar
node ecl-tools.cjs state update-progress

# Add a decision
node ecl-tools.cjs state add-decision --summary "..." [--phase N] [--rationale "..."]
# Or from files:
node ecl-tools.cjs state add-decision --summary-file path [--rationale-file path]

# Add/resolve blockers
node ecl-tools.cjs state add-blocker --text "..."
node ecl-tools.cjs state resolve-blocker --text "..."

# Record session continuity
node ecl-tools.cjs state record-session --stopped-at "..." [--resume-file path]

# Phase start — update STATE.md Status/Last activity for a new phase
node ecl-tools.cjs state begin-phase --phase N --name SLUG --plans COUNT

# Agent-discoverable blocker signalling (used by discuss-phase / UI flows)
node ecl-tools.cjs state signal-waiting --type TYPE --question "..." --options "A|B" --phase P
node ecl-tools.cjs state signal-resume
```

### State Snapshot

Structured parse of the full STATE.md:

```bash
node ecl-tools.cjs state-snapshot
```

Returns JSON with: current position, phase, plan, status, decisions, blockers, metrics, last activity.

---

## Phase Commands

Manage phases — directories, numbering, and roadmap sync.

```bash
# Find phase directory by number
node ecl-tools.cjs find-phase <phase>

# Calculate next decimal phase number for insertions
node ecl-tools.cjs phase next-decimal <phase>

# Append new phase to roadmap + create directory
node ecl-tools.cjs phase add <description>

# Insert decimal phase after existing
node ecl-tools.cjs phase insert <after> <description>

# Remove phase, renumber subsequent
node ecl-tools.cjs phase remove <phase> [--force]

# Mark phase complete, update state + roadmap
node ecl-tools.cjs phase complete <phase>

# Index plans with waves and status
node ecl-tools.cjs phase-plan-index <phase>

# List phases with filtering
node ecl-tools.cjs phases list [--type planned|executed|all] [--phase N] [--include-archived]
```

---

## Roadmap Commands

Parse and update `ROADMAP.md`.

```bash
# Extract phase section from ROADMAP.md
node ecl-tools.cjs roadmap get-phase <phase>

# Full roadmap parse with disk status
node ecl-tools.cjs roadmap analyze

# Update progress table row from disk
node ecl-tools.cjs roadmap update-plan-progress <N>
```

---

## Config Commands

Read and write `.planning/config.json`.

```bash
# Initialize config.json with defaults
node ecl-tools.cjs config-ensure-section

# Set a config value (dot notation)
node ecl-tools.cjs config-set <key> <value>

# Get a config value
node ecl-tools.cjs config-get <key>

# Set model profile
node ecl-tools.cjs config-set-model-profile <profile>
```

---

## Model Resolution

```bash
# Get model for agent based on current profile
node ecl-tools.cjs resolve-model <agent-name>
# Raw output returns the selected model ID/tier.
# JSON output also includes profile and, when the active runtime supports it,
# reasoning_effort.
```

Agent names: `ecl-planner`, `ecl-executor`, `ecl-phase-researcher`, `ecl-project-researcher`, `ecl-research-synthesizer`, `ecl-verifier`, `ecl-plan-checker`, `ecl-integration-checker`, `ecl-roadmapper`, `ecl-debugger`, `ecl-codebase-mapper`, `ecl-nyquist-auditor`

---

## Verification Commands

Validate plans, phases, references, and commits.

```bash
# Verify SUMMARY.md file
node ecl-tools.cjs verify-summary <path> [--check-count N]

# Check PLAN.md structure + tasks
node ecl-tools.cjs verify plan-structure <file>

# Check all plans have summaries
node ecl-tools.cjs verify phase-completeness <phase>

# Check @-refs + paths resolve
node ecl-tools.cjs verify references <file>

# Batch verify commit hashes
node ecl-tools.cjs verify commits <hash1> [hash2] ...

# Check must_haves.artifacts
node ecl-tools.cjs verify artifacts <plan-file>

# Check must_haves.key_links
node ecl-tools.cjs verify key-links <plan-file>
```

---

## Validation Commands

Check project integrity.

```bash
# Check phase numbering, disk/roadmap sync
node ecl-tools.cjs validate consistency

# Check .planning/ integrity, optionally repair
node ecl-tools.cjs validate health [--repair]

# Probe context-window utilization for status-line / hook callers (v1.40.0)
node ecl-tools.cjs validate context
```

`validate context` emits a structured envelope with `utilization`, `status`
(`ok` / `warn` / `critical` at the 60 % / 70 % thresholds), and a
`suggestion` string. The same data backs `/ecl-health --context`.

---

## Template Commands

Template selection and filling.

```bash
# Select summary template based on granularity
node ecl-tools.cjs template select <type>

# Fill template with variables
node ecl-tools.cjs template fill <type> --phase N [--plan M] [--name "..."] [--type execute|tdd] [--wave N] [--fields '{json}']
```

Template types for `fill`: `summary`, `plan`, `verification`

---

## Frontmatter Commands

YAML frontmatter CRUD operations on any Markdown file.

```bash
# Extract frontmatter as JSON
node ecl-tools.cjs frontmatter get <file> [--field key]

# Update single field
node ecl-tools.cjs frontmatter set <file> --field key --value jsonVal

# Merge JSON into frontmatter
node ecl-tools.cjs frontmatter merge <file> --data '{json}'

# Validate required fields
node ecl-tools.cjs frontmatter validate <file> --schema plan|summary|verification
```

---

## Scaffold Commands

Create pre-structured files and directories.

```bash
# Create CONTEXT.md template
node ecl-tools.cjs scaffold context --phase N

# Create UAT.md template
node ecl-tools.cjs scaffold uat --phase N

# Create VERIFICATION.md template
node ecl-tools.cjs scaffold verification --phase N

# Create phase directory
node ecl-tools.cjs scaffold phase-dir --phase N --name "phase name"
```

---

## Init Commands (Compound Context Loading)

Load all context needed for a specific workflow in one call. Returns JSON with project info, config, state, and workflow-specific data.

```bash
node ecl-tools.cjs init execute-phase <phase>
node ecl-tools.cjs init plan-phase <phase>
node ecl-tools.cjs init new-project
node ecl-tools.cjs init new-milestone
node ecl-tools.cjs init quick <description>
node ecl-tools.cjs init resume
node ecl-tools.cjs init verify-work <phase>
node ecl-tools.cjs init phase-op <phase>
node ecl-tools.cjs init todos [area]
node ecl-tools.cjs init milestone-op
node ecl-tools.cjs init map-codebase
node ecl-tools.cjs init progress

# Workstream-scoped init (SDK --ws flag)
node ecl-tools.cjs init execute-phase <phase> --ws <name>
node ecl-tools.cjs init plan-phase <phase> --ws <name>
```

**Large payload handling:** When output exceeds ~50KB, the CLI writes to a temp file and returns `@file:/tmp/ecl-init-XXXXX.json`. Workflows check for the `@file:` prefix and read from disk:

```bash
INIT=$(node ecl-tools.cjs init execute-phase "1")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

---

## Milestone Commands

```bash
# Archive milestone
node ecl-tools.cjs milestone complete <version> [--name <name>] [--archive-phases]

# Mark requirements as complete
node ecl-tools.cjs requirements mark-complete <ids>
# Accepts: REQ-01,REQ-02 or REQ-01 REQ-02 or [REQ-01, REQ-02]
```

---

## Skill Manifest

Pre-compute and cache skill discovery for faster command loading.

```bash
# Generate skill manifest (writes to .claude/skill-manifest.json)
node ecl-tools.cjs skill-manifest

# Generate with custom output path
node ecl-tools.cjs skill-manifest --output <path>
```

Returns JSON mapping of all available eCL skills with their metadata (name, description, file path, argument hints). Used by the installer and session-start hooks to avoid repeated filesystem scans.

---

## Utility Commands

```bash
# Convert text to URL-safe slug
node ecl-tools.cjs generate-slug "Some Text Here"
# → some-text-here

# Get timestamp
node ecl-tools.cjs current-timestamp [full|date|filename]

# Count and list pending todos
node ecl-tools.cjs list-todos [area]

# Check file/directory existence
node ecl-tools.cjs verify-path-exists <path>

# Aggregate all SUMMARY.md data
node ecl-tools.cjs history-digest

# Extract structured data from SUMMARY.md
node ecl-tools.cjs summary-extract <path> [--fields field1,field2]

# Project statistics
node ecl-tools.cjs stats [json|table]

# Progress rendering
node ecl-tools.cjs progress [json|table|bar]

# Complete a todo
node ecl-tools.cjs todo complete <filename>

# UAT audit — scan all phases for unresolved items
node ecl-tools.cjs audit-uat

# Cross-artifact audit queue — scan `.planning/` for unresolved audit items
node ecl-tools.cjs audit-open [--json]

# Reverse-migrate a eCL-2 project into the current structure (backs `/ecl-import --from-ecl2`)
node ecl-tools.cjs from-ecl2 [--path <dir>] [--force] [--dry-run]

# Git commit with config checks
node ecl-tools.cjs commit <message> [--files f1 f2] [--amend] [--no-verify] [--respect-staged]
```

> `--no-verify`: Skips pre-commit hooks. Used by parallel executor agents during wave-based execution to avoid build lock contention (e.g., cargo lock fights in Rust projects). The orchestrator runs hooks once after each wave completes. Do not use `--no-verify` during sequential execution — let hooks run normally.
> `--files <paths>` **staging behaviour**: by default, `--files` runs `git add -- <path>` for each named file before committing. This overwrites any per-hunk staging set up via `git add -p`. Pass `--respect-staged` to skip the `git add` step and commit only what is already in the index within the requested pathspec. If nothing is staged within that scope, the command returns `{ committed: false, reason: 'nothing staged' }` without error. The trailing `-- <paths>` pathspec on the commit is applied under both modes, so files staged outside the `--files` scope are never included (#3061 invariant).

# Web search (requires Brave API key)
node ecl-tools.cjs websearch <query> [--limit N] [--freshness day|week|month]
```

---

## Graphify

Build, query, and inspect the project knowledge graph in `.planning/graphs/`. Requires `graphify.enabled: true` in `config.json` (see [Configuration Reference](CONFIGURATION.md#graphify-settings)). Graphify is **CJS-only**: `ecl-sdk query` does not yet register graphify handlers — always use `node ecl-tools.cjs graphify …`.

```bash
# Build or rebuild the knowledge graph
node ecl-tools.cjs graphify build

# Search the graph for a term
node ecl-tools.cjs graphify query <term>

# Show graph freshness and statistics
node ecl-tools.cjs graphify status

# Show changes since the last build
node ecl-tools.cjs graphify diff

# Write a named snapshot of the current graph
node ecl-tools.cjs graphify snapshot [name]
```

User-facing entry point: `/ecl-graphify` (see [Command Reference](COMMANDS.md#ecl-graphify)).

---

## Module Architecture

| Module | File | Exports |
|--------|------|---------|
| Core | `lib/core.cjs` | `error()`, `output()`, `parseArgs()`, shared utilities, compatibility re-exports |
| State | `lib/state.cjs` | All `state` subcommands, `state-snapshot` |
| Phase | `lib/phase.cjs` | Phase CRUD, `find-phase`, `phase-plan-index`, `phases list` |
| Planning Workspace | `lib/planning-workspace.cjs` | Planning seam: `planningDir`, `planningPaths`, active workstream routing, `.planning/.lock` |
| Roadmap | `lib/roadmap.cjs` | Roadmap parsing, phase extraction, progress updates |
| Config | `lib/config.cjs` | Config read/write, section initialization |
| Verify | `lib/verify.cjs` | All verification and validation commands |
| Template | `lib/template.cjs` | Template selection and variable filling |
| Frontmatter | `lib/frontmatter.cjs` | YAML frontmatter CRUD |
| Init | `lib/init.cjs` | Compound context loading for all workflows |
| Milestone | `lib/milestone.cjs` | Milestone archival, requirements marking |
| Commands | `lib/commands.cjs` | Misc: slug, timestamp, todos, scaffold, stats, websearch |
| Model Profiles | `lib/model-profiles.cjs` | Profile resolution table |
| UAT | `lib/uat.cjs` | Cross-phase UAT/verification audit |
| Profile Output | `lib/profile-output.cjs` | Developer profile formatting |
| Profile Pipeline | `lib/profile-pipeline.cjs` | Session analysis pipeline |
| Graphify | `lib/graphify.cjs` | Knowledge graph build/query/status/diff/snapshot (backs `/ecl-graphify`) |
| Learnings | `lib/learnings.cjs` | Extract learnings from phases/SUMMARY artifacts (backs `/ecl-extract-learnings`) |
| Audit | `lib/audit.cjs` | Phase/milestone audit queue handlers; `audit-open` helper |
| GSD2 Import | `lib/ecl2-import.cjs` | Reverse-migration importer from eCL-2 projects (backs `/ecl-import --from-ecl2`) |
| Intel | `lib/intel.cjs` | Queryable codebase intelligence index (backs `/ecl-map-codebase --query`) |

---

## Reviewer CLI Routing

`review.models.<cli>` maps a reviewer flavor to a shell command invoked by the code-review workflow. Set via [`/ecl-config --integrations`](COMMANDS.md#ecl-config) or directly:

```bash
ecl-sdk query config-set review.models.codex    "codex exec --model gpt-5"
ecl-sdk query config-set review.models.gemini   "gemini -m gemini-2.5-pro"
ecl-sdk query config-set review.models.opencode "opencode run --model claude-sonnet-4"
ecl-sdk query config-set review.models.claude   ""   # clear — fall back to session model
```

Slugs are validated against `[a-zA-Z0-9_-]+`; empty or path-containing slugs are rejected. See [`docs/CONFIGURATION.md`](CONFIGURATION.md#code-review-cli-routing) for the full field reference.

## Secret Handling

API keys configured via `/ecl-settings` (`brave_search`, `firecrawl`, `exa_search`) are written plaintext to `.planning/config.json` but are masked (`****<last-4>`) in every `config-set` / `config-get` output, confirmation table, and interactive prompt. See `evolv-coder-lite/bin/lib/secrets.cjs` for the masking implementation. The `config.json` file itself is the security boundary — protect it with filesystem permissions and keep it out of git (`.planning/` is gitignored by default).

---

## See also

- [sdk/src/query/QUERY-HANDLERS.md](../sdk/src/query/QUERY-HANDLERS.md) — registry matrix, routing, golden parity, intentional CJS differences
- [Architecture](ARCHITECTURE.md) — where `ecl-sdk query` fits in orchestration
- [Command Reference](COMMANDS.md) — user-facing `/ecl-` commands
