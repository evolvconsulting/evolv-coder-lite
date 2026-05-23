#!/bin/bash
# Test 08: Multi-runtime install matrix
# Asserts: `evolv-coder-lite --<runtime> --global` (non-interactive) succeeds for
# every supported runtime against an isolated HOME and writes into the runtime's
# expected config directory. Catches wizard / installer regressions across
# runtimes that suite 06 (claude-only) misses.
#
# No model calls — install-and-inventory only. Each runtime adds ~2-3 s.
#
# Per-runtime expected config dir under $HOME (must match install.js getGlobalDir):
#   claude       → .claude
#   gemini       → .gemini
#   codex        → .codex
#   copilot      → .copilot
#   antigravity  → .gemini/antigravity
#   cursor       → .cursor
#   windsurf     → .codeium/windsurf
#   augment      → .augment
#   trae         → .trae
#   qwen         → .qwen
#   hermes       → .hermes
#   cline        → .cline
#   codebuddy    → .codebuddy
#   opencode     → resolved by getOpencodeGlobalDir (~/.config/opencode)
#   kilo         → resolved by getKiloGlobalDir (~/.config/kilo, XDG default)
#
# `--all` is exercised at the end as a separate assertion (writes into multiple
# dirs in one shot).
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"

echo -e "${CYAN}Suite: Multi-runtime install matrix${NC}"

NPM_PREFIX=$(cat "$HOME/.ecl-npm-prefix" 2>/dev/null || echo "$HOME/.npm-global")
PATH_WITH_BINS="$NPM_PREFIX/bin:$PATH"

# Per-runtime: <flag> <relative-config-dir-under-HOME>
# Order matches RUNTIME_INSTALL_CONTRACTS in
# src/tests/installer-migration-install-integration.test.cjs.
RUNTIMES=(
  "claude:.claude"
  "gemini:.gemini"
  "codex:.codex"
  "copilot:.copilot"
  "antigravity:.gemini/antigravity"
  "cursor:.cursor"
  "windsurf:.codeium/windsurf"
  "augment:.augment"
  "trae:.trae"
  "qwen:.qwen"
  "hermes:.hermes"
  "cline:.cline"
  "codebuddy:.codebuddy"
  "opencode:.config/opencode"
  "kilo:.config/kilo"
)

run_runtime() {
  local flag="$1"
  local rel_dir="$2"

  local rt_home
  rt_home=$(mktemp -d)
  local rt_log
  rt_log=$(mktemp)

  test_start "wizard --${flag} --global writes into \$HOME/${rel_dir}"
  if HOME="$rt_home" PATH="$PATH_WITH_BINS" \
      evolv-coder-lite "--${flag}" --global >"$rt_log" 2>&1; then
    local config_dir="$rt_home/$rel_dir"
    if [ -d "$config_dir" ]; then
      local count
      count=$(find "$config_dir" -type f 2>/dev/null | wc -l | tr -d ' ')
      if [ "$count" -gt 0 ]; then
        echo -e "    ${YELLOW}Files written: $count${NC}"
        test_pass
      else
        test_fail "expected files under $config_dir, found 0"
        echo "--- wizard log tail ---"
        tail -20 "$rt_log"
        echo "--- end ---"
      fi
    else
      test_fail "config dir not created: $rt_home/$rel_dir"
      echo "--- wizard log tail ---"
      tail -20 "$rt_log"
      echo "--- end ---"
    fi
  else
    local rc=$?
    test_fail "wizard exited $rc"
    echo "--- wizard log tail ---"
    tail -20 "$rt_log"
    echo "--- end ---"
  fi

  rm -rf "$rt_home"
  rm -f "$rt_log"
}

for entry in "${RUNTIMES[@]}"; do
  flag="${entry%%:*}"
  rel_dir="${entry#*:}"
  run_runtime "$flag" "$rel_dir"
done

# --all: writes to every runtime config dir in one shot. We assert at least
# half of the per-runtime dirs got files — anything less means --all routing
# regressed. Don't enumerate every dir here; that's what the loop above does.
test_start "wizard --all --global writes into multiple runtime dirs"
ALL_HOME=$(mktemp -d)
ALL_LOG=$(mktemp)
if HOME="$ALL_HOME" PATH="$PATH_WITH_BINS" \
    evolv-coder-lite --all --global >"$ALL_LOG" 2>&1; then
  populated=0
  for entry in "${RUNTIMES[@]}"; do
    rel_dir="${entry#*:}"
    config_dir="$ALL_HOME/$rel_dir"
    if [ -d "$config_dir" ] && [ "$(find "$config_dir" -type f 2>/dev/null | wc -l | tr -d ' ')" -gt 0 ]; then
      populated=$((populated + 1))
    fi
  done
  total=${#RUNTIMES[@]}
  half=$((total / 2))
  echo -e "    ${YELLOW}Populated: ${populated}/${total} runtime dirs${NC}"
  if [ "$populated" -ge "$half" ]; then
    test_pass
  else
    test_fail "expected >= $half populated dirs, got $populated"
    echo "--- --all log tail ---"
    tail -30 "$ALL_LOG"
    echo "--- end ---"
  fi
else
  rc=$?
  test_fail "--all wizard exited $rc"
  echo "--- --all log tail ---"
  tail -30 "$ALL_LOG"
  echo "--- end ---"
fi
rm -rf "$ALL_HOME"
rm -f "$ALL_LOG"

test_summary
