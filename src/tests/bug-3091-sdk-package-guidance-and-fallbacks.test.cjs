'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('bug #3091: sdk install guidance and agent fallbacks use query-capable CLI', () => {
  test('quick workflow install hint references @evolvconsulting/evolv-coder-lite (not @evolvconsulting/ecl-sdk)', () => {
    const content = read('evolv-coder-lite/workflows/quick.md');
    // After #3668: quick.md uses local-first preflight which references
    // @evolvconsulting/evolv-coder-lite via npx for the --local fallback.
    const referencesGsdRedux = content.includes('npm install -g @evolvconsulting/evolv-coder-lite') ||
      content.includes('npx @evolvconsulting/evolv-coder-lite');
    assert.ok(referencesGsdRedux, 'quick.md install hint must reference @evolvconsulting/evolv-coder-lite');
    assert.ok(!content.includes('@ecl-redux/sdk'));
    assert.ok(!content.includes('@evolvconsulting/sdk'));
    assert.ok(!content.includes('npm install -g evolv-coder-lite'));
    assert.ok(!content.includes('npx evolv-coder-lite@'));
  });

  test('agent docs no longer reference node_modules/@evolvconsulting/ecl-sdk/dist/cli.js query fallback', () => {
    const files = [
      'agents/ecl-planner.md',
      'agents/ecl-executor.md',
      'agents/ecl-plan-checker.md',
      'agents/ecl-roadmapper.md',
    ];

    const offenders = files.filter((f) => read(f).includes('@evolvconsulting/ecl-sdk/dist/cli.js query'));
    assert.deepStrictEqual(offenders, [], `stale @evolvconsulting/ecl-sdk query fallback references: ${offenders.join(', ')}`);
  });
});
