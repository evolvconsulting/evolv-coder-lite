'use strict';

/**
 * Bug #410: finishInstall writes ~/.ecl/defaults.json for non-Claude runtimes
 * without a ECL_TEST_MODE guard, polluting the real developer home directory
 * during test runs.
 *
 * The opencode permission-config write a few lines above already carries the
 * ECL_TEST_MODE guard (added for #130) — this test covers the un-fixed sibling
 * (the resolve_model_ids: "omit" write).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');

// Point HOME at a temp dir so the defaults.json write can't reach the real
// ~/.ecl/ even if the guard is missing.
// On Windows, os.homedir() reads USERPROFILE (not HOME). Set both so
// finishInstall's path.join(os.homedir(), '.ecl') resolves into FAKE_HOME
// on every platform. Node docs: https://nodejs.org/docs/latest-v22.x/api/os.html#oshomedir
const FAKE_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'ecl-410-test-'));
process.env.HOME = FAKE_HOME;
process.env.USERPROFILE = FAKE_HOME;

// The path that finishInstall would write to for a non-Claude runtime.
const ECL_DIR = path.join(FAKE_HOME, '.ecl');
const DEFAULTS_PATH = path.join(ECL_DIR, 'defaults.json');

// Set ECL_TEST_MODE before requiring install.js so any module-level guards
// also see the flag.
process.env.ECL_TEST_MODE = '1';

const installModule = require(path.join(ROOT, 'bin', 'install.js'));

// A synthetic settingsPath that won't exist — finishInstall should cope.
const SETTINGS_PATH = path.join(FAKE_HOME, `ecl-test-settings-${process.pid}.json`);

function callFinishInstallForRuntime(runtime) {
  const original = console.log;
  console.log = () => {};
  try {
    installModule.finishInstall(
      SETTINGS_PATH,
      {},       // empty settings
      null,     // statuslineCommand
      false,    // shouldInstallStatusline
      runtime,
      true,     // isGlobal
      null,     // configDir
    );
  } finally {
    console.log = original;
  }
}

describe('Bug #410: finishInstall non-Claude runtime + ECL_TEST_MODE side-effect guard', () => {
  test('defaults.json is NOT written for opencode runtime under ECL_TEST_MODE', () => {
    assert.equal(
      fs.existsSync(DEFAULTS_PATH),
      false,
      'defaults.json should not exist before finishInstall call',
    );

    callFinishInstallForRuntime('opencode');

    assert.equal(
      fs.existsSync(DEFAULTS_PATH),
      false,
      `defaults.json must NOT be created under ECL_TEST_MODE; found at ${DEFAULTS_PATH}`,
    );
  });

  test('defaults.json is NOT written for gemini runtime under ECL_TEST_MODE', () => {
    // Reset in case previous test left artifacts (it shouldn't).
    assert.equal(
      fs.existsSync(DEFAULTS_PATH),
      false,
      'defaults.json should not exist before gemini test',
    );

    callFinishInstallForRuntime('gemini');

    assert.equal(
      fs.existsSync(DEFAULTS_PATH),
      false,
      `defaults.json must NOT be created under ECL_TEST_MODE for gemini; found at ${DEFAULTS_PATH}`,
    );
  });

  test('defaults.json IS written for opencode runtime when ECL_TEST_MODE is unset', () => {
    // Temporarily unset ECL_TEST_MODE to verify the user-facing path still works.
    const saved = process.env.ECL_TEST_MODE;
    delete process.env.ECL_TEST_MODE;
    try {
      callFinishInstallForRuntime('opencode');
      assert.equal(
        fs.existsSync(DEFAULTS_PATH),
        true,
        `defaults.json must be written for non-Claude runtime when ECL_TEST_MODE is unset`,
      );
      // Verify the written content is correct.
      const contents = JSON.parse(fs.readFileSync(DEFAULTS_PATH, 'utf8'));
      assert.equal(contents.resolve_model_ids, 'omit', 'resolve_model_ids must be "omit"');
    } finally {
      // Restore ECL_TEST_MODE and clean up the written file.
      process.env.ECL_TEST_MODE = saved;
      try { fs.rmSync(DEFAULTS_PATH); } catch { /* already gone */ }
      try { fs.rmdirSync(ECL_DIR); } catch { /* not empty or already gone */ }
    }
  });
});
