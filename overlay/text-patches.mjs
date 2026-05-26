// overlay/text-patches.mjs
//
// Surgical post-bake string patches against files in src/.
//
// Use this for small, targeted corrections that don't fit the rebrand-map
// (which is global text rewriting) and don't justify a full whole-file
// overlay drop-in (which freezes the file across upstream syncs).
//
// Each patch declares a distinctive anchor (`find`) and the replacement.
// The anchor must match exactly once; mismatch or zero/multiple hits fails
// the bake loudly. That brittleness is intentional — it surfaces upstream
// drift the next time we sync, so we know to revisit the patch.
//
// Run by overlay/bake.mjs after the main upstream-transform pass and the
// overlay/files/** drop-ins, before the package.patch merge.
//
// Remove a patch entry once the equivalent fix lands upstream.

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const PATCHES = [
  {
    id: 'install-profiles-parse-calls-agents-prefix',
    file: 'evolv-coder-lite/bin/lib/install-profiles.cjs',
    issue: 'evolvconsulting/evolv-coder-lite#17',
    note: [
      'Upstream parseCallsAgents() uses a /\\bgsd-.../ regex literal to find',
      'agent references in skill bodies. The rebrand-map\'s id:gsd-dash rule',
      '(/\\bgsd-/) does not transform this literal because the preceding `\\b`',
      'puts a word character (b) directly before `gsd`, breaking the word',
      'boundary. Result: parseCallsAgents always returns [] in eCL, so any',
      'tiered profile (e.g. --profile=standard) resolves to zero agents and',
      'verifyInstalled() bails with "directory is empty". --profile=core and',
      '--profile=full bypass this codepath via separate fast paths in',
      'install.js, which is why only standard fails. Patch: rewrite the regex',
      'literal to use the eCL prefix. Drop this patch when upstream renames',
      'or the rebrand-map handles \\bgsd- inside regex literals.',
    ].join(' '),
    find: `  const matches = content.match(/\\bgsd-[a-z][a-z-]*/g);`,
    replace: `  const matches = content.match(/\\becl-[a-z][a-z-]*/g);`,
  },
  {
    id: 'feat-3594-parser-test-require-path',
    file: 'tests/feat-3594-parser-property-style.test.cjs',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    note: [
      'This upstream test file embeds a single \\x00 byte in a string literal',
      '(line 58 fixture: "null_byte: before\\x00after"). The bake\'s',
      'looksLikeText() rejects any file with a null byte in the first 8KB',
      'as binary, so the file is copied verbatim from upstream and the',
      'name:gsd:k rebrand-rule never sees it. The require path on line 24',
      'stays "../get-shit-done/bin/lib/frontmatter.cjs", which does not',
      'exist in src/. Patch: rewrite the require path to the eCL location.',
      'Drop this patch when the bake handles single-null source-code files',
      'directly or upstream removes the embedded null byte.',
    ].join(' '),
    find: `const { extractFrontmatter } = require('../get-shit-done/bin/lib/frontmatter.cjs');`,
    replace: `const { extractFrontmatter } = require('../evolv-coder-lite/bin/lib/frontmatter.cjs');`,
  },
  {
    id: 'enh-2792-namespace-skills-test-routing-regex-1',
    file: 'tests/enh-2792-namespace-skills.test.cjs',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    note: [
      'Upstream test asserts namespace-skill bodies route to gsd-* targets',
      'using a regex literal /\\bgsd-[a-z-]+/i. The id:gsd-dash rebrand-rule',
      '(/\\bgsd-/) does not transform this literal because the preceding `\\b`',
      'puts a word character (b) directly before `gsd`, breaking the word',
      'boundary. Patch: rewrite the regex literal to ecl-. Drop this patch',
      'when upstream renames or rebrand-map handles \\bgsd- inside literals.',
    ].join(' '),
    find: `      const hasInvoke = /\\bgsd-[a-z-]+/i.test(fm._body);`,
    replace: `      const hasInvoke = /\\becl-[a-z-]+/i.test(fm._body);`,
  },
  {
    id: 'enh-2792-namespace-skills-test-routing-regex-2',
    file: 'tests/enh-2792-namespace-skills.test.cjs',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    note: [
      'Same regex-literal blind spot as the routing regex above, applied',
      'to the cross-reference test that asserts every routed sub-skill exists.',
      'Pattern is /\\bgsd-[a-z][a-z0-9-]*/g, also untouched by id:gsd-dash.',
    ].join(' '),
    find: `        for (const m of cells[cells.length - 1].matchAll(/\\bgsd-[a-z][a-z0-9-]*/g)) {`,
    replace: `        for (const m of cells[cells.length - 1].matchAll(/\\becl-[a-z][a-z0-9-]*/g)) {`,
  },
  {
    id: 'bug-3668-test-bare-sdk-detector-regex-1',
    file: 'tests/bug-3668-local-install-sdk-soft-dep.test.cjs',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    note: [
      'The Defect 3 CI guard scans workflow shell fences for bare gsd-sdk',
      'invocations. Detector regex /(?<!\\$)\\bgsd-sdk\\b/ is a regex literal',
      'in the test, so the bin:sdk rebrand-rule (/\\bgsd-sdk\\b/) does not',
      'rewrite it. After the bake all workflows say ecl-sdk, so the detector',
      'never matches and 3 of the test\'s assertions fail. Patch the detector',
      'regex to look for ecl-sdk; behavior parity with upstream is preserved.',
    ].join(' '),
    find: `  return /(?<!\\$)\\bgsd-sdk\\b/.test(line);`,
    replace: `  return /(?<!\\$)\\becl-sdk\\b/.test(line);`,
  },
  {
    id: 'bug-3668-test-bare-sdk-detector-regex-2',
    file: 'tests/bug-3668-local-install-sdk-soft-dep.test.cjs',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    note: [
      'Companion to bug-3668-test-bare-sdk-detector-regex-1: the file-level',
      'short-circuit `fileHasExecutableGsdSdkInvocation` uses the same regex',
      'literal. Without rewriting both, the file scan exits early and the',
      'per-line guard never runs.',
    ].join(' '),
    find: `      seg.content.split('\\n').some((line) => /(?<!\\$)\\bgsd-sdk\\b/.test(line)),`,
    replace: `      seg.content.split('\\n').some((line) => /(?<!\\$)\\becl-sdk\\b/.test(line)),`,
  },
  {
    id: 'planner-decomposition-test-extracted-limit',
    file: 'tests/planner-decomposition.test.cjs',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    note: [
      'The PLANNER_EXTRACTED_LIMIT threshold proves the three planner mode',
      'sections were extracted to reference files. Upstream sets it at 48*1024',
      'when the file averages ~44K. eCL\'s rebranded ecl-planner.md is ~49K',
      'because Get Shit Done→evolv Coder Lite, get-shit-done→evolv-coder-lite,',
      'and gsd→ecl all add bytes per occurrence. Raise the threshold to 50K',
      'to absorb the rebrand expansion without changing the test\'s intent',
      '(catch a planner that has lost its mode-extraction discipline).',
    ].join(' '),
    find: `const PLANNER_EXTRACTED_LIMIT = 48 * 1024;  // 48K — proves extraction happened`,
    replace: `const PLANNER_EXTRACTED_LIMIT = 50 * 1024;  // 50K — proves extraction happened (eCL: +2K vs upstream 48K to absorb rebrand-expansion of the product name)`,
  },
  {
    id: 'skill-manifest-test-expected-order',
    file: 'tests/skill-manifest.test.cjs',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    note: [
      'Upstream test pins expected skill ordering as ["global-claude",',
      '"global-codex","gsd-help","legacy-import",...]. The list is sorted',
      'alphabetically by skillNames.sort(). After the bake, gsd-help becomes',
      'ecl-help, which sorts BEFORE global-* (lowercase e < g). The test\'s',
      'expected list still has the legacy position. Patch the expected list',
      'to match the post-rebrand alphabetical order.',
    ].join(' '),
    find: `    assert.deepStrictEqual(skillNames, [
      'global-claude',
      'global-codex',
      'ecl-help',
      'legacy-import',
      'project-agents',
      'project-claude',
      'project-codex',
    ]);`,
    replace: `    assert.deepStrictEqual(skillNames, [
      'ecl-help',
      'global-claude',
      'global-codex',
      'legacy-import',
      'project-agents',
      'project-claude',
      'project-codex',
    ]);`,
  },
  // Five patches below remove upstream's workflow-body smoke diagnostics
  // (WORKFLOW_BODY_COLON_LEAK + WORKFLOW_MISSING_SDK_FALLBACK + helpers + test F).
  // The detectors fire false-positives against rebranded eCL workflow bodies
  // and the informational counters add maintenance burden without value here.
  // Drop these five patches if upstream removes the diagnostics, or if eCL
  // adopts a parallel detector that handles the rebrand correctly.
  // The previous release-tarball-smoke-sdk-query-regex patch is subsumed by
  // patch #3 below (the SDK_QUERY definition is deleted along with its function).
  {
    id: 'release-tarball-smoke-strip-workflow-body-jsdoc',
    file: 'scripts/release-tarball-smoke.cjs',
    issue: 'evolvconsulting/evolv-coder-lite#release-tarball-smoke-prune',
    note: 'Drop the JSDoc paragraph that documents the workflow-body checks (lines 37–45 of upstream). The detectors themselves are removed by sibling patches.',
    find: ` *
 * Workflow-body checks (Cycle 3 — informational until #3668 is fixed):
 *   - Calls \`ecl-sdk "query" state.json --project-dir <fixtureDir>\` to verify
 *     the SDK binary is callable and produces parseable JSON (SDK_BINARY_NOT_CALLABLE).
 *   - Scans all installed evolv-coder-lite/workflows/*.md for:
 *     (a) /ecl:<known-cmd> colon-namespace leaks (WORKFLOW_BODY_COLON_LEAK)
 *     (b) bare \`ecl-sdk\` query invocations in shell fences without a \`command -v ecl-sdk\`
 *         guard in the same fence (WORKFLOW_MISSING_SDK_FALLBACK — #3668).
 *   Both checks populate result.details with counters but do NOT return a failure
 *   code by default; they are informational until the upstream fixes land.
 */`,
    replace: ` *
 * SDK binary check (Cycle 3):
 *   - Calls \`ecl-sdk "query" state.json --project-dir <fixtureDir>\` to verify
 *     the SDK binary is callable and produces parseable JSON (SDK_BINARY_NOT_CALLABLE).
 */`,
  },
  {
    id: 'release-tarball-smoke-strip-workflow-body-enum',
    file: 'scripts/release-tarball-smoke.cjs',
    issue: 'evolvconsulting/evolv-coder-lite#release-tarball-smoke-prune',
    note: 'Drop the two SMOKE result codes used only by the deleted workflow-body detectors.',
    find: `  // Cycle 3 codes
  SDK_BINARY_NOT_CALLABLE: 'sdk_binary_not_callable',
  WORKFLOW_BODY_COLON_LEAK: 'workflow_body_colon_leak',
  WORKFLOW_MISSING_SDK_FALLBACK: 'workflow_missing_sdk_fallback',
});`,
    replace: `  // Cycle 3 codes
  SDK_BINARY_NOT_CALLABLE: 'sdk_binary_not_callable',
});`,
  },
  {
    id: 'release-tarball-smoke-strip-workflow-body-helpers',
    file: 'scripts/release-tarball-smoke.cjs',
    issue: 'evolvconsulting/evolv-coder-lite#release-tarball-smoke-prune',
    note: 'Drop readInstalledCmdNames + scanWorkflowColonLeak + scanWorkflowMissingSdkFallback. The SDK_QUERY regex inside scanWorkflowMissingSdkFallback uses upstream gsd-sdk because the rebrand-map cannot transform gsd- after a regex \\b literal — the deletion takes the whole function and renders the prior release-tarball-smoke-sdk-query-regex patch unnecessary.',
    find: `/**
 * Read the list of known eCL command names from the installed package.
 * Returns an array of strings like \`['init', 'discuss-phase', ...]\`.
 */
function readInstalledCmdNames(pkg) {
  const commandsDir = path.join(pkg, 'commands', 'ecl');
  if (!fs.existsSync(commandsDir)) return [];
  return fs.readdirSync(commandsDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.slice(0, -3)); // strip .md
}

/**
 * Scan a single workflow .md file for /ecl:<cmd> colon-namespace leaks.
 *
 * Uses the word-boundary-safe regex shape from scripts/fix-slash-commands.cjs:
 *   /ecl-(<cmd1>|<cmd2>|...)(?=[^a-zA-Z0-9_-]|$)/g  — forward
 * We check the colon form: /ecl:<cmd> leaking in installed workflow bodies.
 *
 * Returns the first leaking { line, lineNumber } or null.
 */
function scanWorkflowColonLeak(filePath, cmdNames) {
  if (!cmdNames || cmdNames.length === 0) return null;
  const sorted = [...cmdNames].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(\`/ecl:(\${sorted.join('|')})(?=[^a-zA-Z0-9_-]|$)\`, 'g');

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\\r?\\n/);
  for (let i = 0; i < lines.length; i++) {
    pattern.lastIndex = 0;
    if (pattern.test(lines[i])) {
      return { line: i + 1, content: lines[i].trim() };
    }
  }
  return null;
}

/**
 * Scan a single workflow .md file for bare \`ecl-sdk\` query invocations inside
 * shell fences that lack a \`command -v ecl-sdk\` guard in the same fence.
 *
 * Structured check: walks lines, tracks open/close shell fences (\`\`\`bash /
 * \`\`\`sh / \`\`\` alone), collects \`ecl-sdk\` query lines and the fence's guard
 * state, then emits findings per-fence.
 *
 * Returns the first unguarded { line, lineNumber } or null.
 */
function scanWorkflowMissingSdkFallback(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\\r?\\n/);

  const FENCE_OPEN = /^\`\`\`(?:bash|sh)?\\s*$/;
  const FENCE_CLOSE = /^\`\`\`\\s*$/;
  const SDK_QUERY = /\\bgsd-sdk\\s+query\\b/;
  const COMMAND_V = /\\bcommand\\s+-v\\s+ecl-sdk\\b/;

  let inFence = false;
  let fenceHasGuard = false;
  let firstSdkQueryLineInFence = null;
  let firstSdkQueryLineNumInFence = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!inFence) {
      if (FENCE_OPEN.test(trimmed)) {
        inFence = true;
        fenceHasGuard = false;
        firstSdkQueryLineInFence = null;
        firstSdkQueryLineNumInFence = null;
      }
    } else {
      if (FENCE_CLOSE.test(trimmed)) {
        // Closing the fence — check if there were bare sdk query calls without a guard
        if (firstSdkQueryLineInFence !== null && !fenceHasGuard) {
          return { line: firstSdkQueryLineNumInFence, content: firstSdkQueryLineInFence.trim() };
        }
        inFence = false;
        fenceHasGuard = false;
        firstSdkQueryLineInFence = null;
        firstSdkQueryLineNumInFence = null;
      } else {
        if (COMMAND_V.test(line)) {
          fenceHasGuard = true;
        }
        if (SDK_QUERY.test(line) && firstSdkQueryLineInFence === null) {
          firstSdkQueryLineInFence = line;
          firstSdkQueryLineNumInFence = i + 1;
        }
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Pure function: runSmoke
// ---------------------------------------------------------------------------`,
    replace: `// ---------------------------------------------------------------------------
// Pure function: runSmoke
// ---------------------------------------------------------------------------`,
  },
  {
    id: 'release-tarball-smoke-strip-workflow-body-invocation',
    file: 'scripts/release-tarball-smoke.cjs',
    issue: 'evolvconsulting/evolv-coder-lite#release-tarball-smoke-prune',
    note: 'Drop the workflow-body scan block inside runSmoke and update the section header comment.',
    find: `  // ─────────────────────────────────────────────────────────────────────────
  // Cycle 3: SDK binary callable + workflow-body validation (informational)
  // ─────────────────────────────────────────────────────────────────────────

  // --- Verify \`ecl-sdk\` query is callable and returns parseable JSON -------`,
    replace: `  // ─────────────────────────────────────────────────────────────────────────
  // Cycle 3: SDK binary callable
  // ─────────────────────────────────────────────────────────────────────────

  // --- Verify \`ecl-sdk\` query is callable and returns parseable JSON -------`,
  },
  {
    id: 'release-tarball-smoke-strip-workflow-body-runner',
    file: 'scripts/release-tarball-smoke.cjs',
    issue: 'evolvconsulting/evolv-coder-lite#release-tarball-smoke-prune',
    note: 'Drop the workflow-body invocation block at the end of runSmoke (everything between the sdkQueryParsed assignment and the final return).',
    find: `  details.sdkQueryResult = sdkQueryResult.stdout;
  details.sdkQueryParsed = true;

  // --- Workflow-body checks (informational — #3668 not yet fixed) ----------
  const workflowsDir = path.join(pkg, 'evolv-coder-lite', 'workflows');
  const installedCmdNames = readInstalledCmdNames(pkg);

  let workflowsScanned = 0;
  let colonLeakCount = 0;
  let missingFallbackCount = 0;
  // Store first finding per check type (for future enforcement mode)
  let firstColonLeak = null;
  let firstMissingFallback = null;

  if (fs.existsSync(workflowsDir)) {
    // Collect all .md files (flat only — subdirs contain sub-workflows that
    // follow the same contract, but the top-level .md files are the primary surface)
    const entries = fs.readdirSync(workflowsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const filePath = path.join(workflowsDir, entry.name);
      workflowsScanned++;

      const leak = scanWorkflowColonLeak(filePath, installedCmdNames);
      if (leak) {
        colonLeakCount++;
        if (!firstColonLeak) {
          firstColonLeak = { file: filePath, line: leak.line };
        }
      }

      const missingFallback = scanWorkflowMissingSdkFallback(filePath);
      if (missingFallback) {
        missingFallbackCount++;
        if (!firstMissingFallback) {
          firstMissingFallback = { file: filePath, line: missingFallback.line };
        }
      }
    }
  }

  details.workflowsScanned = workflowsScanned;
  details.colonLeakCount = colonLeakCount;
  details.missingFallbackCount = missingFallbackCount;
  if (firstColonLeak) details.firstColonLeak = firstColonLeak;
  if (firstMissingFallback) details.firstMissingFallback = firstMissingFallback;

  // NOTE: colonLeakCount and missingFallbackCount are informational here.
  // They will be non-zero against current main per #3668 and the /ecl: leak
  // backlog. Once those issues are fixed, a future enforcement mode can be
  // enabled (e.g. SMOKE_ENFORCE_WORKFLOW_BODY=1) to fail here.

  return { code: SMOKE.OK, details };`,
    replace: `  details.sdkQueryResult = sdkQueryResult.stdout;
  details.sdkQueryParsed = true;

  return { code: SMOKE.OK, details };`,
  },
  {
    id: 'release-tarball-smoke-strip-workflow-body-test-f',
    file: 'tests/release-tarball-smoke.install.test.cjs',
    issue: 'evolvconsulting/evolv-coder-lite#release-tarball-smoke-prune',
    note: 'Remove Test F which exercises the deleted workflow-body scanning machinery (workflowsScanned / colonLeakCount / missingFallbackCount).',
    find: `
  // ── Test F — workflow-body checks run (informational) ─────────────────────
  // Asserts that the workflow-body scanning machinery ran (structural assertion).
  // Does NOT assert colonLeakCount or missingFallbackCount are zero — they will
  // be non-zero against current main per #3668 and the /ecl: leak backlog.
  // When those issues are fixed, this test continues to pass unchanged.
  test('F: workflow-body checks run — scan counts are present integers', () => {
    const result = runSmoke({
      tarballPath,
      installPrefix,
      expectedVersion: pkg.version,
      fixtureDir,
      lifecycleCommands: [],
      npmEnv: isolatedNpmEnv(),
    });

    // Structural: the scan ran and populated the counters
    assert.ok(
      Number.isInteger(result.details.workflowsScanned) && result.details.workflowsScanned >= 1,
      \`expected workflowsScanned >= 1, got \${result.details.workflowsScanned}\`,
    );
    assert.ok(
      Number.isInteger(result.details.colonLeakCount),
      \`expected colonLeakCount to be an integer, got \${result.details.colonLeakCount}\`,
    );
    assert.ok(
      Number.isInteger(result.details.missingFallbackCount),
      \`expected missingFallbackCount to be an integer, got \${result.details.missingFallbackCount}\`,
    );
  });
});`,
    replace: `
});`,
  },
  {
    id: 'bug-2801-ingest-docs-handler-regex-literal',
    file: 'tests/bug-2801-ingest-docs-handler.test.cjs',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    note: [
      'Test scans candidate workflow lines for bare gsd-sdk invocations using',
      '/\\bgsd-sdk\\b/. The bin:sdk rebrand-rule cannot rewrite this literal',
      'because the preceding `\\b` (the regex assertion) ends in a word char',
      '(`b`) and `gsd` starts with a word char (`g`), so there is no word',
      'boundary between them. After rebrand, eCL workflows say ecl-sdk, so',
      'the test\'s filter returns an empty match-set and the assertion passes',
      'vacuously. Patch the literal to ecl-sdk so the test scans for the right',
      'token. Drop this patch when rebrand-map handles `\\bgsd-` after a regex',
      '`\\b` literal.',
    ].join(' '),
    find: `      .filter((line) => /\\bgsd-sdk\\b/.test(line));`,
    replace: `      .filter((line) => /\\becl-sdk\\b/.test(line));`,
  },
  {
    id: 'bug-2808-skill-hyphen-name-colon-regex-literal-1',
    file: 'tests/bug-2808-skill-hyphen-name.test.cjs',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    note: [
      'Test scans skill bodies for legacy colon-form command references using',
      '/\\bgsd:[a-z][a-z0-9-]*\\b/. The cmd:colon rebrand-rule (/\\/gsd:/) only',
      'matches when preceded by `/` so the standalone literal `\\bgsd:` slips',
      'through. After rebrand, eCL emits ecl: forms, so the test\'s scan',
      'returns 0 matches and the assertion passes vacuously. Patch to ecl:.',
    ].join(' '),
    find: `      const colonRefs = (bodyContent.match(/\\bgsd:[a-z][a-z0-9-]*\\b/g) || [])`,
    replace: `      const colonRefs = (bodyContent.match(/\\becl:[a-z][a-z0-9-]*\\b/g) || [])`,
  },
  {
    id: 'bug-2808-skill-hyphen-name-colon-regex-literal-2',
    file: 'tests/bug-2808-skill-hyphen-name.test.cjs',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    note: [
      'Companion to bug-2808-skill-hyphen-name-colon-regex-literal-1 — second',
      'colon-regex literal in the same test file. Same blind spot, same fix.',
    ].join(' '),
    find: `    assert.ok(!out.match(/\\bgsd:[a-z]/), 'no colon-form command reference may survive');`,
    replace: `    assert.ok(!out.match(/\\becl:[a-z]/), 'no colon-form command reference may survive');`,
  },
  {
    id: 'workflow-agent-skills-consistency-regex-literal',
    file: 'sdk/src/workflow-agent-skills-consistency.test.ts',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    note: [
      'SDK consistency test extracts agent-skills query keys from workflow',
      'shell fences using /\\bgsd-sdk\\s+query\\s+agent-skills\\s+([a-z]...)/g.',
      'Same `\\bgsd-` blind spot as the other regex literals — the bin:sdk',
      'rule cannot match because the preceding `\\b` literal puts a word',
      'character before `gsd`. After rebrand, eCL workflows say ecl-sdk, so',
      'the extractor finds zero keys and parity assertions pass vacuously.',
      'Patch to ecl-sdk.',
    ].join(' '),
    find: `const QUERY_KEY_PATTERN = /\\bgsd-sdk\\s+query\\s+agent-skills\\s+([a-z][a-z0-9-]*)\\b/g;`,
    replace: `const QUERY_KEY_PATTERN = /\\becl-sdk\\s+query\\s+agent-skills\\s+([a-z][a-z0-9-]*)\\b/g;`,
  },
  {
    id: 'readme-en-rebrand-preamble',
    file: 'README.md',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    note: [
      'Upstream README opens with a 29-line "trek-e, fork maintainer" notice',
      'announcing trek-e\'s GSD-Redux fork from gsd-build/get-shit-done. That',
      'announcement is upstream-specific and does not apply to eCL — eCL IS',
      'the Evolv Consulting rebrand of @opengsd/get-shit-done-redux, not a',
      'separate fork. Replace the preamble with a brief, factual eCL notice',
      'so the npm README accurately presents the package. Drop this patch',
      'when upstream removes its preamble or eCL switches to a whole-file',
      'overlay for README.md.',
    ].join(' '),
    find: `> # ⚠️ This is the active fork
>
> 📢 **Read the announcement: [why the fork, what changed, what's next →](https://github.com/ecl-redux/evolv-coder-lite/discussions/109)**
>
> The original repo at [evolvconsulting/evolv-coder-lite](https://github.com/evolvconsulting/evolv-coder-lite) appears compromised or abandoned. The maintainer (evolv Consulting) has not been reachable since **2026-04-01**. evolv Consulting social accounts appear deleted, and a **\`$eCL\` token associated with the project has been linked publicly to a rug-pull**.
>
> I have **no inside information** beyond what is publicly visible. I am stating absence-of-information deliberately — absence of news is not the same as evidence.
>
> ### What I can confirm
>
> - No contact with the original maintainer since 2026-04-01.
> - evolv Consulting social accounts appear deleted or unreachable.
> - The \`$eCL\` token has been linked publicly to a rug-pull.
> - The repo at \`evolvconsulting/evolv-coder-lite\` continues to exist but I cannot vouch for any changes pushed there from this point forward.
>
> ### What changed
>
> | | Before | After |
> |---|---|---|
> | GitHub | \`evolvconsulting/evolv-coder-lite\` | \`evolvconsulting/evolv-coder-lite\` |
> | npm (main) | \`evolv-coder-lite-cc\` → \`evolv-coder-lite\` | \`@evolvconsulting/evolv-coder-lite\` |
> | npm (sdk) | \`@evolvconsulting/sdk\` → \`@ecl-redux/sdk\` | \`@evolvconsulting/ecl-sdk\` |
> | Issue numbers | per source | renumbered; original is in body as \`[from evolvconsulting/evolv-coder-lite#N]\` |
>
> If you can reach the original maintainer, please open an issue here and CC them. If you have technical evidence that materially changes the picture above, please share it in an issue.
>
> — trek-e, fork maintainer
>
> ---

<div align="center">`,
    replace: `> # evolv Coder Lite (eCL)
>
> eCL is the [evolv Consulting](https://evolvconsulting.com) rebrand of the upstream [\`@opengsd/get-shit-done-redux\`](https://github.com/open-gsd/get-shit-done-redux) project. Functionality, contracts, and command surface track upstream releases; identifiers, package names, and command prefixes are renamed to the \`ecl-*\` / \`@evolvconsulting/*\` namespace.
>
> Issues, support, and roadmap for the eCL distribution: [evolvconsulting/evolv-coder-lite](https://github.com/evolvconsulting/evolv-coder-lite/issues).

<div align="center">`,
  },
  {
    id: 'readme-translation-preamble-ja',
    file: 'README.ja-JP.md',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    note: 'Drop the upstream "active fork" pointer from translations; eCL is a rebrand, not a fork.',
    find: `> ⚠️ This is an active fork. See the [English README](README.md) for the full notice about the original repo.

<div align="center">`,
    replace: `> evolv Coder Lite (eCL) is the evolv Consulting rebrand of the upstream \`@opengsd/get-shit-done-redux\` project. See the [English README](README.md) for details.

<div align="center">`,
  },
  {
    id: 'readme-translation-preamble-ko',
    file: 'README.ko-KR.md',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    note: 'Drop the upstream "active fork" pointer from translations; eCL is a rebrand, not a fork.',
    find: `> ⚠️ This is an active fork. See the [English README](README.md) for the full notice about the original repo.

<div align="center">`,
    replace: `> evolv Coder Lite (eCL) is the evolv Consulting rebrand of the upstream \`@opengsd/get-shit-done-redux\` project. See the [English README](README.md) for details.

<div align="center">`,
  },
  {
    id: 'readme-translation-preamble-pt',
    file: 'README.pt-BR.md',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    note: 'Drop the upstream "active fork" pointer from translations; eCL is a rebrand, not a fork.',
    find: `> ⚠️ This is an active fork. See the [English README](README.md) for the full notice about the original repo.

<div align="center">`,
    replace: `> evolv Coder Lite (eCL) is the evolv Consulting rebrand of the upstream \`@opengsd/get-shit-done-redux\` project. See the [English README](README.md) for details.

<div align="center">`,
  },
  {
    id: 'readme-translation-preamble-zh',
    file: 'README.zh-CN.md',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    note: 'Drop the upstream "active fork" pointer from translations; eCL is a rebrand, not a fork.',
    find: `> ⚠️ This is an active fork. See the [English README](README.md) for the full notice about the original repo.

<div align="center">`,
    replace: `> evolv Coder Lite (eCL) is the evolv Consulting rebrand of the upstream \`@opengsd/get-shit-done-redux\` project. See the [English README](README.md) for details.

<div align="center">`,
  },
  {
    id: 'install-uninstall-removes-install-state',
    file: 'bin/install.js',
    issue: 'evolvconsulting/evolv-coder-lite#12',
    note: [
      'Upstream uninstall removes ecl-file-manifest.json but leaves',
      'ecl-install-state.json behind. Mirror the manifest removal block',
      'for the install-state file. Drop this patch when upstream fixes it.',
    ].join(' '),
    find: `  // Remove the file manifest that the installer wrote at install time.
  // Without this step the metadata file persists after uninstall (#1908).
  const manifestPath = path.join(targetDir, MANIFEST_NAME);
  if (fs.existsSync(manifestPath)) {
    fs.rmSync(manifestPath, { force: true });
    removedCount++;
    console.log(\`  \${green}✓\${reset} Removed \${MANIFEST_NAME}\`);
  }
`,
    replace: `  // Remove the file manifest that the installer wrote at install time.
  // Without this step the metadata file persists after uninstall (#1908).
  const manifestPath = path.join(targetDir, MANIFEST_NAME);
  if (fs.existsSync(manifestPath)) {
    fs.rmSync(manifestPath, { force: true });
    removedCount++;
    console.log(\`  \${green}✓\${reset} Removed \${MANIFEST_NAME}\`);
  }

  // Remove the installer-migration state file that lib/installer-migrations.cjs
  // writes at install time. Sibling of the manifest above; same lifecycle.
  // Without this step the metadata file persists after uninstall — mirrors the
  // upstream rollback contract pinned by installer-migration-install-integration.test.cjs.
  // Patched in by overlay/text-patches.mjs (eCL #12). Remove once upstream
  // lands an equivalent block.
  const installStatePath = path.join(targetDir, 'ecl-install-state.json');
  if (fs.existsSync(installStatePath)) {
    fs.rmSync(installStatePath, { force: true });
    removedCount++;
    console.log(\`  \${green}✓\${reset} Removed ecl-install-state.json\`);
  }
`,
  },
  {
    id: 'readme-en-ci-badge',
    file: 'README.md',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    note: [
      'Upstream README points the workflow-status badge at test.yml / "Tests".',
      'eCL renamed the workflow file to ci.yml and the badge label to "CI" to',
      'reflect that the workflow gates more than tests (lint, format, smoke,',
      'release-tarball checks). The rebrand-map does not rewrite filenames in',
      'badge URLs, so this swap lives here. Drop this patch when upstream',
      'renames their workflow to ci.yml or eCL switches to a whole-file overlay',
      'for README.md.',
    ].join(' '),
    find: `[![Tests](https://img.shields.io/github/actions/workflow/status/evolvconsulting/evolv-coder-lite/test.yml?branch=main&style=for-the-badge&logo=github&label=Tests)](https://github.com/evolvconsulting/evolv-coder-lite/actions/workflows/test.yml)`,
    replace: `[![CI](https://img.shields.io/github/actions/workflow/status/evolvconsulting/evolv-coder-lite/ci.yml?branch=main&style=for-the-badge&logo=github&label=CI)](https://github.com/evolvconsulting/evolv-coder-lite/actions/workflows/ci.yml)`,
  },
  {
    id: 'readme-ja-ci-badge',
    file: 'README.ja-JP.md',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    note: 'Same workflow rename as readme-en-ci-badge, applied to the Japanese translation.',
    find: `[![Tests](https://img.shields.io/github/actions/workflow/status/evolvconsulting/evolv-coder-lite/test.yml?branch=main&style=for-the-badge&logo=github&label=Tests)](https://github.com/evolvconsulting/evolv-coder-lite/actions/workflows/test.yml)`,
    replace: `[![CI](https://img.shields.io/github/actions/workflow/status/evolvconsulting/evolv-coder-lite/ci.yml?branch=main&style=for-the-badge&logo=github&label=CI)](https://github.com/evolvconsulting/evolv-coder-lite/actions/workflows/ci.yml)`,
  },
  {
    id: 'readme-ko-ci-badge',
    file: 'README.ko-KR.md',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    note: 'Same workflow rename as readme-en-ci-badge, applied to the Korean translation.',
    find: `[![Tests](https://img.shields.io/github/actions/workflow/status/evolvconsulting/evolv-coder-lite/test.yml?branch=main&style=for-the-badge&logo=github&label=Tests)](https://github.com/evolvconsulting/evolv-coder-lite/actions/workflows/test.yml)`,
    replace: `[![CI](https://img.shields.io/github/actions/workflow/status/evolvconsulting/evolv-coder-lite/ci.yml?branch=main&style=for-the-badge&logo=github&label=CI)](https://github.com/evolvconsulting/evolv-coder-lite/actions/workflows/ci.yml)`,
  },
  {
    id: 'readme-pt-ci-badge',
    file: 'README.pt-BR.md',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    note: 'Same workflow rename as readme-en-ci-badge, applied to the Portuguese translation.',
    find: `[![Tests](https://img.shields.io/github/actions/workflow/status/evolvconsulting/evolv-coder-lite/test.yml?branch=main&style=for-the-badge&logo=github&label=Tests)](https://github.com/evolvconsulting/evolv-coder-lite/actions/workflows/test.yml)`,
    replace: `[![CI](https://img.shields.io/github/actions/workflow/status/evolvconsulting/evolv-coder-lite/ci.yml?branch=main&style=for-the-badge&logo=github&label=CI)](https://github.com/evolvconsulting/evolv-coder-lite/actions/workflows/ci.yml)`,
  },
  {
    id: 'readme-zh-ci-badge',
    file: 'README.zh-CN.md',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    note: 'Same workflow rename as readme-en-ci-badge, applied to the Chinese translation.',
    find: `[![Tests](https://img.shields.io/github/actions/workflow/status/evolvconsulting/evolv-coder-lite/test.yml?branch=main&style=for-the-badge&logo=github&label=Tests)](https://github.com/evolvconsulting/evolv-coder-lite/actions/workflows/test.yml)`,
    replace: `[![CI](https://img.shields.io/github/actions/workflow/status/evolvconsulting/evolv-coder-lite/ci.yml?branch=main&style=for-the-badge&logo=github&label=CI)](https://github.com/evolvconsulting/evolv-coder-lite/actions/workflows/ci.yml)`,
  },
  {
    id: 'install-cyan-recolor-brand-orange',
    file: 'bin/install.js',
    issue: 'evolvconsulting/evolv-coder-lite#brand-banner',
    note: [
      'Upstream uses cyan (\\x1b[36m) as the accent color for flag names,',
      'menu numbers, file callouts, and the community link in install.js.',
      'After bake the prose is rebranded but the accent color is still',
      'upstream cyan, which clashes with the evolv brand orange used in',
      'the banner and statusline. Patch: keep the variable name `cyan`',
      '(every callsite stays untouched, so upstream syncs do not drift)',
      'but rebind it to brand orange via the same truecolor / 256-color',
      'fallback used by [[install-banner-evolv-wordmark]] and the eck',
      'statusline. Drop this patch when the variable rename happens',
      'upstream or rebrand-map handles ANSI-color recoloring directly.',
    ].join(' '),
    find: `const cyan = '\\x1b[36m';`,
    replace: `const cyan = (() => {\n  const useColor = !process.env.NO_COLOR && process.env.TERM !== 'dumb';\n  if (!useColor) return '';\n  const truecolor = process.env.COLORTERM === 'truecolor' || process.env.COLORTERM === '24bit';\n  return truecolor ? '\\x1b[38;2;255;140;0m' : '\\x1b[38;5;208m';\n})();`,
  },
  {
    id: 'install-banner-evolv-wordmark',
    file: 'bin/install.js',
    issue: 'evolvconsulting/evolv-coder-lite#brand-banner',
    note: [
      'Upstream installer banner uses the GSD ANSI Shadow wordmark.',
      'After bake, only the prose line "Get Shit Done" is rebranded — the',
      'ASCII art still spells "GSD", so a clean install greets users with',
      'upstream branding. Patch: replace the wordmark with the canonical',
      'evolv heavy-block lockup (matches eck session banner). Color comes',
      'from the existing `cyan` constant, which sibling patch',
      '[[install-cyan-recolor-brand-orange]] rebinds to brand orange with',
      'the same truecolor / 256-color fallback the eck statusline uses.',
      'Drop this patch when upstream removes the banner or rebrand-map',
      'gains support for ASCII-art replacement.',
    ].join(' '),
    find: `const banner = '\\n' +\n  cyan + '   ██████╗ ███████╗██████╗\\n' +\n  '  ██╔════╝ ██╔════╝██╔══██╗\\n' +\n  '  ██║  ███╗███████╗██║  ██║\\n' +\n  '  ██║   ██║╚════██║██║  ██║\\n' +\n  '  ╚██████╔╝███████║██████╔╝\\n' +\n  '   ╚═════╝ ╚══════╝╚═════╝' + reset + '\\n' +`,
    replace: `const banner = '\\n' +\n  cyan + '                                ██\\n' +\n  '                                ██\\n' +\n  '   ▄████▄   ██    ██   ▄████▄   ██  ██    ██\\n' +\n  '  ██    ██  ██    ██  ██    ██  ██  ██    ██\\n' +\n  '  ███████▀  ▐██  ██▌  ██    ██  ██  ▐██  ██▌\\n' +\n  '  ██         ▐█▄▄█▌   ██    ██  ██   ▐█▄▄█▌\\n' +\n  '   ▀████▀     ▀██▀     ▀████▀   ██    ▀██▀' + reset + '\\n' +`,
  },
  {
    id: 'install-postinstall-discord-link-claude-global',
    file: 'bin/install.js',
    issue: 'evolvconsulting/evolv-coder-lite#brand-banner',
    note: [
      'Upstream prints "Join the community: https://discord.gg/mYgfVNfA2r"',
      'in the post-install success block for the claude+global path. The',
      'link points at the upstream community Discord which is not the',
      'evolv community. Patch: drop the link line (and the blank line that',
      'precedes it) so the success message ends after the "Done!" line.',
      'Drop this patch when upstream removes the link or rebrand-map gains',
      'a rule that strips Discord URLs by domain.',
    ].join(' '),
    find: `  \${green}Done!\${reset} Restart \${program}, then in any directory either type \${cyan}\${command}\${reset} or ask Claude to run the \${cyan}ecl-new-project\${reset} skill.\n\n  \${cyan}Join the community:\${reset} https://discord.gg/mYgfVNfA2r\n`,
    replace: `  \${green}Done!\${reset} Restart \${program}, then in any directory either type \${cyan}\${command}\${reset} or ask Claude to run the \${cyan}ecl-new-project\${reset} skill.\n`,
  },
  {
    id: 'install-postinstall-discord-link-default',
    file: 'bin/install.js',
    issue: 'evolvconsulting/evolv-coder-lite#brand-banner',
    note: [
      'Companion to install-postinstall-discord-link-claude-global: same',
      'Discord link printed in the default post-install branch (non-claude',
      'or non-global paths). Strip identically.',
    ].join(' '),
    find: `  \${green}Done!\${reset} Open a blank directory in \${program} and run \${cyan}\${command}\${reset}.\n\n  \${cyan}Join the community:\${reset} https://discord.gg/mYgfVNfA2r\n`,
    replace: `  \${green}Done!\${reset} Open a blank directory in \${program} and run \${cyan}\${command}\${reset}.\n`,
  },
];

export async function applyTextPatches(srcDir, { onlyFiles } = {}) {
  const applied = [];
  for (const patch of PATCHES) {
    if (onlyFiles && !onlyFiles.has(patch.file)) continue;
    const filePath = join(srcDir, patch.file);
    const original = await readFile(filePath, 'utf8');
    const occurrences = original.split(patch.find).length - 1;
    if (occurrences === 0) {
      throw new Error(
        `text-patch "${patch.id}": anchor not found in ${patch.file}. ` +
        `Upstream likely changed the surrounding code; revisit the patch.`,
      );
    }
    if (occurrences > 1) {
      throw new Error(
        `text-patch "${patch.id}": anchor matched ${occurrences} times in ${patch.file}; ` +
        `expected exactly 1. Tighten the anchor.`,
      );
    }
    await writeFile(filePath, original.replace(patch.find, patch.replace));
    applied.push(patch.id);
  }
  return applied;
}
