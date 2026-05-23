#!/usr/bin/env bash
# evolv-coder-lite E2E harness
#
# Bakes src/ from upstream + overlay, packs the tarball, builds a Docker image
# that installs the tarball globally on Node 24, and runs a smoke-test suite.
#
# No Bedrock / Claude CLI calls — these are install-and-inventory tests only.
# Lifecycle / model-backed tests are out of scope for this harness.
#
# Usage: bash e2e/run-e2e.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=== evolv-coder-lite E2E harness ===${NC}"

cd "$REPO_ROOT"

# Assumes src/ is already baked. Run `node overlay/bake.mjs` first if you've
# changed upstream/ or overlay rules.
if [ ! -f "$REPO_ROOT/src/package.json" ] || [ ! -f "$REPO_ROOT/src/REBRAND-MANIFEST.json" ]; then
  echo -e "${RED}ERROR: src/ is missing or not baked (no src/package.json + REBRAND-MANIFEST.json).${NC}"
  echo -e "${RED}Run \`node overlay/bake.mjs\` first.${NC}"
  exit 1
fi
echo -e "${CYAN}Step 1: Using existing src/ (baked at $(jq -r .bakedAt "$REPO_ROOT/src/REBRAND-MANIFEST.json"))${NC}"

echo -e "${CYAN}Step 2: Pre-install SDK deps (so prepublishOnly tsc works)${NC}"
# prepublishOnly fires on `npm pack` and runs `cd sdk && npm ci && npm run build`.
# But we need sdk/node_modules to exist before npm pack runs — see HANDOVER watch-out.
( cd "$REPO_ROOT/src/sdk" && npm ci --silent )

echo -e "${CYAN}Step 3: npm pack from src/${NC}"
( cd "$REPO_ROOT/src" && rm -f evolvconsulting-evolv-coder-lite-*.tgz && npm pack --silent )
TARBALL=$(ls "$REPO_ROOT"/src/evolvconsulting-evolv-coder-lite-*.tgz 2>/dev/null | head -1 || true)
if [ -z "$TARBALL" ]; then
  echo -e "${RED}ERROR: npm pack produced no tarball${NC}"
  exit 1
fi
echo -e "    Tarball: ${TARBALL}"

# Stage tarball at repo root (the docker build context)
cp "$TARBALL" "$REPO_ROOT/"
STAGED_TARBALL="$REPO_ROOT/$(basename "$TARBALL")"

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
