---
name: ecl-manage
description: "config workspace | workstreams thread update ship inbox"
argument-hint: ""
allowed-tools:
  - Read
  - Skill
requires: [config, workspace, workstreams, thread, pause-work, resume-work, update, ship, inbox, pr-branch, undo, cleanup, health, manager, settings, stats, surface, help]
---

Route to the appropriate management skill based on the user's intent.
`ecl-config` (settings + advanced + integrations + profile) and `ecl-workspace`
(new + list + remove) are post-#2790 consolidated entries.

| User wants | Invoke |
|---|---|
| Configure eCL settings (basic / advanced / integrations / profile) | ecl-config |
| Manage workspaces (create / list / remove) | ecl-workspace |
| Manage parallel workstreams | ecl-workstreams |
| Continue work in a fresh context thread | ecl-thread |
| Pause current work | ecl-pause-work |
| Resume paused work | ecl-resume-work |
| Update the eCL installation | ecl-update |
| Ship completed work | ecl-ship |
| Process inbox items | ecl-inbox |
| Create a clean PR branch | ecl-pr-branch |
| Undo the last eCL action | ecl-undo |
| Archive accumulated phase directories | ecl-cleanup |
| Diagnose planning directory health | ecl-health |
| Open the interactive command center | ecl-manager |
| Configure workflow toggles and model profile | ecl-settings |
| Show project statistics | ecl-stats |
| Toggle which skills are surfaced | ecl-surface |
| Show the eCL command guide | ecl-help |

Invoke the matched skill directly using the Skill tool.
