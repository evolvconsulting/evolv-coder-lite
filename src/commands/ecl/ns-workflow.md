---
name: ecl-workflow
description: "workflow | discuss plan execute verify phase progress"
argument-hint: ""
allowed-tools:
  - Read
  - Skill
requires: [discuss-phase, spec-phase, plan-phase, execute-phase, verify-work, phase, progress, ultraplan-phase, plan-review-convergence, add-tests, ai-integration-phase, autonomous, fast, mvp-phase, quick]
---

Route to the appropriate phase-pipeline skill based on the user's intent.
Sub-skill names below are post-#2790 consolidated targets — `ecl-phase`
absorbs the former add/insert/remove/edit-phase commands and `ecl-progress`
absorbs the former next/do commands.

| User wants | Invoke |
|---|---|
| Gather context before planning | ecl-discuss-phase |
| Clarify what a phase delivers | ecl-spec-phase |
| Create a PLAN.md | ecl-plan-phase |
| Execute plans in a phase | ecl-execute-phase |
| Verify built features through UAT | ecl-verify-work |
| Add / insert / remove / edit a phase | ecl-phase |
| Advance to the next logical step | ecl-progress |
| Offload planning to the ultraplan cloud | ecl-ultraplan-phase |
| Cross-AI plan review convergence loop | ecl-plan-review-convergence |
| Generate tests for a completed phase | ecl-add-tests |
| Design an AI-integration phase | ecl-ai-integration-phase |
| Run all remaining phases autonomously | ecl-autonomous |
| Execute a trivial task inline | ecl-fast |
| Plan a phase as a vertical MVP slice | ecl-mvp-phase |
| Execute a quick task with eCL guarantees | ecl-quick |

Invoke the matched skill directly using the Skill tool.
