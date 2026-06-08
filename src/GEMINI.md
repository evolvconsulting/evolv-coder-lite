# eCL Core — Gemini CLI context

This context is loaded by the **evolv-coder-lite Gemini CLI extension**. It gives Gemini
the operating context for [eCL Core](https://github.com/evolvconsulting/evolv-coder-lite), a
meta-prompting, context-engineering, and spec-driven development system for AI
coding agents.

## What eCL is

eCL turns a vague goal into shipped software through an explicit,
resumable workflow: **explore → plan → execute → verify → ship**. Work is
organised into milestones and phases under a `.planning/` directory, with each
phase carrying a SPEC, a PLAN, and verification criteria. The system favours
small, atomic, test-backed commits and keeps durable context in version-tracked
files rather than in the conversation.

## The slash commands (installed separately)

> **This extension ships only the context above — not the slash commands.** It
> loads ecl's operating context into your Gemini sessions and is managed through
> `gemini extensions list / update / uninstall`. To install the `/ecl:*` command
> set, agents, and hooks into `~/.gemini/`, run the dedicated installer:
>
> ```bash
> npx evolv-coder-lite --gemini --global
> ```
>
> The two paths are complementary and the manual installer remains fully
> supported. The commands below are available only once that installer has run.

If you have installed the ecl commands, the workflow is driven by these `/ecl:*`
slash commands (Gemini registers ecl's commands under the `ecl` namespace, so the
colon form is canonical):

- `/ecl:new-project` — initialise a project and gather deep context.
- `/ecl:progress` — the unified situational command: check progress, advance the
  workflow, or dispatch a freeform intent.
- `/ecl:plan-phase <N>` — produce a detailed phase plan with a verification loop.
- `/ecl:execute-phase <N>` — execute a phase's plans with wave-based parallelism.
- `/ecl:verify-work` — validate built features through conversational UAT.
- `/ecl:ship` — open a PR, run review, and prepare for merge.
- `/ecl:help` — list every available command.

## Working with eCL

- Treat `.planning/` as the source of truth for project state — read it before
  acting, and keep it current as work progresses.
- Prefer the smallest change that satisfies the phase's verification criteria.
- Run the project's tests and linters before declaring a phase done.
- When unsure what to do next, and the ecl commands are installed, `/ecl:progress`
  is the situational entry point.

Learn more: <https://github.com/evolvconsulting/evolv-coder-lite>
