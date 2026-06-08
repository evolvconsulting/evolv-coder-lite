// allow-test-rule: source-text-is-the-product
// codebase-drift-gate.md is the shipped orchestration step contract. Bug #619:
// the initial drift check ran the bare PATH binary `ecl-tools verify codebase-drift`.
// On a shim-only install (ecl-tools.cjs present, `ecl-tools` not on PATH) that exits
// 127, `2>/dev/null` hides it, and the `|| echo` fallback marks the gate skipped —
// so post-execution drift detection silently never runs. The fix resolves ecl-tools
// through the runtime shim launcher (ecl_run), defining the canonical preamble once in
// this always-run block so the file stays compliant with the single-preamble parity
// invariant (the conditional auto-remap block reuses the launcher via shared shell scope).
//
// This file locks the source contract AND behaviorally proves the shim resolves: it runs
// the exact shipped drift-check block against a shim-only topology and asserts the shim
// actually executes, where the old bare-binary form would have skipped.

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { cleanup } = require('./helpers.cjs');

const GATE_MD = path.join(
  __dirname, '..', 'evolv-coder-lite', 'workflows', 'execute-phase', 'steps', 'codebase-drift-gate.md',
);
const SNIPPET_FILE = path.join(__dirname, '..', 'evolv-coder-lite', 'workflows', '_runtime-launcher.snippet.sh');

function readGate() {
  return fs.readFileSync(GATE_MD, 'utf8');
}

// Extract the Nth (0-based) ```bash fenced block body from the file.
function bashBlock(content, n) {
  const blocks = [];
  const re = /```bash\r?\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(content)) !== null) blocks.push(m[1]);
  assert.ok(blocks.length > n, `expected at least ${n + 1} bash blocks, found ${blocks.length}`);
  return blocks[n];
}

describe('bug #619 — codebase-drift-gate resolves ecl-tools via the runtime shim, not the bare PATH binary', () => {
  test('codebase-drift-gate.md is readable', () => {
    assert.ok(readGate().length > 0, 'codebase-drift-gate.md must not be empty');
  });

  // ── Source contract (the .md is the product) ──────────────────────────────

  test('the drift check resolves ecl-tools via the shim launcher (ecl_run), not the bare binary (#619)', () => {
    const content = readGate();
    assert.match(
      content,
      /DRIFT=\$\(ecl_run verify codebase-drift 2>\/dev\/null \|\| echo '\{"skipped":true,"reason":"sdk-failed"\}'\)/,
      'drift check must call `ecl_run verify codebase-drift` with the non-blocking skip fallback',
    );
    assert.doesNotMatch(
      content,
      /\becl-tools verify codebase-drift\b/,
      'the bare `ecl-tools verify codebase-drift` PATH-binary call (the #619 bug) must be gone',
    );
  });

  test('non-blocking contract preserved: the skip JSON fallback is intact (#619)', () => {
    const content = readGate();
    assert.match(
      content,
      /\|\| echo '\{"skipped":true,"reason":"sdk-failed"\}'/,
      'an internal drift-command failure must still fall through to the skip JSON',
    );
  });

  test('exactly one canonical launcher preamble, in the drift-check block, before any launcher call (#619)', () => {
    const content = readGate();
    const snippet = fs.readFileSync(SNIPPET_FILE, 'utf8').replace(/\n$/, '');

    // Count canonical preamble occurrences across the whole file (parity: exactly one).
    let count = 0;
    let pos = 0;
    for (;;) {
      const idx = content.indexOf(snippet, pos);
      if (idx === -1) break;
      count++;
      pos = idx + snippet.length;
    }
    assert.equal(count, 1, `expected exactly one canonical preamble; found ${count}`);

    // The preamble must live in the first (drift-check) bash block, before the DRIFT call.
    const block0 = bashBlock(content, 0);
    assert.ok(block0.includes(snippet), 'the canonical preamble must be in the drift-check block');
    assert.ok(
      block0.indexOf(snippet) < block0.indexOf('ecl_run verify codebase-drift'),
      'the preamble must precede the ecl_run drift call in the same block',
    );

    // The auto-remap block reuses ecl_run but must NOT carry its own preamble.
    const content2 = content.slice(content.indexOf('AGENT_SKILLS_MAPPER'));
    assert.ok(!content2.includes(snippet), 'the auto-remap block must not re-declare the preamble (single-preamble parity)');
  });

  // ── Behavioral proof: the shim resolves on a shim-only topology ───────────

  test('shipped drift-check block runs the shim (ecl-tools.cjs), not skip, on a shim-only install (#619)', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ecl-619-'));
    try {
      // Shim-only topology: ecl-tools.cjs present under RUNTIME_DIR; no `ecl-tools` on PATH.
      const binDir = path.join(tmp, 'evolv-coder-lite', 'bin');
      fs.mkdirSync(binDir, { recursive: true });
      fs.writeFileSync(
        path.join(binDir, 'ecl-tools.cjs'),
        'if (process.argv[2] === "verify" && process.argv[3] === "codebase-drift") {\n' +
        '  process.stdout.write(JSON.stringify({ action_required: false, sentinel: "SHIM_RAN" }));\n' +
        '}\n',
      );

      const block = bashBlock(readGate(), 0) + '\nprintf "%s" "$DRIFT"\n';
      const out = execFileSync('bash', ['-c', block], {
        env: { ...process.env, RUNTIME_DIR: tmp },
        encoding: 'utf8',
      });

      assert.match(out, /SHIM_RAN/, 'the drift check must execute the resolved shim, proving ecl_run resolution');
      assert.doesNotMatch(out, /sdk-failed/, 'the gate must NOT silently skip when the shim is present (#619)');
    } finally {
      cleanup(tmp);
    }
  });

  test('red-proof: the old bare `ecl-tools` form would skip when ecl-tools is not on PATH', () => {
    // Documents the #619 bug: the pre-fix bare-binary call, with no `ecl-tools` on PATH,
    // hits the 127 → `|| echo` skip path even though the shim (ecl-tools.cjs) exists.
    const oldForm =
      'DRIFT=$(ecl-tools verify codebase-drift 2>/dev/null || echo \'{"skipped":true,"reason":"sdk-failed"}\'); printf "%s" "$DRIFT"';
    const out = execFileSync('bash', ['-c', 'export PATH=/nonexistent-empty-path; ' + oldForm], {
      env: { ...process.env },
      encoding: 'utf8',
    });
    assert.match(out, /sdk-failed/, 'sanity: the bare-binary form skips without ecl-tools on PATH — the bug the fix removes');
  });
});
