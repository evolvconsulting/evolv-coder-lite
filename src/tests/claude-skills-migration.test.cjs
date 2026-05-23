// allow-test-rule: source-text-is-the-product
// Reads .md/.json/.yml product files whose deployed text IS what the
// runtime loads — testing text content tests the deployed contract.

/**
 * eCL Tools Tests - Claude Skills Migration (#1504)
 *
 * Tests for migrating Claude Code from commands/ecl/ to skills/ecl-xxx/SKILL.md
 * format for compatibility with Claude Code 2.1.88+.
 *
 * Uses node:test and node:assert (NOT Jest).
 */

process.env.ECL_TEST_MODE = '1';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');

const {
  convertClaudeCommandToClaudeSkill,
  writeManifest,
  install,
  installRuntimeArtifacts,
  uninstallRuntimeArtifacts,
} = require(path.join(ROOT, 'bin', 'install.js'));

const {
  loadSkillsManifest,
  resolveProfile,
} = require(path.join(ROOT, 'evolv-coder-lite', 'bin', 'lib', 'install-profiles.cjs'));

// Shared resolved profile (full — installs all skills from srcDir)
const _manifest = loadSkillsManifest();
const resolvedProfileFull = resolveProfile({ modes: [], manifest: _manifest });

/**
 * Set up a configDir backed by a custom srcDir via .ecl-source marker.
 * Returns { configDir, srcDir } both under tmpDir.
 */
function setupConfigDir(tmpDir, commandFiles) {
  const srcDir = path.join(tmpDir, 'commands', 'ecl');
  fs.mkdirSync(srcDir, { recursive: true });
  for (const [name, content] of Object.entries(commandFiles)) {
    fs.writeFileSync(path.join(srcDir, name), content);
  }
  const configDir = path.join(tmpDir, 'config');
  fs.mkdirSync(configDir, { recursive: true });
  // .ecl-source marker tells findInstallSourceRoot to use our custom srcDir
  fs.writeFileSync(path.join(configDir, '.ecl-source'), srcDir + '\n');
  return { configDir, srcDir };
}

// ─── convertClaudeCommandToClaudeSkill ──────────────────────────────────────

describe('convertClaudeCommandToClaudeSkill', () => {
  test('preserves allowed-tools multiline YAML list', () => {
    const input = [
      '---',
      'name: ecl:next',
      'description: Advance to the next step',
      'allowed-tools:',
      '  - Read',
      '  - Bash',
      '  - Grep',
      '---',
      '',
      'Body content here.',
    ].join('\n');

    const result = convertClaudeCommandToClaudeSkill(input, 'ecl-next');
    assert.ok(result.includes('allowed-tools:'), 'allowed-tools field is present');
    assert.ok(result.includes('Read'), 'Read tool preserved');
    assert.ok(result.includes('Bash'), 'Bash tool preserved');
    assert.ok(result.includes('Grep'), 'Grep tool preserved');
  });

  test('preserves argument-hint', () => {
    const input = [
      '---',
      'name: ecl:debug',
      'description: Debug issues',
      'argument-hint: "[issue description]"',
      'allowed-tools:',
      '  - Read',
      '  - Bash',
      '---',
      '',
      'Debug body.',
    ].join('\n');

    const result = convertClaudeCommandToClaudeSkill(input, 'ecl-debug');
    assert.ok(result.includes('argument-hint:'), 'argument-hint field is present');
    // The value should be preserved (possibly yaml-quoted)
    assert.ok(
      result.includes('[issue description]'),
      'argument-hint value preserved'
    );
  });

  test('emits hyphen-form name (ecl-<cmd>) from hyphen-form dir (#2808)', () => {
    const input = [
      '---',
      'name: ecl:next',
      'description: Advance workflow',
      '---',
      '',
      'Body.',
    ].join('\n');

    // Directory name is ecl-next (hyphen, Windows-safe), frontmatter name is
    // ecl-next (hyphen, #2808) so Claude Code autocomplete shows canonical form.
    const result = convertClaudeCommandToClaudeSkill(input, 'ecl-next');
    assert.ok(result.includes('name: ecl-next'), 'frontmatter name uses hyphen form (#2808)');
  });

  test('preserves body content while normalizing ecl: command references (#3583)', () => {
    // The body transformer now rewrites ecl: references (colon → hyphen) but must
    // leave all other custom prose, tags, and structure intact.
    const body = '\n<objective>\nSee /ecl:plan-phase and ecl:review for details.\n</objective>\n\n<process>\nStep 1.\nStep 2.\n</process>\n';
    const input = [
      '---',
      'name: ecl:test',
      'description: Test command',
      '---',
      body,
    ].join('');

    const result = convertClaudeCommandToClaudeSkill(input, 'ecl-test');
    // Custom structure preserved
    assert.ok(result.includes('<objective>'), 'objective tag preserved');
    assert.ok(result.includes('See /ecl-plan-phase'), 'rewritten command reference visible');
    assert.ok(result.includes('<process>'), 'process tag preserved');
    assert.ok(result.includes('Step 1.'), 'step text preserved');

    // #3583: ecl: references in body are normalized to hyphen form
    assert.ok(result.includes('/ecl-plan-phase'), 'colon command ref rewritten to hyphen');
    assert.ok(result.includes('ecl-review'), 'bare colon ref rewritten to hyphen');
    assert.ok(!result.includes('ecl:plan-phase'), 'no colon form should survive in body');
    assert.ok(!result.includes('ecl:review'), 'no colon form should survive in body');
  });

  test('preserves agent field', () => {
    const input = [
      '---',
      'name: ecl:plan-phase',
      'description: Plan a phase',
      'agent: true',
      'allowed-tools:',
      '  - Read',
      '---',
      '',
      'Plan body.',
    ].join('\n');

    const result = convertClaudeCommandToClaudeSkill(input, 'ecl-plan-phase');
    assert.ok(result.includes('agent:'), 'agent field is present');
  });

  test('handles content with no frontmatter', () => {
    const input = 'Just some plain markdown content.';
    const result = convertClaudeCommandToClaudeSkill(input, 'ecl-plain');
    assert.strictEqual(result, input, 'content returned unchanged');
  });

  test('preserves allowed-tools as multiline YAML list (not flattened)', () => {
    const input = [
      '---',
      'name: ecl:debug',
      'description: Debug',
      'allowed-tools:',
      '  - Read',
      '  - Bash',
      '  - Task',
      '  - AskUserQuestion',
      '---',
      '',
      'Body.',
    ].join('\n');

    const result = convertClaudeCommandToClaudeSkill(input, 'ecl-debug');
    // Claude Code native format keeps YAML multiline list
    assert.ok(result.includes('  - Read'), 'Read in multiline list');
    assert.ok(result.includes('  - Bash'), 'Bash in multiline list');
    assert.ok(result.includes('  - Task'), 'Task in multiline list');
    assert.ok(result.includes('  - AskUserQuestion'), 'AskUserQuestion in multiline list');
  });
});

// ─── installRuntimeArtifacts (claude global) — skill layout ─────────────────

describe('installRuntimeArtifacts (claude global) — skill layout', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecl-claude-skills-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('creates correct directory structure skills/ecl-xxx/SKILL.md', () => {
    const { configDir } = setupConfigDir(tmpDir, {
      'next.md': '---\nname: ecl:next\ndescription: Advance\nallowed-tools:\n  - Read\n---\n\nBody.',
      'health.md': '---\nname: ecl:health\ndescription: Check health\n---\n\nHealth body.',
    });

    installRuntimeArtifacts('claude', configDir, 'global', resolvedProfileFull);

    const skillsDir = path.join(configDir, 'skills');
    assert.ok(
      fs.existsSync(path.join(skillsDir, 'ecl-next', 'SKILL.md')),
      'skills/ecl-next/SKILL.md exists'
    );
    assert.ok(
      fs.existsSync(path.join(skillsDir, 'ecl-health', 'SKILL.md')),
      'skills/ecl-health/SKILL.md exists'
    );
  });

  test('cleans up old skills before installing new ones (uninstall+install cycle)', () => {
    const { configDir } = setupConfigDir(tmpDir, {
      'next.md': '---\nname: ecl:next\ndescription: Advance\n---\n\nBody.',
    });

    const skillsDir = path.join(configDir, 'skills');
    // Create a stale skill that should be removed by the uninstall step
    const staleDir = path.join(skillsDir, 'ecl-old-command');
    fs.mkdirSync(staleDir, { recursive: true });
    fs.writeFileSync(path.join(staleDir, 'SKILL.md'), 'stale content');

    // Production sequence: uninstall wipes ecl-* entries, install writes fresh ones
    uninstallRuntimeArtifacts('claude', configDir, 'global');
    installRuntimeArtifacts('claude', configDir, 'global', resolvedProfileFull);

    // Stale skill removed by uninstall
    assert.ok(
      !fs.existsSync(staleDir),
      'stale skill directory removed'
    );
    // New skill created by install
    assert.ok(
      fs.existsSync(path.join(skillsDir, 'ecl-next', 'SKILL.md')),
      'new skill created'
    );
  });

  test('does not remove non-eCL skills', () => {
    const { configDir } = setupConfigDir(tmpDir, {
      'next.md': '---\nname: ecl:next\ndescription: Advance\n---\n\nBody.',
    });

    const skillsDir = path.join(configDir, 'skills');
    // Create a non-eCL skill before install
    const otherDir = path.join(skillsDir, 'my-custom-skill');
    fs.mkdirSync(otherDir, { recursive: true });
    fs.writeFileSync(path.join(otherDir, 'SKILL.md'), 'custom content');

    // Install (no pre-uninstall: uninstall only removes ecl-* prefixed entries)
    installRuntimeArtifacts('claude', configDir, 'global', resolvedProfileFull);

    // Non-eCL skill preserved
    assert.ok(
      fs.existsSync(otherDir),
      'non-eCL skill preserved after install'
    );

    // Also survives uninstall (uninstall only removes ecl-* prefixed entries)
    uninstallRuntimeArtifacts('claude', configDir, 'global');
    assert.ok(
      fs.existsSync(otherDir),
      'non-eCL skill preserved after uninstall'
    );
  });

  // NOTE: Recursive subdirectory support was removed when the shim was replaced.
  // stageSkillsForRuntimeAsSkills only processes top-level .md files.
  // No subdirectories exist under commands/ecl/ in production.
  // The subdir-recursion test has been deleted (option a per #3664 brief).

  test('no-ops on install when source directory has no .md files', () => {
    // Create an empty (but existing) commands/ecl dir with no .md files.
    // stageSkillsForRuntimeAsSkills loops over entries, finds none, and stages
    // an empty dir — _copyStaged then copies nothing into skills/.
    const emptySrc = path.join(tmpDir, 'empty-commands', 'ecl');
    fs.mkdirSync(emptySrc, { recursive: true });

    const configDir = path.join(tmpDir, 'config-empty');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, '.ecl-source'), emptySrc + '\n');

    // Should not throw
    installRuntimeArtifacts('claude', configDir, 'global', resolvedProfileFull);
    const skillsDir = path.join(configDir, 'skills');
    // If skills dir was created it must contain no ecl-* entries
    if (fs.existsSync(skillsDir)) {
      const gsdEntries = fs.readdirSync(skillsDir).filter(n => n.startsWith('ecl-'));
      assert.strictEqual(gsdEntries.length, 0, 'no ecl-* skills created when src has no .md files');
    }
  });
});

// ─── Path replacement in Claude skills (#1653) ────────────────────────────────

describe('installRuntimeArtifacts path replacement in Claude global skills (#1653)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecl-claude-path-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('replaces ~/.claude/ and $HOME/.claude/ paths with absolute configDir prefix on global install', () => {
    // Global install: configDir IS the runtime config directory.
    // computePathPrefix(isGlobal=true) → resolvedTarget + '/'.
    // applyRuntimeContentRewritesInPlace rewrites ~/.claude/ and $HOME/.claude/
    // to the absolute configDir path so skills work from any machine.
    const { configDir } = setupConfigDir(tmpDir, {
      'manager.md': [
        '---',
        'name: ecl:manager',
        'description: Manager command',
        '---',
        '',
        '<execution_context>',
        '@~/.claude/evolv-coder-lite/workflows/manager.md',
        '@$HOME/.claude/evolv-coder-lite/references/ui-brand.md',
        '</execution_context>',
      ].join('\n'),
    });

    installRuntimeArtifacts('claude', configDir, 'global', resolvedProfileFull);

    const content = fs.readFileSync(
      path.join(configDir, 'skills', 'ecl-manager', 'SKILL.md'), 'utf8'
    );
    assert.ok(!content.includes('~/.claude/'), 'no hardcoded ~/.claude/ paths remain');
    assert.ok(!content.includes('$HOME/.claude/'), 'no $HOME/.claude/ paths remain');
    // Paths are rewritten to the absolute configDir prefix
    const expectedPrefix = path.resolve(configDir).replace(/\\/g, '/') + '/';
    assert.ok(
      content.includes(expectedPrefix + 'evolv-coder-lite/workflows/manager.md'),
      'tilde path rewritten to absolute configDir prefix'
    );
    assert.ok(
      content.includes(expectedPrefix + 'evolv-coder-lite/references/ui-brand.md'),
      'HOME path rewritten to absolute configDir prefix'
    );
  });

  test('replaces $HOME/.claude/ paths with absolute configDir prefix on global install', () => {
    const { configDir } = setupConfigDir(tmpDir, {
      'debug.md': '---\nname: ecl:debug\ndescription: Debug\n---\n\n@$HOME/.claude/evolv-coder-lite/workflows/debug.md',
    });

    installRuntimeArtifacts('claude', configDir, 'global', resolvedProfileFull);

    const content = fs.readFileSync(
      path.join(configDir, 'skills', 'ecl-debug', 'SKILL.md'), 'utf8'
    );
    assert.ok(!content.includes('$HOME/.claude/'), 'no $HOME/.claude/ paths remain');
    const expectedPrefix = path.resolve(configDir).replace(/\\/g, '/') + '/';
    assert.ok(
      content.includes(expectedPrefix + 'evolv-coder-lite/workflows/debug.md'),
      'path rewritten to absolute configDir prefix'
    );
  });

  test('global install rewrites ~/.claude/ paths to absolute configDir form', () => {
    // For global installs, computePathPrefix returns the absolute configDir path.
    // Both ~/.claude/ and $HOME/.claude/ are normalized to the same absolute prefix.
    const { configDir } = setupConfigDir(tmpDir, {
      'next.md': '---\nname: ecl:next\ndescription: Next\n---\n\n@~/.claude/evolv-coder-lite/workflows/next.md',
    });

    installRuntimeArtifacts('claude', configDir, 'global', resolvedProfileFull);

    const content = fs.readFileSync(
      path.join(configDir, 'skills', 'ecl-next', 'SKILL.md'), 'utf8'
    );
    const expectedPrefix = path.resolve(configDir).replace(/\\/g, '/') + '/';
    assert.ok(
      content.includes(expectedPrefix + 'evolv-coder-lite/workflows/next.md'),
      'global tilde path rewritten to absolute configDir prefix'
    );
    assert.ok(!content.includes('~/.claude/'), 'tilde form is replaced');
  });
});

// ─── Legacy cleanup during install ──────────────────────────────────────────

describe('Legacy commands/ecl/ cleanup', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecl-legacy-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('install removes legacy commands/ecl/ directory when present', () => {
    const { configDir } = setupConfigDir(tmpDir, {
      'next.md': '---\nname: ecl:next\ndescription: Advance\n---\n\nBody.',
    });

    // Create a mock legacy commands/ecl/ directory inside configDir
    const legacyDir = path.join(configDir, 'commands', 'ecl');
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, 'next.md'), 'legacy content');

    // installRuntimeArtifacts calls _runLegacyInstallMigrations which removes
    // commands/ecl/ for claude runtime (it's the legacy location for global).
    installRuntimeArtifacts('claude', configDir, 'global', resolvedProfileFull);

    assert.ok(!fs.existsSync(legacyDir), 'legacy commands/ecl/ removed');
    assert.ok(
      fs.existsSync(path.join(configDir, 'skills', 'ecl-next', 'SKILL.md')),
      'new skill installed'
    );
  });
});

// ─── writeManifest tracks skills/ for Claude ────────────────────────────────

describe('writeManifest tracks skills/ for Claude', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecl-manifest-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('manifest includes skills/ecl-xxx/SKILL.md entries for Claude runtime', () => {
    // Create skills directory structure (as install would)
    const skillsDir = path.join(tmpDir, 'skills');
    const skillDir = path.join(skillsDir, 'ecl-next');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), 'skill content');

    // Create evolv-coder-lite directory (required by writeManifest)
    const gsdDir = path.join(tmpDir, 'evolv-coder-lite');
    fs.mkdirSync(gsdDir, { recursive: true });
    fs.writeFileSync(path.join(gsdDir, 'test.md'), 'test');

    writeManifest(tmpDir, 'claude');

    const manifest = JSON.parse(
      fs.readFileSync(path.join(tmpDir, 'ecl-file-manifest.json'), 'utf8')
    );

    // Should have skills/ entries
    const skillEntries = Object.keys(manifest.files).filter(k =>
      k.startsWith('skills/')
    );
    assert.ok(skillEntries.length > 0, 'manifest has skills/ entries');
    assert.ok(
      skillEntries.some(k => k === 'skills/ecl-next/SKILL.md'),
      'manifest has skills/ecl-next/SKILL.md'
    );

    // Should NOT have commands/ecl/ entries
    const cmdEntries = Object.keys(manifest.files).filter(k =>
      k.startsWith('commands/ecl/')
    );
    assert.strictEqual(cmdEntries.length, 0, 'manifest has no commands/ecl/ entries');
  });
});

// ─── Exports exist ──────────────────────────────────────────────────────────

describe('Claude skills migration exports', () => {
  test('convertClaudeCommandToClaudeSkill is exported', () => {
    assert.strictEqual(typeof convertClaudeCommandToClaudeSkill, 'function');
  });

  test('installRuntimeArtifacts is exported', () => {
    assert.strictEqual(typeof installRuntimeArtifacts, 'function');
  });
});
