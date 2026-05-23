#!/bin/bash
# Shared test helpers — fork of evolv-coder-kit-dev-alpha/e2e/tests/helpers.sh.
# Source this at the top of every test script.
set -uo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

TEST_PASS=0
TEST_FAIL=0
TEST_NAME=""

test_start() {
  TEST_NAME="$1"
  echo -e "${CYAN}  TEST: ${TEST_NAME}${NC}"
}

test_pass() {
  echo -e "${GREEN}    PASS: ${TEST_NAME}${NC}"
  TEST_PASS=$((TEST_PASS + 1))
}

test_fail() {
  local msg="${1:-$TEST_NAME}"
  echo -e "${RED}    FAIL: ${msg}${NC}"
  TEST_FAIL=$((TEST_FAIL + 1))
}

test_summary() {
  local total=$((TEST_PASS + TEST_FAIL))
  echo ""
  echo -e "${CYAN}  Results: ${total} tests — ${GREEN}${TEST_PASS} passed${NC}, ${RED}${TEST_FAIL} failed${NC}"
  if [ "$TEST_FAIL" -gt 0 ]; then
    return 1
  fi
  return 0
}

assert_file_exists() {
  local file="$1"
  local label="${2:-$file}"
  test_start "file exists: $label"
  if [ -f "$file" ]; then
    test_pass
  else
    test_fail "file not found: $file"
  fi
}

assert_dir_exists() {
  local dir="$1"
  local label="${2:-$dir}"
  test_start "dir exists: $label"
  if [ -d "$dir" ]; then
    test_pass
  else
    test_fail "dir not found: $dir"
  fi
}

assert_executable() {
  local file="$1"
  local label="${2:-$file}"
  test_start "executable: $label"
  if [ -x "$file" ]; then
    test_pass
  else
    test_fail "not executable: $file"
  fi
}

assert_command_succeeds() {
  local label="$1"
  shift
  test_start "$label"
  if "$@" >/dev/null 2>&1; then
    test_pass
  else
    test_fail "command failed: $*"
  fi
}

assert_command_output_contains() {
  local label="$1"
  local pattern="$2"
  shift 2
  test_start "$label"
  local output
  output=$("$@" 2>&1) || true
  if echo "$output" | grep -q "$pattern"; then
    test_pass
  else
    test_fail "output did not contain '$pattern'. Got: $(echo "$output" | head -3)"
  fi
}

assert_count_gte() {
  local dir="$1"
  local pattern="$2"
  local min="$3"
  local label="${4:-count >= $min in $dir}"
  test_start "$label"
  local count
  count=$(find "$dir" -name "$pattern" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$count" -ge "$min" ]; then
    test_pass
  else
    test_fail "expected >= $min, found $count"
  fi
}

assert_exit_code() {
  local expected="$1"
  local label="$2"
  shift 2
  test_start "$label"
  local actual=0
  "$@" >/dev/null 2>&1 || actual=$?
  if [ "$actual" -eq "$expected" ]; then
    test_pass
  else
    test_fail "expected exit code $expected, got $actual"
  fi
}
