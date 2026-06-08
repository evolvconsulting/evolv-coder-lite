# How to spike and sketch before committing

**Goal:** De-risk an implementation by running focused feasibility experiments (spikes) and exploring visual directions through throwaway HTML mockups (sketches) before committing a phase to any specific approach.

**Prerequisites:** None. `/ecl-spike` and `/ecl-sketch` create their own storage directories and do not require an initialised eCL project.

---

## Decide: spike, sketch, or both

| You want to answer… | Use |
|---|---|
| "Will this technical approach actually work?" | `/ecl-spike` |
| "Does this layout / interaction / visual treatment feel right?" | `/ecl-sketch` |
| "What's the right technical approach, and what should it look like?" | Both, in order: spike first, then sketch |

Spikes answer binary feasibility questions with executable code and a VALIDATED / INVALIDATED / PARTIAL verdict. Sketches answer visual questions with 2–3 browser-comparable HTML variants. They are complementary — a spike proves the approach is buildable, a sketch proves the design is worth building.

---

## Run a spike

### Interactive intake (default)

```bash
/ecl-spike
```

eCL asks about the technical question, decomposes it into 2–5 independent experiments framed as **Given / When / Then** hypotheses, and asks for confirmation before building.

### Provide the idea directly

```bash
/ecl-spike "can we stream LLM tokens through SSE"
```

### Skip intake and run immediately

```bash
/ecl-spike --quick "websocket vs SSE latency"
```

`--quick` skips the decomposition conversation and treats the argument as a single spike question. Use this when the question is already specific enough to run without refinement.

### What each experiment produces

Each spike in `.planning/spikes/NNN-descriptive-name/` includes:

- Working code (not pseudocode)
- A **Given / When / Then** hypothesis written before any code
- An investigation trail documenting edge cases, pivots, and surprises
- A **VALIDATED**, **INVALIDATED**, or **PARTIAL** verdict with evidence
- A `README.md` with frontmatter, how-to-run instructions, and results

All spikes are indexed in `.planning/spikes/MANIFEST.md`.

### Package the findings

When you have signal, wrap the findings into a project-local skill so future sessions load them automatically:

```bash
/ecl-spike --wrap-up
```

This writes `.claude/skills/spike-findings-[project]/`. The skill is discovered automatically and loaded by subsequent `/ecl-sketch`, `/ecl-ui-phase`, and `/ecl-plan-phase` runs — you do not need to reference it explicitly.

---

## Run a sketch

### Mood intake (default)

```bash
/ecl-sketch
```

eCL opens a short conversation to explore feel, visual references, and the core user action before any code is written. It asks one question at a time and only starts building when you say go.

### Provide a design direction directly

```bash
/ecl-sketch "dashboard layout"
```

### Skip mood intake and run immediately

```bash
/ecl-sketch --quick "sidebar navigation"
```

`--quick` skips the intake conversation entirely and uses the argument as the design direction.

### Non-Claude runtimes (Codex, Gemini CLI, etc.)

```bash
/ecl-sketch --text "onboarding flow"
```

`--text` replaces interactive prompts with plain-text numbered lists. Use this when your runtime does not support `AskUserQuestion`.

### What each sketch produces

Each sketch in `.planning/sketches/NNN-descriptive-name/` includes:

- `index.html` with 2–3 variants accessible via tab navigation — open directly in a browser, no build step
- Functional interactive elements (hover, click, transitions)
- Real-ish content using field names and data shapes from any prior spike findings
- Shared CSS variables from `.planning/sketches/themes/default.css`
- A `README.md` with the design question, variants, and what to look for

All sketches are indexed in `.planning/sketches/MANIFEST.md`.

### Package the winning design decisions

After picking a variant, capture the visual decisions into a project-local skill:

```bash
/ecl-sketch --wrap-up
```

This writes `.claude/skills/sketch-findings-[project]/`. The skill is picked up automatically by `/ecl-ui-phase` — pre-validated decisions (layout, colour palette, typography, spacing) are treated as locked and are not re-asked.

---

## Combined flow: spike → sketch → phase

This is the recommended sequence when you are uncertain about both technical feasibility and visual direction:

```bash
/ecl-spike "SSE vs WebSocket for real-time feed"
/ecl-spike --wrap-up

/ecl-sketch "real-time feed UI"
/ecl-sketch --wrap-up

/ecl-discuss-phase N
/ecl-plan-phase N
```

The spike findings inform the sketch (real data shapes, real interaction states, realistic constraints). Both wrap-ups persist decisions that the planner and UI researcher load automatically, so you do not need to re-explain choices during `/ecl-discuss-phase` or `/ecl-ui-phase`.

---

## How a spike or sketch feeds into a phase

Spike and sketch artifacts do not need to be manually referenced. eCL reads them automatically at two points:

1. **`/ecl-sketch`** — loads `.claude/skills/spike-findings-*/` before building mockups, so variants reflect proven constraints (streaming states, real field names, etc.)
2. **`/ecl-ui-phase N`** — loads `.claude/skills/sketch-findings-*/` before generating the UI design contract; pre-validated design decisions are treated as locked

The planner also reads spike findings when a `spike-findings-*` skill is present, so validated technical choices (which library, which protocol, which data format) flow directly into task plans without repeated explanation.

---

## Related

- [Design a UI phase](design-a-ui-phase.md)
- [Plan a phase](plan-a-phase.md)
- [Commands](../COMMANDS.md)
- [Docs index](../README.md)
