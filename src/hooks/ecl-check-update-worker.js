#!/usr/bin/env node
// ecl-hook-version: {{ECL_VERSION}}
// Background worker spawned by ecl-check-update.js (SessionStart hook).
// Checks for eCL updates and stale hooks, writes result to cache file.
// Receives paths via environment variables set by the parent hook.
//
// Using a separate file (rather than node -e '<inline code>') avoids the
// template-literal regex-escaping problem: regex source is plain JS here.

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const cacheFile = process.env.ECL_CACHE_FILE;
const projectVersionFile = process.env.ECL_PROJECT_VERSION_FILE;
const globalVersionFile = process.env.ECL_GLOBAL_VERSION_FILE;

// Compare semver: true if a > b (a is strictly newer than b)
// Strips pre-release suffixes (e.g. '3-beta.1' → '3') to avoid NaN from Number()
function isNewer(a, b) {
  const pa = (a || '').split('.').map(s => Number(s.replace(/-.*/, '')) || 0);
  const pb = (b || '').split('.').map(s => Number(s.replace(/-.*/, '')) || 0);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return true;
    if (pa[i] < pb[i]) return false;
  }
  return false;
}

// Check project directory first (local install), then global
let installed = '0.0.0';
let configDir = '';
try {
  if (fs.existsSync(projectVersionFile)) {
    installed = fs.readFileSync(projectVersionFile, 'utf8').trim();
    configDir = path.dirname(path.dirname(projectVersionFile));
  } else if (fs.existsSync(globalVersionFile)) {
    installed = fs.readFileSync(globalVersionFile, 'utf8').trim();
    configDir = path.dirname(path.dirname(globalVersionFile));
  }
} catch (e) {}

// Check for stale hooks — compare hook version headers against installed VERSION
// Hooks are installed at configDir/hooks/ (e.g. ~/.claude/hooks/) (#1421)
// Only check hooks that eCL currently ships — orphaned files from removed features
// (e.g., ecl-intel-*.js) must be ignored to avoid permanent stale warnings (#1750)
const MANAGED_HOOKS = [
  'ecl-check-update-worker.js',
  'ecl-check-update.js',
  'ecl-context-monitor.js',
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
];

let staleHooks = [];
if (configDir) {
  const hooksDir = path.join(configDir, 'hooks');
  try {
    if (fs.existsSync(hooksDir)) {
      const hookFiles = fs.readdirSync(hooksDir).filter(f => MANAGED_HOOKS.includes(f));
      for (const hookFile of hookFiles) {
        try {
          const content = fs.readFileSync(path.join(hooksDir, hookFile), 'utf8');
          // Match both JS (//) and bash (#) comment styles
          const versionMatch = content.match(/(?:\/\/|#) ecl-hook-version:\s*(.+)/);
          if (versionMatch) {
            const hookVersion = versionMatch[1].trim();
            if (isNewer(installed, hookVersion) && !hookVersion.includes('{{')) {
              staleHooks.push({ file: hookFile, hookVersion, installedVersion: installed });
            }
          } else {
            // No version header at all — definitely stale (pre-version-tracking)
            staleHooks.push({ file: hookFile, hookVersion: 'unknown', installedVersion: installed });
          }
        } catch (e) {}
      }
    }
  } catch (e) {}
}

let latest = null;
try {
  latest = execFileSync('npm', ['view', 'evolv-coder-lite', 'version'], {
    encoding: 'utf8',
    timeout: 10000,
    windowsHide: true,
    // On Windows, 'npm' is distributed as npm.cmd. Node's execFileSync does
    // not apply PATHEXT resolution and looks for a literal 'npm' binary,
    // failing with ENOENT. Setting shell:true on Windows routes through
    // cmd.exe which resolves npm.cmd via PATHEXT.
    // POSIX (Linux/macOS) is left untouched — no shell spawn, no extra
    // signal/exit-code semantics, no overhead.
    shell: process.platform === 'win32',
  }).trim();
} catch (e) {}

const result = {
  update_available: latest && isNewer(latest, installed),
  installed,
  latest: latest || 'unknown',
  checked: Math.floor(Date.now() / 1000),
  stale_hooks: staleHooks.length > 0 ? staleHooks : undefined,
};

if (cacheFile) {
  try { fs.writeFileSync(cacheFile, JSON.stringify(result)); } catch (e) {}
}
