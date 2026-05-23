// allow-test-rule: source-text-is-the-product
// Reads .md/.json/.yml product files whose deployed text IS what the
// runtime loads — testing text content tests the deployed contract.

/**
 * Regression test for bug #2808
 *
 * All 85 eCL SKILL.md files declared `name: ecl:<cmd>` (colon), the deprecated
 * form. Claude Code surfaces the `name:` frontmatter field in autocomplete, so
 * users saw `/ecl:add-phase` suggestions instead of the canonical `/ecl-add-phase`.
 *
 * Root cause: skillFrontmatterName() in bin/install.js converted hyphenated
 * skill dir names to colon form (ecl-add-phase → ecl:add-phase) because
 * workflows called Skill(skill="ecl:<cmd>"). That was the original fix for
 * #2643. Since then, workflows have been updated to use hyphen form (#2808).
 *
 * Fix: skillFrontmatterName() now returns the hyphen form unchanged.
 * Workflow Skill() colon calls are updated to hyphen.
 *
 * This test verifies:
 * 1. skillFrontmatterName returns hyphen form (not colon).
 * 2. Installed SKILL.md would emit name: ecl-<cmd> (not ecl:<cmd>).
 * 3. No workflow contains a Skill(skill="ecl:<cmd>") colon call.
 */

'use strict';

process.env.ECL_TEST_MODE = '1';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { cleanup, createTempDir } = require('./helpers.cjs');

const ROOT = path.join(__dirname, '..');
const { convertClaudeCommandToClaudeSkill, installRuntimeArtifacts, uninstallRuntimeArtifacts, skillFrontmatterName } =
  require(path.join(ROOT, 'bin', 'install.js'));

const {
  loadSkillsManifest,
  resolveProfile,
} = require(path.join(ROOT, 'evolv-coder-lite', 'bin', 'lib', 'install-profiles.cjs'));

// Full resolved profile — installs all available skills from the source dir
const _manifest = loadSkillsManifest();
const resolvedProfileFull = resolveProfile({ modes: [], manifest: _manifest });

const WORKFLOWS_DIR = path.join(ROOT, 'evolv-coder-lite', 'workflows');
const COMMANDS_DIR = path.join(ROOT, 'commands', 'ecl');

function walkMd(dir) {
  const files = [];
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) files.push(...walkMd(full));
      else if (e.name.endsWith('.md')) files.push(full);
    }
  } catch (err) {
    assert.fail(`failed to read markdown files from ${dir}: ${err.message}`);
  }
  return files;
}

describe('bug-2808: SKILL.md name: uses hyphen form', () => {
  test('skillFrontmatterName returns hyphen form (not colon)', () => {
    assert.strictEqual(skillFrontmatterName('ecl-add-phase'), 'ecl-add-phase');
    assert.strictEqual(skillFrontmatterName('ecl-plan-phase'), 'ecl-plan-phase');
    assert.strictEqual(skillFrontmatterName('ecl-autonomous'), 'ecl-autonomous');
  });

  test('generated SKILL.md contains name: ecl-<cmd> (not ecl:<cmd>)', () => {
    const cmdFiles = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.md'));
    assert.ok(cmdFiles.length > 0, 'expected eCL command files');

    for (const cmd of cmdFiles) {
      const base = cmd.replace(/\.md$/, '');
      const skillDirName = 'ecl-' + base;
      const src = fs.readFileSync(path.join(COMMANDS_DIR, cmd), 'utf-8');
      const skillContent = convertClaudeCommandToClaudeSkill(src, skillDirName);

      // Parse frontmatter structurally: extract name: line from the --- block.
      const fmMatch = skillContent.match(/^---\n([\s\S]*?)\n---/);
      assert.ok(fmMatch, `${cmd}: generated skill content must have a frontmatter block`);
      const fmLines = fmMatch[1].split('\n');
      const nameEntry = fmLines.find((l) => l.startsWith('name:'));
      assert.ok(nameEntry, `${cmd}: generated SKILL.md is missing required name: field`);

      const name = nameEntry.replace(/^name:\s*/, '').trim();
      assert.ok(
        !name.includes(':'),
        `${cmd}: SKILL.md name should be hyphen form, got "${name}"`
      );
      assert.ok(
        name.startsWith('ecl-'),
        `${cmd}: SKILL.md name should start with ecl-, got "${name}"`
      );

      // #3583 regression guard: the *body* must not leak retired colon-form
      // command references (e.g. /ecl:plan-phase or ecl:review). The converter
      // now uses transformContentToHyphen from the shared transformer.
      //
      // We explicitly scope to the body (after stripping the leading frontmatter
      // block) so that descriptions or other frontmatter fields containing example
      // ecl: references do not cause spurious failures.
      //
      // ecl:sdk and ecl:tools are intentionally excluded: they are not slash commands
      // (no commands/ecl/sdk.md or tools.md exist), so the transformer correctly leaves
      // them alone. They are benign and should not trigger this assertion.
      const bodyContent = skillContent.replace(/^---\n[\s\S]*?\n---\n?/, '');
      const colonRefs = (bodyContent.match(/\bgsd:[a-z][a-z0-9-]*\b/g) || [])
        .filter(r => !/ecl:(sdk|tools)/.test(r));
      assert.strictEqual(
        colonRefs.length, 0,
        `${cmd}: generated SKILL.md body must not contain ecl: command references (found: ${colonRefs.join(', ')})`
      );
    }
  });

  test('no workflow contains Skill(skill="ecl:<cmd>") colon form', () => {
    const workflowFiles = walkMd(WORKFLOWS_DIR);
    assert.ok(
      workflowFiles.length > 0,
      `expected workflow markdown files under ${WORKFLOWS_DIR}`
    );
    const colonCalls = [];
    for (const f of workflowFiles) {
      const src = fs.readFileSync(f, 'utf-8');
      // Strip HTML comments to avoid matching commented-out examples.
      const stripped = src.replace(/<!--[\s\S]*?-->/g, '');
      // Scan each line for Skill() calls using the colon form.
      // Parsing line-by-line is more precise than a multi-line regex
      // and avoids false positives from incidental matches in prose.
      for (const line of stripped.split('\n')) {
        // Tolerate whitespace around the parenthesis, the `skill` keyword,
        // and the `=` so variants like `Skill( skill = "ecl:foo" )` are still
        // flagged. Without the `\s*` allowances, drift slips through this guard.
        //
        // The local-name capture must be permissive (`[^'"\s)]+`, not
        // `[a-z0-9-]+`) — the whole purpose of this guard is to surface
        // *malformed* drift, including legacy underscore-form names like
        // `ecl:extract_learnings`. A character-class that excludes the very
        // characters we need to flag would silently let drift through.
        const colonCallRe = /Skill\(\s*skill\s*=\s*\\?['"]ecl:([^'"\s)]+)\\?['"]/gi;
        let m;
        while ((m = colonCallRe.exec(line)) !== null) {
          colonCalls.push(`${path.basename(f)}: Skill(skill="ecl:${m[1]}")`);
        }
      }
    }
    assert.deepStrictEqual(
      colonCalls,
      [],
      'deprecated colon-form Skill() calls found — update to ecl-<cmd>: ' + colonCalls.join(', ')
    );
  });

  test('generated autocomplete skill surface uses hyphen names without underscores', (t) => {
    const tmp = createTempDir('ecl-autocomplete-surface-');
    t.after(() => cleanup(tmp));

    // Use the real COMMANDS_DIR as the source via .ecl-source marker.
    // installRuntimeArtifacts('claude', configDir, 'global') writes to
    // configDir/skills/ecl-*/SKILL.md using the same converter as the shim did.
    const configDir = path.join(tmp, 'config');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, '.ecl-source'), COMMANDS_DIR + '\n');
    installRuntimeArtifacts('claude', configDir, 'global', resolvedProfileFull);
    const skillsDir = path.join(configDir, 'skills');

    // Don't filter the directory listing by `startsWith('ecl-')` — that
    // would silently hide exactly the kind of drift this test exists to
    // catch (a `ecl:extract-learnings` colon variant or a bare
    // `extract-learnings` without the namespace prefix would never be
    // collected, and the loop below would never see them). Capture every
    // generated directory and assert the namespace invariants explicitly.
    const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    assert.ok(skillDirs.length > 0, 'expected generated skill directories under skillsDir');
    for (const dir of skillDirs) {
      assert.ok(
        dir.startsWith('ecl-'),
        `${dir}: generated skill directory must start with the canonical 'ecl-' namespace`,
      );
      assert.ok(
        !dir.includes(':'),
        `${dir}: generated skill directory must not contain the retired colon namespace separator`,
      );
      assert.ok(
        !dir.includes('_'),
        `${dir}: generated skill directory must use hyphens, not underscores`,
      );
    }

    assert.ok(skillDirs.includes('ecl-extract-learnings'), 'autocomplete surface must include ecl-extract-learnings');
    assert.ok(!skillDirs.includes('ecl-extract_learnings'), 'autocomplete surface must not include ecl-extract_learnings');

    for (const skillDir of skillDirs) {
      const skillContent = fs.readFileSync(path.join(skillsDir, skillDir, 'SKILL.md'), 'utf-8');
      // Scope the name: lookup to the YAML frontmatter block so a stray
      // `name:` line in the body cannot satisfy the assertion.
      const fmMatch = skillContent.match(/^---\n([\s\S]*?)\n---/);
      assert.ok(fmMatch, `${skillDir}: generated SKILL.md must include frontmatter`);
      const nameLine = fmMatch[1].split('\n').find((l) => /^name:\s*/.test(l));
      assert.ok(nameLine, `${skillDir}: generated SKILL.md is missing name: frontmatter`);
      const name = nameLine.replace(/^name:\s*/, '').trim();
      assert.ok(name.startsWith('ecl-'), `${skillDir}: autocomplete name must start with ecl-, got ${name}`);
      assert.ok(!name.includes(':'), `${skillDir}: autocomplete name must not contain colon, got ${name}`);
      assert.ok(!name.includes('_'), `${skillDir}: autocomplete name must not contain underscore, got ${name}`);
    }
  });

  test('transformContentToHyphen (from fix-slash-commands.cjs) rewrites colon to hyphen for known commands', () => {
    const transformer = require(path.join(ROOT, 'scripts', 'fix-slash-commands.cjs'));
    const { transformContentToHyphen, readCmdNames } = transformer;
    const liveCmdNames = readCmdNames();

    const input = 'Run /ecl:plan-phase then ecl:execute-phase. Also see /ecl:review and ecl-sdk query.';
    const out = transformContentToHyphen(input, liveCmdNames);

    assert.ok(out.includes('/ecl-plan-phase'), 'leading-/ colon form must become hyphen');
    assert.ok(out.includes('ecl-execute-phase'), 'bare colon form must become hyphen');
    assert.ok(out.includes('/ecl-review'), 'another command reference must be rewritten');
    assert.ok(out.includes('ecl-sdk'), 'non-command ecl-sdk must be left untouched');
    assert.ok(!out.match(/\bgsd:[a-z]/), 'no colon-form command reference may survive');
  });

  test('respects word boundary — does not rewrite ecl:plan-phase-extra (partial match guard)', () => {
    const transformer = require(path.join(ROOT, 'scripts', 'fix-slash-commands.cjs'));
    const { transformContentToHyphen, readCmdNames } = transformer;
    const liveCmdNames = readCmdNames();

    const out = transformContentToHyphen('ecl:plan-phase-extra and /ecl:execute-phase-extra', liveCmdNames);
    assert.strictEqual(out, 'ecl:plan-phase-extra and /ecl:execute-phase-extra',
      'word-boundary lookahead must prevent partial matches on the reverse transform');
  });

  test('respects left word boundary — does not rewrite inside larger tokens (e.g. mygsd:cmd)', () => {
    const transformer = require(path.join(ROOT, 'scripts', 'fix-slash-commands.cjs'));
    const { transformContentToHyphen, readCmdNames } = transformer;
    const liveCmdNames = readCmdNames();

    const input = 'See mygsd:plan-phase or prefix-ecl:execute in the docs.';
    const out = transformContentToHyphen(input, liveCmdNames);
    assert.strictEqual(out, input, 'negative lookbehind must prevent left-side in-word matches');
  });

  test('leaves already-hyphen-form references untouched (idempotent on output)', () => {
    const transformer = require(path.join(ROOT, 'scripts', 'fix-slash-commands.cjs'));
    const { transformContentToHyphen, readCmdNames } = transformer;
    const liveCmdNames = readCmdNames();

    const input = 'Run ecl-plan-phase and /ecl-execute-phase then ecl:review.'; // mixed, only colon should change
    const out = transformContentToHyphen(input, liveCmdNames);
    assert.ok(out.includes('ecl-plan-phase'), 'pre-existing hyphen stays');
    assert.ok(out.includes('/ecl-execute-phase'), 'pre-existing hyphen stays');
    assert.ok(out.includes('ecl-review'), 'colon form was normalized');
    assert.ok(!out.includes('ecl:review'), 'no colon form remains');
  });
});
