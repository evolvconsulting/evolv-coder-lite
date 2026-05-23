/**
 * Bug #3037: Gemini global+local install creates duplicate /ecl:* commands
 * across user (HOME/.gemini/) and workspace (PROJECT/.gemini/) scopes.
 *
 * Reproduction (from issue body):
 *   1. install --gemini --global with HOME=tmpHome
 *   2. cd tmpProject; install --gemini --local
 *   → both ~/.gemini/commands/ecl/ and PROJECT/.gemini/commands/ecl/ contain
 *     65 overlapping command filenames.
 *   → Gemini conflict detection renames every overlapping command to
 *     /workspace.ecl:* and /user.ecl:*, breaking the documented /ecl:*
 *     namespace.
 *
 * Fix: when the local Gemini install detects the user-scope eCL command
 * directory already exists with managed-shape content, skip the local copy
 * and emit a clear warning explaining the conflict avoidance.
 *
 * Tests are structural: they assert on the post-install filesystem shape
 * (existence and overlap count of typed paths), not on warning-message
 * substrings.
 */

'use strict';

process.env.ECL_TEST_MODE = '1';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createTempDir, cleanup } = require('./helpers.cjs');

const { install } = require('../bin/install.js');

describe('bug #3037: Gemini global+local install must not create duplicate command scopes', () => {
  let tmpHome;
  let tmpProject;
  let originalHome;
  let originalUserprofile;
  let originalCwd;

  beforeEach(() => {
    tmpHome = createTempDir('ecl-3037-home-');
    tmpProject = createTempDir('ecl-3037-work-');
    originalHome = process.env.HOME;
    originalUserprofile = process.env.USERPROFILE;
    originalCwd = process.cwd();
    // Point HOME at the temp dir so install(true, 'gemini') writes to
    // tmpHome/.gemini, not the developer's real home.
    process.env.HOME = tmpHome;
    process.env.USERPROFILE = tmpHome;
  });

  afterEach(() => {
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    // CR #3041: also restore USERPROFILE so the temp HOME doesn't leak
    // into later tests and create order-dependent failures on Windows
    // or any code path that reads USERPROFILE.
    if (originalUserprofile === undefined) delete process.env.USERPROFILE;
    else process.env.USERPROFILE = originalUserprofile;
    process.chdir(originalCwd);
    cleanup(tmpHome);
    cleanup(tmpProject);
  });

  function listCommandFiles(geminiCommandsRoot) {
    if (!fs.existsSync(geminiCommandsRoot)) return [];
    const out = [];
    function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.isFile()) out.push(path.relative(geminiCommandsRoot, full));
      }
    }
    walk(geminiCommandsRoot);
    return out.sort();
  }

  test('global install populates HOME/.gemini/commands/ecl', () => {
    install(true, 'gemini');
    const globalCmds = path.join(tmpHome, '.gemini', 'commands', 'ecl');
    const files = listCommandFiles(globalCmds);
    assert.ok(
      files.length > 0,
      'global install must populate HOME/.gemini/commands/ecl'
    );
  });

  test('local install after global does NOT populate PROJECT/.gemini/commands/ecl (avoids /ecl:* namespace conflict)', () => {
    // Step 1: global install
    install(true, 'gemini');
    const globalCmds = path.join(tmpHome, '.gemini', 'commands', 'ecl');
    const globalFiles = listCommandFiles(globalCmds);
    assert.ok(globalFiles.length > 0, 'precondition: global install must succeed');

    // Step 2: local install in a temp project
    process.chdir(tmpProject);
    install(false, 'gemini');

    // Assertion: the local commands/ecl/ directory must NOT exist (or must
    // be empty) so Gemini's conflict detection has nothing to rename. The
    // fix may either skip the directory entirely (preferred — no leftover
    // file system noise) or create an empty directory (acceptable but odd).
    const localCmds = path.join(tmpProject, '.gemini', 'commands', 'ecl');
    const localFiles = listCommandFiles(localCmds);
    assert.equal(
      localFiles.length,
      0,
      `local install must skip commands/ecl/ when global already exists; ` +
        `found ${localFiles.length} duplicate command file(s) at ${localCmds}`
    );
  });

  test('local install with NO existing global eCL does still populate PROJECT/.gemini/commands/ecl', () => {
    // No global install first — local should proceed normally so users who
    // only ever run --local still get eCL commands in their project.
    process.chdir(tmpProject);
    install(false, 'gemini');

    const localCmds = path.join(tmpProject, '.gemini', 'commands', 'ecl');
    const localFiles = listCommandFiles(localCmds);
    assert.ok(
      localFiles.length > 0,
      `local-only install must populate PROJECT/.gemini/commands/ecl; ` +
        `found ${localFiles.length} files at ${localCmds}`
    );
  });

  test('local install when HOME has hand-dropped overrides UNDER commands/ecl/ (but no full eCL) still populates locally', () => {
    // CR #3041 regression: the previous detection was
    // `fs.readdirSync(homeGeminiGsd).length > 0` which would skip the
    // local install for a user who manually dropped a single override
    // command at ~/.gemini/commands/ecl/<thing>.toml without ever
    // running --gemini --global. The fix narrows detection to require
    // at least 3 canonical eCL command files (help.toml, progress.toml,
    // new-project.toml) — a marker that's structurally impossible to
    // produce by accident.
    const homeGsdDir = path.join(tmpHome, '.gemini', 'commands', 'ecl');
    fs.mkdirSync(homeGsdDir, { recursive: true });
    fs.writeFileSync(
      path.join(homeGsdDir, 'my-override.toml'),
      'description = "user override"\nprompt = "..."\n'
    );

    process.chdir(tmpProject);
    install(false, 'gemini');

    const localCmds = path.join(tmpProject, '.gemini', 'commands', 'ecl');
    const localFiles = listCommandFiles(localCmds);
    assert.ok(
      localFiles.length > 0,
      `local install must proceed when HOME/.gemini/commands/ecl contains ` +
        `only user overrides (not the full eCL canary set); ` +
        `found ${localFiles.length} files at ${localCmds}`
    );
  });

  test('local install when HOME/.gemini exists but commands/ecl is absent (non-eCL Gemini user) still populates locally', () => {
    // Simulate a user who has Gemini configured but never installed eCL
    // globally. ~/.gemini/ exists with unrelated content; ~/.gemini/commands/
    // may or may not exist with non-ecl subdirectories. Local install must
    // still proceed because no eCL-managed user-scope directory is present.
    fs.mkdirSync(path.join(tmpHome, '.gemini', 'commands', 'someone-else'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(tmpHome, '.gemini', 'commands', 'someone-else', 'foo.toml'),
      'description = "user command"\nprompt = "..."\n'
    );

    process.chdir(tmpProject);
    install(false, 'gemini');

    const localCmds = path.join(tmpProject, '.gemini', 'commands', 'ecl');
    const localFiles = listCommandFiles(localCmds);
    assert.ok(
      localFiles.length > 0,
      `local install must proceed when no eCL-managed user-scope directory ` +
        `exists, even if other Gemini commands are present at the user scope`
    );
  });
});
