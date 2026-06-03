#!/bin/bash
# Test 02: Bin invocation
# Asserts: evolv-coder-lite --help exits 0 with branding, and ecl-tools --help
# exits 0. (v1.2.0 retired gsd-sdk/ecl-sdk; the new ecl-tools CLI rejects
# --version by design, so --help is the callability probe — matching the
# upstream release-tarball-smoke.)
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"

echo -e "${CYAN}Suite: Bin invocation${NC}"

NPM_PREFIX=$(cat "$HOME/.ecl-npm-prefix" 2>/dev/null || echo "$HOME/.npm-global")
export PATH="$NPM_PREFIX/bin:$PATH"

# evolv-coder-lite --help: must exit 0 and contain branded usage banner
test_start "evolv-coder-lite --help exits 0 with branded banner"
HELP_OUT=$(evolv-coder-lite --help 2>&1)
HELP_EXIT=$?
if [ "$HELP_EXIT" -eq 0 ] && echo "$HELP_OUT" | grep -q "evolv-coder-lite"; then
  test_pass
else
  echo "$HELP_OUT" | head -10
  test_fail "exit=$HELP_EXIT, branding match=$(echo "$HELP_OUT" | grep -c "evolv-coder-lite")"
fi

# ecl-tools --help: the installed tools binary must be callable and exit 0.
# (The new gsd-tools-derived CLI has no --version; --help is the contract the
# upstream release-tarball-smoke uses to assert callability.)
test_start "ecl-tools --help exits 0"
TOOLS_OUT=$(ecl-tools --help 2>&1)
TOOLS_EXIT=$?
if [ "$TOOLS_EXIT" -eq 0 ]; then
  echo -e "    ${YELLOW}$(echo "$TOOLS_OUT" | head -1)${NC}"
  test_pass
else
  echo "$TOOLS_OUT" | head -5
  test_fail "ecl-tools --help exited $TOOLS_EXIT"
fi

test_summary
