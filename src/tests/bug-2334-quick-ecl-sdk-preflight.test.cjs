/**
 * Regression test for bug #2334
 *
 * /ecl-quick crashed with `command not found: ecl-sdk` (exit code 127) when
 * the ecl-sdk binary was not installed or not in PATH. The workflow's Step 2
 * called `ecl-sdk query init.quick` directly with no pre-flight check and no
 * fallback, so missing ecl-sdk caused an immediate abort with no helpful message.
 *
 * Fix: Step 2 must check for ecl-sdk in PATH before invoking it. If absent,
 * emit a human-readable error pointing users to the install command.
 */

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const WORKFLOW_PATH = path.join(__dirname, '..', 'evolv-coder-lite', 'workflows', 'quick.md');

// allow-test-rule: source-text-is-the-product
// quick.md is the AI instruction workflow — the `command -v ecl-sdk` guard IS the fix.
// There is no behavioral equivalent: the check runs inside the AI agent, not in ecl-tools.
describe('bug #2334: quick workflow ecl-sdk pre-flight check', () => {
  let content;

  test('workflow file exists', () => {
    assert.ok(fs.existsSync(WORKFLOW_PATH), 'workflows/quick.md should exist');
    content = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
  });

  test('Step 2 checks for ecl-sdk before invoking it', () => {
    content = content || fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    // The check must appear before the first ecl-sdk invocation in Step 2.
    // After the #3797 architectural fix, callsites use $ECL_SDK (not bare ecl-sdk),
    // so we search for the $ECL_SDK form of the init.quick call.
    const step2Start = content.indexOf('**Step 2:');
    assert.ok(step2Start !== -1, 'Step 2 must exist in quick workflow');

    // Accept either the bare form (legacy) or the $ECL_SDK form (post-#3797)
    let firstSdkCall = content.indexOf('$ECL_SDK query init.quick', step2Start);
    if (firstSdkCall === -1) {
      firstSdkCall = content.indexOf('ecl-sdk query init.quick', step2Start);
    }
    assert.ok(firstSdkCall !== -1, 'ecl-sdk query init.quick must be present in Step 2');

    // Find any ecl-sdk availability check between the Step 2 heading and the first call
    const step2Section = content.slice(step2Start, firstSdkCall);
    const hasCommandCheck = step2Section.includes('command -v ecl-sdk') || step2Section.includes('which ecl-sdk');
    assert.ok(
      hasCommandCheck,
      'Step 2 must check for ecl-sdk in PATH (via `command -v ecl-sdk` or `which ecl-sdk`) ' +
      'before calling `ecl-sdk query init.quick`. Without this guard, the workflow crashes ' +
      'with exit code 127 when ecl-sdk is not installed (root cause of #2334).'
    );
  });

  test('pre-flight error message references the install command', () => {
    content = content || fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    const step2Start = content.indexOf('**Step 2:');
    // Accept either form of the SDK call (bare or $ECL_SDK)
    let firstSdkCall = content.indexOf('$ECL_SDK query init.quick', step2Start);
    if (firstSdkCall === -1) {
      firstSdkCall = content.indexOf('ecl-sdk query init.quick', step2Start);
    }
    const step2Section = content.slice(step2Start, firstSdkCall);

    const hasInstallHint = step2Section.includes('@evolvconsulting/evolv-coder-lite') || step2Section.includes('ecl-update') || step2Section.includes('/ecl-update');
    assert.ok(
      hasInstallHint,
      'Pre-flight error must include a hint on how to install query-capable ecl-sdk (npm install -g @evolvconsulting/evolv-coder-lite or /ecl-update)'
    );
  });
});
