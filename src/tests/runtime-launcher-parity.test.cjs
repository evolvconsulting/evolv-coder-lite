'use strict';
/**
 * Parity test for bug #373: space-safe ecl_run launcher
 *
 * Asserts:
 * (A) No retired ECL_SDK token remains in any workflow .md file.
 * (B) Each workflow .md that uses ecl_run contains EXACTLY ONE canonical preamble
 *     (byte-equal to _runtime-launcher.snippet.sh), and it appears before the first
 *     ecl_run call. NOT every bash block — exactly one per file (define once, use
 *     across blocks — original footprint).
 * (C) Space-safe behavioral: a RUNTIME_DIR path with spaces in it resolves
 *     and calls ecl-tools.cjs correctly (no word-split, no {}).
 * (D) Loud guard behavioral: missing ecl-tools.cjs exits non-zero and emits
 *     "not found" to stderr.
 * (E) PATH fallback behavioral: when no local ecl-tools.cjs, the elif branch
 *     resolves to the ecl-tools binary on PATH (#3668).
 * (F) Regression locks: the snippet file contains no /ecl-tools substring; and
 *     no line in workflows/do.md matches /\/ecl[:-][a-z]/ (dispatcher-parity
 *     scanner must not read the preamble as a slash-command stub).
 * (H) Codex shim fallback: when PATH has no ecl-tools, $HOME/.codex/evolv-coder-lite/bin
 *     can satisfy ecl_run for Codex shim-only installs.
 */

// allow-test-rule: structural parity/drift guard — asserts literal presence/absence of the canonical ecl_run launcher and the retired $ECL_SDK / `/ecl-tools` tokens across workflow markdown; there is no typed IR for "this source file does not contain substring X".

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { cleanup } = require('./helpers.cjs');

const WORKFLOWS_DIR = path.join(__dirname, '..', 'evolv-coder-lite', 'workflows');
const AGENTS_DIR = path.join(__dirname, '..', 'agents');
const SNIPPET_FILE = path.join(WORKFLOWS_DIR, '_runtime-launcher.snippet.sh');

/**
 * Read the canonical preamble from the snippet file (all lines, no trailing newline).
 */
function expectedPreamble() {
  const raw = fs.readFileSync(SNIPPET_FILE, 'utf8');
  const lines = raw.split('\n');
  // Strip trailing empty element produced by a trailing newline.
  const content = lines[lines.length - 1] === '' ? lines.slice(0, -1) : lines;
  assert.ok(content.length >= 1, `_runtime-launcher.snippet.sh must not be empty`);
  return content; // array of strings
}

/**
 * Extract all bash/sh/shell fenced blocks from markdown content.
 * Returns array of { index, lines } where index is 0-based block count,
 * and lines is the array of content lines (without the fence markers).
 *
 * Handles both column-0 fences (```bash) and indented fences (   ```bash).
 */
function extractShellBlocks(content) {
  const allLines = content.split('\n');
  const blocks = [];
  let inBlock = false;
  let blockLang = null;
  let blockLines = [];
  let blockIndex = 0;
  let blockIndent = '';
  let closingPattern = null;

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    if (!inBlock) {
      const fenceOpen = line.match(/^(\s*)```(\w+)?\s*$/);
      if (fenceOpen) {
        inBlock = true;
        blockIndent = fenceOpen[1];
        blockLang = (fenceOpen[2] || '').toLowerCase();
        blockLines = [];
        // Closing pattern: same indent prefix + ```
        closingPattern = new RegExp('^' + blockIndent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '```\\s*$');
        continue;
      }
    } else {
      if (closingPattern.test(line)) {
        if (['bash', 'sh', 'shell', 'zsh', ''].includes(blockLang)) {
          blocks.push({ index: blockIndex, lang: blockLang, lines: blockLines });
          blockIndex++;
        }
        inBlock = false;
        blockLang = null;
        blockLines = [];
        blockIndent = '';
        closingPattern = null;
        continue;
      }
      blockLines.push(line);
    }
  }
  return blocks;
}

/**
 * Collect all workflow .md files recursively under WORKFLOWS_DIR.
 * Excludes _runtime-launcher.snippet.sh (not a markdown file).
 */
function collectWorkflowFiles() {
  const results = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(full);
      }
    }
  }
  walk(WORKFLOWS_DIR);
  return results;
}

/**
 * Collect all agent .md files under AGENTS_DIR (non-recursive — agents/ has no subdirs,
 * but collectFiles in the sync script is recursive-safe; we mirror that here).
 */
function collectAgentFiles() {
  const results = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(full);
      }
    }
  }
  walk(AGENTS_DIR);
  return results;
}

describe('runtime-launcher-parity (#373)', () => {
  // ─── (A) No retired ECL_SDK token ────────────────────────────────────────
  test('(A) no ECL_SDK token in any workflow .md file', () => {
    const files = collectWorkflowFiles();
    assert.ok(files.length > 0, 'expected at least one workflow .md file');

    const offending = [];
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf8');
      if (content.includes('ECL_SDK')) {
        offending.push(path.relative(WORKFLOWS_DIR, f));
      }
    }

    assert.deepStrictEqual(
      offending,
      [],
      'Found ECL_SDK (retired token) in workflow files — run `node scripts/sync-runtime-launcher.cjs` to fix:\n' +
        offending.join('\n'),
    );
  });

  // ─── (B) Exactly ONE canonical preamble per using file ───────────────────
  test('(B) each workflow .md using ecl_run contains exactly ONE canonical preamble, before the first ecl_run call', () => {
    const preamble = expectedPreamble();
    const preambleStr = preamble.join('\n');
    const files = collectWorkflowFiles();
    assert.ok(files.length > 0, 'expected at least one workflow .md file');

    const violations = [];

    for (const f of files) {
      const rel = path.relative(WORKFLOWS_DIR, f);
      const content = fs.readFileSync(f, 'utf8');
      const blocks = extractShellBlocks(content);

      // Collect all block lines in document order for flat analysis
      const allBlockLines = [];
      for (const blk of blocks) {
        allBlockLines.push(...blk.lines);
      }

      // Does this file use ecl_run at all?
      const fileHasGsdRun = allBlockLines.some((l) => /\becl_run\b/.test(l));
      if (!fileHasGsdRun) continue;

      // Count preamble occurrences across all shell content of this file
      // Flatten all block lines with a separator so multi-block boundary doesn't create false match
      const allContent = allBlockLines.join('\n');
      let preambleCount = 0;
      let searchPos = 0;
      while (true) {
        const idx = allContent.indexOf(preambleStr, searchPos);
        if (idx === -1) break;
        preambleCount++;
        searchPos = idx + preambleStr.length;
      }

      if (preambleCount !== 1) {
        violations.push(
          `${rel}: expected exactly 1 canonical preamble occurrence in bash blocks, found ${preambleCount}. ` +
            `Run \`node scripts/sync-runtime-launcher.cjs\` to fix.`,
        );
        continue;
      }

      // Verify preamble appears BEFORE the first ecl_run call (in document order)
      // Find the line index of the preamble start vs the first ecl_run call in the flat content
      const preamblePos = allContent.indexOf(preambleStr);
      const firstGsdRunPos = allContent.search(/\becl_run\b/);

      // The first ecl_run WITHIN the preamble itself (the function definition) is fine.
      // We need to verify that no ecl_run CALL (i.e. ecl_run used as a command, not in a
      // function definition body) appears before the preamble starts.
      // Simple check: preamble starts at or before the first ecl_run occurrence
      if (preamblePos > firstGsdRunPos) {
        violations.push(
          `${rel}: preamble appears AFTER the first ecl_run reference — it must precede all ecl_run calls.`,
        );
      }
    }

    assert.deepStrictEqual(
      violations,
      [],
      'Files with ecl_run calls have wrong preamble count or ordering:\n' +
        violations.join('\n---\n'),
    );
  });

  // ─── (C) Space-safe behavioral test ──────────────────────────────────────
  test('(C) ecl_run works with a RUNTIME_DIR path containing spaces', () => {
    // Create temp dir whose path contains a space
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'ecl 373 '));
    try {
      const binDir = path.join(base, 'evolv-coder-lite', 'bin');
      fs.mkdirSync(binDir, { recursive: true });

      // Stub ecl-tools.cjs that prints its argv
      const stub = path.join(binDir, 'ecl-tools.cjs');
      fs.writeFileSync(stub, '#!/usr/bin/env node\nconsole.log("STUB:" + process.argv.slice(2).join(","));\n');
      fs.chmodSync(stub, 0o755);

      // Build a shell script: set RUNTIME_DIR, source preamble, run ecl_run
      const snippet = fs.readFileSync(SNIPPET_FILE, 'utf8');
      const scriptContent =
        `export RUNTIME_DIR=${JSON.stringify(base)}\n` +
        snippet +
        `\necl_run query state.json\n`;

      const scriptPath = path.join(base, 'test-space.sh');
      fs.writeFileSync(scriptPath, scriptContent);

      const stdout = execFileSync('bash', [scriptPath], { encoding: 'utf8' });
      assert.ok(
        stdout.includes('STUB:query,state.json'),
        `Expected stdout to contain "STUB:query,state.json" but got: ${stdout.trim()}`,
      );
    } finally {
      cleanup(base);
    }
  });

  // ─── (D) Loud guard: missing runtime is fatal ─────────────────────────────
  test('(D) missing ecl-tools.cjs and no PATH ecl-tools causes loud non-zero exit with "not found" on stderr', () => {
    // Create temp dir with a space in the name, but NO ecl-tools.cjs.
    // We ensure ecl-tools is not on PATH by prepending a dir that has no
    // ecl-tools binary (system binaries remain on PATH so bash/node work).
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'ecl 373 notools '));
    // Place a no-op dir first in PATH; no ecl-tools stub there.
    const noToolsBin = path.join(base, 'nobin');
    fs.mkdirSync(noToolsBin, { recursive: true });
    try {
      const snippet = fs.readFileSync(SNIPPET_FILE, 'utf8');
      // The script must also unset any ECL_TOOLS env var that might leak in
      const scriptContent =
        `unset ECL_TOOLS\n` +
        `export RUNTIME_DIR=${JSON.stringify(base)}\n` +
        snippet +
        `\necl_run query state.json\n`;

      const scriptPath = path.join(base, 'test-guard.sh');
      fs.writeFileSync(scriptPath, scriptContent);

      // Build a PATH that has noToolsBin first (no ecl-tools stub there) but retains
      // system paths needed for bash. Exclude any PATH entry that contains a ecl-tools binary.
      const systemPaths = (process.env.PATH || '/usr/bin:/bin')
        .split(path.delimiter)
        .filter((p) => {
          try { fs.accessSync(path.join(p, 'ecl-tools'), fs.constants.X_OK); return false; }
          catch { return true; }
        });
      const isolatedPath = [noToolsBin, ...systemPaths].join(path.delimiter);

      let threw = false;
      let stderrOutput = '';
      try {
        execFileSync('bash', [scriptPath], {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, PATH: isolatedPath, HOME: base },
        });
      } catch (err) {
        threw = true;
        stderrOutput = err.stderr || '';
      }

      assert.ok(threw, 'Expected the script to exit non-zero when ecl-tools.cjs is missing and ecl-tools is not on PATH');
      assert.ok(
        stderrOutput.includes('not found') || stderrOutput.includes('ERROR'),
        `Expected stderr to contain "not found" or "ERROR", got: ${stderrOutput.trim()}`,
      );
    } finally {
      cleanup(base);
    }
  });

  // ─── (E) PATH fallback behavioral (#3668) ────────────────────────────────
  test('(E) PATH fallback: uses installed ecl-tools when no local ecl-tools.cjs present', () => {
    // Create a temp dir with NO local evolv-coder-lite/bin/ecl-tools.cjs.
    // Place an executable ecl-tools stub on a dedicated PATH dir.
    // RUNTIME_DIR points somewhere that has no ecl-tools.cjs.
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'ecl 373 pathfb '));
    try {
      const pathBinDir = path.join(base, 'bin');
      fs.mkdirSync(pathBinDir, { recursive: true });

      // Stub installed ecl-tools binary that prints a marker
      const stubPath = path.join(pathBinDir, 'ecl-tools');
      fs.writeFileSync(stubPath, '#!/bin/sh\necho "installed:$*"\n');
      fs.chmodSync(stubPath, 0o755);

      // RUNTIME_DIR points to base — no evolv-coder-lite/bin/ecl-tools.cjs there
      const snippet = fs.readFileSync(SNIPPET_FILE, 'utf8');
      const scriptContent =
        `export RUNTIME_DIR=${JSON.stringify(base)}\n` +
        snippet +
        `\nprintf "ECL_TOOLS=%s\\n" "$ECL_TOOLS"\n` +
        `ecl_run query state.json\n`;

      const scriptPath = path.join(base, 'test-pathfb.sh');
      fs.writeFileSync(scriptPath, scriptContent);

      const stdout = execFileSync('bash', [scriptPath], {
        encoding: 'utf8',
        env: { ...process.env, PATH: `${pathBinDir}${path.delimiter}${process.env.PATH || ''}` },
      });

      // The PATH fallback must have resolved ECL_TOOLS to the stub binary.
      // Normalize backslashes → forward slashes so the assertion works on Windows
      // (git-bash emits POSIX paths while Node's os.tmpdir() returns the Windows form).
      // Assert by suffix (/bin/ecl-tools, no .cjs extension) rather than absolute prefix
      // because the prefix differs between Windows and POSIX.
      // Use .+ (not \S*) to tolerate paths that contain spaces.
      const normStdout = stdout.replace(/\\/g, '/');
      assert.match(
        normStdout,
        /ECL_TOOLS=.+\/bin\/ecl-tools(?:\s|$)/m,
        `Expected ECL_TOOLS to resolve to the installed PATH stub (suffix /bin/ecl-tools), got: ${stdout.trim()}`,
      );
      assert.doesNotMatch(
        normStdout,
        /ECL_TOOLS=.+\.cjs/m,
        `Expected ECL_TOOLS NOT to point to a .cjs file in PATH fallback, got: ${stdout.trim()}`,
      );
      // The stub must have been invoked with the query arguments
      assert.ok(
        stdout.includes('installed:query state.json'),
        `Expected stdout to contain "installed:query state.json" (PATH stub output), got: ${stdout.trim()}`,
      );
    } finally {
      cleanup(base);
    }
  });

  // ─── (G) ~/.claude fallback arm is present (#211) ───────────────────────────
  test('(G) snippet and all propagated workflow .md files contain the $HOME/.claude fallback arm between PATH check and hard error', () => {
    // The resolution order must be:
    //   (1) local/RUNTIME_DIR  →  (2) PATH  →  (3) $HOME/.claude/evolv-coder-lite/bin  →  (4) hard error
    // We probe for .claude/evolv-coder-lite/bin (using ${_GSD_SHIM_NAME} indirection)
    // between the `command -v ecl-tools` elif and the hard-error else branch.
    const CLAUDE_HOME_PROBE = '.claude/evolv-coder-lite/bin/';

    // Assert snippet itself contains the probe
    const snippetContent = fs.readFileSync(SNIPPET_FILE, 'utf8');
    assert.ok(
      snippetContent.includes(CLAUDE_HOME_PROBE),
      `_runtime-launcher.snippet.sh must contain the $HOME/.claude fallback arm (probing "${CLAUDE_HOME_PROBE}"). ` +
        `Add an elif arm that checks $HOME/.claude/evolv-coder-lite/bin/\${_GSD_SHIM_NAME} before the hard-error else.`,
    );

    // Assert the probe appears BEFORE the hard-error text in the snippet
    const probePos = snippetContent.indexOf(CLAUDE_HOME_PROBE);
    const errorPos = snippetContent.indexOf('exit 1');
    assert.ok(
      probePos < errorPos,
      `The $HOME/.claude fallback arm (at index ${probePos}) must appear before "exit 1" (at index ${errorPos}) in the snippet.`,
    );

    // Assert every propagated workflow .md file that uses ecl_run also contains the probe
    const files = collectWorkflowFiles();
    const missing = [];
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf8');
      const blocks = extractShellBlocks(content);
      const allBlockLines = blocks.flatMap((b) => b.lines);
      const fileHasGsdRun = allBlockLines.some((l) => /\becl_run\b/.test(l));
      if (!fileHasGsdRun) continue;
      const allContent = allBlockLines.join('\n');
      if (!allContent.includes(CLAUDE_HOME_PROBE)) {
        missing.push(path.relative(WORKFLOWS_DIR, f));
      }
    }
    assert.deepStrictEqual(
      missing,
      [],
      `These workflow files use ecl_run but are missing the $HOME/.claude fallback arm ("${CLAUDE_HOME_PROBE}"). ` +
        `Run \`node scripts/sync-runtime-launcher.cjs\` to propagate:\n` +
        missing.join('\n'),
    );
  });

  // ─── (H) Codex shim fallback behavioral ------------------------------------
  test('(H) ecl_run resolves $HOME/.codex/evolv-coder-lite/bin/ shim when PATH has no ecl-tools', () => {
    const CODEX_HOME_PROBE = '.codex/evolv-coder-lite/bin/';

    const snippetContent = fs.readFileSync(SNIPPET_FILE, 'utf8');
    assert.ok(
      snippetContent.includes(CODEX_HOME_PROBE),
      `_runtime-launcher.snippet.sh must contain the Codex fallback arm (probing "${CODEX_HOME_PROBE}").`,
    );

    const missing = [];
    for (const f of collectWorkflowFiles()) {
      const content = fs.readFileSync(f, 'utf8');
      const blocks = extractShellBlocks(content);
      const allBlockLines = blocks.flatMap((b) => b.lines);
      const fileHasGsdRun = allBlockLines.some((l) => /\becl_run\b/.test(l));
      if (!fileHasGsdRun) continue;
      if (!allBlockLines.join('\n').includes(CODEX_HOME_PROBE)) {
        missing.push(path.relative(WORKFLOWS_DIR, f));
      }
    }
    assert.deepStrictEqual(
      missing,
      [],
      `These workflow files use ecl_run but are missing the Codex fallback arm ("${CODEX_HOME_PROBE}"). ` +
        `Run \`node scripts/sync-runtime-launcher.cjs\` to propagate:\n` +
        missing.join('\n'),
    );

    const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ecl-codex-home-'));
    const fakeRuntime = fs.mkdtempSync(path.join(os.tmpdir(), 'ecl-codex-rt-'));
    try {
      const codexBinDir = path.join(fakeHome, '.codex', 'evolv-coder-lite', 'bin');
      fs.mkdirSync(codexBinDir, { recursive: true });
      const stubPath = path.join(codexBinDir, 'ecl-tools.cjs');
      fs.writeFileSync(
        stubPath,
        '#!/usr/bin/env node\nconsole.log("CODEX_HOME_STUB:" + process.argv.slice(2).join(","));\n',
      );
      fs.chmodSync(stubPath, 0o755);

      const snippet = fs.readFileSync(SNIPPET_FILE, 'utf8');
      const scriptContent =
        `unset ECL_TOOLS\n` +
        `export RUNTIME_DIR=${JSON.stringify(fakeRuntime)}\n` +
        `export HOME=${JSON.stringify(fakeHome)}\n` +
        snippet +
        `\nprintf "ECL_TOOLS=%s\\n" "$ECL_TOOLS"\n` +
        `ecl_run query init.quick\n`;

      const scriptPath = path.join(fakeRuntime, 'test-codex-home-fb.sh');
      fs.writeFileSync(scriptPath, scriptContent);

      const hasExecutable = (dir, name) => {
        try {
          fs.accessSync(path.join(dir, name), fs.constants.X_OK);
          return true;
        } catch {
          return false;
        }
      };
      const systemPaths = (process.env.PATH || '/usr/bin:/bin')
        .split(path.delimiter)
        .filter((p) => !hasExecutable(p, 'ecl-tools'));
      if (!systemPaths.some((p) => hasExecutable(p, 'node'))) {
        const nodeShimDir = path.join(fakeRuntime, 'node-shim');
        fs.mkdirSync(nodeShimDir, { recursive: true });
        fs.symlinkSync(process.execPath, path.join(nodeShimDir, 'node'));
        systemPaths.unshift(nodeShimDir);
      }

      const stdout = execFileSync('bash', [scriptPath], {
        encoding: 'utf8',
        env: { ...process.env, PATH: systemPaths.join(path.delimiter), HOME: fakeHome },
      });

      const normStdout = stdout.replace(/\\/g, '/');
      assert.ok(
        normStdout.includes('.codex/evolv-coder-lite/bin/'),
        `Expected ECL_TOOLS to resolve into .codex/evolv-coder-lite/bin/, got:\n${stdout.trim()}`,
      );
      assert.ok(
        stdout.includes('CODEX_HOME_STUB:query,init.quick'),
        `Expected Codex shim stub output, got:\n${stdout.trim()}`,
      );
    } finally {
      cleanup(fakeHome);
      cleanup(fakeRuntime);
    }
  });

  // ─── (F) Regression locks: no /ecl-tools substring; no do.md dispatcher false-positive ──
  test('(F) snippet has no /ecl-tools substring; do.md has no /ecl[:-][a-z] matches', () => {
    // (F1) The snippet must not contain the literal substring /ecl-tools.
    // The _GSD_SHIM_NAME indirection ensures bin/${_GSD_SHIM_NAME} instead of
    // bin/ecl-tools.cjs — so the do.md dispatcher regex /\/ecl[:-]([a-z]...)/ never
    // misreads a preamble line as a slash-command stub.
    const snippetContent = fs.readFileSync(SNIPPET_FILE, 'utf8');
    assert.ok(
      !snippetContent.includes('/ecl-tools'),
      `_runtime-launcher.snippet.sh must not contain the literal "/ecl-tools" substring. ` +
        `Use bin/\${_GSD_SHIM_NAME} indirection to keep the /ecl[:-] scanner from ` +
        `misreading it as a slash-command stub. Found in snippet:\n` +
        snippetContent.split('\n').filter((l) => l.includes('/ecl-tools')).join('\n'),
    );

    // (F2) workflows/do.md must not contain the literal substring /ecl-tools
    // (the specific path that leaks when _GSD_SHIM_NAME indirection is bypassed).
    // The bug-2954 dispatcher scanner /\/ecl[:-]([a-z]...)/ would misread
    // /ecl-tools as a slash-command stub named "tools" — which is not shipped.
    // Note: /ecl:command references (with colon) in the dispatch table are
    // legitimate and are NOT checked here.
    const doMdPath = path.join(WORKFLOWS_DIR, 'do.md');
    const doMdContent = fs.readFileSync(doMdPath, 'utf8');
    const offendingLines = doMdContent
      .split('\n')
      .filter((l) => /\/ecl-tools/.test(l));
    assert.deepStrictEqual(
      offendingLines,
      [],
      `workflows/do.md contains the literal "/ecl-tools" substring which the dispatcher-parity ` +
        `scanner (bug-2954) misreads as a slash-command stub. Use \${_GSD_SHIM_NAME} indirection. ` +
        `Offending lines:\n` +
        offendingLines.join('\n'),
    );
  });
});

// ─── Issue #381: standalone ecl_run executable + CLAUDE_ENV_FILE persistence ──
describe('runtime-launcher-parity — standalone executable (#381)', () => {
  const BIN_DIR = path.join(__dirname, '..', 'evolv-coder-lite', 'bin');
  const ECL_RUN_SRC = path.join(BIN_DIR, 'ecl_run');

  // ─── (I) ecl_run executable delegates to ecl-tools.cjs beside it ──────────
  test('(I) ecl_run executable delegates to ecl-tools.cjs beside it', () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'ecl-381-I-'));
    try {
      const binDir = path.join(base, 'evolv-coder-lite', 'bin');
      fs.mkdirSync(binDir, { recursive: true });

      // Copy the real ecl_run executable into the temp bin dir
      fs.copyFileSync(ECL_RUN_SRC, path.join(binDir, 'ecl_run'));
      fs.chmodSync(path.join(binDir, 'ecl_run'), 0o755);

      // Write a stub ecl-tools.cjs that echoes its args
      fs.writeFileSync(
        path.join(binDir, 'ecl-tools.cjs'),
        `console.log('ECL_TOOLS_STUB:' + process.argv.slice(2).join(' '))`,
      );

      const stdout = execFileSync('sh', [path.join(binDir, 'ecl_run'), 'query', 'x'], {
        encoding: 'utf8',
      });
      assert.ok(
        stdout.includes('ECL_TOOLS_STUB:query x'),
        `Expected stdout to contain "ECL_TOOLS_STUB:query x", got: ${stdout.trim()}`,
      );
    } finally {
      cleanup(base);
    }
  });

  // ─── (J) preamble persists bin dir to CLAUDE_ENV_FILE ─────────────────────
  test('(J) preamble persists bin dir to CLAUDE_ENV_FILE so a fresh shell resolves ecl_run', () => {
    // Use a RUNTIME_DIR whose path contains a SPACE to prove single-quote safety.
    const baseParent = fs.mkdtempSync(path.join(os.tmpdir(), 'ecl-381-J-'));
    const base = path.join(baseParent, 'has space');
    try {
      const binDir = path.join(base, 'evolv-coder-lite', 'bin');
      fs.mkdirSync(binDir, { recursive: true });

      // ecl_run stub that prints ECL_RUN_STUB:<args>
      const gsdRunStub = path.join(binDir, 'ecl_run');
      fs.writeFileSync(gsdRunStub, '#!/bin/sh\necho "ECL_RUN_STUB:$*"\n');
      fs.chmodSync(gsdRunStub, 0o755);

      // ecl-tools.cjs stub (must exist for preamble first arm to win)
      fs.writeFileSync(path.join(binDir, 'ecl-tools.cjs'), '// stub');

      const envFile = path.join(baseParent, 'envfile');
      const snippet = fs.readFileSync(SNIPPET_FILE, 'utf8');

      // Script: just source the preamble with RUNTIME_DIR + CLAUDE_ENV_FILE set
      const preambleScript = path.join(baseParent, 'run-preamble.sh');
      fs.writeFileSync(preambleScript, snippet);

      execFileSync('bash', [preambleScript], {
        encoding: 'utf8',
        env: {
          RUNTIME_DIR: base,
          CLAUDE_ENV_FILE: envFile,
          PATH: process.env.PATH,
        },
      });

      // Assert envfile exists and the persisted line is single-quoted
      assert.ok(fs.existsSync(envFile), `Expected CLAUDE_ENV_FILE (${envFile}) to be created after preamble runs`);
      const envFileContent = fs.readFileSync(envFile, 'utf8');
      // The persisted line must single-quote the directory (neutralising $, spaces, etc.)
      // and keep "$PATH" expanding at source time.
      // Expected form: export PATH='<dir>':"$PATH"
      assert.ok(
        envFileContent.includes("export PATH='"),
        `Expected envfile to contain single-quoted export PATH line, got: ${envFileContent.trim()}`,
      );
      assert.ok(
        envFileContent.includes('has space/evolv-coder-lite/bin'),
        `Expected envfile to contain the spaced bin dir, got: ${envFileContent.trim()}`,
      );
      assert.ok(
        envFileContent.includes(':"$PATH"'),
        `Expected envfile to contain :"$PATH" (double-quoted, expands at source time), got: ${envFileContent.trim()}`,
      );

      // Windows Git Bash (msys2) does not honor Node's chmod exec bit for PATH-executing
      // extension-less scripts; the env-file persistence above is the cross-platform proof.
      // Global installs on Windows are covered by npm's generated bin shim.
      if (process.platform !== 'win32') {
        // Simulate a LATER fresh block that SOURCES the env file to get ecl_run on PATH.
        // The later shell does NOT have the bin dir on PATH beforehand — it only gets it
        // by sourcing the env file.  We use a minimal PATH (no temp bin dir pre-injected).
        const stdout = execFileSync('bash', ['-c', '. "$CLAUDE_ENV_FILE"; ecl_run hello'], {
          encoding: 'utf8',
          env: {
            CLAUDE_ENV_FILE: envFile,
            PATH: process.env.PATH,
          },
        });
        assert.ok(
          stdout.includes('ECL_RUN_STUB:hello'),
          `Expected stdout to contain "ECL_RUN_STUB:hello" after sourcing env file, got: ${stdout.trim()}`,
        );
      }
    } finally {
      cleanup(baseParent);
    }
  });
});

// ─── Agent parity — runtime-launcher-parity — agents (#1041) ─────────────────
describe('runtime-launcher-parity — agents (#1041)', () => {
  // ─── (B-agents) Exactly ONE canonical preamble per using agent file ────────
  test('(B-agents) each agent .md using ecl_run contains exactly ONE canonical preamble, before the first ecl_run call', () => {
    const preamble = expectedPreamble();
    const preambleStr = preamble.join('\n');
    const files = collectAgentFiles();
    assert.ok(files.length > 0, 'expected at least one agent .md file');

    const violations = [];

    for (const f of files) {
      const rel = path.relative(AGENTS_DIR, f);
      const content = fs.readFileSync(f, 'utf8');
      const blocks = extractShellBlocks(content);

      // Collect all block lines in document order for flat analysis
      const allBlockLines = [];
      for (const blk of blocks) {
        allBlockLines.push(...blk.lines);
      }

      // Does this file use ecl_run at all?
      const fileHasGsdRun = allBlockLines.some((l) => /\becl_run\b/.test(l));
      if (!fileHasGsdRun) continue; // agents without ecl_run are not checked

      // Count preamble occurrences across all shell content of this file
      const allContent = allBlockLines.join('\n');
      let preambleCount = 0;
      let searchPos = 0;
      while (true) {
        const idx = allContent.indexOf(preambleStr, searchPos);
        if (idx === -1) break;
        preambleCount++;
        searchPos = idx + preambleStr.length;
      }

      if (preambleCount !== 1) {
        violations.push(
          `${rel}: expected exactly 1 canonical preamble occurrence in bash blocks, found ${preambleCount}. ` +
            `Run \`node scripts/sync-runtime-launcher.cjs\` to fix.`,
        );
        continue;
      }

      // Verify preamble appears BEFORE the first ecl_run call (in document order)
      const preamblePos = allContent.indexOf(preambleStr);
      const firstGsdRunPos = allContent.search(/\becl_run\b/);

      // The first ecl_run WITHIN the preamble itself (the function definition) is fine.
      // Simple check: preamble starts at or before the first ecl_run occurrence.
      if (preamblePos > firstGsdRunPos) {
        violations.push(
          `${rel}: preamble appears AFTER the first ecl_run reference — it must precede all ecl_run calls.`,
        );
      }
    }

    assert.deepStrictEqual(
      violations,
      [],
      'Agent files with ecl_run calls have wrong preamble count or ordering:\n' +
        violations.join('\n---\n'),
    );
  });
});
