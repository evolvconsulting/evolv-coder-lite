'use strict';
/**
 * Regression test for bug #211: ecl_run launcher must probe
 * $HOME/.claude/evolv-coder-lite/bin/ecl-tools.cjs before emitting the hard error.
 *
 * Asserts:
 * (A) The canonical snippet file contains the ~/.claude fallback arm.
 * (B) A representative propagated workflow file contains the ~/.claude fallback arm.
 * (C) Behavioral: when RUNTIME_DIR misses and ecl-tools is NOT on PATH,
 *     a stub at $HOME/.claude/evolv-coder-lite/bin/ecl-tools.cjs is resolved and invoked.
 * (D) The resolution order is preserved: local -> PATH -> ~/.claude -> hard error.
 *     When all three miss, exit non-zero.
 */

// allow-test-rule: structural/behavioral regression for the ~/.claude fallback arm in
// the ecl_run launcher snippet -- asserts literal substring presence and exercises the
// bash resolution path via execFileSync; there is no typed IR for "snippet contains arm X".

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { cleanup } = require('./helpers.cjs');

const WORKFLOWS_DIR = path.join(__dirname, '..', 'evolv-coder-lite', 'workflows');
const SNIPPET_FILE = path.join(WORKFLOWS_DIR, '_runtime-launcher.snippet.sh');
// Representative propagated workflow file (has a ecl_run call):
const REPRESENTATIVE_FILE = path.join(WORKFLOWS_DIR, 'add-backlog.md');

const CLAUDE_HOME_PROBE = '.claude/evolv-coder-lite/bin/';

describe('bug-211: launcher ~/.claude home fallback', () => {
  // --- (A) Snippet contains the arm ----------------------------------------
  test('(A) snippet file contains the $HOME/.claude fallback arm', () => {
    const content = fs.readFileSync(SNIPPET_FILE, 'utf8');
    assert.ok(
      content.includes(CLAUDE_HOME_PROBE),
      `_runtime-launcher.snippet.sh must contain "${CLAUDE_HOME_PROBE}" (the ~/.claude fallback arm). ` +
        `Found snippet content:\n${content.trim()}`,
    );
  });

  // --- (B) Representative propagated file contains the arm ------------------
  test('(B) add-backlog.md (representative propagated file) contains the $HOME/.claude fallback arm', () => {
    const content = fs.readFileSync(REPRESENTATIVE_FILE, 'utf8');
    assert.ok(
      content.includes(CLAUDE_HOME_PROBE),
      `add-backlog.md must contain "${CLAUDE_HOME_PROBE}" after propagation. ` +
        `Run \`node scripts/sync-runtime-launcher.cjs\` to propagate the updated snippet.`,
    );
  });

  // --- (C) Behavioral: ~/.claude stub is resolved when local and PATH both miss
  test('(C) ecl_run resolves $HOME/.claude/evolv-coder-lite/bin/ stub when no local install and ecl-tools not on PATH', () => {
    // Build a fake $HOME with a stub at .claude/evolv-coder-lite/bin/ecl-tools.cjs
    const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ecl-211-home-'));
    // RUNTIME_DIR points to a directory with no ecl-tools.cjs
    const fakeRuntime = fs.mkdtempSync(path.join(os.tmpdir(), 'ecl-211-rt-'));
    try {
      const claudeBinDir = path.join(fakeHome, '.claude', 'evolv-coder-lite', 'bin');
      fs.mkdirSync(claudeBinDir, { recursive: true });

      // Stub ecl-tools.cjs that prints a marker
      const stubPath = path.join(claudeBinDir, 'ecl-tools.cjs');
      fs.writeFileSync(
        stubPath,
        '#!/usr/bin/env node\nconsole.log("CLAUDE_HOME_STUB:" + process.argv.slice(2).join(","));\n',
      );
      fs.chmodSync(stubPath, 0o755);

      const snippet = fs.readFileSync(SNIPPET_FILE, 'utf8');
      const scriptContent =
        `unset ECL_TOOLS\n` +
        `export RUNTIME_DIR=${JSON.stringify(fakeRuntime)}\n` +
        `export HOME=${JSON.stringify(fakeHome)}\n` +
        snippet +
        `\nprintf "ECL_TOOLS=%s\\n" "$ECL_TOOLS"\n` +
        `ecl_run ping test\n`;

      const scriptPath = path.join(fakeRuntime, 'test-home-fb.sh');
      fs.writeFileSync(scriptPath, scriptContent);

      // Build a PATH with no ecl-tools binary to force the ~/.claude arm.
      // Filter out directories that contain a ecl-tools executable. If node lives
      // in the same directory as ecl-tools, create a dedicated shim dir with a
      // symlink to node only (no ecl-tools there).
      const nodeBin = execFileSync('which', ['node'], { encoding: 'utf8' }).trim();
      const systemPaths = (process.env.PATH || '/usr/bin:/bin')
        .split(path.delimiter)
        .filter((p) => {
          try {
            fs.accessSync(path.join(p, 'ecl-tools'), fs.constants.X_OK);
            return false;
          } catch {
            return true;
          }
        });
      // If node's dir was filtered (it contained ecl-tools), create a shim dir
      // with just a node symlink so the stub's shebang (#!/usr/bin/env node) resolves.
      const nodeShimDir = path.join(fakeRuntime, 'node-shim');
      if (!systemPaths.some((p) => {
        try { fs.accessSync(path.join(p, 'node'), fs.constants.X_OK); return true; }
        catch { return false; }
      })) {
        fs.mkdirSync(nodeShimDir, { recursive: true });
        fs.symlinkSync(nodeBin, path.join(nodeShimDir, 'node'));
        systemPaths.unshift(nodeShimDir);
      }

      const stdout = execFileSync('bash', [scriptPath], {
        encoding: 'utf8',
        env: { ...process.env, PATH: systemPaths.join(path.delimiter), HOME: fakeHome },
      });

      // ECL_TOOLS must point into the fake ~/.claude dir
      const normStdout = stdout.replace(/\\/g, '/');
      assert.ok(
        normStdout.includes('.claude/evolv-coder-lite/bin/'),
        `Expected ECL_TOOLS to resolve into .claude/evolv-coder-lite/bin/, got:\n${stdout.trim()}`,
      );
      // The stub must have been invoked
      assert.ok(
        stdout.includes('CLAUDE_HOME_STUB:ping,test'),
        `Expected stub output "CLAUDE_HOME_STUB:ping,test", got:\n${stdout.trim()}`,
      );
    } finally {
      cleanup(fakeHome);
      cleanup(fakeRuntime);
    }
  });

  // --- (D) All three miss -> hard error -------------------------------------
  test('(D) hard error when local, PATH, and ~/.claude all miss', () => {
    const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ecl-211-nohome-'));
    const fakeRuntime = fs.mkdtempSync(path.join(os.tmpdir(), 'ecl-211-nort-'));
    // noToolsBin so PATH check finds nothing
    const noToolsBin = path.join(fakeHome, 'nobin');
    fs.mkdirSync(noToolsBin, { recursive: true });
    // NO .claude/evolv-coder-lite/bin stub created in fakeHome
    try {
      const snippet = fs.readFileSync(SNIPPET_FILE, 'utf8');
      const scriptContent =
        `unset ECL_TOOLS\n` +
        `export RUNTIME_DIR=${JSON.stringify(fakeRuntime)}\n` +
        `export HOME=${JSON.stringify(fakeHome)}\n` +
        snippet +
        `\necl_run ping test\n`;

      const scriptPath = path.join(fakeRuntime, 'test-allfail.sh');
      fs.writeFileSync(scriptPath, scriptContent);

      const systemPaths = (process.env.PATH || '/usr/bin:/bin')
        .split(path.delimiter)
        .filter((p) => {
          try {
            fs.accessSync(path.join(p, 'ecl-tools'), fs.constants.X_OK);
            return false;
          } catch {
            return true;
          }
        });
      const isolatedPath = [noToolsBin, ...systemPaths].join(path.delimiter);

      let threw = false;
      let stderrOutput = '';
      try {
        execFileSync('bash', [scriptPath], {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, PATH: isolatedPath, HOME: fakeHome },
        });
      } catch (err) {
        threw = true;
        stderrOutput = err.stderr || '';
      }

      assert.ok(threw, 'Expected non-zero exit when all three resolution arms miss');
      assert.ok(
        stderrOutput.includes('not found') || stderrOutput.includes('ERROR'),
        `Expected stderr to contain "not found" or "ERROR", got: ${stderrOutput.trim()}`,
      );
    } finally {
      cleanup(fakeHome);
      cleanup(fakeRuntime);
    }
  });
});
