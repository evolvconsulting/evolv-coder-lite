# How to migrate from eCL-2

**Goal:** Bring an older eCL-2 project (`.ecl/` directory layout) forward into eCL Core (`.planning/` layout), and optionally absorb any existing ADRs, PRDs, or specs that live in the repository into the new planning structure.

**Prerequisites:** eCL Core is installed. The eCL-2 project directory is available on disk.

---

## Understand what migrates

eCL-2 used a `.ecl/` directory as its planning root. eCL Core uses `.planning/`. The migration reverses this: it reads `.ecl/` artifacts and writes them into the standard `.planning/` structure that all eCL Core commands expect.

| What exists in eCL-2 | What `/ecl-import --from-ecl2` produces |
|----------------------|-----------------------------------------|
| `.ecl/PROJECT.md` | `.planning/PROJECT.md` |
| `.ecl/ROADMAP.md` | `.planning/ROADMAP.md` |
| `.ecl/STATE.md` | `.planning/STATE.md` |
| `.ecl/phases/` directories | `.planning/phases/` directories |
| Phase `PLAN.md` files | eCL Core `{NN}-{MM}-PLAN.md` files (renaming enforced) |

Conflict detection runs before any files are written. If the target directory already has a `PROJECT.md` and the imported content contradicts it, the migration stops at the BLOCKER gate and lists the conflicts for you to resolve.

---

## Run the migration

### Migrate the current directory

```bash
/ecl-import --from-ecl2
```

eCL reads `.ecl/` in the current working directory and writes the migrated artifacts into `.planning/`.

### Migrate from a different path

```bash
/ecl-import --from-ecl2 --path ~/projects/old-project
```

Use `--path` when the eCL-2 project is not your current working directory.

---

## Resolve conflicts

If conflict detection finds blockers — for example, a eCL-2 tech-stack declaration that contradicts an existing `.planning/PROJECT.md` — it prints a conflict report and stops without writing any files.

Read the report, resolve the contradiction (edit the source document or the existing planning artifact), then re-run `/ecl-import --from-ecl2`. The migration is safe to re-run until it passes cleanly.

---

## Import an external plan file

If you have a standalone plan document (a team planning document, a Markdown spec, an exported task list) rather than a full eCL-2 project, use `--from` instead:

```bash
/ecl-import --from /tmp/team-plan.md
```

eCL performs the same conflict-detection pass, converts the content to eCL Core `PLAN.md` format, and validates the result with the plan-checker. After validation you will see the target filename and next steps.

---

## Absorb existing documentation

If your repository already contains ADRs (Architecture Decision Records), PRDs, or specification documents, use `/ecl-ingest-docs` to synthesise them into the `.planning/` structure after migration:

### Scan the whole repository (auto-detects mode)

```bash
/ecl-ingest-docs
```

If `.planning/` is already present (for example, from the migration you just ran), eCL defaults to merge mode — it synthesises the ingested documents alongside what is already there rather than overwriting it.

### Scope to a specific directory

```bash
/ecl-ingest-docs docs/
/ecl-ingest-docs docs/adr/
```

### Use an explicit precedence manifest

When documents have mixed types or you want to control which document wins on conflicts:

```bash
/ecl-ingest-docs --manifest ingest.yaml
```

The manifest is a YAML file listing `{path, type, precedence?}` per document. See the `--manifest` flag description in [Commands](../COMMANDS.md) for the expected shape.

### Force a specific mode

```bash
/ecl-ingest-docs --mode merge     # Merge into existing .planning/
/ecl-ingest-docs --mode new       # Bootstrap from scratch (overwrites)
```

**Output:** `/ecl-ingest-docs` always produces an `INGEST-CONFLICTS.md` with three buckets — auto-resolved, competing-variants, and unresolved-blockers. Review this file after every ingest run. Hard-stops only occur on LOCKED-vs-LOCKED ADR contradictions; everything else is surfaced for your review, not silently discarded.

---

## Verify the migrated project

Once migration and any doc ingestion are complete, confirm the project state is consistent:

```bash
/ecl-health
/ecl-health --repair
```

`/ecl-health` checks `.planning/` directory integrity and reports any drift. `--repair` auto-fixes recoverable issues.

Then check that eCL Core can read your project state:

```bash
/ecl-progress
```

If the project came across cleanly you will see the current phase status and the recommended next step. From here the standard eCL Core workflow applies.

---

## Conditionals: what migrates and what does not

| Situation | What to do |
|-----------|-----------|
| `.ecl/` exists in the current directory | Run `/ecl-import --from-ecl2` (no `--path` needed) |
| `.ecl/` is in a different directory | Use `--path ~/projects/old-project` |
| You have a standalone plan document, not a full eCL-2 project | Use `/ecl-import --from /path/to/plan.md` |
| You have ADRs in `docs/adr/` | Run `/ecl-ingest-docs docs/adr/` after migration |
| You have a mix of ADRs, PRDs, and specs | Run `/ecl-ingest-docs` at repo root; it classifies automatically |
| Conflict detection reports blockers | Resolve the listed contradictions then re-run; no files are written until all blockers clear |
| You are not sure whether migration worked | Run `/ecl-health` and `/ecl-progress` to confirm |
| INGEST-CONFLICTS.md lists unresolved blockers | These require manual resolution before affected documents are incorporated into planning |

---

## Related

- [Your first project](../tutorials/your-first-project.md)
- [Commands](../COMMANDS.md)
- [docs index](../README.md)
