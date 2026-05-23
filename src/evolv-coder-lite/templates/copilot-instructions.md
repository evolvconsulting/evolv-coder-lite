# Instructions for eCL

- Use the evolv-coder-lite skill when the user asks for eCL or uses a `ecl-*` command.
- Treat `/ecl-...` or `ecl-...` as command invocations and load the matching file from `.github/skills/ecl-*`.
- When a command says to spawn a subagent, prefer a matching custom agent from `.github/agents`.
- Do not apply eCL workflows unless the user explicitly asks for them.
- After completing any `ecl-*` command (or any deliverable it triggers: feature, bug fix, tests, docs, etc.), ALWAYS: (1) offer the user the next step by prompting via `ask_user`; repeat this feedback loop until the user explicitly indicates they are done.
