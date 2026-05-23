'use strict';
/**
 * Installer Module — date-stamped regression tests.
 *
 * Consolidates install-hermes-regressions.test.cjs into a single
 * regressions file for the installer module cluster.
 *
 * Defects covered:
 *   #3664 Defect #1 — stale skills/ecl/ecl-<stem>/ dirs on Hermes upgrade
 *   #3664 Defect #2 — --hermes --profile=core falls through to wrong path
 *   #2973 M1–M3    — dev-preferences migration at profile=core for hermes/qwen/claude
 *   #2973 U1–U3    — uninstall preserves dev-preferences via skill migration
 *
 * Closes #3758
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { createTempDir, cleanup } = require('./helpers.cjs');
const {
  loadSkillsManifest,
  resolveProfile,
} = require('../evolv-coder-lite/bin/lib/install-profiles.cjs');

// Load install exports via ECL_TEST_MODE to skip CLI main()
const savedTestMode = process.env.ECL_TEST_MODE;
process.env.ECL_TEST_MODE = '1';
let installExports;
try {
  installExports = require('../bin/install.js');
} finally {
  if (savedTestMode === undefined) delete process.env.ECL_TEST_MODE;
  else process.env.ECL_TEST_MODE = savedTestMode;
}

const { installRuntimeArtifacts, uninstallRuntimeArtifacts } = installExports || {};

const INSTALL_SCRIPT = path.join(__dirname, '..', 'bin', 'install.js');
const REAL_COMMANDS_DIR = path.join(__dirname, '..', 'commands', 'ecl');
const MANIFEST = loadSkillsManifest(REAL_COMMANDS_DIR);
const RESOLVED_CORE = resolveProfile({ modes: ['core'], manifest: MANIFEST });

// ─── Defect #1 — Hermes upgrade leaves stale skills/ecl/ecl-<stem>/ dirs ────

describe('Defect #1 regression (#3664): _runLegacyInstallMigrations removes skills/ecl/ecl-*/ layout', () => {
  test('installRuntimeArtifacts removes intermediate skills/ecl/ecl-*/ dirs and writes bare-stem layout', (t) => {
    const configDir = createTempDir('ecl-hermes-reg1-');
    t.after(() => cleanup(configDir));

    assert.strictEqual(typeof installRuntimeArtifacts, 'function',
      'installRuntimeArtifacts must be exported from bin/install.js');

    // Pre-create intermediate Hermes layout (between #2841 and #3664)
    const nestedGsdDir = path.join(configDir, 'skills', 'ecl');
    fs.mkdirSync(path.join(nestedGsdDir, 'ecl-help'), { recursive: true });
    fs.writeFileSync(path.join(nestedGsdDir, 'ecl-help', 'SKILL.md'), '# legacy help\n');
    fs.mkdirSync(path.join(nestedGsdDir, 'ecl-plan'), { recursive: true });
    fs.writeFileSync(path.join(nestedGsdDir, 'ecl-plan', 'SKILL.md'), '# legacy plan\n');

    // Sibling non-ecl dir inside skills/ecl/ must survive
    const userContentDir = path.join(nestedGsdDir, 'user-content');
    fs.mkdirSync(userContentDir, { recursive: true });
    fs.writeFileSync(path.join(userContentDir, 'SKILL.md'), '# user content\n');

    installRuntimeArtifacts('hermes', configDir, 'global', RESOLVED_CORE);

    assert.ok(!fs.existsSync(path.join(nestedGsdDir, 'ecl-help')),
      'skills/ecl/ecl-help/ must be removed (Defect #1)');
    assert.ok(!fs.existsSync(path.join(nestedGsdDir, 'ecl-plan')),
      'skills/ecl/ecl-plan/ must be removed (Defect #1)');
    assert.ok(fs.existsSync(path.join(nestedGsdDir, 'help', 'SKILL.md')),
      'skills/ecl/help/SKILL.md must exist after install');
    assert.ok(fs.existsSync(path.join(userContentDir, 'SKILL.md')),
      'user-content must be preserved');
  });
});

// ─── Defect #2 — --qwen --profile=core falls through to wrong path ────────────

describe('Defect #2 regression (Qwen, #3664): --qwen --profile=core writes skills/ecl-*/, not commands/ecl/', () => {
  test('spawn --qwen --global --profile=core: skills/ecl-*/ written, no commands/ecl/', (t) => {
    const root = createTempDir('ecl-qwen-reg2-');
    t.after(() => cleanup(root));

    const result = spawnSync(
      process.execPath,
      [INSTALL_SCRIPT, '--qwen', '--global', '--config-dir', root, '--profile=core'],
      { encoding: 'utf8', env: { ...process.env, HOME: root, USERPROFILE: root } },
    );

    assert.strictEqual(result.status, 0,
      `installer exited ${result.status}\n${result.stdout}\n${result.stderr}`);

    const qwenSkillsDir = path.join(root, 'skills');
    assert.ok(fs.existsSync(qwenSkillsDir));

    const skillDirs = fs.readdirSync(qwenSkillsDir, { withFileTypes: true })
      .filter(e => e.isDirectory() && e.name.startsWith('ecl-'));
    assert.ok(skillDirs.length >= 1, 'at least one ecl-* skill dir must exist');
    assert.ok(
      skillDirs.some(e => fs.existsSync(path.join(qwenSkillsDir, e.name, 'SKILL.md'))),
      'at least one skills/ecl-*/SKILL.md must exist'
    );

    const commandsGsd = path.join(root, 'commands', 'ecl');
    if (fs.existsSync(commandsGsd)) {
      const mdFiles = fs.readdirSync(commandsGsd).filter(f => f.endsWith('.md'));
      assert.strictEqual(mdFiles.length, 0, `commands/ecl/ must not contain .md files (Defect #2). Found: ${mdFiles.join(', ')}`);
    }
  });
});

describe('Defect #2 regression (Hermes, #3664): --hermes --profile=core writes skills/ecl/, not commands/ecl/', () => {
  test('spawn --hermes --global --profile=core: skills/ecl/ written, no commands/ecl/', (t) => {
    const root = createTempDir('ecl-hermes-reg2-');
    t.after(() => cleanup(root));

    const result = spawnSync(
      process.execPath,
      [INSTALL_SCRIPT, '--hermes', '--global', '--config-dir', root, '--profile=core'],
      { encoding: 'utf8', env: { ...process.env, HOME: root, USERPROFILE: root } },
    );

    assert.strictEqual(result.status, 0,
      `installer exited ${result.status}\n${result.stdout}\n${result.stderr}`);

    const hermesSkillsGsd = path.join(root, 'skills', 'ecl');
    assert.ok(fs.existsSync(hermesSkillsGsd));

    const skillDirs = fs.readdirSync(hermesSkillsGsd, { withFileTypes: true })
      .filter(e => e.isDirectory());
    assert.ok(skillDirs.length >= 1);
    assert.ok(
      skillDirs.some(e => fs.existsSync(path.join(hermesSkillsGsd, e.name, 'SKILL.md'))),
    );

    const commandsGsd = path.join(root, 'commands', 'ecl');
    if (fs.existsSync(commandsGsd)) {
      const mdFiles = fs.readdirSync(commandsGsd).filter(f => f.endsWith('.md'));
      assert.strictEqual(mdFiles.length, 0, `commands/ecl/ must not contain .md files (Defect #2). Found: ${mdFiles.join(', ')}`);
    }
  });
});

// ─── M1 — Hermes minimal-mode migrates dev-preferences (#2973) ───────────────

describe('M1 (#2973): --hermes --global --profile=core migrates dev-preferences → skills/ecl/dev-preferences/SKILL.md', () => {
  test('dev-preferences migrated to nested Hermes location, legacy source removed', (t) => {
    const root = createTempDir('ecl-hermes-m1-');
    t.after(() => cleanup(root));

    const legacyDir = path.join(root, 'commands', 'ecl');
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, 'dev-preferences.md'), '# my hermes prefs\n');

    const result = spawnSync(
      process.execPath,
      [INSTALL_SCRIPT, '--hermes', '--global', '--config-dir', root, '--profile=core'],
      { encoding: 'utf8', env: { ...process.env, HOME: root, USERPROFILE: root } },
    );

    assert.strictEqual(result.status, 0,
      `installer exited ${result.status}\n${result.stdout}\n${result.stderr}`);

    const skillFile = path.join(root, 'skills', 'ecl', 'dev-preferences', 'SKILL.md');
    assert.ok(fs.existsSync(skillFile),
      'skills/ecl/dev-preferences/SKILL.md must exist (M1: nested, not flat)');
    assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), '# my hermes prefs\n');
    assert.ok(!fs.existsSync(path.join(legacyDir, 'dev-preferences.md')),
      'legacy source must be removed');
  });
});

// ─── M2 — Qwen minimal-mode migrates dev-preferences (#2973) ────────────────

describe('M2 (#2973): --qwen --global --profile=core migrates dev-preferences → skills/ecl-dev-preferences/SKILL.md', () => {
  test('dev-preferences migrated to flat Qwen location, legacy source removed', (t) => {
    const root = createTempDir('ecl-qwen-m2-');
    t.after(() => cleanup(root));

    const legacyDir = path.join(root, 'commands', 'ecl');
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, 'dev-preferences.md'), '# my qwen prefs\n');

    const result = spawnSync(
      process.execPath,
      [INSTALL_SCRIPT, '--qwen', '--global', '--config-dir', root, '--profile=core'],
      { encoding: 'utf8', env: { ...process.env, HOME: root, USERPROFILE: root } },
    );

    assert.strictEqual(result.status, 0,
      `installer exited ${result.status}\n${result.stdout}\n${result.stderr}`);

    const skillFile = path.join(root, 'skills', 'ecl-dev-preferences', 'SKILL.md');
    assert.ok(fs.existsSync(skillFile),
      'skills/ecl-dev-preferences/SKILL.md must exist (M2: flat Qwen layout)');
    assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), '# my qwen prefs\n');
    assert.ok(!fs.existsSync(path.join(legacyDir, 'dev-preferences.md')));
  });
});

// ─── M3 — Claude global minimal-mode migrates dev-preferences (#2973) ────────

describe('M3 (#2973): --claude --global --profile=core migrates dev-preferences → skills/ecl-dev-preferences/SKILL.md', () => {
  test('dev-preferences migrated to flat Claude-global location, legacy source removed', (t) => {
    const root = createTempDir('ecl-claude-m3-');
    t.after(() => cleanup(root));

    const legacyDir = path.join(root, 'commands', 'ecl');
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, 'dev-preferences.md'), '# my claude prefs\n');

    const result = spawnSync(
      process.execPath,
      [INSTALL_SCRIPT, '--claude', '--global', '--config-dir', root, '--profile=core'],
      { encoding: 'utf8', env: { ...process.env, HOME: root, USERPROFILE: root } },
    );

    assert.strictEqual(result.status, 0,
      `installer exited ${result.status}\n${result.stdout}\n${result.stderr}`);

    const skillFile = path.join(root, 'skills', 'ecl-dev-preferences', 'SKILL.md');
    assert.ok(fs.existsSync(skillFile),
      'skills/ecl-dev-preferences/SKILL.md must exist (M3)');
    assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), '# my claude prefs\n');
    assert.ok(!fs.existsSync(path.join(legacyDir, 'dev-preferences.md')));
  });
});

// ─── U1 — Qwen uninstall preserves dev-preferences via migration (#2973) ─────

describe('U1 (#2973): uninstallRuntimeArtifacts qwen migrates dev-preferences → skills/ecl-dev-preferences/SKILL.md', () => {
  test('commands/ecl/ removed, dev-preferences migrated to skills skill', (t) => {
    const configDir = createTempDir('ecl-qwen-uninstall-u1-');
    t.after(() => cleanup(configDir));

    assert.strictEqual(typeof uninstallRuntimeArtifacts, 'function',
      'uninstallRuntimeArtifacts must be exported from bin/install.js');

    const legacyDir = path.join(configDir, 'commands', 'ecl');
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, 'dev-preferences.md'), '# my qwen prefs\n');
    fs.writeFileSync(path.join(legacyDir, 'help.md'), '# help content\n');

    uninstallRuntimeArtifacts('qwen', configDir, 'global');

    assert.ok(!fs.existsSync(path.join(legacyDir, 'help.md')));
    assert.ok(!fs.existsSync(path.join(legacyDir, 'dev-preferences.md')));

    const skillFile = path.join(configDir, 'skills', 'ecl-dev-preferences', 'SKILL.md');
    assert.ok(fs.existsSync(skillFile), 'skills/ecl-dev-preferences/SKILL.md must exist (U1)');
    assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), '# my qwen prefs\n');
  });
});

// ─── U2 — Claude-global uninstall preserves dev-preferences (#2973) ──────────

describe('U2 (#2973): uninstallRuntimeArtifacts claude/global migrates dev-preferences → skills/ecl-dev-preferences/SKILL.md', () => {
  test('commands/ecl/ removed, dev-preferences migrated to skills skill', (t) => {
    const configDir = createTempDir('ecl-claude-uninstall-u2-');
    t.after(() => cleanup(configDir));

    assert.strictEqual(typeof uninstallRuntimeArtifacts, 'function');

    const legacyDir = path.join(configDir, 'commands', 'ecl');
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, 'dev-preferences.md'), '# my claude prefs\n');

    uninstallRuntimeArtifacts('claude', configDir, 'global');

    assert.ok(!fs.existsSync(path.join(legacyDir, 'dev-preferences.md')));

    const skillFile = path.join(configDir, 'skills', 'ecl-dev-preferences', 'SKILL.md');
    assert.ok(fs.existsSync(skillFile), 'skills/ecl-dev-preferences/SKILL.md must exist (U2)');
    assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), '# my claude prefs\n');
  });
});

// ─── U3 — Hermes uninstall migrates dev-preferences to NESTED location (#2973) ─

describe('U3 (#2973): uninstallRuntimeArtifacts hermes migrates dev-preferences → skills/ecl/dev-preferences/SKILL.md', () => {
  test('commands/ecl/ NOT recreated, dev-preferences at nested Hermes location', (t) => {
    const configDir = createTempDir('ecl-hermes-uninstall-u3-');
    t.after(() => cleanup(configDir));

    assert.strictEqual(typeof uninstallRuntimeArtifacts, 'function');

    const legacyDir = path.join(configDir, 'commands', 'ecl');
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, 'dev-preferences.md'), '# my hermes prefs\n');

    uninstallRuntimeArtifacts('hermes', configDir, 'global');

    assert.ok(!fs.existsSync(path.join(legacyDir, 'dev-preferences.md')),
      'commands/ecl/dev-preferences.md must not exist after hermes uninstall (U3)');

    const skillFile = path.join(configDir, 'skills', 'ecl', 'dev-preferences', 'SKILL.md');
    assert.ok(fs.existsSync(skillFile),
      'skills/ecl/dev-preferences/SKILL.md must exist at HERMES nested location (U3)');
    assert.strictEqual(fs.readFileSync(skillFile, 'utf8'), '# my hermes prefs\n');
  });
});
