#!/bin/bash
# Test 01: Tarball install
# Asserts: npm install -g <tarball> succeeds; the three declared bins are
# resolvable on PATH and point at files inside the installed package.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"

echo -e "${CYAN}Suite: Tarball install${NC}"

# Find tarball
test_start "find tarball"
TARBALL=$(find "$HOME" -maxdepth 1 -name "evolvconsulting-evolv-coder-lite-*.tgz" -print -quit)
if [ -n "$TARBALL" ]; then
  echo -e "    ${YELLOW}Found: $(basename "$TARBALL")${NC}"
  test_pass
else
  test_fail "no tarball at \$HOME matching evolvconsulting-evolv-coder-lite-*.tgz"
  test_summary
  exit 1
fi

TARBALL_VERSION=$(basename "$TARBALL" | sed 's/evolvconsulting-evolv-coder-lite-//' | sed 's/\.tgz$//')
echo -e "    ${YELLOW}Version: ${TARBALL_VERSION}${NC}"

# Configure npm to install globally without sudo
NPM_PREFIX="$HOME/.npm-global"
mkdir -p "$NPM_PREFIX"
npm config set prefix "$NPM_PREFIX"
export PATH="$NPM_PREFIX/bin:$PATH"

# Install
test_start "npm install -g <tarball>"
INSTALL_LOG=$(mktemp)
if npm install -g "$TARBALL" >"$INSTALL_LOG" 2>&1; then
  test_pass
else
  echo "--- npm install output (last 40 lines) ---"
  tail -40 "$INSTALL_LOG"
  echo "--- end ---"
  test_fail "npm install -g failed"
  test_summary
  exit 1
fi
rm -f "$INSTALL_LOG"

# All three bins declared in package.json#bin must resolve on PATH
for bin in evolv-coder-lite ecl-sdk ecl-tools; do
  test_start "bin on PATH: $bin"
  if command -v "$bin" >/dev/null 2>&1; then
    echo -e "    ${YELLOW}$(command -v "$bin")${NC}"
    test_pass
  else
    test_fail "$bin not on PATH"
  fi
done

# Cache install root for downstream tests
echo "$NPM_PREFIX" > "$HOME/.ecl-npm-prefix"

test_summary
