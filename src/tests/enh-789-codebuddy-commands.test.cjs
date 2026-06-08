// allow-test-rule: source-text-is-the-product
// Workflow .md / command .md / SKILL.md files — their text IS what the runtime
// loads. Testing emitted text tests the deployed contract.
// Per CONTRIBUTING.md exception matrix.

/**
 * Regression guard — enh(#789): elevate CodeBuddy slash-command surface.
 *
 * CodeBuddy (Tencent, @tencent-ai/codebuddy-code) reads user-level surfaces
 * (https://www.codebuddy.ai/docs/cli/slash-commands, /skills):
 *   - commands/ecl-<stem>.md   — slash commands shown in the '/' menu
 *   - skills/ecl-<stem>/SKILL.md — model-invocable skills
 *
 * Before #789 ecl emitted only skills/. Because CodeBuddy skills default to
 * user-invocable:true (appear in '/'), emitting a commands/ surface AND leaving
 * skills user-invocable would duplicate every /ecl-* entry. #789 therefore:
 *   1. emits commands/ecl-<stem>.md (the '/' surface, peer-consistent with
 *      Cursor #785 and Augment #790),
 *   2. marks skills user-invocable:false so they become model-invocable
 *      background knowledge and the commands/ surface is the sole '/' surface.
 *
 * Subagents are already emitted via the generic agents block + convertClaude
 * AgentToCodebuddyAgent (~/.codebuddy/agents/), so #789 adds no agents change.
 *
 * mcp.json is intentionally NOT written: ecl ships no MCP server, and CodeBuddy's
 * mcp.json holds an `mcpServers` map of *external* servers to connect to —
 * there is nothing for ecl to register. Same exclusion as #784/#785/#790.
 */
'use strict';

process.env.ECL_TEST_MODE = '1';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createTempDir, cleanup } = require('./helpers.cjs');

const {
  installRuntimeArtifacts,
  uninstallRuntimeArtifacts,
  convertClaudeCommandToCodebuddyCommand,
  convertClaudeCommandToCodebuddySkill,
} = require('../bin/install.js');
const { resolveRuntimeArtifactLayout } = require('../evolv-coder-lite/bin/lib/runtime-artifact-layout.cjs');
const { loadSkillsManifest, resolveProfile } = require('../evolv-coder-lite/bin/lib/install-profiles.cjs');

const REAL_COMMANDS_DIR = path.join(__dirname, '..', 'commands', 'ecl');
const MANIFEST = loadSkillsManifest(REAL_COMMANDS_DIR);
const RESOLVED_CORE = resolveProfile({ modes: ['core'], manifest: MANIFEST });

// ─── Layout contract ─────────────────────────────────────────────────────────

describe('enh-789 — codebuddy layout has commands + skills kinds', () => {
  test('resolveRuntimeArtifactLayout codebuddy returns 2 kinds', () => {
    const layout = resolveRuntimeArtifactLayout('codebuddy', '/tmp/fake-codebuddy-dir');
    assert.strictEqual(layout.kinds.length, 2, 'codebuddy must have exactly 2 artifact kinds');
    const kindNames = layout.kinds.map(k => k.kind).sort();
    assert.deepStrictEqual(kindNames, ['commands', 'skills']);
  });

  test('codebuddy commands kind targets commands/ with ecl- prefix', () => {
    const layout = resolveRuntimeArtifactLayout('codebuddy', '/tmp/fake-codebuddy-dir');
    const commandsKind = layout.kinds.find(k => k.kind === 'commands');
    assert.ok(commandsKind, 'must have commands kind');
    assert.strictEqual(commandsKind.destSubpath, 'commands');
    assert.strictEqual(commandsKind.prefix, 'ecl-');
    assert.strictEqual(typeof commandsKind.stage, 'function');
  });

  test('codebuddy skills kind targets skills/ with ecl- prefix', () => {
    const layout = resolveRuntimeArtifactLayout('codebuddy', '/tmp/fake-codebuddy-dir');
    const skillsKind = layout.kinds.find(k => k.kind === 'skills');
    assert.ok(skillsKind, 'must have skills kind');
    assert.strictEqual(skillsKind.destSubpath, 'skills');
    assert.strictEqual(skillsKind.prefix, 'ecl-');
  });
});

// ─── Command converter contract ──────────────────────────────────────────────

describe('enh-789 — convertClaudeCommandToCodebuddyCommand', () => {
  const SRC = [
    '---',
    'name: ecl:new-project',
    'description: Initialize a project',
    'argument-hint: "[name]"',
    'allowed-tools:',
    '  - Read',
    '---',
    '',
    'Use .claude/skills/ and run /ecl:help. Claude Code reads CLAUDE.md.',
    '',
  ].join('\n');

  test('emits a description-only frontmatter (no Claude-specific name: ecl:)', () => {
    const out = convertClaudeCommandToCodebuddyCommand(SRC, 'ecl-new-project');
    assert.ok(out.startsWith('---\n'), 'must begin with frontmatter');
    assert.ok(/^description:/m.test(out), 'must carry a description field');
    assert.ok(!out.includes('name: ecl:new-project'), 'must drop Claude colon-form name field');
  });

  test('preserves a present argument-hint (CodeBuddy supports it)', () => {
    const out = convertClaudeCommandToCodebuddyCommand(SRC, 'ecl-new-project');
    assert.ok(/^argument-hint:\s*["']?\[name\]["']?\s*$/m.test(out),
      `argument-hint must be carried through when present in source. Got:\n${out}`);
  });

  test('converts body Claude-isms to CodeBuddy equivalents', () => {
    const out = convertClaudeCommandToCodebuddyCommand(SRC, 'ecl-new-project');
    assert.ok(out.includes('.codebuddy/skills/'), out);
    assert.ok(out.includes('/ecl-help'), out);
    assert.ok(out.includes('CODEBUDDY.md'), out);
    assert.ok(!/\bClaude Code\b/.test(out), 'must rebrand "Claude Code"');
  });
});

describe('enh-789 — skills marked user-invocable:false', () => {
  test('convertClaudeCommandToCodebuddySkill emits user-invocable: false', () => {
    const src = [
      '---',
      'name: ecl:help',
      'description: Show help',
      '---',
      '',
      '# body',
      '',
    ].join('\n');
    const out = convertClaudeCommandToCodebuddySkill(src, 'ecl-help');
    assert.ok(/^user-invocable:\s*false\s*$/m.test(out),
      `SKILL.md frontmatter must hide skill from '/' menu (user-invocable: false). Got:\n${out}`);
  });
});

// ─── Install contract ────────────────────────────────────────────────────────

describe('enh-789 — installRuntimeArtifacts codebuddy emits commands and skills', () => {
  test('global codebuddy install: commands/ecl-help.md and skills/ecl-help/SKILL.md exist', (t) => {
    const configDir = createTempDir('ecl-enh789-codebuddy-');
    t.after(() => cleanup(configDir));

    installRuntimeArtifacts('codebuddy', configDir, 'global', RESOLVED_CORE);

    const commandsDir = path.join(configDir, 'commands');
    assert.ok(fs.existsSync(commandsDir), 'commands/ dir must exist');
    const cmdFiles = fs.readdirSync(commandsDir).filter(f => f.startsWith('ecl-') && f.endsWith('.md'));
    assert.ok(cmdFiles.length > 0, 'at least one ecl-*.md command file must be installed');
    assert.ok(fs.existsSync(path.join(commandsDir, 'ecl-help.md')), 'commands/ecl-help.md must exist');

    const skillsDir = path.join(configDir, 'skills');
    assert.ok(fs.existsSync(skillsDir), 'skills/ dir must exist');
    assert.ok(fs.existsSync(path.join(skillsDir, 'ecl-help', 'SKILL.md')), 'skills/ecl-help/SKILL.md must exist');
  });

  test('installed commands/ecl-help.md is CodeBuddy-compatible (no raw ~/.claude/, rebranded)', (t) => {
    const configDir = createTempDir('ecl-enh789-content-');
    t.after(() => cleanup(configDir));

    installRuntimeArtifacts('codebuddy', configDir, 'global', RESOLVED_CORE);

    const helpCmd = path.join(configDir, 'commands', 'ecl-help.md');
    const content = fs.readFileSync(helpCmd, 'utf8');
    assert.ok(!content.includes('~/.claude/'), 'commands must not contain raw ~/.claude/ refs');
    assert.ok(content.startsWith('---'), 'commands must carry frontmatter');
  });

  test('installed skills/ecl-help/SKILL.md is hidden from the / menu', (t) => {
    const configDir = createTempDir('ecl-enh789-skillhide-');
    t.after(() => cleanup(configDir));

    installRuntimeArtifacts('codebuddy', configDir, 'global', RESOLVED_CORE);

    const skill = fs.readFileSync(path.join(configDir, 'skills', 'ecl-help', 'SKILL.md'), 'utf8');
    assert.ok(/^user-invocable:\s*false\s*$/m.test(skill),
      'installed SKILL.md must set user-invocable: false');
  });

  test('command count matches skill count (profile parity)', (t) => {
    const configDir = createTempDir('ecl-enh789-parity-');
    t.after(() => cleanup(configDir));

    installRuntimeArtifacts('codebuddy', configDir, 'global', RESOLVED_CORE);

    const cmdCount = fs.readdirSync(path.join(configDir, 'commands'))
      .filter(f => f.startsWith('ecl-') && f.endsWith('.md')).length;
    const skillCount = fs.readdirSync(path.join(configDir, 'skills'), { withFileTypes: true })
      .filter(e => e.isDirectory() && e.name.startsWith('ecl-')).length;
    assert.strictEqual(cmdCount, skillCount, 'command count must equal skill count for same profile');
  });

  test('full profile install: no $HOME/.codebuddy or ~/.codebuddy leak in any command', (t) => {
    // The codebuddy converter rewrites `.claude/` → `.codebuddy/`, so source
    // refs like `@$HOME/.claude/evolv-coder-lite/...` (e.g. plan-review-convergence.md)
    // must be normalized to the install target — not left as $HOME/.codebuddy.
    const RESOLVED_FULL = resolveProfile({ modes: ['full'], manifest: MANIFEST });
    const configDir = createTempDir('ecl-enh789-noleak-');
    t.after(() => cleanup(configDir));

    installRuntimeArtifacts('codebuddy', configDir, 'global', RESOLVED_FULL);

    const commandsDir = path.join(configDir, 'commands');
    for (const f of fs.readdirSync(commandsDir).filter(n => n.endsWith('.md'))) {
      const content = fs.readFileSync(path.join(commandsDir, f), 'utf8');
      assert.ok(!content.includes('$HOME/.codebuddy'), `${f} must not leak $HOME/.codebuddy`);
      assert.ok(!content.includes('~/.codebuddy'), `${f} must not leak ~/.codebuddy`);
      assert.ok(!content.includes('.claude/'), `${f} must not retain raw .claude/ refs`);
    }
  });

  test('full profile install does NOT mutate source commands/ecl/ files', (t) => {
    const RESOLVED_FULL = resolveProfile({ modes: ['full'], manifest: MANIFEST });
    assert.strictEqual(RESOLVED_FULL.skills, '*', 'full profile must have skills === "*"');

    const configDir = createTempDir('ecl-enh789-full-');
    t.after(() => cleanup(configDir));

    const srcHelpPath = path.join(REAL_COMMANDS_DIR, 'help.md');
    const before = fs.readFileSync(srcHelpPath, 'utf8');

    installRuntimeArtifacts('codebuddy', configDir, 'global', RESOLVED_FULL);

    const after = fs.readFileSync(srcHelpPath, 'utf8');
    assert.strictEqual(before, after, 'source commands/ecl/help.md must not be mutated by the install');
  });
});

// ─── Uninstall contract ──────────────────────────────────────────────────────

describe('enh-789 — uninstallRuntimeArtifacts removes codebuddy commands', () => {
  test('uninstall removes ecl-* commands but preserves user commands', (t) => {
    const configDir = createTempDir('ecl-enh789-uninstall-');
    t.after(() => cleanup(configDir));

    const commandsDir = path.join(configDir, 'commands');
    fs.mkdirSync(commandsDir, { recursive: true });
    fs.writeFileSync(path.join(commandsDir, 'ecl-help.md'), '# help\n');
    fs.writeFileSync(path.join(commandsDir, 'user-custom.md'), '# user\n');

    uninstallRuntimeArtifacts('codebuddy', configDir, 'global');

    assert.ok(!fs.existsSync(path.join(commandsDir, 'ecl-help.md')), 'ecl-help.md must be removed');
    assert.ok(fs.existsSync(path.join(commandsDir, 'user-custom.md')), 'user-custom.md must be preserved');
  });
});

// ─── mcp.json exclusion ──────────────────────────────────────────────────────

describe('enh-789 — mcp.json excluded (ecl ships no MCP server)', () => {
  test('codebuddy install does not write mcp.json / .mcp.json', (t) => {
    const configDir = createTempDir('ecl-enh789-mcp-excluded-');
    t.after(() => cleanup(configDir));

    installRuntimeArtifacts('codebuddy', configDir, 'global', RESOLVED_CORE);

    assert.ok(!fs.existsSync(path.join(configDir, 'mcp.json')), 'must not write mcp.json');
    assert.ok(!fs.existsSync(path.join(configDir, '.mcp.json')), 'must not write .mcp.json');
  });
});
