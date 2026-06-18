/**
 * Kimi CLI skill converter tests.
 *
 * Kimi Agent Skills use ecl-<command>/SKILL.md directories with lowercase
 * hyphenated frontmatter names and /skill:<name> invocation syntax.
 */

process.env.ECL_TEST_MODE = '1';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  convertClaudeCommandToKimiSkill,
} = require('../bin/install.js');

function sampleCommand() {
  return [
    '---',
    'name: ecl:new-project',
    'description: Create a new eCL project',
    'allowed-tools:',
    '  - Read',
    '  - Bash',
    'agent: ecl-planner',
    'tools: Read, Bash',
    'model: opus',
    'color: blue',
    'skills:',
    '  - ecl-planner-workflow',
    'hooks:',
    '  PostToolUse:',
    '    - matcher: "Write|Edit"',
    '---',
    '',
    'Invoke /ecl:new-project from slash form.',
    'Invoke ecl:new-project from bare colon form.',
    'Invoke /ecl-new-project from hyphen slash form.',
    'Invoke $ecl-new-project from shell-style form.',
    'Do not rewrite /ecl-tools, ecl-new-projector, or $ecl-planets.',
  ].join('\n');
}

describe('convertClaudeCommandToKimiSkill', () => {
  test('emits Kimi SKILL.md frontmatter with name and description only', () => {
    const result = convertClaudeCommandToKimiSkill(sampleCommand(), 'ecl-new-project');

    assert.ok(result.startsWith('---\n'), 'frontmatter starts with ---');
    assert.ok(result.includes('\n---\n'), 'frontmatter closes with ---');
    assert.ok(result.includes('name: ecl-new-project'), 'frontmatter name uses Kimi-safe hyphen form');
    assert.ok(
      result.includes('description: "Create a new eCL project"'),
      'description is preserved from source frontmatter'
    );

    for (const unsupported of [
      'allowed-tools',
      'agent',
      'tools',
      'model',
      'color',
      'skills',
      'hooks',
    ]) {
      assert.ok(!result.includes(`${unsupported}:`), `${unsupported}: is stripped from Kimi frontmatter`);
    }
  });

  test('rewrites eCL command references to Kimi skill invocation syntax', () => {
    const result = convertClaudeCommandToKimiSkill(sampleCommand(), 'ecl-new-project');

    assert.equal(
      (result.match(/\/skill:ecl-new-project/g) || []).length,
      5,
      'self invocation hint and all supported source invocation forms are emitted'
    );
    assert.ok(!result.includes('/ecl:new-project'), 'slash colon form is removed');
    assert.ok(!result.includes('ecl:new-project'), 'bare colon form is removed');
    assert.ok(!result.includes('/ecl-new-project'), 'slash hyphen form is removed');
    assert.ok(!result.includes('$ecl-new-project'), 'shell-style form is removed');
  });

  test('does not rewrite unrelated words or introduce Phase 3 artifacts', () => {
    const result = convertClaudeCommandToKimiSkill(sampleCommand(), 'ecl-new-project');

    assert.ok(result.includes('/ecl-tools'), 'non-command slash token is preserved');
    assert.ok(result.includes('ecl-new-projector'), 'longer hyphenated word is preserved');
    assert.ok(result.includes('$ecl-planets'), 'unrelated shell-style token is preserved');
    assert.ok(!result.includes('type: flow'), 'Phase 2 does not create Kimi flow skills');
    assert.ok(!result.includes('kimi_cli.tools'), 'Phase 2 does not emit Kimi tool module paths');
    assert.ok(!result.includes('system_prompt_path'), 'Phase 2 does not emit custom agent YAML');
    assert.ok(!result.includes('version: 1'), 'Phase 2 does not emit Kimi agent YAML markers');
  });
});
