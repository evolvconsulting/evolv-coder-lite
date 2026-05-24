#!/usr/bin/env bash
# Bootstrap the lifecycle tracker repo (evolvconsulting/ecl-e2e-weather-app).
#
# Runs on the HOST using your existing `gh auth` (needs `repo` scope). The
# resulting clone is bind-mounted into the worker container by
# docker-compose.lifecycle.yml, so this script must complete before
# `bash e2e/run-e2e.sh --lifecycle`.
#
# Idempotent:
#   - Skips `gh repo create` if the remote already exists.
#   - Skips clone if the local checkout is already valid.
#   - Resets to a known baseline (main + dev with FRD seed) only when
#     invoked with --reset.
#
# Usage:
#   bash e2e/lifecycle/bootstrap-tracker.sh           # idempotent up-create
#   bash e2e/lifecycle/bootstrap-tracker.sh --reset   # wipe + reseed (DESTRUCTIVE)

set -euo pipefail

# --- Config -----------------------------------------------------------------
ORG="${TRACKER_ORG:-evolvconsulting}"
REPO="${TRACKER_REPO:-ecl-e2e-weather-app}"
SLUG="${ORG}/${REPO}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIFECYCLE_DIR="$SCRIPT_DIR"
DEFAULT_CHECKOUT="$LIFECYCLE_DIR/.tracker-repo"
CHECKOUT="${TRACKER_REPO_PATH:-$DEFAULT_CHECKOUT}"
FRD_SRC="$LIFECYCLE_DIR/fixtures/wa-FRD.md"
FRD_DEST_REL="docs/wa-1-weather-lookup/FRD.md"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
NC='\033[0m'

log() { printf "${CYAN}[bootstrap]${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}[bootstrap]${NC} %s\n" "$*" >&2; }
err() { printf "${RED}[bootstrap]${NC} %s\n" "$*" >&2; }
ok() { printf "${GREEN}[bootstrap]${NC} %s\n" "$*"; }

RESET=0
for arg in "$@"; do
    case "$arg" in
        --reset) RESET=1 ;;
        -h|--help)
            sed -n '2,/^set -euo/p' "$0" | sed 's/^# \?//'
            exit 0
            ;;
        *) err "unknown arg: $arg"; exit 2 ;;
    esac
done

# --- Preflight --------------------------------------------------------------
command -v gh >/dev/null || { err "gh CLI not on PATH"; exit 1; }
command -v git >/dev/null || { err "git not on PATH"; exit 1; }
[ -f "$FRD_SRC" ] || { err "FRD fixture missing: $FRD_SRC"; exit 1; }

if ! gh auth status >/dev/null 2>&1; then
    err "gh is not authenticated. Run \`gh auth login\` first."
    exit 1
fi

# Verify `repo` scope (the rest of this script needs it).
SCOPES=$(gh auth status 2>&1 | awk -F': ' '/Token scopes/ {print $2}' | tr -d "'")
case "$SCOPES" in
    *repo*) : ;;
    *) err "gh token lacks 'repo' scope. Current scopes: $SCOPES"; exit 1 ;;
esac

# --- Reset (destructive) ----------------------------------------------------
if [ "$RESET" -eq 1 ]; then
    warn "--reset specified: will delete remote $SLUG and local $CHECKOUT"
    read -r -p "Type the repo name '$REPO' to confirm: " CONFIRM
    [ "$CONFIRM" = "$REPO" ] || { err "confirmation failed"; exit 1; }
    if gh repo view "$SLUG" >/dev/null 2>&1; then
        log "deleting remote $SLUG"
        gh repo delete "$SLUG" --yes
    fi
    rm -rf "$CHECKOUT"
fi

# --- Remote create (idempotent) ---------------------------------------------
if gh repo view "$SLUG" >/dev/null 2>&1; then
    log "remote $SLUG already exists; skipping create"
else
    log "creating remote $SLUG (private)"
    gh repo create "$SLUG" --private \
        --description "eCL lifecycle E2E tracker repo (issue #13). Reset/recreated by bootstrap-tracker.sh." \
        --confirm >/dev/null
fi

# --- Local clone (idempotent) -----------------------------------------------
if [ -d "$CHECKOUT/.git" ]; then
    EXISTING_REMOTE=$(git -C "$CHECKOUT" remote get-url origin 2>/dev/null || echo "")
    case "$EXISTING_REMOTE" in
        *"$SLUG"*) log "local checkout at $CHECKOUT looks valid; fetching" ;;
        *)
            err "local $CHECKOUT exists but origin is $EXISTING_REMOTE (expected $SLUG). Use --reset or move it aside."
            exit 1
            ;;
    esac
    git -C "$CHECKOUT" fetch origin --prune
else
    log "cloning $SLUG -> $CHECKOUT"
    mkdir -p "$(dirname "$CHECKOUT")"
    gh repo clone "$SLUG" "$CHECKOUT" -- --quiet
fi

cd "$CHECKOUT"

# --- Seed FRD on main, branch dev off main ---------------------------------
DEFAULT_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")
if [ -z "$DEFAULT_BRANCH" ]; then
    # Fresh repo with no commits — start on main.
    git checkout -b main
    DEFAULT_BRANCH=main
fi

# Move to main (create if needed for fresh repos).
if ! git show-ref --verify --quiet refs/heads/main; then
    if git ls-remote --exit-code --heads origin main >/dev/null 2>&1; then
        git checkout -b main origin/main
    else
        git checkout -b main
    fi
fi
git checkout main

# Drop the FRD if it's missing or differs from the fixture.
mkdir -p "$(dirname "$FRD_DEST_REL")"
if ! cmp -s "$FRD_SRC" "$FRD_DEST_REL" 2>/dev/null; then
    log "seeding $FRD_DEST_REL from fixture"
    cp "$FRD_SRC" "$FRD_DEST_REL"
    git add "$FRD_DEST_REL"
    if [ -z "$(git status --porcelain)" ]; then
        : # nothing to commit (e.g. ignored file)
    else
        git -c user.email="ecl-e2e@evolvconsulting.local" \
            -c user.name="eCL Lifecycle Bootstrap" \
            commit -m "seed: WA-1 weather-lookup FRD" >/dev/null
        git push -u origin main >/dev/null 2>&1 || git push origin main >/dev/null
    fi
else
    log "$FRD_DEST_REL already matches fixture; no commit"
fi

# Branch dev off main if it doesn't exist locally.
if git show-ref --verify --quiet refs/heads/dev; then
    log "local dev branch already exists"
else
    if git ls-remote --exit-code --heads origin dev >/dev/null 2>&1; then
        git checkout -b dev origin/dev
    else
        git checkout -b dev
        git push -u origin dev >/dev/null 2>&1
    fi
fi

# Leave the working tree on dev — that's the branch the lifecycle's first
# turn (`/ecl:new-project`) operates on.
git checkout dev

ok "tracker repo ready"
ok "  slug:    $SLUG"
ok "  path:    $CHECKOUT"
ok "  FRD:     $CHECKOUT/$FRD_DEST_REL"
ok "  branch:  dev (main also seeded)"
echo ""
echo "Next: export TRACKER_REPO_PATH=\"$CHECKOUT\" if it's not the default,"
echo "      then \`bash e2e/run-e2e.sh --lifecycle\`."
