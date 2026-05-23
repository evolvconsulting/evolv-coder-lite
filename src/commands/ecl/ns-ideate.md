---
name: ecl-ideate
description: "exploration capture | explore sketch spike spec capture"
argument-hint: ""
allowed-tools:
  - Read
  - Skill
requires: [capture, explore, sketch, spike, spec-phase]
---

Route to the appropriate exploration / capture skill based on the user's intent.
`ecl-note`, `ecl-add-todo`, `ecl-add-backlog`, and `ecl-plant-seed` were folded
into `ecl-capture` (with `--note`, default, `--backlog`, `--seed` modes) by
#2790. The capture target lists pending todos via `--list`.

| User wants | Invoke |
|---|---|
| Explore an idea or opportunity | ecl-explore |
| Sketch out a rough design or plan | ecl-sketch |
| Time-boxed technical spike | ecl-spike |
| Write a spec for a phase | ecl-spec-phase |
| Capture a thought (todo / note / backlog / seed) | ecl-capture |

Invoke the matched skill directly using the Skill tool.
