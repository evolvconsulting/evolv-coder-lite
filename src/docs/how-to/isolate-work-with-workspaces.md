# How to isolate work with workspaces

**Goal:** Create a fully isolated eCL environment — separate git worktree, independent `.planning/` root, and optionally multiple repositories — for feature branches or multi-repo work.

**Prerequisites:** `git` is installed and the repository supports worktrees. For multi-repo workspaces, the target repos exist on your local machine or are accessible by path.

---

## What workspaces are

A workspace is a self-contained environment that pairs one or more git worktrees (or clones) with its own `.planning/` root directory. Each workspace has:

- Its own `.planning/` directory that is **completely independent** from the source repo's `.planning/` — not a subdirectory of it
- Its own `WORKSPACE.md` manifest tracking member repos
- Git worktrees (default) or full clones of the specified repos, checked out on a dedicated branch (default: `workspace/<name>`)

Workspaces live under `~/ecl-workspaces/<name>/` by default.

```
~/ecl-workspaces/
└── feature-b/
    ├── WORKSPACE.md        ← manifest
    ├── .planning/          ← fully independent eCL state
    │   ├── PROJECT.md
    │   ├── ROADMAP.md
    │   └── ...
    ├── hr-ui/              ← worktree or clone of hr-ui repo
    └── ZeymoAPI/           ← worktree or clone of ZeymoAPI repo
```

Because the workspace's `.planning/` is separate from the source repos, there is no overlap or conflict with planning state that exists in the source repos themselves.

---

## Create a workspace for multiple repos

```bash
/ecl-workspace --new --name feature-b --repos hr-ui,ZeymoAPI
```

eCL creates worktrees of `hr-ui` and `ZeymoAPI` inside `~/ecl-workspaces/feature-b/`, checks out a `workspace/feature-b` branch in each, writes `WORKSPACE.md`, and creates an empty `.planning/` directory ready for `/ecl-new-project`.

To customise the location:

```bash
/ecl-workspace --new --name feature-b --repos hr-ui,ZeymoAPI --path /projects/feature-b
```

---

## Create a workspace for the current repo

When you want feature-branch isolation on a single repo — independent branch, independent `.planning/`, no state bleed from main:

```bash
/ecl-workspace --new --name payments-rework --repos .
```

The `.` tells eCL to create a worktree of the current repo. The worktree is checked out on `workspace/payments-rework`.

To force a full clone instead of a worktree:

```bash
/ecl-workspace --new --name payments-rework --repos . --strategy clone
```

---

## Specify a branch explicitly

```bash
/ecl-workspace --new --name payments-rework --repos . --branch feature/payments-v2
```

The `--branch` flag sets the branch name for all repos in the workspace. Defaults to `workspace/<name>`.

---

## Skip interactive questions

```bash
/ecl-workspace --new --name payments-rework --repos . --auto
```

eCL accepts all defaults without prompting.

---

## Initialise eCL inside the workspace

After creating a workspace, move into it and initialise a eCL project:

```bash
cd ~/ecl-workspaces/feature-b
/ecl-new-project
```

The `.planning/` directory inside the workspace is the root for all subsequent eCL commands run from that directory. It is entirely separate from any `.planning/` that exists in the source repos.

---

## List workspaces

```bash
/ecl-workspace --list
```

Prints all active eCL workspaces and their status.

---

## Remove a workspace

```bash
/ecl-workspace --remove feature-b
```

eCL removes the git worktrees and cleans up the workspace directory. This does not delete the branches from the origin remote — only the local worktrees and workspace directory.

---

## When to use workspaces instead of workstreams

Choose workspaces when:

- You are working across **multiple repositories** that need to be co-ordinated under one eCL project (e.g., an API repo and a UI repo that ship together)
- You need a **separate git worktree** with its own branch, lock files, and build artefacts per feature — so builds and dependency installs in one environment cannot affect another
- You want a **wholly independent `.planning/` root** rather than a subdirectory of the main repo's `.planning/`
- You are following an issue-driven workflow where each tracker issue maps to a workspace (see [Drive eCL from a tracker issue](drive-ecl-from-a-tracker-issue.md))

Choose [workstreams](work-in-parallel-with-workstreams.md) instead when:

- All the work lives in **one repository** and shares the same git history
- You want to run `/ecl-plan-phase` or `/ecl-discuss-phase` on different concern areas concurrently — API, UI, infra — without context bleed between their `STATE.md` files
- You do not need a separate worktree per concern; switching planning context is sufficient

---

## Related

- [Work in parallel with workstreams](work-in-parallel-with-workstreams.md)
- [Drive eCL from a tracker issue](drive-ecl-from-a-tracker-issue.md)
- [Commands](../COMMANDS.md)
- [docs index](../README.md)
