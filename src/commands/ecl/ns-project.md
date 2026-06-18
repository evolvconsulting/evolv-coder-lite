---
name: ecl-project
description: "project lifecycle | milestones audits summary"
argument-hint: ""
allowed-tools:
  - Read
  - Skill
requires: [new-project, new-milestone, complete-milestone, audit-milestone, milestone-summary, import, ingest-docs, profile-user, review-backlog]
---

Route to the appropriate project / milestone skill based on the user's intent.
`ecl-plan-milestone-gaps` was deleted by #2790 — gap planning now happens
inline as part of `ecl-audit-milestone`'s output.

| User wants | Invoke |
|---|---|
| Start a new project | ecl-new-project |
| Create a new milestone | ecl-new-milestone |
| Complete the current milestone | ecl-complete-milestone |
| Audit a milestone for issues | ecl-audit-milestone |
| Summarize milestone status | ecl-milestone-summary |
| Import an external plan | ecl-import |
| Bootstrap planning from existing docs | ecl-ingest-docs |
| Generate a developer profile | ecl-profile-user |
| Review and promote backlog items | ecl-review-backlog |

Invoke the matched skill directly using the Skill tool.
