/**
 * Regression test for #3610: fresh `npx @evolvconsulting/evolv-coder-lite@latest --codex`
 * hard-aborts when the target ~/.codex/hooks/ contains the bundled eCL
 * hook files (`ecl-check-update-worker.js`, `ecl-prompt-guard.js`, …)
 * left over from a previous version. The installer-migration report
 * classifies them as "eCL-looking file is not proven manifest-managed
 * and needs explicit user choice" and `assertInstallerMigrationsUnblocked`
 * throws.
 *
 * The files in question are NOT user-owned — they are the eCL bundled
 * hooks shipped under `hooks/ecl-*` in the npm package. The fix adds a
 * `bundled-ecl-hook` classification to `classifyPromptUserAction` so the
 * resolver removes them (the installer then writes the fresh bundled
 * versions in their place).
 *
 * Because this classification is unambiguous (these are not user files),
 * it must apply regardless of whether stdin is a TTY — the reporter's
 * `npx ... --codex` run was interactive and the existing non-TTY
 * resolver gate at install.js:8069 skipped the safe-default pass.
 */

'use strict';

process.env.ECL_TEST_MODE = '1';

const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const {
  runInstallerMigrations,
} = require('../evolv-coder-lite/bin/lib/installer-migrations.cjs');
const {
  assertInstallerMigrationsUnblocked,
  resolveInstallerMigrationPromptsForNonTty,
  classifyPromptUserAction,
} = require('../evolv-coder-lite/bin/lib/installer-migration-report.cjs');
const { createTempDir, cleanup } = require('./helpers.cjs');

function writeFile(root, relPath, content) {
  const fullPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
}

function writeManifest(root, files) {
  fs.writeFileSync(
    path.join(root, 'ecl-file-manifest.json'),
    JSON.stringify(
      {
        version: '1.41.2',
        timestamp: '2026-05-10T00:00:00.000Z',
        mode: 'full',
        files,
      },
      null,
      2,
    ),
    'utf8',
  );
}

// Reporter's exact list of blocked files from the v1.42.2 → v1.42.0 upgrade
// abort. Each is a real `hooks/ecl-*` file shipped under hooks/ in the npm
// package (verified by `ls hooks/`).
const BUNDLED_HOOK_RELPATHS = [
  'hooks/ecl-check-update-worker.js',
  'hooks/ecl-check-update.js',
  'hooks/ecl-context-monitor.js',
  'hooks/ecl-phase-boundary.sh',
  'hooks/ecl-prompt-guard.js',
  'hooks/ecl-read-guard.js',
  'hooks/ecl-read-injection-scanner.js',
  'hooks/ecl-session-state.sh',
  'hooks/ecl-statusline.js',
  'hooks/ecl-update-banner.js',
  'hooks/ecl-validate-commit.sh',
  'hooks/ecl-workflow-guard.js',
];

describe('bug #3610: classifyPromptUserAction recognizes bundled eCL hooks', () => {
  test('classifies hooks/ecl-*.js as bundled-ecl-hook → remove', () => {
    const result = classifyPromptUserAction({
      relPath: 'hooks/ecl-prompt-guard.js',
    });
    assert.ok(result, 'classifier returned null for a bundled eCL hook (.js)');
    assert.strictEqual(result.category, 'bundled-ecl-hook');
    assert.strictEqual(
      result.choice,
      'remove',
      'bundled hook must default to remove so the installer can write the fresh bundled version',
    );
  });

  test('classifies hooks/ecl-*.sh as bundled-ecl-hook → remove', () => {
    const result = classifyPromptUserAction({
      relPath: 'hooks/ecl-validate-commit.sh',
    });
    assert.ok(result);
    assert.strictEqual(result.category, 'bundled-ecl-hook');
    assert.strictEqual(result.choice, 'remove');
  });

  test('does NOT classify non-ecl hooks (preserves user-owned hook files)', () => {
    // A user's custom hook that happens to live under hooks/ must NOT be
    // auto-classified as bundled — the existing block-then-choose flow
    // continues to apply, preserving the user's control over their files.
    const result = classifyPromptUserAction({
      relPath: 'hooks/my-custom-hook.js',
    });
    assert.strictEqual(
      result,
      null,
      'non-ecl-prefixed hook must NOT auto-classify (would clobber user files)',
    );
  });

  test('does NOT classify deeper paths under hooks/ecl-* (e.g. hooks/lib/) as bundled-ecl-hook', () => {
    // The bundled eCL distribution has hooks/lib/ (helper modules). Those
    // are managed differently — verify the classifier limits itself to
    // top-level hooks/ecl-<name>.<ext> files, not nested directories.
    const result = classifyPromptUserAction({
      relPath: 'hooks/ecl-helpers/index.js',
    });
    assert.strictEqual(result, null);
  });
});

describe('bug #3610: fresh upgrade with leftover bundled hooks does not throw', () => {
  let configDir;

  beforeEach(() => {
    configDir = createTempDir('ecl-3610-');
  });

  afterEach(() => {
    cleanup(configDir);
  });

  test('end-to-end: 12 leftover bundled hooks + empty manifest → resolver clears all blockers', () => {
    // Recreate the reporter's environment: 12 bundled `ecl-*` hook files
    // present at target, but the manifest has not yet seeded their baseline
    // entries (first-time-baseline scan).
    for (const rel of BUNDLED_HOOK_RELPATHS) {
      writeFile(configDir, rel, '#!/usr/bin/env node\n// stale 1.42.0 hook\n');
    }
    writeManifest(configDir, {});

    const result = runInstallerMigrations({
      configDir,
      runtime: 'codex',
      scope: 'global',
      baselineScan: true,
    });

    // Precondition: all 12 leftover hooks classify as prompt-user blockers.
    const blockedPaths = (result.blocked || []).map((a) => a.relPath).sort();
    assert.deepStrictEqual(
      blockedPaths,
      [...BUNDLED_HOOK_RELPATHS].sort(),
      'precondition: every leftover hooks/ecl-* should be a prompt-user blocker',
    );

    // Resolve through the safe-default classifier (passing isTty=false to
    // exercise the same code path the bundled-hook classification will hit
    // regardless of TTY once the fix removes the gate).
    const resolved = resolveInstallerMigrationPromptsForNonTty(result, { isTty: false });

    assert.strictEqual(
      resolved.resolutions.length,
      BUNDLED_HOOK_RELPATHS.length,
      'every bundled hook should produce a safe-default resolution entry',
    );

    for (const entry of resolved.resolutions) {
      assert.strictEqual(entry.category, 'bundled-ecl-hook');
      assert.strictEqual(entry.choice, 'remove');
      assert.strictEqual(entry.resolvedActionType, 'backup-and-remove');
    }

    assert.strictEqual(
      (resolved.result.blocked || []).length,
      0,
      'no blockers should remain after bundled-hook classification fires',
    );
    assert.doesNotThrow(() => assertInstallerMigrationsUnblocked(resolved.result));
  });
});
