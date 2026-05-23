#!/bin/bash
# Test 02: Bin invocation
# Asserts: each bin's --help exits 0 and prints recognizable evolv-coder-lite
# branding. ecl-tools is a back-compat alias of ecl-sdk and is treated as such.
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

# ecl-sdk --version: must exit 0 (delegates to sdk/dist/cli.js)
test_start "ecl-sdk --version exits 0"
SDK_OUT=$(ecl-sdk --version 2>&1)
SDK_EXIT=$?
if [ "$SDK_EXIT" -eq 0 ]; then
  echo -e "    ${YELLOW}${SDK_OUT}${NC}"
  test_pass
else
  echo "$SDK_OUT" | head -5
  test_fail "ecl-sdk --version exited $SDK_EXIT"
fi

# ecl-tools is the same shim — must also exit 0
test_start "ecl-tools --version exits 0"
TOOLS_OUT=$(ecl-tools --version 2>&1)
TOOLS_EXIT=$?
if [ "$TOOLS_EXIT" -eq 0 ]; then
  echo -e "    ${YELLOW}${TOOLS_OUT}${NC}"
  test_pass
else
  echo "$TOOLS_OUT" | head -5
  test_fail "ecl-tools --version exited $TOOLS_EXIT"
fi

test_summary
