#!/bin/bash
# Test 03: File inventory
# Asserts: every entry in package.json#files exists in the installed package
# and is non-empty. Spot-checks high-value assets (sdk/dist build output, hook
# scripts, install bin).
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"

echo -e "${CYAN}Suite: File inventory${NC}"

NPM_PREFIX=$(cat "$HOME/.ecl-npm-prefix" 2>/dev/null || echo "$HOME/.npm-global")
PKG_DIR="$NPM_PREFIX/lib/node_modules/@evolvconsulting/evolv-coder-lite"

assert_dir_exists "$PKG_DIR" "installed package root"
assert_file_exists "$PKG_DIR/package.json" "package.json"

# Load expected file entries from the installed package.json
EXPECTED_ENTRIES=$(jq -r '.files[]' "$PKG_DIR/package.json")

while IFS= read -r entry; do
  [ -n "$entry" ] || continue
  ABS="$PKG_DIR/$entry"
  test_start "files entry exists: $entry"
  if [ -e "$ABS" ]; then
    if [ -d "$ABS" ]; then
      COUNT=$(find "$ABS" -mindepth 1 -maxdepth 1 | wc -l | tr -d ' ')
      if [ "$COUNT" -gt 0 ]; then
        test_pass
      else
        test_fail "$entry exists but is empty"
      fi
    else
      if [ -s "$ABS" ]; then
        test_pass
      else
        test_fail "$entry exists but is zero-byte"
      fi
    fi
  else
    test_fail "$entry not found in installed package"
  fi
done <<< "$EXPECTED_ENTRIES"

# Spot checks
assert_file_exists "$PKG_DIR/bin/install.js" "bin/install.js"
assert_file_exists "$PKG_DIR/bin/ecl-sdk.js" "bin/ecl-sdk.js"
assert_dir_exists "$PKG_DIR/sdk/dist" "sdk/dist (build output)"
assert_count_gte "$PKG_DIR/sdk/dist" "*.js" 1 "sdk/dist has at least one .js"
assert_count_gte "$PKG_DIR/hooks" "*.sh" 1 "hooks/ has at least one .sh"
assert_dir_exists "$PKG_DIR/evolv-coder-lite" "evolv-coder-lite/ (project assets)"

test_summary
