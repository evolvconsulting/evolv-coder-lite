/**
 * Regression guard for #1766: $ECL_TOOLS env var undefined
 *
 * All command files must use the resolved path to ecl-tools.cjs
 * ($HOME/.claude/evolv-coder-lite/bin/ecl-tools.cjs), not the undefined
 * $ECL_TOOLS variable. This test catches any command file that
 * references the undefined variable.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const COMMANDS_DIR = path.join(__dirname, '..', 'commands', 'ecl');

describe('command files: ecl-tools path references (#1766)', () => {
  test('no command file references undefined $ECL_TOOLS variable', () => {
    const files = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.md'));
    const violations = [];

    for (const file of files) {
      const content = fs.readFileSync(path.join(COMMANDS_DIR, file), 'utf-8');
      // Match $ECL_TOOLS or "$ECL_TOOLS" or ${ECL_TOOLS} used as a path
      // (not as a documentation reference)
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/\$ECL_TOOLS\b/.test(line) && /node\s/.test(line)) {
          violations.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      }
    }

    assert.strictEqual(violations.length, 0,
      'Command files must not reference undefined $ECL_TOOLS. ' +
      'Use $HOME/.claude/evolv-coder-lite/bin/ecl-tools.cjs instead.\n' +
      'Violations:\n' + violations.join('\n'));
  });

  test('workstreams.md documents ecl-sdk query or legacy ecl-tools.cjs', () => {
    const content = fs.readFileSync(
      path.join(COMMANDS_DIR, 'workstreams.md'), 'utf-8'
    );

    assert.ok(
      /ecl-sdk\s+query/.test(content) || /ecl-tools\.cjs/.test(content),
      'workstreams.md should document ecl-sdk query or ecl-tools.cjs'
    );

    const lines = content.split('\n');
    for (const line of lines) {
      if (/node\s/.test(line)) {
        assert.ok(
          line.includes('ecl-tools.cjs'),
          'Each node invocation must reference ecl-tools.cjs, got: ' + line.trim()
        );
      }
    }
  });
});
