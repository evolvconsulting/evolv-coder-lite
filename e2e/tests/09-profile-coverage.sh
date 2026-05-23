#!/bin/bash
# Test 09: Profile flag coverage
# Asserts: --profile=core, --profile=standard, --profile=full produce strictly
# ascending skill counts (core < standard < full). Catches profile-routing
# regressions cheaply — runtime-only, no model calls.
#
# Strategy: install --claude --global with each profile flag against an isolated
# HOME, count SKILL.md files under $HOME/.claude/skills/, assert ordering.
#
# Numbers (from install.js help text, as of v1.0.0):
#   core     ~7 skills
#   standard ~13 skills
#   full     66 skills (default)
#
# We don't pin exact counts — those drift as the catalog grows. We assert the
# *ordering* invariant: any future change that puts core >= standard or
# standard >= full means routing is broken.
#
# --minimal alias is exercised separately and asserted to match core.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"

echo -e "${CYAN}Suite: Profile flag coverage${NC}"

NPM_PREFIX=$(cat "$HOME/.ecl-npm-prefix" 2>/dev/null || echo "$HOME/.npm-global")
PATH_WITH_BINS="$NPM_PREFIX/bin:$PATH"

# Returns count of SKILL.md files under the target HOME's claude skills dir.
count_skills() {
  local h="$1"
  find "$h/.claude/skills" -name 'SKILL.md' -type f 2>/dev/null | wc -l | tr -d ' '
}

# Run wizard with a profile flag, return skill count via stdout. Fails the
# whole suite if the install itself errors out.
install_and_count() {
  local label="$1"
  shift
  local h
  h=$(mktemp -d)
  local log
  log=$(mktemp)
  if HOME="$h" PATH="$PATH_WITH_BINS" \
      evolv-coder-lite --claude --global "$@" >"$log" 2>&1; then
    local n
    n=$(count_skills "$h")
    echo "$n"
    rm -rf "$h"
    rm -f "$log"
    return 0
  else
    local rc=$?
    echo "INSTALL FAIL ($label) exit=$rc" >&2
    echo "--- log tail ---" >&2
    tail -20 "$log" >&2
    echo "--- end ---" >&2
    rm -rf "$h"
    rm -f "$log"
    echo "0"
    return 1
  fi
}

CORE=$(install_and_count core --profile=core) || CORE_FAIL=$?
STANDARD=$(install_and_count standard --profile=standard) || STANDARD_FAIL=$?
FULL=$(install_and_count full --profile=full) || FULL_FAIL=$?
MINIMAL=$(install_and_count minimal --minimal) || MINIMAL_FAIL=$?

echo -e "    ${YELLOW}skill counts: core=$CORE standard=$STANDARD full=$FULL minimal=$MINIMAL${NC}"

test_start "core profile installs at least one skill"
if [ "$CORE" -gt 0 ]; then
  test_pass
else
  test_fail "core profile produced 0 skills (install probably failed)"
fi

test_start "core < standard < full"
if [ "${STANDARD_FAIL:-0}" -ne 0 ] || [ "$STANDARD" -eq 0 ]; then
  test_fail "standard profile install failed or produced 0 skills"
elif [ "$CORE" -lt "$STANDARD" ] && [ "$STANDARD" -lt "$FULL" ]; then
  test_pass
else
  test_fail "expected core ($CORE) < standard ($STANDARD) < full ($FULL)"
fi

test_start "core < full"
if [ "$CORE" -lt "$FULL" ]; then
  test_pass
else
  test_fail "expected core ($CORE) < full ($FULL)"
fi

test_start "--minimal is alias for --profile=core"
if [ "$MINIMAL" -eq "$CORE" ]; then
  test_pass
else
  test_fail "expected --minimal == --profile=core, got minimal=$MINIMAL core=$CORE"
fi

test_summary
