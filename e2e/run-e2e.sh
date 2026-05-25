#!/usr/bin/env bash
# evolv-coder-lite E2E harness
#
# Two modes:
#
#   bash e2e/run-e2e.sh                  # cheap suites (01-09), no Bedrock
#   bash e2e/run-e2e.sh --lifecycle      # bring up Bedrock-backed worker (#13)
#
# Cheap mode: bakes src/ from upstream + overlay, packs the tarball, builds
# a Docker image that installs the tarball globally on Node 24, and runs
# install-and-inventory smokes. No model calls.
#
# Lifecycle mode: same bake/pack, then builds an extended image containing
# Claude CLI + fast-mcp-claude + Bedrock env, starts it detached. The
# operator drives the 12-turn flow interactively from another Claude Code
# session whose .mcp.json points at localhost:5474. Real Bedrock dollars
# per turn — see e2e/lifecycle/RUNBOOK.md.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LIFECYCLE_DIR="$SCRIPT_DIR/lifecycle"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
NC='\033[0m'

# --- Mode -------------------------------------------------------------------
MODE="cheap"
for arg in "$@"; do
  case "$arg" in
    --lifecycle) MODE="lifecycle" ;;
    -h|--help)
      sed -n '2,/^set -euo/p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *) echo -e "${RED}unknown arg: $arg${NC}" >&2; exit 2 ;;
  esac
done

if [ "$MODE" = "lifecycle" ]; then
  echo -e "${CYAN}=== evolv-coder-lite E2E harness (lifecycle mode, #13) ===${NC}"
else
  echo -e "${CYAN}=== evolv-coder-lite E2E harness ===${NC}"
fi

cd "$REPO_ROOT"

# --- Common: bake check, SDK build, npm pack -------------------------------
if [ ! -f "$REPO_ROOT/src/package.json" ] || [ ! -f "$REPO_ROOT/src/REBRAND-MANIFEST.json" ]; then
  echo -e "${RED}ERROR: src/ is missing or not baked (no src/package.json + REBRAND-MANIFEST.json).${NC}"
  echo -e "${RED}Run \`node overlay/bake.mjs\` first.${NC}"
  exit 1
fi
echo -e "${CYAN}Step 1: Using existing src/ (baked at $(jq -r .bakedAt "$REPO_ROOT/src/REBRAND-MANIFEST.json"))${NC}"

echo -e "${CYAN}Step 2: Build SDK (npm pack does NOT run prepublishOnly — npm 7+)${NC}"
( cd "$REPO_ROOT/src/sdk" && npm ci --silent && npm run build --silent )

echo -e "${CYAN}Step 3: npm pack from src/${NC}"
( cd "$REPO_ROOT/src" && rm -f evolvconsulting-evolv-coder-lite-*.tgz && npm pack --silent )
TARBALL=$(ls "$REPO_ROOT"/src/evolvconsulting-evolv-coder-lite-*.tgz 2>/dev/null | head -1 || true)
if [ -z "$TARBALL" ]; then
  echo -e "${RED}ERROR: npm pack produced no tarball${NC}"
  exit 1
fi
echo -e "    Tarball: ${TARBALL}"

cp "$TARBALL" "$REPO_ROOT/"
STAGED_TARBALL="$REPO_ROOT/$(basename "$TARBALL")"

# --- Lifecycle mode --------------------------------------------------------
if [ "$MODE" = "lifecycle" ]; then
  # Lifecycle EXIT trap: don't tear down the worker (the operator drives it
  # interactively after this script returns). Just clean the staged tarball.
  cleanup_lifecycle() { rm -f "$STAGED_TARBALL" "$TARBALL"; }
  trap cleanup_lifecycle EXIT

  # Preflight: .env present
  if [ ! -f "$LIFECYCLE_DIR/.env" ]; then
    echo -e "${RED}ERROR: $LIFECYCLE_DIR/.env not found${NC}"
    echo -e "${YELLOW}  cp e2e/lifecycle/.env.example e2e/lifecycle/.env  # then fill in secrets${NC}"
    exit 1
  fi

  # Preflight: tracker repo present at the bind-mount path
  # shellcheck disable=SC1091
  set -a; . "$LIFECYCLE_DIR/.env"; set +a
  TRACKER_PATH="${TRACKER_REPO_PATH:-$LIFECYCLE_DIR/.tracker-repo}"
  if [ ! -d "$TRACKER_PATH/.git" ]; then
    echo -e "${RED}ERROR: tracker repo not found at $TRACKER_PATH${NC}"
    echo -e "${YELLOW}  bash e2e/lifecycle/bootstrap-tracker.sh   # creates evolvconsulting/ecl-e2e-weather-app${NC}"
    exit 1
  fi
  export TRACKER_REPO_PATH="$TRACKER_PATH"

  echo -e "${CYAN}Step 4a: docker build base image (ecl-e2e-base)${NC}"
  docker build -t ecl-e2e-base -f "$SCRIPT_DIR/Dockerfile" "$REPO_ROOT"

  echo -e "${CYAN}Step 4b: docker compose build (lifecycle worker)${NC}"
  docker compose -f "$LIFECYCLE_DIR/docker-compose.lifecycle.yml" build

  echo -e "${CYAN}Step 5: docker compose up -d (lifecycle worker)${NC}"
  docker compose -f "$LIFECYCLE_DIR/docker-compose.lifecycle.yml" up -d

  # Brief readiness check.
  sleep 2
  if ! docker compose -f "$LIFECYCLE_DIR/docker-compose.lifecycle.yml" ps --status=running | grep -q ecl-lifecycle-worker; then
    echo -e "${RED}ERROR: worker container is not running. Logs:${NC}"
    docker compose -f "$LIFECYCLE_DIR/docker-compose.lifecycle.yml" logs --tail=80
    exit 1
  fi

  cat <<EOF

${GREEN}=== Lifecycle worker is up ===${NC}

  Container:  ecl-lifecycle-worker
  MCP URL:    http://localhost:5474/mcp
  Tracker:    $TRACKER_PATH

Drive the 12 turns. Two sessions are involved:

  WORKER-side (in the container, interactive):
    1. docker exec -it ecl-lifecycle-worker ecl-worker-claude
       (Wrapper bakes in --mcp-config and --dangerously-skip-permissions.
       The theme picker re-prompts every fresh \`up\` — there is no
       persistent .claude/ volume by design (would shadow baked-in
       eCL skills). Dismiss it once per session.)
    2. Type /worker and press Enter to start the worker loop.
    3. Leave this terminal open; the worker now waits for
       \`send_prompt\` calls from the controller.

  CONTROLLER-side (your local Claude Code session driving the worker):
    1. cp e2e/lifecycle/.mcp.json.template <controller-repo>/.mcp.json
       (.mcp.json is gitignored.)
    2. export MCP_API_KEY=... (same value as in e2e/lifecycle/.env)
    3. Launch \`claude\` in that repo — \`/mcp\` shows
       \`claude-docker:*\` and \`claude-mini2:*\` tools.
    4. Follow ${CYAN}e2e/lifecycle/RUNBOOK.md${NC} turn-by-turn.

Stop the worker (between sessions or when done):

  docker compose -f e2e/lifecycle/docker-compose.lifecycle.yml down

Live logs (fast-mcp-claude server inside the container):

  docker compose -f e2e/lifecycle/docker-compose.lifecycle.yml logs -f

EOF
  exit 0
fi

# --- Cheap mode (unchanged) ------------------------------------------------
cleanup() {
  rm -f "$STAGED_TARBALL"
  rm -f "$TARBALL"
  docker compose -f "$SCRIPT_DIR/docker-compose.yml" down --remove-orphans 2>/dev/null || true
}
trap cleanup EXIT

echo -e "${CYAN}Step 4: docker build${NC}"
docker compose -f "$SCRIPT_DIR/docker-compose.yml" build

echo -e "${CYAN}Step 5: docker run (test suite)${NC}"
EXIT_CODE=0
docker compose -f "$SCRIPT_DIR/docker-compose.yml" up \
  --abort-on-container-exit --exit-code-from e2e || EXIT_CODE=$?

if [ "$EXIT_CODE" -eq 0 ]; then
  echo -e "${GREEN}=== E2E PASSED ===${NC}"
else
  echo -e "${RED}=== E2E FAILED (exit ${EXIT_CODE}) ===${NC}"
fi
exit "$EXIT_CODE"
