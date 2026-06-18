'use strict';

/**
 * eCL override of the upstream migration-004 test.
 *
 * Upstream migration 004 (#934) prunes the post-rename LEGACY pristine dir
 * gsd-pristine/get-shit-done/ — distinct upstream from the CURRENT
 * gsd-pristine/gsd-core/. eCL's rebrand maps BOTH `get-shit-done` and `gsd-core`
 * to `evolv-coder-lite`, so a straight rebrand of the migration would target
 * ecl-pristine/evolv-coder-lite/ — which IS eCL's current pristine dir — and
 * pruning it would wipe live snapshots and degrade reapply-patches (#2972/#2998).
 *
 * eCL has always installed as evolv-coder-lite/ (the get-shit-done -> gsd-core
 * rename never happened downstream), so overlay/text-patches.mjs points the
 * migration's walk at the upstream-legacy `get-shit-done` dir, which eCL installs
 * never create. The migration is therefore a SAFE NO-OP in production and must
 * NEVER touch the current ecl-pristine/evolv-coder-lite/ snapshots.
 *
 * This test pins that contract:
 *   - current dir (evolv-coder-lite/) is NEVER pruned — the key regression guard;
 *   - the pruning logic still works for the legacy dir if one were ever present;
 *   - symlink safety is preserved.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Load compiled module (build:lib compiles src/*.cts -> evolv-coder-lite/bin/lib/*.cjs)
const migration = require('../evolv-coder-lite/bin/lib/installer-migrations/004-prune-stale-pristine-snapshots.cjs');

const LEGACY_DIR = 'get-shit-done';       // ecl-allow-legacy-name (upstream pre-rename dir; absent in eCL)
const CURRENT_DIR = 'evolv-coder-lite';   // ecl-allow-legacy-name (eCL's live runtime/pristine dir)

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ecl-migration-004-test-'));
}

function cleanup(dir) {
  // eslint-disable-next-line local/no-raw-rmsync-in-tests -- local cleanup in migration test; no helpers import available
  fs.rmSync(dir, { recursive: true, force: true });
}

function writeFile(root, relPath, content) {
  const fullPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
}

function writeManifest(root, files) {
  fs.writeFileSync(
    path.join(root, 'ecl-file-manifest.json'),
    JSON.stringify({
      version: '1.3.0',
      timestamp: '2026-06-01T00:00:00.000Z',
      mode: 'full',
      files,
    }, null, 2),
    'utf8'
  );
}

const {
  classifyArtifact: realClassifyArtifact,
  readInstallManifest,
} = require('../evolv-coder-lite/bin/lib/installer-migrations.cjs');

function makePlanCtx(configDir) {
  const manifest = readInstallManifest(configDir);
  return {
    configDir,
    classifyArtifact: (relPath) => realClassifyArtifact(configDir, relPath, manifest),
  };
}

describe('migration 004 metadata', () => {
  test('exports a single migration object with required fields', () => {
    assert.equal(typeof migration, 'object');
    assert.equal(typeof migration.id, 'string');
    assert.ok(migration.id.length > 0, 'id must be non-empty');
    assert.equal(typeof migration.title, 'string');
    assert.ok(migration.scopes.includes('local'), 'scopes must include local');
    assert.equal(typeof migration.plan, 'function');
  });

  test('id contains expected date prefix and references pristine pruning', () => {
    assert.ok(migration.id.startsWith('2026-06-09-'), `id should start with date prefix, got: ${migration.id}`);
    assert.ok(migration.id.includes('pristine'), `id should reference pristine pruning, got: ${migration.id}`);
  });
});

// ---------------------------------------------------------------------------
// eCL key regression: the CURRENT pristine dir must NEVER be pruned.
// (Without the legacy-dir text-patch, the rebrand collision would prune it.)
// ---------------------------------------------------------------------------

describe('migration 004 never prunes the current ecl-pristine/evolv-coder-lite/ dir (eCL)', () => {
  test('returns [] when only the current pristine dir has files', () => {
    const configDir = createTempDir();
    try {
      writeFile(configDir, `ecl-pristine/${CURRENT_DIR}/workflows/plan.md`, 'live pristine snapshot\n');
      writeFile(configDir, `ecl-pristine/${CURRENT_DIR}/skills/ecl-foo/SKILL.md`, 'live skill\n');
      writeManifest(configDir, {});

      const actions = migration.plan(makePlanCtx(configDir));
      assert.deepEqual(actions, [], 'migration 004 must NOT touch the current pristine dir for eCL');
    } finally {
      cleanup(configDir);
    }
  });

  test('returns [] when ecl-pristine/ does not exist at all', () => {
    const configDir = createTempDir();
    try {
      writeManifest(configDir, {});
      assert.deepEqual(migration.plan(makePlanCtx(configDir)), []);
    } finally {
      cleanup(configDir);
    }
  });
});

// ---------------------------------------------------------------------------
// Pruning logic still works for the legacy dir (defensive — eCL installs never
// create ecl-pristine/get-shit-done/, so this only exercises the code path).
// ---------------------------------------------------------------------------

describe('migration 004 prunes the legacy pristine dir when present', () => {
  test('emits remove-managed for each file under the legacy dir', () => {
    const configDir = createTempDir();
    try {
      writeFile(configDir, `ecl-pristine/${LEGACY_DIR}/workflows/plan.md`, 'old pristine\n');
      writeFile(configDir, `ecl-pristine/${LEGACY_DIR}/skills/ecl-foo/SKILL.md`, 'old skill\n');
      writeManifest(configDir, {});

      const actions = migration.plan(makePlanCtx(configDir));
      assert.equal(actions.length, 2, `expected 2 actions, got ${actions.length}`);
      for (const action of actions) {
        assert.equal(action.type, 'remove-managed');
        assert.ok(
          action.relPath.replace(/\\/g, '/').startsWith(`ecl-pristine/${LEGACY_DIR}/`),
          `relPath should start with ecl-pristine/${LEGACY_DIR}/, got: ${action.relPath}`,
        );
        assert.equal(action.classification, 'managed-pristine');
        assert.ok(typeof action.reason === 'string' && action.reason.length > 0, 'reason must not be empty');
      }
    } finally {
      cleanup(configDir);
    }
  });
});

// ---------------------------------------------------------------------------
// Symlink safety preserved.
// ---------------------------------------------------------------------------

describe('migration 004 symlink safety', () => {
  test('returns [] when the legacy pristine root is a symlink', () => {
    const configDir = createTempDir();
    const externalDir = createTempDir();
    try {
      writeFile(externalDir, 'workflows/plan.md', 'pristine content\n');
      fs.mkdirSync(path.join(configDir, 'ecl-pristine'), { recursive: true });
      fs.symlinkSync(externalDir, path.join(configDir, 'ecl-pristine', LEGACY_DIR));
      writeManifest(configDir, {});

      assert.deepEqual(
        migration.plan(makePlanCtx(configDir)),
        [],
        'plan() must return [] when the legacy pristine root is a symlink',
      );
    } finally {
      cleanup(configDir);
      cleanup(externalDir);
    }
  });

  test('skips a symlinked entry inside the legacy pristine dir', () => {
    const configDir = createTempDir();
    const externalTarget = createTempDir();
    try {
      writeFile(configDir, `ecl-pristine/${LEGACY_DIR}/workflows/plan.md`, 'real pristine\n');
      const externalFile = path.join(externalTarget, 'external.md');
      fs.writeFileSync(externalFile, 'external content\n', 'utf8');
      fs.symlinkSync(
        externalFile,
        path.join(configDir, 'ecl-pristine', LEGACY_DIR, 'workflows', 'symlinked.md'),
      );
      writeManifest(configDir, {});

      const actions = migration.plan(makePlanCtx(configDir));
      assert.equal(actions.length, 1, `expected 1 action (real file only), got ${actions.length}`);
      assert.equal(actions.some((a) => a.relPath.includes('symlinked')), false, 'symlinked entry must be skipped');
    } finally {
      cleanup(configDir);
      cleanup(externalTarget);
    }
  });
});
