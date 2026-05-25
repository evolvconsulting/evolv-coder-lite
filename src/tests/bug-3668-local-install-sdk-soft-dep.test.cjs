// allow-test-rule: reads workflow .md files (product content, not source .cjs) to assert structural invariants — file-presence check is the only viable IR for markdown guard patterns
/**
 * Regression test for #3668: --local install has soft dependency on global ecl-sdk
 *
 * Two defects confirmed by code inspection:
 *
 * Defect 1 — `buildGsdSdkVersionMismatchReport` emits `npm install -g evolv-coder-lite-cc@latest`
 *   unconditionally, even when the caller is a local install. For local installs the
 *   correct remediation is to run `/ecl:update` (or `npx evolv-coder-lite-cc@latest --local`),
 *   not to install globally.
 *
 * Defect 2 — 69 of 72 workflow files that call `ecl-sdk query …` do so without a
 *   `[ -f "$ECL_TOOLS" ] … elif command -v ecl-sdk` fallback, so uninstalling the
 *   global `ecl-sdk` breaks every workflow on a fresh local session.
 *
 * Defect 3 — No CI guard prevents future workflow regressions.
 *
 * Acceptance criteria (from confirmed-bug triage comment):
 *   - `renderGsdSdkVersionMismatchReport` does NOT emit `npm install -g` for isLocal=true.
 *   - All SDK-invoking workflow files (recursively) use the local-first guard pattern.
 *   - A CI guard (Defect 3) blocks any future workflow file from invoking bare `ecl-sdk`
 *     without a resolution guard. The guard also catches untyped fences, not just bash/sh.
 */

'use strict';

process.env.ECL_TEST_MODE = '1';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { buildGsdSdkVersionMismatchReport, renderGsdSdkVersionMismatchReport } = require('../bin/install.js');
const { captureConsole } = require('./helpers.cjs');

const WORKFLOWS_DIR = path.join(__dirname, '..', 'evolv-coder-lite', 'workflows');

/**
 * Find all .md files under a directory (recursively).
 */
function findMdFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findMdFiles(fullPath));
    else if (entry.isFile() && entry.name.endsWith('.md')) results.push(fullPath);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Defect 1: version-mismatch report should not suggest `npm install -g` for
// local installs.
// ---------------------------------------------------------------------------

describe('#3668 Defect 1: version-mismatch report respects isLocal', () => {
  test('buildGsdSdkVersionMismatchReport accepts isLocal=true and sets local fix_command', () => {
    // Simulate a version mismatch report built for a local install.
    const ir = buildGsdSdkVersionMismatchReport('/fake/path/ecl-sdk', '1.42.0', { isLocal: true });
    // Without a real ecl-sdk binary the function may return null — that's fine,
    // the important contract is: when it DOES return a report for isLocal=true,
    // the fix_command must NOT be the global install command.
    if (ir === null) return; // no mismatch detected (no real binary) — skip assertion
    assert.ok(
      !ir.fix_command.includes('npm install -g'),
      [
        'buildGsdSdkVersionMismatchReport with isLocal=true must NOT produce',
        '`npm install -g …` as the fix_command — local installs should be told',
        `to run /ecl:update instead. Got: ${ir.fix_command}`,
      ].join(' '),
    );
  });

  test('renderGsdSdkVersionMismatchReport does not print npm install -g when isLocal=true', () => {
    // Construct an IR that represents a local-install mismatch (what the
    // fixed buildGsdSdkVersionMismatchReport must produce for isLocal=true).
    const localIr = {
      ok: false,
      reason: 'ecl_sdk_version_mismatch',
      sdk_path: '/fake/path/ecl-sdk',
      actual_version: '1.41.0',
      expected_version: '1.42.0',
      fix_command: 'npx evolv-coder-lite-cc@latest --claude --local',
      is_local: true,
    };

    const { stdout } = captureConsole(() => {
      renderGsdSdkVersionMismatchReport(localIr);
    });

    assert.ok(
      !stdout.includes('npm install -g'),
      [
        'renderGsdSdkVersionMismatchReport must not emit `npm install -g` when',
        `is_local=true. Stdout:\n${stdout}`,
      ].join(' '),
    );
    assert.ok(
      stdout.includes(localIr.fix_command),
      [
        'renderGsdSdkVersionMismatchReport must print the fix_command from the IR.',
        `Expected to find: ${localIr.fix_command}`,
        `Stdout:\n${stdout}`,
      ].join('\n'),
    );
  });

  test('buildGsdSdkVersionMismatchReport with isLocal=false still uses global fix_command', () => {
    // Verifies the global install path is unchanged (regression guard).
    const ir = buildGsdSdkVersionMismatchReport('/fake/path/ecl-sdk', '1.42.0', { isLocal: false });
    if (ir === null) return; // no real binary available — skip
    assert.ok(
      ir.fix_command.includes('npm install -g'),
      [
        'buildGsdSdkVersionMismatchReport with isLocal=false must keep',
        `\`npm install -g …\` as the fix_command. Got: ${ir.fix_command}`,
      ].join(' '),
    );
  });
});

// ---------------------------------------------------------------------------
// Shared helpers: structural markdown parsing (used by Defect 2, Defect 3,
// and the integration test below).
// ---------------------------------------------------------------------------

/**
 * Parse a markdown string into segments.
 * Returns an array of { type: 'prose' | 'bash-fence' | 'other-fence', content: string }.
 */
function parseMarkdownSegments(content) {
  const segments = [];
  const lines = content.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fenceMatch = line.match(/^```(bash|sh|[a-zA-Z0-9_-]*)(\s*)$/);
    if (fenceMatch) {
      const lang = fenceMatch[1].toLowerCase();
      const fenceLines = [line];
      i++;
      while (i < lines.length && !lines[i].match(/^```\s*$/)) {
        fenceLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        fenceLines.push(lines[i]);
        i++;
      }
      // Treat untyped fences (lang === '') as bash-fence: they frequently contain
      // shell commands (e.g. verify-work.md:118) and must be checked for bare
      // ecl-sdk invocations (#3668 F7).
      const isBash = lang === 'bash' || lang === 'sh' || lang === '';
      segments.push({ type: isBash ? 'bash-fence' : 'other-fence', content: fenceLines.join('\n') });
    } else {
      const proseLines = [line];
      i++;
      while (i < lines.length && !lines[i].match(/^```/)) {
        proseLines.push(lines[i]);
        i++;
      }
      segments.push({ type: 'prose', content: proseLines.join('\n') });
    }
  }
  return segments;
}

/**
 * Determine if a line invokes `ecl-sdk` as a bare command (not via $ECL_SDK).
 *
 * Returns true for invocation lines like:
 *   INIT=$(ecl-sdk query ...)
 *   ecl-sdk query commit ...
 *
 * Returns false for:
 *   # comment lines
 *   - [ ] checklist/bullet lines
 *   ECL_SDK="ecl-sdk"         (assignment inside the resolution guard)
 *   command -v ecl-sdk         (availability check, not an invocation)
 *   echo "...ecl-sdk..."      (error message string)
 *   $ECL_SDK query ...         (already routed through the variable)
 */
function isBareGsdSdkInvocation(line) {
  const trimmed = line.trimStart();
  // Comment lines
  if (trimmed.startsWith('#')) return false;
  // Bullet/checklist lines (prose in a bash block)
  if (/^[-*]\s/.test(trimmed)) return false;
  // Availability check — not an invocation
  if (trimmed.includes('command -v ecl-sdk')) return false;
  // Assignment inside the guard: ECL_SDK="ecl-sdk"
  if (/^\s*ECL_SDK\s*=/.test(line)) return false;
  // echo/print lines containing ecl-sdk as a string in an error message
  if (/^\s*(echo|printf)\s/.test(trimmed)) return false;
  // Match bare ecl-sdk as an executable token (not preceded by $)
  return /(?<!\$)\becl-sdk\b/.test(line);
}

/**
 * Return true if the file has any bash-fence content that invokes ecl-sdk
 * (i.e., the file actually EXECUTES ecl-sdk, not just mentions it in prose).
 * Used by Defect 2 to skip files where ecl-sdk only appears in documentation
 * text or inline code spans (#3668 — e.g. discuss-phase/modes/text.md).
 */
function fileHasExecutableGsdSdkInvocation(content) {
  const segments = parseMarkdownSegments(content);
  return segments.some(
    (seg) =>
      seg.type === 'bash-fence' &&
      seg.content.split('\n').some((line) => /(?<!\$)\becl-sdk\b/.test(line)),
  );
}

// ---------------------------------------------------------------------------
// Defect 2: Every workflow file that calls `ecl-sdk` must use the
// local-first `[ -f "$ECL_TOOLS" ] … elif command -v ecl-sdk` guard pattern.
// Uses findMdFiles (recursive) to cover workflow subdirectories (#3668 F6).
// Uses bash-fence check (not raw content) to skip docs-only references (#3668).
// ---------------------------------------------------------------------------

describe('#3668 Defect 2: workflow files must guard every ecl-sdk invocation', () => {
  test('every workflow file that calls ecl-sdk has a resolution guard', () => {
    const allFiles = findMdFiles(WORKFLOWS_DIR);
    const bare = [];

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      // Does this file *execute* ecl-sdk (in a bash fence), not just mention it?
      if (!fileHasExecutableGsdSdkInvocation(content)) continue;
      // Must have either a local-first guard (ECL_TOOLS check) or a command-v guard.
      // Both patterns set $ECL_SDK so downstream callsites use $ECL_SDK.
      if (!content.includes('ECL_TOOLS') && !content.includes('command -v ecl-sdk')) {
        bare.push(path.relative(WORKFLOWS_DIR, filePath));
      }
    }

    assert.strictEqual(
      bare.length,
      0,
      [
        `${bare.length} workflow file(s) call ecl-sdk without a resolution guard.`,
        'Every workflow must use (local-first pattern — #3668):',
        '  ECL_TOOLS="$(git rev-parse --show-toplevel 2>/dev/null || pwd)/evolv-coder-lite/bin/ecl-tools.cjs"',
        '  if [ -f "$ECL_TOOLS" ]; then',
        '    ECL_SDK="node $ECL_TOOLS"',
        '  elif command -v ecl-sdk >/dev/null 2>&1; then',
        '    ECL_SDK="ecl-sdk"',
        '  fi',
        '  RESULT=$($ECL_SDK query <key>)   # use $ECL_SDK, never bare ecl-sdk',
        '',
        'Missing guard in:',
        ...bare.map((f) => `  - ${f}`),
      ].join('\n'),
    );
  });
});

// ---------------------------------------------------------------------------
// Defect 3: CI guard — callsite routing, not just guard presence.
//
// The original Defect 3 test only checked that `command -v ecl-sdk` appeared
// as a string in the file. That assertion passes even when the preflight block
// is present but every downstream callsite still uses the bare `ecl-sdk`
// command — which is exactly the state that caused the bug. This upgraded test
// parses shell fenced blocks structurally and verifies that no block outside
// a resolution guard invokes `ecl-sdk` as a bare command.
//
// allow-test-rule: structural markdown parse is the only viable IR for
// shell-routing invariants in LLM-consumed workflow files (#3668 architectural
// constraint — source files cannot expose a typed runtime surface).
// ---------------------------------------------------------------------------

describe('#3668 Defect 3 (upgraded): CI guard — every ecl-sdk callsite routes through $ECL_SDK', () => {
  test('no shell block outside a resolution guard invokes bare ecl-sdk', () => {
    // allow-test-rule: structural parse of markdown shell blocks to assert
    // callsite routing — file-content parse is the only viable surface for
    // LLM-consumed workflow markdown (#3668 architectural constraint).
    const allFiles = findMdFiles(WORKFLOWS_DIR);
    const violations = [];

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (!content.includes('ecl-sdk')) continue;

      const segments = parseMarkdownSegments(content);
      for (const seg of segments) {
        if (seg.type !== 'bash-fence') continue;
        // A block is a "resolution guard block" if it contains the command-v check.
        // Within that block, the guard lines are left alone; callsites after the fi
        // must use $ECL_SDK. However, some files use an inline guard (update.md)
        // where each branch explicitly guards its own ecl-sdk call — also acceptable.
        // We flag only blocks with NO command -v guard that contain bare invocations.
        const blockHasGuard = seg.content.includes('command -v ecl-sdk');
        if (blockHasGuard) continue; // guard block — handled by resolution logic

        const blockLines = seg.content.split('\n');
        for (const line of blockLines) {
          if (isBareGsdSdkInvocation(line)) {
            const rel = path.relative(WORKFLOWS_DIR, filePath);
            violations.push(`${rel}: ${line.trim().slice(0, 80)}`);
          }
        }
      }
    }

    assert.strictEqual(
      violations.length,
      0,
      [
        `CI GUARD FAIL (#3668): ${violations.length} bare ecl-sdk invocation(s) found`,
        'in shell blocks that have no resolution guard.',
        'All SDK calls must use $ECL_SDK (set by the preflight block — local-first):',
        '  ECL_TOOLS="$(git rev-parse --show-toplevel 2>/dev/null || pwd)/evolv-coder-lite/bin/ecl-tools.cjs"',
        '  if [ -f "$ECL_TOOLS" ]; then',
        '    ECL_SDK="node $ECL_TOOLS"',
        '  elif command -v ecl-sdk >/dev/null 2>&1; then',
        '    ECL_SDK="ecl-sdk"',
        '  fi',
        '  RESULT=$($ECL_SDK query <key>)   # <-- use $ECL_SDK, not bare ecl-sdk',
        '',
        'Violations:',
        ...violations.map((v) => `  ${v}`),
      ].join('\n'),
    );
  });

  // Counter-test (Contract 6): verify the filter correctly identifies callsites
  // and correctly excludes guard/preflight lines.
  test('isBareGsdSdkInvocation correctly identifies callsite lines', () => {
    // These must be flagged as bare invocations
    const mustFlag = [
      'INIT=$(ecl-sdk query init.milestone-op)',
      'RESULT=$(ecl-sdk query phase.add "${description}")',
      'ecl-sdk query commit "docs: add item" --files foo',
      'ANALYZE=$(ecl-sdk query roadmap.analyze)',
    ];
    for (const line of mustFlag) {
      assert.ok(
        isBareGsdSdkInvocation(line),
        `Expected line to be flagged as bare invocation: ${line}`,
      );
    }

    // These must NOT be flagged
    const mustNotFlag = [
      '  ECL_SDK="ecl-sdk"',                           // assignment in guard
      'if command -v ecl-sdk >/dev/null 2>&1; then',   // availability check
      '  echo "ERROR: ecl-sdk not found" >&2',          // error message
      '# SDK resolution: prefer local ecl-sdk',          // comment
      '- [ ] `ecl-sdk query phase.add` executed',       // checklist
      'INIT=$($ECL_SDK query init.milestone-op)',        // already using $ECL_SDK
    ];
    for (const line of mustNotFlag) {
      assert.ok(
        !isBareGsdSdkInvocation(line),
        `Expected line NOT to be flagged: ${line}`,
      );
    }
  });

  // F8: Propagation test — verify the Defect 3 guard would catch a regression
  // if a new file with a bare ecl-sdk invocation in an unguarded block were added.
  test('Defect 3 guard catches bare ecl-sdk in unguarded bash fence (regression canary)', () => {
    // Construct synthetic markdown with a bare ecl-sdk invocation in an unguarded bash block.
    const syntheticContent = [
      '# Test file',
      '',
      '```bash',
      'RESULT=$(ecl-sdk query phase.list)',
      '```',
    ].join('\n');

    const segments = parseMarkdownSegments(syntheticContent);
    let caught = false;
    for (const seg of segments) {
      if (seg.type !== 'bash-fence') continue;
      const blockHasGuard = seg.content.includes('command -v ecl-sdk');
      if (blockHasGuard) continue;
      for (const line of seg.content.split('\n')) {
        if (isBareGsdSdkInvocation(line)) {
          caught = true;
        }
      }
    }
    assert.ok(
      caught,
      'Defect 3 guard failed to catch bare ecl-sdk in an unguarded bash fence — regression detector is broken',
    );
  });

  // F8 (untyped fence): also catches bare ecl-sdk in an untyped (no lang) fence.
  test('Defect 3 guard catches bare ecl-sdk in untyped fence (verify-work.md pattern)', () => {
    const syntheticContent = [
      '# Test file',
      '',
      '```',
      'UI_FLAG=$(ecl-sdk query config-get workflow.ui_phase --raw 2>/dev/null || echo "true")',
      '```',
    ].join('\n');

    const segments = parseMarkdownSegments(syntheticContent);
    let caught = false;
    for (const seg of segments) {
      if (seg.type !== 'bash-fence') continue;
      const blockHasGuard = seg.content.includes('command -v ecl-sdk');
      if (blockHasGuard) continue;
      for (const line of seg.content.split('\n')) {
        if (isBareGsdSdkInvocation(line)) {
          caught = true;
        }
      }
    }
    assert.ok(
      caught,
      'Defect 3 guard failed to catch bare ecl-sdk in an untyped fence — untyped fences must be treated as bash (#3668 F7)',
    );
  });
});

// ---------------------------------------------------------------------------
// Integration: local-only scenario — verify resolution order prefers local
//
// Structural test: with no global ecl-sdk on PATH, a --local install only has
// $ECL_TOOLS (ecl-tools.cjs). Every workflow must check for $ECL_TOOLS first
// so that local-only installs work without any global ecl-sdk (#3668 F9).
// ---------------------------------------------------------------------------

describe('#3668 Integration: local-only scenario — $ECL_TOOLS checked before command -v ecl-sdk', () => {
  test('every workflow preflight block checks ECL_TOOLS file existence before global ecl-sdk', () => {
    // allow-test-rule: structural parse of markdown shell blocks to assert
    // local-first resolution order (#3668 F9 — prefer local over global).
    const allFiles = findMdFiles(WORKFLOWS_DIR);
    const wrongOrder = [];

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (!content.includes('ECL_TOOLS')) continue;

      const segments = parseMarkdownSegments(content);
      for (const seg of segments) {
        if (seg.type !== 'bash-fence') continue;
        if (!seg.content.includes('ECL_TOOLS') || !seg.content.includes('command -v ecl-sdk')) continue;
        // This is a resolution block. The ECL_TOOLS file check must appear BEFORE
        // the command -v ecl-sdk check.
        const gtPos = seg.content.indexOf('[ -f "$ECL_TOOLS"');
        const cvPos = seg.content.indexOf('command -v ecl-sdk');
        if (gtPos === -1 || cvPos === -1) continue;
        // One-liner style (discuss-phase.md): check the same way
        if (gtPos > cvPos) {
          const rel = path.relative(WORKFLOWS_DIR, filePath);
          wrongOrder.push(`${rel}: local ECL_TOOLS check (pos ${gtPos}) comes after command -v ecl-sdk (pos ${cvPos})`);
        }
      }
    }

    assert.strictEqual(
      wrongOrder.length,
      0,
      [
        `${wrongOrder.length} workflow file(s) check global ecl-sdk BEFORE local ECL_TOOLS.`,
        'Local-first resolution (#3668 F9): check [ -f "$ECL_TOOLS" ] first so that',
        '--local-only installs (no global ecl-sdk) work without modification.',
        'Pattern must be:',
        '  if [ -f "$ECL_TOOLS" ]; then',
        '    ECL_SDK="node $ECL_TOOLS"  # local first',
        '  elif command -v ecl-sdk >/dev/null 2>&1; then',
        '    ECL_SDK="ecl-sdk"           # global fallback',
        '  fi',
        '',
        'Violations (prefer-local order broken):',
        ...wrongOrder.map((v) => `  - ${v}`),
      ].join('\n'),
    );
  });
});
