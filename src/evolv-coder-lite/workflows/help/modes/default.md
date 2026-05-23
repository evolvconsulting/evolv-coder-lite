<purpose>
One-page newcomer-oriented tour of eCL. Output ONLY the `<reference>` content below. No additions.
</purpose>

<reference>
# eCL — evolv Coder Lite

Plan-driven development for solo agentic work with Claude Code. eCL turns a vague idea into a hierarchical plan, then executes it phase by phase with state tracking and atomic commits.

## Start here (3 commands)

```text
/ecl:new-project        # Greenfield: questioning → research → requirements → roadmap
/ecl:plan-phase 1       # Create a detailed plan for phase 1
/ecl:execute-phase 1    # Execute all plans in the phase
```

Existing codebase? Run `/ecl:map-codebase` first to ground eCL in your code.

## Common commands

| Command | Purpose |
|---|---|
| `/ecl:progress` | Where am I, what's next — also routes freeform intent with `--do "..."` |
| `/ecl:quick` | Small ad-hoc task with eCL guarantees (planning dir + atomic commit) |
| `/ecl:fast "<task>"` | Trivial inline change — no subagents, ≤3 file edits |
| `/ecl:discuss-phase <N>` | Capture vision and decisions before planning |
| `/ecl:debug "<symptom>"` | Persistent debug session, survives `/clear` |
| `/ecl:capture` | Save an idea, todo, note, seed, or backlog item |
| `/ecl:verify-work <N>` | Conversational UAT for a completed phase |
| `/ecl:ship <N>` | Open a PR from a completed phase |
| `/ecl:help --full` | Complete reference (every command, every flag) |

## Want more?

```text
/ecl:help --brief         # 10-line refresher of top commands
/ecl:help --full          # complete reference
/ecl:help <topic>         # one section only — see topics below
/ecl:help --brief <topic> # compact scoped lookup — signature + one-line summary
```

Topics: `workflow` · `planning` · `execute` · `quick` · `debug` · `capture` · `ship` · `config` · `milestones` · `spike` · `sketch` · `review` · `audit` · `progress`

## Update eCL

```bash
npx @evolvconsulting/evolv-coder-lite@latest
```
</reference>
