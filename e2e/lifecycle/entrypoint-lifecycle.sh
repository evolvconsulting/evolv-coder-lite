#!/usr/bin/env bash
# Entrypoint for the eCL lifecycle worker container.
#
# Boots fast-mcp-claude as a background HTTP MCP server on $MCP_PORT, then
# execs `claude /worker` (or whatever CMD was passed) inside the bind-mounted
# tracker repo. The MCP server is what the operator's local Claude Code
# session on the host talks to.
#
# Failure modes:
#   - MCP_API_KEY unset             -> abort. fast-mcp-claude will accept
#                                      unauth'd traffic with only a WARNING
#                                      log, which we don't want.
#   - BEDROCK_BEARER_TOKEN unset    -> abort. The worker will spin trying to
#                                      reach Bedrock and look like it's hung.
#   - Tracker repo not bind-mounted -> abort with a hint.
set -euo pipefail

log() { printf '[lifecycle] %s\n' "$*"; }

# --- Required env -----------------------------------------------------------
: "${MCP_API_KEY:?MCP_API_KEY must be set (see e2e/lifecycle/.env.example)}"
: "${BEDROCK_BEARER_TOKEN:?BEDROCK_BEARER_TOKEN must be set (see e2e/lifecycle/.env.example)}"
: "${WORKSPACE_ROOTS:=/home/tester/ecl-e2e-weather-app}"

# --- Model wiring -----------------------------------------------------------
# Apply CLAUDE_MODEL across both Sonnet and Haiku slots so that whichever the
# CLI resolves picks up the operator's choice. Kit's image bakes Sonnet via
# ANTHROPIC_DEFAULT_SONNET_MODEL; eCL allows the operator to override either
# default via a single CLAUDE_MODEL var.
if [ -n "${CLAUDE_MODEL:-}" ]; then
    case "$CLAUDE_MODEL" in
        *haiku*) export ANTHROPIC_DEFAULT_HAIKU_MODEL="$CLAUDE_MODEL" ;;
        *)       export ANTHROPIC_DEFAULT_SONNET_MODEL="$CLAUDE_MODEL" ;;
    esac
fi

# --- Tracker repo sanity ----------------------------------------------------
if [ ! -d "$WORKSPACE_ROOTS/.git" ]; then
    cat >&2 <<EOF
[lifecycle] ERROR: tracker repo not found at $WORKSPACE_ROOTS

Run \`bash e2e/lifecycle/bootstrap-tracker.sh\` on the host first, then
\`bash e2e/run-e2e.sh --lifecycle\`. The tracker repo is bind-mounted into
the container; the bootstrap script clones it on the host using your
existing gh auth.
EOF
    exit 1
fi

# --- fast-mcp-claude server (background) ------------------------------------
log "starting fast-mcp-claude server on :${MCP_PORT:-5473}"
mkdir -p /home/tester/.local/state/fmc
cd /opt/fmc
nohup uv run fast-mcp-claude \
    > /home/tester/.local/state/fmc/server.log 2>&1 &
FMC_PID=$!

# Wait for the server to bind. fast-mcp-claude logs "Uvicorn running on" once
# ready; tail until we see it (or 30s elapses).
for i in $(seq 1 60); do
    if grep -q "Uvicorn running on" /home/tester/.local/state/fmc/server.log 2>/dev/null; then
        break
    fi
    if ! kill -0 "$FMC_PID" 2>/dev/null; then
        log "ERROR: fast-mcp-claude exited before binding. Last 50 lines:"
        tail -50 /home/tester/.local/state/fmc/server.log >&2 || true
        exit 1
    fi
    sleep 0.5
done

log "fast-mcp-claude PID=$FMC_PID, log=/home/tester/.local/state/fmc/server.log"
log "model=${CLAUDE_MODEL:-us.anthropic.claude-sonnet-4-6}, region=${AWS_REGION:-us-west-2}"
log "tracker repo: $WORKSPACE_ROOTS"

# --- Hand off to claude /worker --------------------------------------------
cd "$WORKSPACE_ROOTS"
log "exec: $*"
exec "$@"
