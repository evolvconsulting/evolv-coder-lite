---
name: ecl-quality
description: "quality gates | code review debug audit security eval ui"
argument-hint: ""
allowed-tools:
  - Read
  - Skill
requires: [code-review, audit-uat, secure-phase, eval-review, ui-review, validate-phase, debug, forensics]
---

Route to the appropriate quality / review skill based on the user's intent.
`ecl-code-review-fix` was absorbed by `ecl-code-review --fix` in #2790.

| User wants | Invoke |
|---|---|
| Review code for quality and correctness | ecl-code-review |
| Auto-fix code review findings | ecl-code-review --fix |
| Audit UAT / acceptance testing | ecl-audit-uat |
| Security review of a phase | ecl-secure-phase |
| Evaluate AI response quality | ecl-eval-review |
| Review UI for design and accessibility | ecl-ui-review |
| Validate phase outputs | ecl-validate-phase |
| Debug a failing feature or error | ecl-debug |
| Forensic investigation of a broken system | ecl-forensics |

Invoke the matched skill directly using the Skill tool.
