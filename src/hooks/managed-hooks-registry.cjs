'use strict';

/**
 * Authoritative list of eCL-managed hook files.
 *
 * Extracted from the worker script into a shared CJS module so that:
 *  1. ecl-check-update-worker.js can require() it directly (no source-level
 *     duplication).
 *  2. Tests can assert against the exported array instead of regex-parsing
 *     the worker source (retiring the pending-migration-to-typed-ir token
 *     on managed-hooks.test.cjs and orphaned-hooks.test.cjs, per #455).
 *
 * These are the files eCL ships into ~/.claude/hooks/ (or equivalent) and
 * checks for staleness after an update. Orphaned files from removed features
 * (e.g., ecl-intel-*.js) must NOT be listed here — that would cause permanent
 * stale warnings for users who haven't cleaned up manually (#1750).
 */
const MANAGED_HOOKS = [
  'ecl-check-update-worker.js',
  'ecl-check-update.js',
  'ecl-config-reload.js',
  'ecl-context-monitor.js',
  'ecl-cursor-post-tool.js',
  'ecl-cursor-session-start.js',
  'ecl-graphify-update.sh',
  'ecl-phase-boundary.sh',
  'ecl-prompt-guard.js',
  'ecl-read-guard.js',
  'ecl-read-injection-scanner.js',
  'ecl-session-state.sh',
  'ecl-statusline.js',
  'ecl-update-banner.js',
  'ecl-validate-commit.sh',
  'ecl-workflow-guard.js',
  'ecl-worktree-path-guard.js',
];

module.exports = { MANAGED_HOOKS };
