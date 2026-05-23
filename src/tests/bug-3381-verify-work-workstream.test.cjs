// allow-test-rule: source-text-is-the-product — verify-work.md is a runtime workflow contract.

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('bug #3381: verify-work forwards workstream context', () => {
  test('workflow forwards ${ECL_WS} to workstream-sensitive SDK queries', () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, '..', 'evolv-coder-lite', 'workflows', 'verify-work.md'),
      'utf8',
    );

    assert.match(workflow, /ECL_WS=""/, 'verify-work must initialize ECL_WS');
    assert.match(
      workflow,
      /grep -qE -- '--ws\[\[:space:\]\]\+\[\^\[:space:\]\]\+'/,
      'verify-work must detect --ws in $ARGUMENTS',
    );
    assert.match(
      workflow,
      /grep -oE -- '--ws\[\[:space:\]\]\+\[\^\[:space:\]\]\+'/,
      'verify-work must extract the --ws flag pair from $ARGUMENTS',
    );
    assert.match(
      workflow,
      /PHASE_ARG=\$\(echo "\$ARGUMENTS" \| sed -E 's\/--ws\[\[:space:\]\]\+\[\^\[:space:\]\]\+\/\/g' \| xargs\)/,
      'verify-work must derive PHASE_ARG after removing --ws',
    );
    // After #3797 architectural fix, callsites use $ECL_SDK — accept either bare or $ECL_SDK form
    assert.match(
      workflow,
      /(?:\$ECL_SDK|ecl-sdk) query init\.verify-work "\$\{PHASE_ARG\}" \$\{ECL_WS\}/,
      'init.verify-work must receive ECL_WS so phase_dir resolves in workstreams',
    );
    assert.match(
      workflow,
      /(?:\$ECL_SDK|ecl-sdk) query phase\.mvp-mode "\$\{phase_number\}" \$\{ECL_WS\} --pick active/,
      'phase.mvp-mode must receive ECL_WS so roadmap mode is workstream-scoped',
    );
    assert.match(
      workflow,
      /(?:\$ECL_SDK|ecl-sdk) query roadmap\.get-phase "\$\{phase_number\}" \$\{ECL_WS\} --pick goal/,
      'roadmap.get-phase must receive ECL_WS so goals are workstream-scoped',
    );
  });
});
