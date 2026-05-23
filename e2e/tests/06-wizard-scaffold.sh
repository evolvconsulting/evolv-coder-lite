#!/bin/bash
# Test 06: Wizard scaffold
# Asserts: `evolv-coder-lite --claude --global` (non-interactive) succeeds end
# to end against an isolated HOME and produces some scaffolded files. Uses an
# isolated HOME so we don't touch the tester user's real config.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"

echo -e "${CYAN}Suite: Wizard scaffold${NC}"

NPM_PREFIX=$(cat "$HOME/.ecl-npm-prefix" 2>/dev/null || echo "$HOME/.npm-global")
PATH_WITH_BINS="$NPM_PREFIX/bin:$PATH"

WIZARD_HOME=$(mktemp -d)
echo -e "    ${YELLOW}Isolated HOME: $WIZARD_HOME${NC}"

test_start "wizard runs non-interactively (--claude --global)"
WIZARD_LOG=$(mktemp)
if HOME="$WIZARD_HOME" PATH="$PATH_WITH_BINS" \
    evolv-coder-lite --claude --global >"$WIZARD_LOG" 2>&1; then
  test_pass
else
  WIZARD_EXIT=$?
  echo "--- wizard output (last 40 lines) ---"
  tail -40 "$WIZARD_LOG"
  echo "--- end ---"
  test_fail "wizard exited $WIZARD_EXIT"
  rm -rf "$WIZARD_HOME"
  rm -f "$WIZARD_LOG"
  test_summary
  exit 1
fi

# Wizard must have written something into the isolated HOME's .claude dir
test_start "wizard wrote into \$HOME/.claude"
if [ -d "$WIZARD_HOME/.claude" ]; then
  WRITTEN=$(find "$WIZARD_HOME/.claude" -type f 2>/dev/null | wc -l | tr -d ' ')
  if [ "$WRITTEN" -gt 0 ]; then
    echo -e "    ${YELLOW}Files written: $WRITTEN${NC}"
    test_pass
  else
    test_fail "\$HOME/.claude exists but is empty"
  fi
else
  echo "--- wizard log tail ---"
  tail -20 "$WIZARD_LOG"
  echo "--- end ---"
  test_fail "\$HOME/.claude not created"
fi

rm -rf "$WIZARD_HOME"
rm -f "$WIZARD_LOG"

test_summary
