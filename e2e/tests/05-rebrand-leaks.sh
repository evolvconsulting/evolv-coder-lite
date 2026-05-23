#!/bin/bash
# Test 05: Rebrand leaks (installed tree)
# Asserts: zero GSD / get-shit-done / @opengsd / TÂCHES references remain in
# the installed package. Mirrors LEAK_PATTERNS from scripts/verify-rebrand.mjs
# but runs against the installed tree (the tarball's actual published surface).
#
# Skips: LICENSE, NOTICE, REBRAND-MANIFEST.json, CHANGELOG (attribution /
# history files where leaks are intentional). Skips node_modules.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"

echo -e "${CYAN}Suite: Rebrand leaks (installed tree)${NC}"

NPM_PREFIX=$(cat "$HOME/.ecl-npm-prefix" 2>/dev/null || echo "$HOME/.npm-global")
PKG_DIR="$NPM_PREFIX/lib/node_modules/@evolvconsulting/evolv-coder-lite"

assert_dir_exists "$PKG_DIR" "installed package root"

# Count leaks by pattern. Each is a grep -E regex (case-insensitive where the
# source verifier was case-insensitive). Patterns mirror LEAK_PATTERNS in
# scripts/verify-rebrand.mjs.
declare -a PATTERNS=(
  'gsd-token::-i:\bgsd\b'
  'gsd-prefix::-i:\bgsd[-_]'
  'gsd-suffix::-i:[-_]gsd\b'
  'get-shit-done::-i:get[- ]shit[- ]done'
  'opengsd::-i:@opengsd'
  'taches:::TÂCHES'
  'open-gsd-org:::\bopen-gsd\b'
  'gsd-build-org:::\bgsd-build\b'
)

# Files where leaks are allowed (attribution / history).
ALLOWLIST_RE='(^|/)(LICENSE|NOTICE|REBRAND-MANIFEST\.json|CHANGELOG(\.md)?|\.changeset/)'

TOTAL_LEAKS=0
LEAKING_FILES=()

# Build a list of candidate files (text, not in node_modules, not allowlisted)
CANDIDATES=$(mktemp)
find "$PKG_DIR" \
  -path "$PKG_DIR/node_modules" -prune -o \
  -type f -print 2>/dev/null \
  | grep -v -E "$ALLOWLIST_RE" \
  > "$CANDIDATES"

# Scan each pattern with grep -lE; collect hits
HITS_FILE=$(mktemp)
> "$HITS_FILE"
for spec in "${PATTERNS[@]}"; do
  name="${spec%%::*}"
  rest="${spec#*::}"
  flags="${rest%%:*}"
  re="${rest#*:}"

  # grep -I = skip binary files; -l = list files only
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    if grep -I -l $flags -E "$re" "$f" 2>/dev/null >/dev/null; then
      LINE=$(grep -I -m1 -n $flags -E "$re" "$f" 2>/dev/null | head -1)
      REL="${f#$PKG_DIR/}"
      printf '%s\t%s\t%s\n' "$name" "$REL" "$LINE" >> "$HITS_FILE"
      TOTAL_LEAKS=$((TOTAL_LEAKS + 1))
    fi
  done < "$CANDIDATES"
done

test_start "zero GSD / upstream-branding leaks in installed package"
if [ "$TOTAL_LEAKS" -eq 0 ]; then
  test_pass
else
  echo -e "    ${RED}Found $TOTAL_LEAKS leak(s):${NC}"
  # Group by file for readability — show first few
  awk -F'\t' '{print "      "$1"  "$2"  "$3}' "$HITS_FILE" | head -50
  if [ "$TOTAL_LEAKS" -gt 50 ]; then
    echo -e "      ${YELLOW}...and $((TOTAL_LEAKS - 50)) more${NC}"
  fi
  test_fail "$TOTAL_LEAKS upstream-branding leaks in installed tree"
fi

rm -f "$CANDIDATES" "$HITS_FILE"

test_summary
