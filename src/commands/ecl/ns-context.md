---
name: ecl-context
description: "codebase intel | map graphify docs learnings mempalace"
argument-hint: ""
allowed-tools:
  - Read
  - Skill
requires: [map-codebase, graphify, docs-update, extract-learnings, mempalace-recall, mempalace-capture]
---

Route to the appropriate codebase-intelligence skill based on the user's intent.
`ecl-scan` and `ecl-intel` were folded into `ecl-map-codebase` flags by #2790.

| User wants | Invoke |
|---|---|
| Map the full codebase structure | ecl-map-codebase |
| Quick lightweight codebase scan | ecl-map-codebase --fast |
| Query mapped intelligence files | ecl-map-codebase --query |
| Generate a knowledge graph | ecl-graphify |
| Update project documentation | ecl-docs-update |
| Extract learnings from a completed phase | ecl-extract-learnings |
| Recall prior decisions and patterns before planning | ecl-mempalace-recall |
| File a phase artifact into MemPalace | ecl-mempalace-capture |

Invoke the matched skill directly using the Skill tool.
