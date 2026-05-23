# eCL Shipped Surface Inventory

> Authoritative roster of every shipped eCL surface: commands, agents, workflows, references, CLI modules, and hooks. Where the broad docs (AGENTS.md, COMMANDS.md, ARCHITECTURE.md, CLI-TOOLS.md) diverge from the filesystem, treat this file and the repository tree itself as the source of truth.

## How To Use This File

- Counts here are derived from the filesystem at the v1.36.0 pin and may drift between releases. For live counts, run `ls commands/ecl/*.md | wc -l`, `ls agents/ecl-*.md | wc -l`, etc. against the checkout.
- This file enumerates every shipped surface across all six families (agents, commands, workflows, references, CLI modules, hooks). Broad docs may render narrative or curated subsets; when they disagree with the filesystem, this file and the directory listings are authoritative.
- New surfaces added after v1.36.0 should land here first, then propagate to the broad docs. The drift-control tests in `tests/inventory-counts.test.cjs`, `tests/commands-doc-parity.test.cjs`, `tests/agents-doc-parity.test.cjs`, `tests/cli-modules-doc-parity.test.cjs`, `tests/hooks-doc-parity.test.cjs`, `tests/architecture-counts.test.cjs`, and `tests/command-count-sync.test.cjs` anchor the counts and roster contents against the filesystem.

---

## Agents (33 shipped)

Full roster at `agents/ecl-*.md`. The "Primary doc" column flags whether [`docs/AGENTS.md`](AGENTS.md) carries a full role card (*primary*), a short stub in the "Advanced and Specialized Agents" section (*advanced stub*), or no coverage (*inventory only*).

| Agent | Role (one line) | Spawned by | Primary doc |
|-------|-----------------|------------|-------------|
| ecl-project-researcher | Researches domain ecosystem before roadmap creation (stack, features, architecture, pitfalls). | `/ecl-new-project`, `/ecl-new-milestone` | primary |
| ecl-phase-researcher | Researches implementation approach for a specific phase before planning. | `/ecl-plan-phase` | primary |
| ecl-ui-researcher | Produces UI design contracts for frontend phases. | `/ecl-ui-phase` | primary |
| ecl-assumptions-analyzer | Produces evidence-backed assumptions for discuss-phase (assumptions mode). | `discuss-phase-assumptions` workflow | primary |
| ecl-advisor-researcher | Researches a single gray-area decision during discuss-phase advisor mode. | `discuss-phase` workflow (advisor mode) | primary |
| ecl-research-synthesizer | Combines parallel researcher outputs into a unified SUMMARY.md. | `/ecl-new-project` | primary |
| ecl-planner | Creates executable phase plans with task breakdown and goal-backward verification. | `/ecl-plan-phase`, `/ecl-quick` | primary |
| ecl-roadmapper | Creates project roadmaps with phase breakdown and requirement mapping. | `/ecl-new-project` | primary |
| ecl-executor | Executes eCL plans with atomic commits and deviation handling. | `/ecl-execute-phase`, `/ecl-quick` | primary |
| ecl-plan-checker | Verifies plans will achieve phase goals (8 verification dimensions). | `/ecl-plan-phase` (verification loop) | primary |
| ecl-integration-checker | Verifies cross-phase integration and end-to-end flows. | `/ecl-audit-milestone` | primary |
| ecl-ui-checker | Validates UI-SPEC.md design contracts against quality dimensions. | `/ecl-ui-phase` (validation loop) | primary |
| ecl-verifier | Verifies phase goal achievement through goal-backward analysis. | `/ecl-execute-phase` | primary |
| ecl-nyquist-auditor | Fills Nyquist validation gaps by generating tests. | `/ecl-validate-phase` | primary |
| ecl-ui-auditor | Retroactive 6-pillar visual audit of implemented frontend code. | `/ecl-ui-review` | primary |
| ecl-codebase-mapper | Explores codebase and writes structured analysis documents. | `/ecl-map-codebase` | primary |
| ecl-debugger | Investigates bugs using scientific method with persistent state. | `/ecl-debug`, `/ecl-verify-work` | primary |
| ecl-user-profiler | Scores developer behavior across 8 dimensions. | `/ecl-profile-user` | primary |
| ecl-doc-writer | Writes and updates project documentation. | `/ecl-docs-update` | primary |
| ecl-doc-verifier | Verifies factual claims in generated documentation. | `/ecl-docs-update` | primary |
| ecl-security-auditor | Verifies threat mitigations from PLAN.md threat model. | `/ecl-secure-phase` | primary |
| ecl-pattern-mapper | Maps new files to closest existing analogs; writes PATTERNS.md for the planner. | `/ecl-plan-phase` (between research and planning) | advanced stub |
| ecl-debug-session-manager | Runs the full `/ecl-debug` checkpoint-and-continuation loop in isolated context so main stays lean. | `/ecl-debug` | advanced stub |
| ecl-code-reviewer | Reviews source files for bugs, security issues, and code-quality problems; produces REVIEW.md. | `/ecl-code-review` | advanced stub |
| ecl-code-fixer | Applies fixes to REVIEW.md findings with atomic per-fix commits; produces REVIEW-FIX.md. | `/ecl-code-review --fix` | advanced stub |
| ecl-ai-researcher | Researches a chosen AI framework's official docs into implementation-ready guidance (AI-SPEC.md §3–§4b). | `/ecl-ai-integration-phase` | advanced stub |
| ecl-domain-researcher | Surfaces domain-expert evaluation criteria and failure modes for an AI system (AI-SPEC.md §1b). | `/ecl-ai-integration-phase` | advanced stub |
| ecl-eval-planner | Designs structured evaluation strategy for an AI phase (AI-SPEC.md §5–§7). | `/ecl-ai-integration-phase` | advanced stub |
| ecl-eval-auditor | Retroactive audit of an AI phase's evaluation coverage; produces EVAL-REVIEW.md (COVERED/PARTIAL/MISSING). | `/ecl-eval-review` | advanced stub |
| ecl-framework-selector | ≤6-question interactive decision matrix that scores and recommends an AI/LLM framework. | `/ecl-ai-integration-phase` | advanced stub |
| ecl-intel-updater | Writes structured intel files (`.planning/intel/*.json`) used as a queryable codebase knowledge base. | `/ecl-map-codebase --query` | advanced stub |
| ecl-doc-classifier | Classifies a single planning document as ADR, PRD, SPEC, DOC, or UNKNOWN; spawned in parallel to process the doc corpus. | `/ecl-ingest-docs` | advanced stub |
| ecl-doc-synthesizer | Synthesizes classified planning docs into a single consolidated context with precedence rules, cycle detection, and three-bucket conflicts report. | `/ecl-ingest-docs` | advanced stub |

**Coverage note.** `docs/AGENTS.md` gives full role cards for 21 primary agents plus concise stubs for the 12 advanced agents. The Agent Tool Permissions Summary in that file covers only the primary 21 agents; the advanced agents' tool lists are captured in their per-agent frontmatter in `agents/ecl-*.md`.

---

## Commands (67 shipped)

Full roster at `commands/ecl/*.md`. The groupings below mirror `docs/COMMANDS.md` section order; each row carries the command name, a one-line role derived from the command's frontmatter `description:`, and a link to the source file. `tests/command-count-sync.test.cjs` locks the count against the filesystem.

### Namespace Meta-Skills

These six routers are descriptor-only entries that the model picks first; the body of each contains a routing table that points at the correct concrete sub-skill. They exist to keep the eager skill-listing token cost low while the full surface remains reachable. See [#2792](https://github.com/evolvconsulting/evolv-coder-lite/issues/2792) for the rationale; the routing tables target the post-[#2790](https://github.com/evolvconsulting/evolv-coder-lite/issues/2790) consolidated surface.

| Command | Role | Source |
|---------|------|--------|
| `/ecl-workflow` | Phase pipeline router — discuss / plan / execute / verify / phase / progress. | [commands/ecl/ns-workflow.md](../commands/ecl/ns-workflow.md) |
| `/ecl-project` | Project lifecycle router — milestones, audits, summary. | [commands/ecl/ns-project.md](../commands/ecl/ns-project.md) |
| `/ecl-quality` | Quality-gate router — code review, debug, audit, security, eval, ui. | [commands/ecl/ns-review.md](../commands/ecl/ns-review.md) |
| `/ecl-context` | Codebase-intelligence router — map, graphify, docs, learnings. | [commands/ecl/ns-context.md](../commands/ecl/ns-context.md) |
| `/ecl-manage` | Management router — config, workspace, workstreams, thread, update, ship, inbox. | [commands/ecl/ns-manage.md](../commands/ecl/ns-manage.md) |
| `/ecl-ideate` | Exploration & capture router — explore, sketch, spike, spec, capture. | [commands/ecl/ns-ideate.md](../commands/ecl/ns-ideate.md) |

### Core Workflow

| Command | Role | Source |
|---------|------|--------|
| `/ecl-new-project` | Initialize a new project with deep context gathering and PROJECT.md. | [commands/ecl/new-project.md](../commands/ecl/new-project.md) |
| `/ecl-workspace` | Manage eCL workspaces — create (`--new`), list (`--list`), or remove (`--remove`) isolated workspace environments. | [commands/ecl/workspace.md](../commands/ecl/workspace.md) |
| `/ecl-discuss-phase` | Gather phase context through adaptive questioning before planning. | [commands/ecl/discuss-phase.md](../commands/ecl/discuss-phase.md) |
| `/ecl-mvp-phase` | Plan a phase as a vertical MVP slice — user story, SPIDR splitting, then plan-phase. | [commands/ecl/mvp-phase.md](../commands/ecl/mvp-phase.md) |
| `/ecl-spec-phase` | Socratic spec refinement producing a SPEC.md with falsifiable requirements. | [commands/ecl/spec-phase.md](../commands/ecl/spec-phase.md) |
| `/ecl-ui-phase` | Generate UI design contract (UI-SPEC.md) for frontend phases. | [commands/ecl/ui-phase.md](../commands/ecl/ui-phase.md) |
| `/ecl-ai-integration-phase` | Generate AI design contract (AI-SPEC.md) via framework selection, research, and eval planning. | [commands/ecl/ai-integration-phase.md](../commands/ecl/ai-integration-phase.md) |
| `/ecl-plan-phase` | Create detailed phase plan (PLAN.md) with verification loop. | [commands/ecl/plan-phase.md](../commands/ecl/plan-phase.md) |
| `/ecl-plan-review-convergence` | Cross-AI plan convergence loop — replan with review feedback until no HIGH concerns remain (max 3 cycles). | [commands/ecl/plan-review-convergence.md](../commands/ecl/plan-review-convergence.md) |
| `/ecl-ultraplan-phase` | [BETA] Offload plan phase to Claude Code's ultraplan cloud — drafts remotely, review in browser, import back via `/ecl-import`. Claude Code only. | [commands/ecl/ultraplan-phase.md](../commands/ecl/ultraplan-phase.md) |
| `/ecl-spike` | Rapidly spike an idea with throwaway experiments; use `--wrap-up` to package findings as a persistent skill. | [commands/ecl/spike.md](../commands/ecl/spike.md) |
| `/ecl-sketch` | Rapidly sketch UI/design ideas using throwaway HTML mockups; use `--wrap-up` to package findings. | [commands/ecl/sketch.md](../commands/ecl/sketch.md) |
| `/ecl-execute-phase` | Execute all plans in a phase with wave-based parallelization. | [commands/ecl/execute-phase.md](../commands/ecl/execute-phase.md) |
| `/ecl-verify-work` | Validate built features through conversational UAT with auto-diagnosis. | [commands/ecl/verify-work.md](../commands/ecl/verify-work.md) |
| `/ecl-ship` | Create PR, run review, and prepare for merge after verification. | [commands/ecl/ship.md](../commands/ecl/ship.md) |
| `/ecl-fast` | Execute a trivial task inline — no subagents, no planning overhead. | [commands/ecl/fast.md](../commands/ecl/fast.md) |
| `/ecl-quick` | Execute a quick task with eCL guarantees (atomic commits, state tracking) but skip optional agents. | [commands/ecl/quick.md](../commands/ecl/quick.md) |
| `/ecl-ui-review` | Retroactive 6-pillar visual audit of implemented frontend code. | [commands/ecl/ui-review.md](../commands/ecl/ui-review.md) |
| `/ecl-code-review` | Review source files changed during a phase for bugs, security, and code-quality problems; use `--fix` to auto-apply findings. | [commands/ecl/code-review.md](../commands/ecl/code-review.md) |
| `/ecl-eval-review` | Retroactively audit an executed AI phase's evaluation coverage; produces EVAL-REVIEW.md. | [commands/ecl/eval-review.md](../commands/ecl/eval-review.md) |

### Phase & Milestone Management

| Command | Role | Source |
|---------|------|--------|
| `/ecl-phase` | CRUD for phases — add (default), insert (`--insert`), remove (`--remove`), or edit (`--edit`) phases in ROADMAP.md. | [commands/ecl/phase.md](../commands/ecl/phase.md) |
| `/ecl-add-tests` | Generate tests for a completed phase based on UAT criteria and implementation. | [commands/ecl/add-tests.md](../commands/ecl/add-tests.md) |
| `/ecl-validate-phase` | Retroactively audit and fill Nyquist validation gaps for a completed phase. | [commands/ecl/validate-phase.md](../commands/ecl/validate-phase.md) |
| `/ecl-secure-phase` | Retroactively verify threat mitigations for a completed phase. | [commands/ecl/secure-phase.md](../commands/ecl/secure-phase.md) |
| `/ecl-audit-milestone` | Audit milestone completion against original intent before archiving. | [commands/ecl/audit-milestone.md](../commands/ecl/audit-milestone.md) |
| `/ecl-audit-uat` | Cross-phase audit of all outstanding UAT and verification items. | [commands/ecl/audit-uat.md](../commands/ecl/audit-uat.md) |
| `/ecl-audit-fix` | Autonomous audit-to-fix pipeline — find issues, classify, fix, test, commit. | [commands/ecl/audit-fix.md](../commands/ecl/audit-fix.md) |
| `/ecl-complete-milestone` | Archive completed milestone and prepare for next version. | [commands/ecl/complete-milestone.md](../commands/ecl/complete-milestone.md) |
| `/ecl-new-milestone` | Start a new milestone cycle — update PROJECT.md and route to requirements. | [commands/ecl/new-milestone.md](../commands/ecl/new-milestone.md) |
| `/ecl-milestone-summary` | Generate a comprehensive project summary from milestone artifacts. | [commands/ecl/milestone-summary.md](../commands/ecl/milestone-summary.md) |
| `/ecl-cleanup` | Archive accumulated phase directories from completed milestones. | [commands/ecl/cleanup.md](../commands/ecl/cleanup.md) |
| `/ecl-manager` | Interactive command center for managing multiple phases from one terminal. | [commands/ecl/manager.md](../commands/ecl/manager.md) |
| `/ecl-workstreams` | Manage parallel workstreams — list, create, switch, status, progress, complete, resume. | [commands/ecl/workstreams.md](../commands/ecl/workstreams.md) |
| `/ecl-autonomous` | Run all remaining phases autonomously — discuss → plan → execute per phase. | [commands/ecl/autonomous.md](../commands/ecl/autonomous.md) |
| `/ecl-undo` | Safe git revert — roll back phase or plan commits using the phase manifest. | [commands/ecl/undo.md](../commands/ecl/undo.md) |

### Session & Navigation

| Command | Role | Source |
|---------|------|--------|
| `/ecl-progress` | Check project progress, show context, and route to next action; use `--next` to advance automatically or `--do` to run a freeform task. | [commands/ecl/progress.md](../commands/ecl/progress.md) |
| `/ecl-capture` | Capture ideas, tasks, notes, and seeds — todo (default), `--note`, `--backlog`, `--seed`, or `--list` pending todos. | [commands/ecl/capture.md](../commands/ecl/capture.md) |
| `/ecl-stats` | Display project statistics — phases, plans, requirements, git metrics, timeline. | [commands/ecl/stats.md](../commands/ecl/stats.md) |
| `/ecl-pause-work` | Create context handoff when pausing work mid-phase. | [commands/ecl/pause-work.md](../commands/ecl/pause-work.md) |
| `/ecl-resume-work` | Resume work from previous session with full context restoration. | [commands/ecl/resume-work.md](../commands/ecl/resume-work.md) |
| `/ecl-explore` | Socratic ideation and idea routing — think through ideas before committing. | [commands/ecl/explore.md](../commands/ecl/explore.md) |
| `/ecl-review-backlog` | Review and promote backlog items to active milestone. | [commands/ecl/review-backlog.md](../commands/ecl/review-backlog.md) |
| `/ecl-thread` | Manage persistent context threads for cross-session work. | [commands/ecl/thread.md](../commands/ecl/thread.md) |

### Codebase Intelligence

| Command | Role | Source |
|---------|------|--------|
| `/ecl-map-codebase` | Analyze codebase with parallel mapper agents; use `--fast` for lightweight scan or `--query` for intel queries. | [commands/ecl/map-codebase.md](../commands/ecl/map-codebase.md) |
| `/ecl-graphify` | Build, query, and inspect the project knowledge graph in `.planning/graphs/`. | [commands/ecl/graphify.md](../commands/ecl/graphify.md) |
| `/ecl-extract-learnings` | Extract decisions, lessons, patterns, and surprises from completed phase artifacts. | [commands/ecl/extract-learnings.md](../commands/ecl/extract-learnings.md) |

### Review, Debug & Recovery

| Command | Role | Source |
|---------|------|--------|
| `/ecl-review` | Request cross-AI peer review of phase plans from external AI CLIs. | [commands/ecl/review.md](../commands/ecl/review.md) |
| `/ecl-debug` | Systematic debugging with persistent state across context resets. | [commands/ecl/debug.md](../commands/ecl/debug.md) |
| `/ecl-forensics` | Post-mortem investigation for failed eCL workflows — analyzes git, artifacts, state. | [commands/ecl/forensics.md](../commands/ecl/forensics.md) |
| `/ecl-health` | Diagnose planning directory health and optionally repair issues. | [commands/ecl/health.md](../commands/ecl/health.md) |
| `/ecl-import` | Ingest external plans with conflict detection against project decisions. | [commands/ecl/import.md](../commands/ecl/import.md) |
| `/ecl-inbox` | Triage and review all open GitHub issues and PRs against project templates. | [commands/ecl/inbox.md](../commands/ecl/inbox.md) |

### Docs, Profile & Utilities

| Command | Role | Source |
|---------|------|--------|
| `/ecl-docs-update` | Generate or update project documentation verified against the codebase. | [commands/ecl/docs-update.md](../commands/ecl/docs-update.md) |
| `/ecl-ingest-docs` | Scan a repo for mixed ADRs/PRDs/SPECs/DOCs and bootstrap or merge the full `.planning/` setup with classification, synthesis, and conflicts report. | [commands/ecl/ingest-docs.md](../commands/ecl/ingest-docs.md) |
| `/ecl-profile-user` | Generate developer behavioral profile and Claude-discoverable artifacts. | [commands/ecl/profile-user.md](../commands/ecl/profile-user.md) |
| `/ecl-settings` | Configure eCL workflow toggles and model profile. | [commands/ecl/settings.md](../commands/ecl/settings.md) |
| `/ecl-config` | Configure eCL settings — workflow toggles (default), advanced knobs (`--advanced`), integrations (`--integrations`), or model profile (`--profile`). | [commands/ecl/config.md](../commands/ecl/config.md) |
| `/ecl-pr-branch` | Create a clean PR branch by filtering out `.planning/` commits. | [commands/ecl/pr-branch.md](../commands/ecl/pr-branch.md) |
| `/ecl-surface` | Toggle which skills are surfaced — apply a profile, list, or disable a cluster without reinstall. | [commands/ecl/surface.md](../commands/ecl/surface.md) |
| `/ecl-update` | Update eCL to latest version; use `--sync` to sync skills across runtimes or `--reapply` to reapply local patches. | [commands/ecl/update.md](../commands/ecl/update.md) |
| `/ecl-help` | Show available eCL commands and usage guide. | [commands/ecl/help.md](../commands/ecl/help.md) |

---

## Workflows (88 shipped)

Full roster at `evolv-coder-lite/workflows/*.md`. Workflows are thin orchestrators that commands reference internally; most are not read directly by end users. Rows below map each workflow file to its role (derived from the `<purpose>` block) and, where applicable, to the command that invokes it.

| Workflow | Role | Invoked by |
|----------|------|------------|
| `add-backlog.md` | Add a backlog item to ROADMAP.md using 999.x numbering. | `/ecl-capture --backlog` |
| `add-phase.md` | Add a new integer phase to the end of the current milestone in the roadmap. | `/ecl-phase` (default) |
| `add-tests.md` | Generate unit and E2E tests for a completed phase based on its artifacts. | `/ecl-add-tests` |
| `add-todo.md` | Capture an idea or task that surfaces during a session as a structured todo. | `/ecl-capture` (default) |
| `ai-integration-phase.md` | Orchestrate framework selection → AI research → domain research → eval planning into AI-SPEC.md. | `/ecl-ai-integration-phase` |
| `analyze-dependencies.md` | Analyze ROADMAP.md phases for file overlap and semantic dependencies; suggest `Depends on` edges. | `/ecl-manager --analyze-deps` |
| `audit-fix.md` | Autonomous audit-to-fix pipeline — run audit, parse, classify, fix, test, commit. | `/ecl-audit-fix` |
| `audit-milestone.md` | Verify milestone met its definition of done by aggregating phase verifications. | `/ecl-audit-milestone` |
| `audit-uat.md` | Cross-phase audit of UAT and verification files; produces prioritized outstanding-items list. | `/ecl-audit-uat` |
| `autonomous.md` | Drive milestone phases autonomously — all remaining, a range, or a single phase. | `/ecl-autonomous` |
| `check-todos.md` | List pending todos, allow selection, load context, and route to the appropriate action. | `/ecl-capture --list` |
| `cleanup.md` | Archive accumulated phase directories from completed milestones. | `/ecl-cleanup` |
| `code-review-fix.md` | Auto-fix issues from REVIEW.md via ecl-code-fixer with per-fix atomic commits. | `/ecl-code-review --fix` |
| `code-review.md` | Review phase source changes via ecl-code-reviewer; produces REVIEW.md. | `/ecl-code-review` |
| `complete-milestone.md` | Mark a shipped version as complete — MILESTONES.md entry, PROJECT.md evolution, tag. | `/ecl-complete-milestone` |
| `diagnose-issues.md` | Orchestrate parallel debug agents to investigate UAT gaps and find root causes. | `/ecl-verify-work` (auto-diagnosis) |
| `discovery-phase.md` | Execute discovery at the appropriate depth level. | `/ecl-new-project` (discovery path) |
| `discuss-phase-assumptions.md` | Assumptions-mode discuss — extract implementation decisions via codebase-first analysis. | `/ecl-discuss-phase` (when `discuss_mode=assumptions`) |
| `discuss-phase-power.md` | Power-user discuss — pre-generate all questions into a JSON state file + HTML UI. | `/ecl-discuss-phase --power` |
| `discuss-phase.md` | Extract implementation decisions through iterative gray-area discussion. | `/ecl-discuss-phase` |
| `mvp-phase.md` | Plan a phase as a vertical MVP slice — user story, SPIDR splitting, then plan-phase. | `/ecl-mvp-phase` |
| `do.md` | Route freeform text from the user to the best matching eCL command. | `/ecl-progress --do` |
| `docs-update.md` | Generate, update, and verify canonical and hand-written project documentation. | `/ecl-docs-update` |
| `edit-phase.md` | Edit any field of an existing phase in ROADMAP.md in place, preserving number and position. | `/ecl-phase --edit` |
| `eval-review.md` | Retroactive audit of an implemented AI phase's evaluation coverage. | `/ecl-eval-review` |
| `execute-phase.md` | Execute all plans in a phase using wave-based parallel execution. | `/ecl-execute-phase` |
| `execute-plan.md` | Execute a phase prompt (PLAN.md) and create the outcome summary (SUMMARY.md). | `execute-phase.md` (per-plan subagent) |
| `explore.md` | Socratic ideation — guide the developer through probing questions. | `/ecl-explore` |
| `debug.md` | Systematic debugging — subcommand routing, session creation, delegation to ecl-debug-session-manager. | `/ecl-debug` |
| `extract-learnings.md` | Extract decisions, lessons, patterns, and surprises from completed phase artifacts. | `/ecl-extract-learnings` |
| `fast.md` | Execute a trivial task inline without subagent overhead. | `/ecl-fast` |
| `forensics.md` | Forensics investigation of failed workflows — git, artifacts, and state analysis. | `/ecl-forensics` |
| `graduation.md` | Cluster recurring LEARNINGS.md items across phases and surface HITL promotion candidates. | `transition.md` (graduation_scan step) |
| `health.md` | Validate `.planning/` directory integrity and report actionable issues. | `/ecl-health` |
| `help.md` | Display the complete eCL command reference. | `/ecl-help` |
| `import.md` | Ingest external plans with conflict detection against existing project decisions. | `/ecl-import` |
| `inbox.md` | Triage open GitHub issues and PRs against project contribution templates. | `/ecl-inbox` |
| `ingest-docs.md` | Scan a repo for mixed planning docs; classify, synthesize, and bootstrap or merge into `.planning/` with a conflicts report. | `/ecl-ingest-docs` |
| `insert-phase.md` | Insert a decimal phase for urgent work discovered mid-milestone. | `/ecl-phase --insert` |
| `list-phase-assumptions.md` | Surface Claude's assumptions about a phase before planning. | `/ecl-discuss-phase --assumptions` |
| `list-workspaces.md` | List all eCL workspaces found in `~/ecl-workspaces/` with their status. | `/ecl-workspace --list` |
| `manager.md` | Interactive milestone command center — dashboard, inline discuss, background plan/execute. | `/ecl-manager` |
| `map-codebase.md` | Orchestrate parallel codebase mapper agents to produce `.planning/codebase/` docs. | `/ecl-map-codebase` |
| `milestone-summary.md` | Milestone summary synthesis — onboarding and review artifact from milestone artifacts. | `/ecl-milestone-summary` |
| `new-milestone.md` | Start a new milestone cycle — load project context, gather goals, update PROJECT.md/STATE.md. | `/ecl-new-milestone` |
| `new-project.md` | Unified new-project flow — questioning, research (optional), requirements, roadmap. | `/ecl-new-project` |
| `new-workspace.md` | Create an isolated workspace with repo worktrees/clones and an independent `.planning/`. | `/ecl-workspace --new` |
| `next.md` | Detect current project state and automatically advance to the next logical step. | `/ecl-progress --next` |
| `node-repair.md` | Autonomous repair operator for failed task verification; invoked by `execute-plan`. | `execute-plan.md` (recovery) |
| `note.md` | Zero-friction idea capture — one Write call, one confirmation line. | `/ecl-capture --note` |
| `pause-work.md` | Create structured `.planning/HANDOFF.json` and `.continue-here.md` handoff files. | `/ecl-pause-work` |
| `plan-phase.md` | Create executable PLAN.md files with integrated research and verification loop. | `/ecl-plan-phase`, `/ecl-quick` |
| `plan-review-convergence.md` | Cross-AI plan convergence loop — replan with review feedback until no HIGH concerns remain. | `/ecl-plan-review-convergence` |
| `plant-seed.md` | Capture a forward-looking idea as a structured seed file with trigger conditions. | `/ecl-capture --seed` |
| `pr-branch.md` | Create a clean branch for pull requests by filtering `.planning/` commits. | `/ecl-pr-branch` |
| `profile-user.md` | Orchestrate the full developer profiling flow — consent, session scan, profile generation. | `/ecl-profile-user` |
| `progress.md` | Progress rendering — project context, position, and next-action routing. | `/ecl-progress` |
| `quick.md` | Quick-task execution with eCL guarantees (atomic commits, state tracking). | `/ecl-quick` |
| `reapply-patches.md` | Reapply local modifications after a eCL update. | `/ecl-update --reapply` |
| `remove-phase.md` | Remove a future phase from the roadmap and renumber subsequent phases. | `/ecl-phase --remove` |
| `remove-workspace.md` | Remove a eCL workspace and clean up worktrees. | `/ecl-workspace --remove` |
| `resume-project.md` | Resume work — restore full context from STATE.md, HANDOFF.json, and artifacts. | `/ecl-resume-work` |
| `review.md` | Cross-AI plan review via external CLIs; produces REVIEWS.md. | `/ecl-review` |
| `scan.md` | Rapid single-focus codebase scan — lightweight alternative to map-codebase. | `/ecl-map-codebase --fast` |
| `secure-phase.md` | Retroactive threat-mitigation audit for a completed phase. | `/ecl-secure-phase` |
| `session-report.md` | Session report — token usage, work summary, outcomes. | `/ecl-pause-work --report` |
| `settings.md` | Configure eCL workflow toggles and model profile. | `/ecl-settings`, `/ecl-config --profile` |
| `settings-advanced.md` | Configure eCL power-user knobs — plan bounce, timeouts, branch templates, cross-AI execution, runtime knobs. | `/ecl-config --advanced` |
| `settings-integrations.md` | Configure third-party API keys (Brave/Firecrawl/Exa), `review.models.<cli>` CLI routing, and `agent_skills.<agent-type>` injection with masked (`****<last-4>`) display. | `/ecl-config --integrations` |
| `ship.md` | Create PR, run review, and prepare for merge after verification. | `/ecl-ship` |
| `sketch.md` | Explore design directions through throwaway HTML mockups with 2-3 variants per sketch. | `/ecl-sketch` |
| `sketch-wrap-up.md` | Curate sketch findings and package them as a persistent `sketch-findings-[project]` skill. | `/ecl-sketch --wrap-up` |
| `spec-phase.md` | Socratic spec refinement with ambiguity scoring; produces SPEC.md. | `/ecl-spec-phase` |
| `spike.md` | Rapid feasibility validation through focused, throwaway experiments. | `/ecl-spike` |
| `spike-wrap-up.md` | Curate spike findings and package them as a persistent `spike-findings-[project]` skill. | `/ecl-spike --wrap-up` |
| `stats.md` | Project statistics rendering — phases, plans, requirements, git metrics. | `/ecl-stats` |
| `sync-skills.md` | Cross-runtime eCL skill sync — diff and apply `ecl-*` skill directories across runtime roots. | `/ecl-update --sync` |
| `transition.md` | Phase-boundary transition workflow — workstream checks, state advancement. | `execute-phase.md`, `/ecl-progress --next` |
| `ui-phase.md` | Generate UI-SPEC.md design contract via ecl-ui-researcher. | `/ecl-ui-phase` |
| `ui-review.md` | Retroactive 6-pillar visual audit via ecl-ui-auditor. | `/ecl-ui-review` |
| `ultraplan-phase.md` | [BETA] Offload planning to Claude Code's ultraplan cloud; drafts remotely and imports back via `/ecl-import`. | `/ecl-ultraplan-phase` |
| `undo.md` | Safe git revert — phase or plan commits using the phase manifest. | `/ecl-undo` |
| `thread.md` | Create, list, close, or resume persistent context threads for cross-session work. | `/ecl-thread` |
| `update.md` | Update eCL to latest version with changelog display. | `/ecl-update` |
| `validate-phase.md` | Retroactively audit and fill Nyquist validation gaps for a completed phase. | `/ecl-validate-phase` |
| `verify-phase.md` | Verify phase goal achievement through goal-backward analysis. | `execute-phase.md` (post-execution) |
| `verify-work.md` | Conversational UAT with auto-diagnosis — produces UAT.md and fix plans. | `/ecl-verify-work` |

> **Note:** Some workflows have no direct user-facing command (e.g. `execute-plan.md`, `verify-phase.md`, `transition.md`, `node-repair.md`, `diagnose-issues.md`) — they are invoked internally by orchestrator workflows. `discovery-phase.md` is an alternate entry for `/ecl-new-project`.

---

## References (61 shipped)

Full roster at `evolv-coder-lite/references/*.md`. References are shared knowledge documents that workflows and agents `@-reference`. The groupings below match [`docs/ARCHITECTURE.md`](ARCHITECTURE.md#references-evolv-coder-litereferencesmd) — core, workflow, thinking-model clusters, and the modular planner decomposition.

### Core References

| Reference | Role |
|-----------|------|
| `checkpoints.md` | Checkpoint type definitions and interaction patterns. |
| `gates.md` | 4 canonical gate types (Confirm, Quality, Safety, Transition) wired into plan-checker and verifier. |
| `model-profiles.md` | Per-agent model tier assignments. |
| `model-profile-resolution.md` | Model resolution algorithm documentation. |
| `verification-patterns.md` | How to verify different artifact types. |
| `verification-overrides.md` | Per-artifact verification override rules. |
| `planning-config.md` | Full config schema and behavior. |
| `git-integration.md` | Git commit, branching, and history patterns. |
| `git-planning-commit.md` | Planning directory commit conventions. |
| `questioning.md` | Dream-extraction philosophy for project initialization. |
| `tdd.md` | Test-driven development integration patterns. |
| `ui-brand.md` | Visual output formatting patterns. |
| `common-bug-patterns.md` | Common bug patterns for code review and verification. |
| `debugger-philosophy.md` | Evergreen debugging disciplines loaded by `ecl-debugger`. |
| `mandatory-initial-read.md` | Shared required-reading boilerplate injected into agent prompts. |
| `project-skills-discovery.md` | Shared project-skills-discovery boilerplate injected into agent prompts. |

### Workflow References

| Reference | Role |
|-----------|------|
| `agent-contracts.md` | Formal interface between orchestrators and agents. |
| `context-budget.md` | Context window budget allocation rules. |
| `continuation-format.md` | Session continuation/resume format. |
| `domain-probes.md` | Domain-specific probing questions for discuss-phase. |
| `gate-prompts.md` | Gate/checkpoint prompt templates. |
| `scout-codebase.md` | Phase-type→codebase-map selection table for discuss-phase scout step (extracted via #2551). |
| `revision-loop.md` | Plan revision iteration patterns. |
| `universal-anti-patterns.md` | Universal anti-patterns to detect and avoid. |
| `worktree-path-safety.md` | Worktree guard suite: HEAD assertion, cwd-drift sentinel (step 0a, #3097), and absolute-path guard (step 0b, #3099) — loaded into executor spawn prompts via `<execution_context>`. |
| `artifact-types.md` | Planning artifact type definitions. |
| `phase-argument-parsing.md` | Phase argument parsing conventions. |
| `decimal-phase-calculation.md` | Decimal sub-phase numbering rules. |
| `workstream-flag.md` | Workstream active-pointer conventions (`--ws`). |
| `user-profiling.md` | User behavioral profiling detection heuristics. |
| `thinking-partner.md` | Conditional thinking-partner activation at decision points. |
| `autonomous-smart-discuss.md` | Smart-discuss logic for autonomous mode. |
| `ios-scaffold.md` | iOS application scaffolding patterns. |
| `ai-evals.md` | AI evaluation design reference for `/ecl-ai-integration-phase`. |
| `ai-frameworks.md` | AI framework decision-matrix reference for `ecl-framework-selector`. |
| `executor-examples.md` | Worked examples for the ecl-executor agent. |
| `doc-conflict-engine.md` | Shared conflict-detection contract for ingest/import workflows. |
| `execute-mvp-tdd.md` | Runtime gate semantics for execute-phase under MVP+TDD — pre-task failing-test verification, end-of-phase blocking review. |
| `verify-mvp-mode.md` | UAT framing rules for MVP-mode phases — user-flow-first ordering, deferred technical checks, user-story-format guard. |

### Sketch References

References consumed by the `/ecl-sketch` workflow and its wrap-up companion.

| Reference | Role |
|-----------|------|
| `sketch-interactivity.md` | Rules for making HTML sketches feel interactive and alive. |
| `sketch-theme-system.md` | Shared CSS theme variable system for cross-sketch consistency. |
| `sketch-tooling.md` | Floating toolbar utilities included in every sketch. |
| `sketch-variant-patterns.md` | Multi-variant HTML patterns (tabs, side-by-side, overlays). |

### Thinking-Model References

References for integrating thinking-class models (o3, o4-mini, Gemini 2.5 Pro) into eCL workflows.

| Reference | Role |
|-----------|------|
| `thinking-models-debug.md` | Thinking-model patterns for debug workflows. |
| `thinking-models-execution.md` | Thinking-model patterns for execution agents. |
| `thinking-models-planning.md` | Thinking-model patterns for planning agents. |
| `thinking-models-research.md` | Thinking-model patterns for research agents. |
| `thinking-models-verification.md` | Thinking-model patterns for verification agents. |

### Modular Planner Decomposition

The `ecl-planner` agent is decomposed into a core agent plus reference modules to fit runtime character limits.

| Reference | Role |
|-----------|------|
| `planner-antipatterns.md` | Planner anti-patterns and specificity examples. |
| `planner-chunked.md` | Chunked mode return formats (`## OUTLINE COMPLETE`, `## PLAN COMPLETE`) for Windows stdio hang mitigation. |
| `planner-gap-closure.md` | Gap-closure mode behavior (reads VERIFICATION.md, targeted replanning). |
| `planner-reviews.md` | Cross-AI review integration (reads REVIEWS.md from `/ecl-review`). |
| `planner-revision.md` | Plan revision patterns for iterative refinement. |
| `planner-source-audit.md` | Planner source-audit and authority-limit rules. |
| `planner-mvp-mode.md` | Vertical-slice planning rules for MVP mode. |
| `planner-human-verify-mode.md` | Rules for `workflow.human_verify_mode = end-of-phase`: suppress `checkpoint:human-verify` task emission and route deferred items via `<verify><human-check>`. |
| `planner-graphify-auto-update.md` | How `load_graph_context` surfaces `.last-build-status.json` auto-update state (running / failed / stale head) alongside the existing staleness annotation. Opt-in via `graphify.auto_update` (#3347). |
| `skeleton-template.md` | SKELETON.md template emitted for new-project Walking Skeleton (Phase 1 + `--mvp`). |
| `user-story-template.md` | User story format for MVP planning — "As a / I want to / So that" structured fields. |
| `spidr-splitting.md` | SPIDR splitting decomposition rules for handling large user stories in MVP mode. |

> **Subdirectory:** `evolv-coder-lite/references/few-shot-examples/` contains additional few-shot examples (`plan-checker.md`, `verifier.md`) that are referenced from specific agents. These are not counted in the 61 top-level references.

---

## CLI Modules (74 shipped)

Full listing: `evolv-coder-lite/bin/lib/*.cjs`.

| Module | Responsibility |
|--------|----------------|
| `active-workstream-store.cjs` | Workstream source precedence and selection (CLI `--ws` > `ECL_WORKSTREAM` env > stored pointer); name validation and environment propagation |
| `adr-parser.cjs` | ADR decision parser for plan-phase ingest express path; normalizes section synonyms, parses status/decision/scope fences, and enforces status rejection gates |
| `artifacts.cjs` | Canonical artifact registry — known `.planning/` root file names; used by `ecl-health` W019 lint |
| `audit.cjs` | Audit dispatch, audit open sessions, audit storage helpers |
| `cjs-command-router-adapter.cjs` | Shared compatibility adapter for manifest-backed CJS command-family routers |
| `cjs-sdk-bridge.cjs` | Shared SDK runtime-bridge loader (`tryLoadSdk`/`getExecuteForCjs`); consumed by every CJS router and `ecl-tools.cjs` to delegate canonical commands to the SDK in-process |
| `clusters.cjs` | Skill cluster definitions for the runtime surface module (ADR-0011 Phase 2) |
| `code-review-flags.cjs` | Typed flag parser for `/ecl:code-review`; exports `parseCodeReviewFlags(argv)` (→ `{ fix, all, auto, depth, files }`) and `resolveCodeReviewWorkflow(flags)` (→ `'code-review.md' \| 'code-review-fix.md'`); canonical dispatch seam for `--fix`/`--all`/`--auto` routing |
| `command-aliases.generated.cjs` | Generated CJS alias/subcommand metadata for manifest-backed family routers |
| `command-routing-hub.cjs` | Pure-result dispatch hub that centralizes mode decision (SDK vs CJS), error taxonomy, and no-throw contract for all command-family routers (#3788) |
| `commands.cjs` | Misc CLI commands (slug, timestamp, todos, scaffolding, stats) |
| `config-schema.cjs` | Single source of truth for `VALID_CONFIG_KEYS` and dynamic key patterns; imported by both the validator and the config-schema-docs parity test |
| `config.cjs` | `config.json` read/write, section initialization; imports validator from `config-schema.cjs` |
| `configuration.generated.cjs` | Generated Configuration Module — canonical config loading, legacy-key normalization, defaults merge, and explicit on-disk migration; source of truth for both SDK and CJS consumers |
| `context-utilization.cjs` | Pure classifier for `ecl-health --context` — turns (tokensUsed, contextWindow) into a `{ percent, state }` triage result against the 60%/70% fracture-point thresholds (#2792) |
| `core.cjs` | Error handling, output formatting, shared utilities, runtime fallbacks; compatibility re-exports for planning-workspace helpers |
| `decisions.cjs` | CJS shim adapter — re-exports from `decisions.generated.cjs` (Phase 6/#3575 Shared Module migration) |
| `decisions.generated.cjs` | GENERATED — CJS artifact emitted from `sdk/src/query/decisions.ts` via `sdk/scripts/gen-decisions.mjs`; parses CONTEXT.md `<decisions>` blocks, accepts numeric (D-42) and alphanumeric (D-INFRA-01) IDs, returns `{id, text, category, tags, trackable}`; do not edit directly |
| `docs.cjs` | Docs-update workflow init, Markdown scanning, monorepo detection |
| `drift.cjs` | Post-execute codebase structural drift detector (#2003): classifies file changes into new-dir/barrel/migration/route categories and round-trips `last_mapped_commit` frontmatter |
| `fallow-runner.cjs` | Fallow audit adapter for `/ecl-code-review`: binary resolution (`PATH` then `node_modules/.bin`), actionable missing-binary errors, and structural findings normalization |
| `frontmatter.cjs` | YAML frontmatter CRUD operations |
| `gap-checker.cjs` | Post-planning gap analysis (#2493): unified REQUIREMENTS.md + CONTEXT.md decisions vs PLAN.md coverage report (`ecl-tools gap-analysis`) |
| `graphify.cjs` | Knowledge-graph build/query/status/diff for `/ecl-graphify` |
| `ecl2-import.cjs` | External-plan ingest for `/ecl-import --from-ecl2` |
| `init-command-router.cjs` | Thin CJS subcommand router adapter for `ecl-tools init` |
| `init.cjs` | Compound context loading for each workflow type |
| `install-profiles.cjs` | Install profile allowlist + skill staging for `--minimal` install (#2762); single source of truth for which `ecl-*` skills/agents land in runtime config dirs |
| `installer-migration-authoring.cjs` | Installer migration authoring guardrails for record metadata, explicit scopes, ownership evidence, and runtime contract citations |
| `installer-migration-report.cjs` | Installer migration report projection and blocked-action guard for install/update integration |
| `installer-migrations.cjs` | Installer migration planning, artifact classification, install-state persistence, journaled apply, and rollback helpers |
| `intel.cjs` | Codebase intel store backing `/ecl-map-codebase --query` and `ecl-intel-updater` |
| `learnings.cjs` | Cross-phase learnings extraction for `/ecl-extract-learnings` |
| `milestone.cjs` | Milestone archival, requirements marking |
| `model-catalog.cjs` | CJS adapter over the shared model catalog JSON; exports canonical runtime tier defaults, agent profile maps, alias maps, and routing metadata for all CLI consumers |
| `model-profiles.cjs` | Backward-compatible profile helpers derived from `model-catalog.cjs`; no longer owns its own model table |
| `phase-command-router.cjs` | Thin CJS subcommand router adapter for `ecl-tools phase` |
| `phase.cjs` | Phase directory operations, decimal numbering, plan indexing |
| `phases-command-router.cjs` | Thin CJS subcommand router adapter for `ecl-tools phases` |
| `plan-scan.cjs` | CJS shim adapter — re-exports from `plan-scan.generated.cjs` (Phase 6/#3575 Shared Module migration) |
| `plan-scan.generated.cjs` | GENERATED — CJS artifact emitted from `sdk/src/query/plan-scan.ts` via `sdk/scripts/gen-plan-scan.mjs`; canonical phase-plan scanner for detecting plan and summary files in flat and nested layouts (k014); do not edit directly |
| `planning-workspace.cjs` | Planning path/workstream seam (`planningDir`, `planningPaths`, active-workstream routing, `.planning/.lock` orchestration) |
| `project-root.generated.cjs` | GENERATED — CJS artifact emitted from `sdk/src/project-root/index.ts` via `sdk/scripts/gen-project-root.mjs`; resolves a project root from a starting directory using four heuristics (own `.planning/` guard, `sub_repos` config, `multiRepo` flag, `.git` heuristic); do not edit directly |
| `profile-output.cjs` | Profile rendering, USER-PROFILE.md and dev-preferences.md generation |
| `profile-pipeline.cjs` | User behavioral profiling data pipeline, session file scanning |
| `prompt-budget.cjs` | Pure token-budget accounting for review prompts — estimates tokens, applies deterministic trim priority (head-shrink PROJECT.md, proportional plan truncation, drop context/research/requirements, hard-fail guard), returns structured metadata for `review.max_prompt_tokens` (#3081) |
| `review-reviewer-selection.cjs` | Reviewer selection/normalization helpers for `/ecl-review` default reviewer policy and precedence |
| `roadmap-command-router.cjs` | Thin CJS subcommand router adapter for `ecl-tools roadmap` |
| `roadmap.cjs` | ROADMAP.md parsing, phase extraction, plan progress |
| `runtime-artifact-layout.cjs` | Runtime artifact layout module — resolves the artifact directory shapes (commands, agents, skills) for each supported runtime; single source of truth for per-runtime artifact placement (#3663) |
| `runtime-homes.cjs` | Canonical runtime → global config/skills directory mapping; first-class support for all 15 runtimes including Hermes nested layout and Cline rules-based exclusion (#3126) |
| `runtime-slash.cjs` | Runtime-aware slash-command formatter — single source of truth for emitting `/ecl-<cmd>` (skills-based runtimes) and `$ecl-<cmd>` (codex) in user-facing output and persisted artifacts (#3584) |
| `schema-detect.cjs` | CJS shim adapter — re-exports from `schema-detect.generated.cjs` (Phase 6/#3575 Shared Module migration) |
| `schema-detect.generated.cjs` | GENERATED — CJS artifact emitted from `sdk/src/query/schema-detect.ts` via `sdk/scripts/gen-schema-detect.mjs`; schema-drift detection for ORM patterns (Prisma, Drizzle, Supabase, TypeORM, Payload); exports `detectSchemaFiles`, `detectSchemaOrm`, `checkSchemaDrift`, `SCHEMA_PATTERNS`, `ORM_INFO`; do not edit directly |
| `secrets.cjs` | CJS shim adapter — re-exports from `secrets.generated.cjs` (Phase 6/#3575 Shared Module migration) |
| `secrets.generated.cjs` | GENERATED — CJS artifact emitted from `sdk/src/query/secrets.ts` via `sdk/scripts/gen-secrets.mjs`; secret-config masking convention (`****<last-4>`) for integration keys; exports `SECRET_CONFIG_KEYS`, `isSecretKey`, `maskSecret`, `maskIfSecret`; do not edit directly |
| `security.cjs` | Path traversal prevention, prompt injection detection, safe JSON/shell helpers |
| `shell-command-projection.cjs` | Runtime-aware shell command projection for managed hook serialization: decides PowerShell call-operator usage by runtime/platform and normalizes Windows script path tokens |
| `state-command-router.cjs` | Thin CJS subcommand router adapter for `ecl-tools state` |
| `state.cjs` | STATE.md parsing, updating, progression, metrics |
| `state-document.cjs` | Pure STATE.md field extraction, replacement, status normalization, and progress calculation transforms |
| `state-document.generated.cjs` | GENERATED — CJS artifact emitted from `sdk/src/query/state-document.ts` via `sdk/scripts/gen-state-document.ts`; do not edit directly |
| `surface.cjs` | Runtime surface module — manages the runtime enable/disable surface state independently of the install-time profile marker (ADR-0011 Phase 2) |
| `template.cjs` | Template selection and filling with variable substitution |
| `uat.cjs` | UAT file parsing, verification debt tracking, audit-uat support |
| `validate-command-router.cjs` | Thin CJS subcommand router adapter for `ecl-tools validate` |
| `verify-command-router.cjs` | Thin CJS subcommand router adapter for `ecl-tools verify` |
| `verify.cjs` | Plan structure, phase completeness, reference, commit validation |
| `workstream-inventory-builder.generated.cjs` | GENERATED — pure workstream inventory projection builder; CJS artifact emitted from `sdk/src/workstream-inventory/builder.ts` via `sdk/scripts/gen-workstream-inventory-builder.mjs`; do not edit directly |
| `workstream-inventory.cjs` | Shared workstream inventory projection: state fields, phase/plan/summary counts, roadmap phase count, and active marker — thin orchestrator that delegates pure projection to `workstream-inventory-builder.generated.cjs` |
| `workstream-name-policy.cjs` | CJS shim adapter — re-exports from `workstream-name-policy.generated.cjs` (Phase 6/#3575 Shared Module migration) |
| `workstream-name-policy.generated.cjs` | GENERATED — CJS artifact emitted from `sdk/src/workstream-name-policy.ts` via `sdk/scripts/gen-workstream-name-policy.mjs`; canonical workstream name validation (`isValidActiveWorkstreamName`, `hasInvalidPathSegment`, `validateWorkstreamName`) and slug normalization (`toWorkstreamSlug`); do not edit directly |
| `workstream.cjs` | Workstream CRUD, migration, session-scoped active pointer |
| `worktree-safety.cjs` | Worktree-root resolution and non-destructive prune policy decisions; owns W017 health-check logic |

[`docs/CLI-TOOLS.md`](CLI-TOOLS.md) may describe a subset of these modules; when it disagrees with the filesystem, this table and the directory listing are authoritative.

---

## Hooks (13 shipped)

Full listing: `hooks/`.

| Hook | Event | Purpose |
|------|-------|---------|
| `ecl-statusline.js` | `statusLine` | Displays model, task, directory, context usage |
| `ecl-context-monitor.js` | `PostToolUse` / `AfterTool` | Injects agent-facing context warnings at 35%/25% remaining |
| `ecl-check-update.js` | `SessionStart` | Background check for new eCL versions |
| `ecl-check-update-worker.js` | (worker) | Background worker helper for check-update |
| `ecl-update-banner.js` | `SessionStart` | Opt-in banner surfacing update availability when eCL statusline isn't used (PR #2795) |
| `ecl-prompt-guard.js` | `PreToolUse` | Scans `.planning/` writes for prompt-injection patterns (advisory) |
| `ecl-workflow-guard.js` | `PreToolUse` | Detects file edits outside eCL workflow context (advisory, opt-in) |
| `ecl-read-guard.js` | `PreToolUse` | Advisory guard preventing Edit/Write on unread files |
| `ecl-read-injection-scanner.js` | `PostToolUse` | Scans tool Read results for prompt-injection patterns (v1.36+, PR #2201) |
| `ecl-session-state.sh` | `PostToolUse` | Session-state tracking for shell-based runtimes |
| `ecl-validate-commit.sh` | `PostToolUse` | Commit validation for conventional-commit enforcement |
| `ecl-phase-boundary.sh` | `PostToolUse` | Phase-boundary detection for workflow transitions |
| `ecl-graphify-update.sh` | `PostToolUse` | Auto-rebuild knowledge graph after main HEAD advances (opt-in, default off — #3347) |

---

## Maintenance

- When a new command, agent, workflow, reference, CLI module, or hook ships, update the corresponding section here before the release is cut.
- The drift-guard tests under `tests/` (see "How To Use This File" above) assert that every shipped file is enumerated in this inventory. A new file without a matching row here will fail CI.
- When the filesystem diverges from `docs/ARCHITECTURE.md` counts or from curated-subset docs (e.g. `docs/AGENTS.md`'s primary roster), this file is the source of truth.
