'use strict';

/**
 * teams-status.test.cjs — behavioral tests for teams-status.cjs.
 *
 * issue #1355: read-only detector for claude-code's experimental agent-teams.
 * Uses node:test + node:assert/strict.
 * Pure-function tests (resolveTeamsStatus) pass {runtime, env} directly — no I/O.
 * End-to-end tests use ecl-tools CLI via spawnSync with explicit hermetic envs.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { resolveTeamsStatus } = require('../evolv-coder-lite/bin/lib/teams-status.cjs');

const gsdToolsPath = path.resolve(__dirname, '..', 'evolv-coder-lite', 'bin', 'ecl-tools.cjs');

// ─── resolveTeamsStatus — pure unit tests ─────────────────────────────────────

describe('resolveTeamsStatus — pure unit tests', () => {
  test('claude + "1" → active=true, source="on: env"', () => {
    const status = resolveTeamsStatus({
      runtime: 'claude',
      env: { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1' },
    });
    assert.strictEqual(status.active, true);
    assert.strictEqual(status.env_present, true);
    assert.strictEqual(status.source, 'on: env');
    assert.strictEqual(status.runtime, 'claude');
  });

  test('claude + "true" → active=true, source="on: env"', () => {
    const status = resolveTeamsStatus({
      runtime: 'claude',
      env: { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: 'true' },
    });
    assert.strictEqual(status.active, true);
    assert.strictEqual(status.env_present, true);
    assert.strictEqual(status.source, 'on: env');
  });

  test('claude + "TRUE" (case) → active=true, source="on: env"', () => {
    const status = resolveTeamsStatus({
      runtime: 'claude',
      env: { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: 'TRUE' },
    });
    assert.strictEqual(status.active, true);
    assert.strictEqual(status.env_present, true);
    assert.strictEqual(status.source, 'on: env');
  });

  test('claude + "0" → active=false, source="off: flag absent"', () => {
    const status = resolveTeamsStatus({
      runtime: 'claude',
      env: { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '0' },
    });
    assert.strictEqual(status.active, false);
    assert.strictEqual(status.env_present, false);
    assert.strictEqual(status.source, 'off: flag absent');
  });

  test('claude + "false" → active=false, source="off: flag absent"', () => {
    const status = resolveTeamsStatus({
      runtime: 'claude',
      env: { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: 'false' },
    });
    assert.strictEqual(status.active, false);
    assert.strictEqual(status.env_present, false);
    assert.strictEqual(status.source, 'off: flag absent');
  });

  test('claude + unset → active=false, source="off: flag absent"', () => {
    const status = resolveTeamsStatus({
      runtime: 'claude',
      env: {},
    });
    assert.strictEqual(status.active, false);
    assert.strictEqual(status.env_present, false);
    assert.strictEqual(status.source, 'off: flag absent');
  });

  test('codex + "1" → active=false, source="off: non-claude"', () => {
    const status = resolveTeamsStatus({
      runtime: 'codex',
      env: { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1' },
    });
    assert.strictEqual(status.active, false);
    assert.strictEqual(status.env_present, true);
    assert.strictEqual(status.source, 'off: non-claude');
    assert.strictEqual(status.runtime, 'codex');
  });
});

// ─── CLI/subprocess tests ─────────────────────────────────────────────────────

/**
 * Build a minimal hermetic env for subprocess tests.
 * NEVER inherit the dev shell env — always set ECL_RUNTIME and
 * CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS explicitly.
 */
function makeEnv({ runtime, teamsFlag } = {}) {
  // Start with a safe minimal env (PATH is required for node to find modules)
  const env = {
    PATH: process.env['PATH'] || '',
    HOME: process.env['HOME'] || '',
    // Prevent any ambient eCL env from leaking in
  };
  if (runtime !== undefined) env['ECL_RUNTIME'] = runtime;
  if (teamsFlag !== undefined) env['CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS'] = teamsFlag;
  return env;
}

describe('ecl-tools query teams-status — CLI subprocess tests', () => {
  test('default: prints JSON with correct shape (ECL_RUNTIME=claude, flag=1)', () => {
    const result = spawnSync(
      process.execPath,
      [gsdToolsPath, 'query', 'teams-status'],
      {
        encoding: 'utf8',
        timeout: 15000,
        env: makeEnv({ runtime: 'claude', teamsFlag: '1' }),
      },
    );
    assert.strictEqual(result.status, 0, `ecl-tools exited ${result.status}: ${result.stderr}`);
    const status = JSON.parse(result.stdout);
    assert.strictEqual(status.active, true, 'active should be true');
    assert.strictEqual(status.env_present, true, 'env_present should be true');
    assert.strictEqual(status.source, 'on: env', 'source should be "on: env"');
    assert.strictEqual(status.runtime, 'claude', 'runtime should be "claude"');
    assert.ok('active' in status, 'output must have active key');
    assert.ok('env_present' in status, 'output must have env_present key');
    assert.ok('source' in status, 'output must have source key');
    assert.ok('runtime' in status, 'output must have runtime key');
  });

  test('default: prints JSON with active=false when flag unset', () => {
    const result = spawnSync(
      process.execPath,
      [gsdToolsPath, 'query', 'teams-status'],
      {
        encoding: 'utf8',
        timeout: 15000,
        env: makeEnv({ runtime: 'claude' }),
      },
    );
    assert.strictEqual(result.status, 0, `ecl-tools exited ${result.status}: ${result.stderr}`);
    const status = JSON.parse(result.stdout);
    assert.strictEqual(status.active, false);
    assert.strictEqual(status.source, 'off: flag absent');
  });

  test('--active: exits 0 when ECL_RUNTIME=claude + flag=1', () => {
    const result = spawnSync(
      process.execPath,
      [gsdToolsPath, 'query', 'teams-status', '--active'],
      {
        encoding: 'utf8',
        timeout: 15000,
        env: makeEnv({ runtime: 'claude', teamsFlag: '1' }),
      },
    );
    assert.strictEqual(result.status, 0, `Expected exit 0 when teams active, got ${result.status}: ${result.stderr}`);
    // --active should print nothing
    assert.strictEqual(result.stdout, '', '--active must not print to stdout');
  });

  test('--active: exits 1 when flag unset (ECL_RUNTIME=claude, no flag)', () => {
    const result = spawnSync(
      process.execPath,
      [gsdToolsPath, 'query', 'teams-status', '--active'],
      {
        encoding: 'utf8',
        timeout: 15000,
        env: makeEnv({ runtime: 'claude' }),
      },
    );
    assert.strictEqual(result.status, 1, `Expected exit 1 when teams not active, got ${result.status}`);
  });

  test('--active: exits 1 when ECL_RUNTIME=codex + flag=1 (non-claude)', () => {
    const result = spawnSync(
      process.execPath,
      [gsdToolsPath, 'query', 'teams-status', '--active'],
      {
        encoding: 'utf8',
        timeout: 15000,
        env: makeEnv({ runtime: 'codex', teamsFlag: '1' }),
      },
    );
    assert.strictEqual(result.status, 1, `Expected exit 1 for non-claude runtime, got ${result.status}`);
  });
});
