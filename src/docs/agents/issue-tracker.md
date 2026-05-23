# Issue tracker: GitHub

Issues for this repo live in **GitHub Issues** at `evolvconsulting/evolv-coder-lite`.

## Auth

Use the configured GitHub CLI session for this checkout. Do not require a
repo-local `.envrc` before running `gh`.

## Conventions

- **Create**: `gh issue create --repo evolvconsulting/evolv-coder-lite --title "..." --body "..."`
- **Read**: `gh issue view <number> --repo evolvconsulting/evolv-coder-lite --comments`
- **List**: `gh issue list --repo evolvconsulting/evolv-coder-lite --state open --json number,title,labels --jq '...'`
- **Comment**: `gh issue comment <number> --repo evolvconsulting/evolv-coder-lite --body "..."`
- **Label**: `gh issue edit <number> --repo evolvconsulting/evolv-coder-lite --add-label "..." --remove-label "..."`
- **Close**: `gh issue close <number> --repo evolvconsulting/evolv-coder-lite --comment "..."`

Always pass `--repo evolvconsulting/evolv-coder-lite` explicitly — the local clone has multiple remotes and `gh` may resolve to the wrong one.

## When a skill says "publish to the issue tracker"

Create a GitHub issue at `evolvconsulting/evolv-coder-lite`.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --repo evolvconsulting/evolv-coder-lite --comments`.
