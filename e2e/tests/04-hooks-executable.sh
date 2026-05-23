#!/bin/bash
# Test 04: Hooks executable
# Asserts: every .sh file under the installed hooks/ directories has the
# execute bit. npm chmods bin entries from a tarball but other shipped scripts
# can drift if mode bits aren't set in the tarball — this catches that.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"

echo -e "${CYAN}Suite: Hooks executable${NC}"

NPM_PREFIX=$(cat "$HOME/.ecl-npm-prefix" 2>/dev/null || echo "$HOME/.npm-global")
PKG_DIR="$NPM_PREFIX/lib/node_modules/@evolvconsulting/evolv-coder-lite"

# All .sh under hooks/ and evolv-coder-lite/hooks/ (whichever exist)
TOTAL=0
NON_EXEC=0
NON_EXEC_LIST=()

for hooks_root in "$PKG_DIR/hooks" "$PKG_DIR/evolv-coder-lite/hooks"; do
  [ -d "$hooks_root" ] || continue
  while IFS= read -r -d '' hook; do
    TOTAL=$((TOTAL + 1))
    if [ ! -x "$hook" ]; then
      NON_EXEC=$((NON_EXEC + 1))
      NON_EXEC_LIST+=("$hook")
    fi
  done < <(find "$hooks_root" -name "*.sh" -type f -print0)
done

test_start "all .sh hooks are executable"
if [ "$TOTAL" -eq 0 ]; then
  test_fail "no .sh hooks found in installed package"
elif [ "$NON_EXEC" -eq 0 ]; then
  echo -e "    ${YELLOW}Checked $TOTAL hooks${NC}"
  test_pass
else
  for h in "${NON_EXEC_LIST[@]}"; do
    echo -e "    ${RED}Not executable: $h${NC}"
  done
  test_fail "$NON_EXEC of $TOTAL hooks not executable"
fi

test_summary
