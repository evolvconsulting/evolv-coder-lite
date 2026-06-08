// allow-test-rule: source-text-is-the-product
// Runtime prompt/hook files are deployed verbatim — their text IS what the
// runtime loads and executes. Asserting that text carries no retired `ecl-sdk`
// reference tests the deployed contract, which no behavioral seam can observe
// (there is no runtime API that enumerates "did any shipped prompt name the
// removed SDK binary").

/**
 * Regression guard: no `ecl-sdk` references in runtime-facing surfaces (#339).
 *
 * The `@evolvconsulting/ecl-sdk` package and its `ecl-sdk` binary were retired (ADR 0174,
 * #191). The bulk runtime cleanup is already done — this test locks it in so a
 * `ecl-sdk` / `ECL_SDK` reference cannot creep back into a shipped prompt or hook
 * and re-introduce drift between the documented surface and the supported
 * `ecl-tools` binary.
 *
 * Scope: runtime surfaces only — the prompts and hooks the installer ships into
 * a user's runtime config dir. Explicitly NOT covered here:
 *   - `bin/install.js` — installer code, not a runtime-deployed prompt/hook
 *     surface. (It carries zero `ecl-sdk` references today; the SDK-shim
 *     verification subsystem was removed in #515 and the shim retired in #522.)
 *   - `evolv-coder-lite/bin/` — executable library code, not deployed prompt text; it
 *     may legitimately reference the SDK retirement in comments.
 *   - `tests/`, `docs/`, `.changeset/`, CI/lint scripts — legitimately reference
 *     the SDK retirement as history or detect its stale artifacts.
 *
 * Complements `tests/ecl-tools-path-refs.test.cjs`, which only catches the
 * `ecl-sdk query` binary-invocation form; this catches ANY runtime reference.
 */

'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..');

// Runtime surfaces the installer ships. Each entry is { dir, exts } — dir is
// repo-relative, exts is the set of file extensions whose text is deployed.
const RUNTIME_SURFACES = [
  // .md prompts plus the non-.md runtime artifacts this dir also ships:
  // _runtime-launcher.snippet.sh (the canonical launcher synced into every hook
  // by scripts/sync-runtime-launcher.cjs) and discuss-phase/templates/*.json
  // (loaded at runtime by discuss-phase.md). Scanning only .md left these two
  // deployed files uncovered. (#691 review)
  { dir: path.join('evolv-coder-lite', 'workflows'), exts: ['.md', '.sh', '.json'] },
  { dir: path.join('evolv-coder-lite', 'references'), exts: ['.md'] },
  // Prompt surfaces the installer deep-copies and the runtime loads via
  // `@~/.claude/evolv-coder-lite/templates/*.md` anchors in workflows/commands; the
  // lone config.json under templates/ ships too. (#691 review)
  { dir: path.join('evolv-coder-lite', 'templates'), exts: ['.md', '.json'] },
  { dir: path.join('evolv-coder-lite', 'contexts'), exts: ['.md'] },
  { dir: path.join('commands', 'ecl'), exts: ['.md'] },
  { dir: 'agents', exts: ['.md'] },
  // Hooks ship as executable text (.js/.cjs/.sh). `hooks/dist/` is a gitignored
  // build artifact regenerated from these sources, so scanning the sources is
  // sufficient and avoids asserting against generated copies.
  { dir: 'hooks', exts: ['.js', '.cjs', '.sh'], skipDirs: ['dist'] },
];

// Matches every casing/separator variant of the retired SDK token:
// ecl-sdk, ecl_sdk, eCL-SDK, ECL_SDK, etc.
const SDK_REF = /ecl[-_]sdk/i;

/**
 * Recursively collect files under `absDir` whose extension is in `exts`,
 * skipping any directory name listed in `skipDirs`.
 */
function collectFiles(absDir, exts, skipDirs) {
  if (!fs.existsSync(absDir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (skipDirs.includes(entry.name)) continue;
      out.push(...collectFiles(path.join(absDir, entry.name), exts, skipDirs));
    } else if (entry.isFile() && exts.includes(path.extname(entry.name))) {
      out.push(path.join(absDir, entry.name));
    }
  }
  return out;
}

function rel(file) {
  return path.relative(REPO_ROOT, file).split(path.sep).join('/');
}

describe('#339 no ecl-sdk references in runtime surfaces', () => {
  test('shipped prompts and hooks carry no retired ecl-sdk reference', () => {
    const violations = [];

    for (const { dir, exts, skipDirs = [] } of RUNTIME_SURFACES) {
      const files = collectFiles(path.join(REPO_ROOT, dir), exts, skipDirs);
      for (const file of files) {
        const lines = fs.readFileSync(file, 'utf-8').split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          if (SDK_REF.test(lines[i])) {
            violations.push(`${rel(file)}:${i + 1}: ${lines[i].trim()}`);
          }
        }
      }
    }

    assert.strictEqual(
      violations.length,
      0,
      'Runtime surfaces must not reference the retired ecl-sdk binary/package — ' +
        'use ecl-tools instead.\nViolations:\n' + violations.join('\n')
    );
  });

  test('at least one file per configured extension is scanned (guards against an empty sweep)', () => {
    // A path typo, directory rename, or stale extension could silently make
    // collectFiles() return [] for part of a surface, turning the guard above
    // into a no-op that always passes. Checking per-surface isn't enough: for
    // evolv-coder-lite/workflows the .md files alone keep a per-surface count > 0, so
    // dropping .sh/.json would stop covering _runtime-launcher.snippet.sh and
    // discuss-phase/templates/*.json while the test stayed green. Assert each
    // configured extension actually resolves to scanned files. (#691 review)
    for (const { dir, exts, skipDirs = [] } of RUNTIME_SURFACES) {
      for (const ext of exts) {
        const count = collectFiles(path.join(REPO_ROOT, dir), [ext], skipDirs).length;
        assert.ok(
          count > 0,
          `Runtime surface "${dir}" resolved to 0 "${ext}" files — the path may ` +
            'have moved or the extension is stale; update RUNTIME_SURFACES so the ' +
            'guard keeps covering it.'
        );
      }
    }
  });
});
