/**
 * Regression tests for bug #3584
 *
 * Runtime/user-facing strings emitted by evolv-coder-lite/bin/lib/*.cjs hardcoded
 * the deprecated `/ecl:<cmd>` colon form (16 files, ~50 occurrences). After
 * #2808 unified eCL installs to register skills under the hyphen form
 * (`name: ecl-execute-phase`), pasting the emitted `/ecl:execute-phase` into
 * Claude Code yields `Unknown command: /ecl:execute-phase. Did you mean
 * /ecl-execute-phase?`. Codex installs require `$ecl-<cmd>` (shell-var) form.
 *
 * Fix: a runtime-aware slash formatter (`runtime-slash.cjs`) is now the single
 * source of truth for emitting `/ecl-<cmd>` (hyphen) for skills-based runtimes
 * and `$ecl-<cmd>` for Codex. Tests assert on the formatter's typed output and
 * — for the integration tests in `bug-3584-runtime-slash-emitters.test.cjs` —
 * on the structured `--json` payloads from the runtime command handlers.
 */

'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { formatGsdSlash, resolveRuntime } = require(
  path.join(ROOT, 'evolv-coder-lite', 'bin', 'lib', 'runtime-slash.cjs'),
);

describe('formatGsdSlash — runtime-aware slash command formatter', () => {
  describe('hyphen-form runtimes (claude, cursor, opencode, kilo, etc.)', () => {
    test('emits /ecl-<cmd> for claude', () => {
      assert.strictEqual(formatGsdSlash('execute-phase', 'claude'), '/ecl-execute-phase');
    });

    test('emits /ecl-<cmd> for cursor', () => {
      assert.strictEqual(formatGsdSlash('plan-phase', 'cursor'), '/ecl-plan-phase');
    });

    test('emits /ecl-<cmd> for opencode', () => {
      assert.strictEqual(formatGsdSlash('discuss-phase', 'opencode'), '/ecl-discuss-phase');
    });

    test('emits /ecl-<cmd> for kilo', () => {
      assert.strictEqual(formatGsdSlash('health', 'kilo'), '/ecl-health');
    });

    test('unknown runtime defaults to hyphen form', () => {
      assert.strictEqual(
        formatGsdSlash('new-project', 'some-future-runtime'),
        '/ecl-new-project',
      );
    });

    test('null/undefined runtime defaults to hyphen form (claude)', () => {
      assert.strictEqual(formatGsdSlash('new-milestone', null), '/ecl-new-milestone');
      assert.strictEqual(formatGsdSlash('new-milestone', undefined), '/ecl-new-milestone');
    });
  });

  describe('codex shell-var form', () => {
    test('emits $ecl-<cmd> for codex', () => {
      assert.strictEqual(formatGsdSlash('execute-phase', 'codex'), '$ecl-execute-phase');
    });

    test('codex output is lowercased', () => {
      assert.strictEqual(
        formatGsdSlash('Execute-Phase', 'codex'),
        '$ecl-execute-phase',
      );
    });
  });

  describe('input normalization', () => {
    test('strips existing /ecl: colon prefix', () => {
      assert.strictEqual(
        formatGsdSlash('/ecl:execute-phase', 'claude'),
        '/ecl-execute-phase',
      );
    });

    test('strips existing /ecl- hyphen prefix (idempotent)', () => {
      assert.strictEqual(
        formatGsdSlash('/ecl-plan-phase', 'claude'),
        '/ecl-plan-phase',
      );
    });

    test('strips bare ecl: prefix without leading slash', () => {
      assert.strictEqual(
        formatGsdSlash('ecl:new-project', 'claude'),
        '/ecl-new-project',
      );
    });

    test('strips existing $ecl- shell prefix (codex idempotent)', () => {
      assert.strictEqual(
        formatGsdSlash('$ecl-execute-phase', 'codex'),
        '$ecl-execute-phase',
      );
    });

    test('runtime swap: /ecl:execute-phase + codex → $ecl-execute-phase', () => {
      assert.strictEqual(
        formatGsdSlash('/ecl:execute-phase', 'codex'),
        '$ecl-execute-phase',
      );
    });

    test('case-insensitive prefix stripping', () => {
      assert.strictEqual(
        formatGsdSlash('eCL:execute-phase', 'claude'),
        '/ecl-execute-phase',
      );
    });
  });

  describe('defensive returns for unsafe inputs', () => {
    test('non-string commandName returns input unchanged', () => {
      assert.strictEqual(formatGsdSlash(null, 'claude'), null);
      assert.strictEqual(formatGsdSlash(undefined, 'claude'), undefined);
      assert.strictEqual(formatGsdSlash(42, 'claude'), 42);
    });

    test('empty string returns empty string', () => {
      assert.strictEqual(formatGsdSlash('', 'claude'), '');
    });

    test('whitespace-only string returns empty string (no spurious /ecl- emission)', () => {
      assert.strictEqual(formatGsdSlash('   ', 'claude'), '');
      assert.strictEqual(formatGsdSlash('\t\n', 'codex'), '');
    });

    test('degenerate prefix-only input returns empty (does NOT re-emit colon form)', () => {
      // Regression guard for the CodeRabbit finding on the original PR:
      // a previous fallback returned `commandName` unchanged when the bare
      // tail was empty, which re-introduced the deprecated `/ecl:` shape for
      // inputs like `/ecl:`, `ecl:`, or `ecl-`. The formatter must never
      // emit the colon form — return empty so callers detect "no command"
      // instead of receiving an unroutable string.
      assert.strictEqual(formatGsdSlash('/ecl:', 'claude'), '');
      assert.strictEqual(formatGsdSlash('ecl:', 'claude'), '');
      assert.strictEqual(formatGsdSlash('ecl-', 'claude'), '');
      assert.strictEqual(formatGsdSlash('/ecl-', 'codex'), '');
      assert.strictEqual(formatGsdSlash('$ecl-', 'codex'), '');
    });

    test('commands with arguments preserve the argument tail', () => {
      // `execute-phase 03` is a valid call shape — the formatter only
      // rewrites the command token; everything after the first whitespace
      // belongs to the caller.
      assert.strictEqual(
        formatGsdSlash('execute-phase 03', 'claude'),
        '/ecl-execute-phase 03',
      );
      assert.strictEqual(
        formatGsdSlash('/ecl:execute-phase 03', 'claude'),
        '/ecl-execute-phase 03',
      );
    });

    test('codex form lowercases only the command token, not the argument tail', () => {
      // Regression for codex review finding: a previous implementation
      // lowercased the full input including arguments, which would corrupt
      // Windows paths and case-sensitive flag values passed as args.
      assert.strictEqual(
        formatGsdSlash('Map-Codebase --paths C:\\Users\\Me\\Project', 'codex'),
        '$ecl-map-codebase --paths C:\\Users\\Me\\Project',
      );
      assert.strictEqual(
        formatGsdSlash('execute-phase 03 --Name FooBar', 'codex'),
        '$ecl-execute-phase 03 --Name FooBar',
      );
    });

    test('hyphen form preserves token case (it does not get lowercased)', () => {
      // Symmetry with codex: only codex lowercases the token. Hyphen-form
      // runtimes preserve whatever case the caller supplied for the token.
      assert.strictEqual(
        formatGsdSlash('Plan-Phase 03', 'claude'),
        '/ecl-Plan-Phase 03',
      );
    });
  });
});

describe('resolveRuntime — env > config > default', () => {
  test('process.env.ECL_RUNTIME wins over everything', () => {
    const saved = process.env.ECL_RUNTIME;
    try {
      process.env.ECL_RUNTIME = 'codex';
      assert.strictEqual(resolveRuntime(null), 'codex');
      assert.strictEqual(resolveRuntime('/nonexistent'), 'codex');
    } finally {
      if (saved === undefined) delete process.env.ECL_RUNTIME;
      else process.env.ECL_RUNTIME = saved;
    }
  });

  test('defaults to claude when env is unset and projectDir missing', () => {
    const saved = process.env.ECL_RUNTIME;
    try {
      delete process.env.ECL_RUNTIME;
      assert.strictEqual(resolveRuntime(null), 'claude');
      assert.strictEqual(resolveRuntime(undefined), 'claude');
    } finally {
      if (saved !== undefined) process.env.ECL_RUNTIME = saved;
    }
  });

  test('reads config.runtime when env is unset and projectDir has a config', (t) => {
    const fs = require('fs');
    const os = require('os');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ecl-3584-'));
    t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

    fs.mkdirSync(path.join(tmp, '.planning'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, '.planning', 'config.json'),
      JSON.stringify({ runtime: 'codex' }),
    );

    const saved = process.env.ECL_RUNTIME;
    try {
      delete process.env.ECL_RUNTIME;
      assert.strictEqual(resolveRuntime(tmp), 'codex');
    } finally {
      if (saved !== undefined) process.env.ECL_RUNTIME = saved;
    }
  });

  test('lowercases the resolved runtime', () => {
    const saved = process.env.ECL_RUNTIME;
    try {
      process.env.ECL_RUNTIME = 'CLAUDE';
      assert.strictEqual(resolveRuntime(null), 'claude');
    } finally {
      if (saved === undefined) delete process.env.ECL_RUNTIME;
      else process.env.ECL_RUNTIME = saved;
    }
  });
});
