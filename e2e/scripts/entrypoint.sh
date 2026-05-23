#!/bin/bash
# In-container test runner. Runs all numbered test scripts in order, prints
# summary, exits non-zero on any failure.
set -uo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}======================================${NC}"
echo -e "${CYAN}  evolv-coder-lite E2E suite${NC}"
echo -e "${CYAN}======================================${NC}"
echo ""
echo "Node:   $(node --version)"
echo "npm:    $(npm --version)"
echo ""

TESTS_DIR="/home/tester/tests"
TOTAL_PASS=0
TOTAL_FAIL=0
FAILED_TESTS=()

for test_script in "$TESTS_DIR"/[0-9]*.sh; do
  [ -f "$test_script" ] || continue
  test_name=$(basename "$test_script")

  echo -e "${CYAN}--------------------------------------${NC}"
  echo -e "${CYAN}Running: ${test_name}${NC}"
  echo -e "${CYAN}--------------------------------------${NC}"

  if bash "$test_script"; then
    echo -e "${GREEN}  PASSED: ${test_name}${NC}"
    TOTAL_PASS=$((TOTAL_PASS + 1))
  else
    echo -e "${RED}  FAILED: ${test_name}${NC}"
    TOTAL_FAIL=$((TOTAL_FAIL + 1))
    FAILED_TESTS+=("$test_name")
  fi
  echo ""
done

TOTAL=$((TOTAL_PASS + TOTAL_FAIL))
echo -e "${CYAN}======================================${NC}"
echo -e "${CYAN}  Summary: ${TOTAL} suites${NC}"
echo -e "${GREEN}  Passed: ${TOTAL_PASS}${NC}"
echo -e "${RED}  Failed: ${TOTAL_FAIL}${NC}"
if [ "$TOTAL_FAIL" -gt 0 ]; then
  echo -e "${RED}  Failed suites:${NC}"
  for t in "${FAILED_TESTS[@]}"; do
    echo -e "${RED}    - ${t}${NC}"
  done
  echo -e "${CYAN}======================================${NC}"
  exit 1
fi
echo -e "${CYAN}======================================${NC}"
exit 0
