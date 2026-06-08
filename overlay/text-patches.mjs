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
// Each patch declares its upstream-tracking status via the `upstream` field
// (see VALID_UPSTREAM_STATUSES below). The status is validated at bake time;
// see OPERATING.md "Patches" for the full taxonomy and retirement procedure.
//
// Remove a patch entry once the equivalent fix lands upstream — the bake
// will then fail with an anchor-mismatch error, confirming the upstream
// behavior changed; if the bake still passes after deletion, upstream
// hasn't actually fixed it and the patch must be restored.

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Yocto-style upstream-tracking schema. Every PATCHES entry must carry an
// `upstream: { status, detail? }` object describing how the patch relates
// to an upstream fix:
//
//   pending       — upstream issue not yet filed (eCL-side only). detail optional.
//   submitted     — upstream PR open against open-gsd/get-shit-done-redux.
//                   detail REQUIRED: GitHub PR/issue URL.
//   backport      — fix landed on upstream main but not yet in our pinned
//                   UPSTREAM.lock; tracking until the next sync absorbs it.
//                   detail REQUIRED: PR URL or commit reference.
//   denied        — upstream rejected the change; we keep the patch.
//                   detail REQUIRED: URL or one-line denial reason.
//   inappropriate — eCL-specific (rebrand artifact, brand cosmetic, test
//                   fixture adjustment, eCL-only feature prune).
//                   Will never be submitted upstream.
//                   detail REQUIRED: one-line classification, e.g.
//                     'rebrand-artifact: \\bgsd- regex literal'
//                     'brand: discord link removal'
//                     'test-fixture-rebrand-adjustment'
//                     'release-tarball-smoke-prune: WORKFLOW_BODY_COLON_LEAK'
const VALID_UPSTREAM_STATUSES = new Set([
  'pending',
  'submitted',
  'backport',
  'denied',
  'inappropriate',
]);

const STATUSES_REQUIRING_DETAIL = new Set([
  'submitted',
  'backport',
  'denied',
  'inappropriate',
]);

function validatePatches(patches) {
  const errors = [];
  const seenIds = new Set();
  for (const patch of patches) {
    const id = patch && patch.id;
    if (!id || typeof id !== 'string') {
      errors.push(`patch with missing/non-string id: ${JSON.stringify(patch)}`);
      continue;
    }
    if (seenIds.has(id)) {
      errors.push(`duplicate patch id: "${id}"`);
    }
    seenIds.add(id);
    const upstream = patch.upstream;
    if (!upstream || typeof upstream !== 'object') {
      errors.push(`patch "${id}": missing required \`upstream\` object`);
      continue;
    }
    if (!VALID_UPSTREAM_STATUSES.has(upstream.status)) {
      errors.push(
        `patch "${id}": upstream.status must be one of ` +
        `[${[...VALID_UPSTREAM_STATUSES].join(', ')}], got ${JSON.stringify(upstream.status)}`,
      );
      continue;
    }
    if (STATUSES_REQUIRING_DETAIL.has(upstream.status)) {
      if (typeof upstream.detail !== 'string' || upstream.detail.trim() === '') {
        errors.push(
          `patch "${id}": upstream.status="${upstream.status}" requires non-empty upstream.detail`,
        );
      }
    }
  }
  if (errors.length > 0) {
    throw new Error(
      `text-patches.mjs schema validation failed (${errors.length} error${errors.length === 1 ? '' : 's'}):\n  - ` +
      errors.join('\n  - '),
    );
  }
}

const PATCHES = [
  {
    id: 'install-profiles-parse-calls-agents-prefix',
    // v1.4.0 (upstream TS migration): the lib ships as a tsc build artifact at
    // pack time, so we patch the .cts SOURCE (src/install-profiles.cts) — the
    // fix compiles through to evolv-coder-lite/bin/lib/install-profiles.cjs.
    file: 'src/install-profiles.cts',
    issue: 'evolvconsulting/evolv-coder-lite#17',
    upstream: {
      status: 'inappropriate',
      detail: 'rebrand-artifact: \\bgsd- regex literal',
    },
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
    id: 'enh-2792-namespace-skills-test-routing-regex-1',
    file: 'tests/enh-2792-namespace-skills.test.cjs',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    upstream: {
      status: 'inappropriate',
      detail: 'rebrand-artifact: \\bgsd- regex literal',
    },
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
    upstream: {
      status: 'inappropriate',
      detail: 'rebrand-artifact: \\bgsd- regex literal',
    },
    note: [
      'Same regex-literal blind spot as the routing regex above, applied',
      'to the cross-reference test that asserts every routed sub-skill exists.',
      'Pattern is /\\bgsd-[a-z][a-z0-9-]*/g, also untouched by id:gsd-dash.',
    ].join(' '),
    find: `        for (const m of cells[cells.length - 1].matchAll(/\\bgsd-[a-z][a-z0-9-]*/g)) {`,
    replace: `        for (const m of cells[cells.length - 1].matchAll(/\\becl-[a-z][a-z0-9-]*/g)) {`,
  },
  {
    id: 'planner-decomposition-test-extracted-limit',
    file: 'tests/planner-decomposition.test.cjs',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    upstream: {
      status: 'inappropriate',
      detail: 'test-fixture-rebrand-adjustment: 48K -> 50K threshold (rebrand-byte-expansion)',
    },
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
    upstream: {
      status: 'inappropriate',
      detail: 'test-fixture-rebrand-adjustment: alphabetical sort post gsd->ecl rename',
    },
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
  {
    id: 'bug-2801-ingest-docs-handler-regex-literal',
    file: 'tests/bug-2801-ingest-docs-handler.test.cjs',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    upstream: {
      status: 'inappropriate',
      detail: 'rebrand-artifact: \\bgsd-sdk\\b regex literal',
    },
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
    id: 'ecl-tools-path-refs-bare-sdk-detector-regex',
    file: 'tests/ecl-tools-path-refs.test.cjs',
    issue: 'evolvconsulting/evolv-coder-lite#upstream-sync-v1.2.0',
    upstream: {
      status: 'inappropriate',
      detail: 'rebrand-artifact: \\bgsd-sdk regex literal (v1.2.0 gsd-tools-path-refs.test)',
    },
    note: [
      'New in v1.2.0 (renamed from gsd-tools-path-refs). The retired-token guard',
      'scans workflow lines for `gsd-sdk query` / `$ECL_SDK query` via the literal',
      '/\\bgsd-sdk\\s+query\\b|.../. The leading `\\b` puts a word char before `gsd`,',
      'so the bin:sdk rebrand-rule cannot rewrite it (same blind spot as',
      'bug-2801). After rebrand eCL workflows say ecl-sdk, so the gsd-sdk branch',
      'never matches and the guard passes vacuously. Patch the literal to ecl-sdk.',
      'Drop when rebrand-map handles `\\bgsd-` after a regex `\\b` literal.',
    ].join(' '),
    find: `        if (/\\bgsd-sdk\\s+query\\b|\\$ECL_SDK\\s+query/.test(lines[i])) {`,
    replace: `        if (/\\becl-sdk\\s+query\\b|\\$ECL_SDK\\s+query/.test(lines[i])) {`,
  },
  {
    id: 'bug-2808-skill-hyphen-name-colon-regex-literal-1',
    file: 'tests/bug-2808-skill-hyphen-name.test.cjs',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    upstream: {
      status: 'inappropriate',
      detail: 'rebrand-artifact: \\bgsd: regex literal',
    },
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
    upstream: {
      status: 'inappropriate',
      detail: 'rebrand-artifact: \\bgsd: regex literal',
    },
    note: [
      'Companion to bug-2808-skill-hyphen-name-colon-regex-literal-1 — second',
      'colon-regex literal in the same test file. Same blind spot, same fix.',
    ].join(' '),
    find: `    assert.ok(!out.match(/\\bgsd:[a-z]/), 'no colon-form command reference may survive');`,
    replace: `    assert.ok(!out.match(/\\becl:[a-z]/), 'no colon-form command reference may survive');`,
  },
  {
    id: 'install-uninstall-removes-check-update-worker',
    file: 'bin/install.js',
    issue: 'evolvconsulting/evolv-coder-lite#upstream-sync-v1.2.0',
    upstream: {
      status: 'pending',
      detail: 'no upstream issue filed yet (GSD_UNINSTALL_HOOKS missing the check-update worker)',
    },
    note: [
      'The check-update SessionStart hook spawns a detached worker',
      '(ecl-check-update-worker.js, copied during install) but the',
      'ECL_UNINSTALL_HOOKS list omits it, so uninstall leaves the worker',
      'behind (caught by e2e 07). Add it next to its sibling entries.',
      'Drop this patch when upstream adds the worker to GSD_UNINSTALL_HOOKS.',
    ].join(' '),
    find: `  'ecl-check-update.js',
  'ecl-check-update.cmd',`,
    replace: `  'ecl-check-update.js',
  'ecl-check-update.cmd',
  'ecl-check-update-worker.js',`,
  },
  {
    id: 'install-uninstall-removes-worktree-path-guard',
    file: 'bin/install.js',
    issue: 'evolvconsulting/evolv-coder-lite#upstream-sync-v1.4.0',
    upstream: {
      status: 'pending',
      detail: 'no upstream issue filed yet (GSD_UNINSTALL_HOOKS missing the worktree path guard added in v1.3.x)',
    },
    note: [
      'v1.3.x/v1.4.0 added the worktree-path-guard SessionStart hook',
      '(ecl-worktree-path-guard.js, written during install) but upstream',
      'never added it to GSD_UNINSTALL_HOOKS, so uninstall leaves it behind',
      '(caught by e2e 07 — same bug class as the check-update worker above).',
      'Add it next to its sibling guard hooks. Drop this patch when upstream',
      'adds the hook to GSD_UNINSTALL_HOOKS.',
    ].join(' '),
    find: `  'ecl-workflow-guard.js',
  'ecl-session-state.sh',`,
    replace: `  'ecl-workflow-guard.js',
  'ecl-worktree-path-guard.js',
  'ecl-session-state.sh',`,
  },
  {
    id: 'install-uninstall-removes-install-state',
    file: 'bin/install.js',
    issue: 'evolvconsulting/evolv-coder-lite#12',
    upstream: {
      status: 'pending',
      detail: 'no upstream issue filed yet (install-state cleanup symmetry)',
    },
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
    id: 'installer-migration-classifier-bundled-bin-and-hook-lib',
    // v1.4.0 (upstream TS migration): patch the .cts SOURCE; the injected eCL
    // whitelist Sets + classifier branches compile through to the shipped
    // evolv-coder-lite/bin/lib/installer-migration-report.cjs build artifact.
    file: 'src/installer-migration-report.cts',
    issue: 'evolvconsulting/evolv-coder-lite#50',
    upstream: {
      status: 'pending',
      detail: 'upstream filing deferred — see /tmp/upstream-pr-50/ drafts',
    },
    note: [
      'Extends classifyPromptUserAction with two explicit whitelist Sets so',
      'the installer-migration first-time-baseline scan does not abort on',
      'two bundled paths the eCL installer writes:',
      '  - evolv-coder-lite/bin/ecl-tools.cjs (CLI entrypoint)',
      '  - hooks/lib/ecl-graphify-rebuild.sh  (bundled hook helper)',
      'Mirrors the architectural pattern of BUNDLED_GSD_HOOK_FILES',
      '(upstream #3628): explicit Sets, not shape regexes, to avoid silent',
      'data loss on user-authored files. Anchor spans the entire',
      'BUNDLED_GSD_HOOK_FILES block + classifyPromptUserAction body so any',
      'upstream change to the surrounding code fails the bake — the',
      'brittleness is the point.',
      'Drop condition: when upstream lands an equivalent classifier',
      'extension and the next sync absorbs it; the bake will then fail',
      'with anchor-mismatch (confirming upstream changed) and this patch',
      'must be deleted. If the bake still passes after deletion, upstream',
      'has not actually fixed it and the patch must be restored.',
    ].join(' '),
    find: `// Classify a blocked prompt-user action into one of the safe-default
// categories. Returns null when no safe default applies — caller must
// fall back to the hard assertion / interactive prompt for those.
//
// Stale SDK build artifacts live under evolv-coder-lite/sdk/{dist,src}/
// and are regenerated on every install, so removing them is lossless.
// User-facing skill anchors are the .md files that surface as commands
// to the user — these are user-owned and must be kept.
export function classifyPromptUserAction(action: MigrationAction): ClassifyResult | null {
  const relPath = action && action.relPath;
  if (typeof relPath !== 'string' || !relPath) return null;
  if (/^evolv-coder-lite\\/sdk\\/(dist|src)\\//.test(relPath)) {
    return { category: 'stale-sdk-build-artifact', choice: 'remove' };
  }
  if (/^skills\\/ecl-[^/]+\\/SKILL\\.md$/.test(relPath)) {
    return { category: 'user-facing-skill', choice: 'keep' };
  }
  // #3610 / #3628: bundled eCL hooks shipped under \`hooks/\`. The whitelist
  // is the explicit set of filenames in the npm distribution — files that
  // match the shape but are NOT in the whitelist (user-authored hooks,
  // retired hooks from prior versions) fall through to the block-or-prompt
  // flow so the user retains control. On a first-time-baseline scan the
  // installer can safely remove whitelisted hooks because it is about to
  // write the fresh bundled versions in their place.
  if (BUNDLED_GSD_HOOK_FILES.has(relPath)) {
    return { category: 'bundled-ecl-hook', choice: 'remove' };
  }
  return null;
}`,
    replace: `// eCL #50: bundled eCL CLI files shipped under evolv-coder-lite/bin/.
// Same rationale as BUNDLED_GSD_HOOK_FILES (#3628): explicit whitelist,
// not shape regex, to avoid silent data loss on user-authored files.
// Patched in by overlay/text-patches.mjs (eCL #50). Drop when upstream
// lands an equivalent classifier extension.
const BUNDLED_ECL_BIN_FILES: ReadonlySet<string> = Object.freeze(new Set([
  'evolv-coder-lite/bin/ecl-tools.cjs',
]));

// eCL #50: bundled eCL hook-helper files shipped under hooks/lib/.
// Mirrors the canonical ECL_HOOK_LIB_FILES list in bin/install.js,
// restricted to its ecl-prefixed members. (git-cmd.js is bundled too
// but is already manifest-managed via the saveLocalPatches() seam.)
const BUNDLED_ECL_HOOK_LIB_FILES: ReadonlySet<string> = Object.freeze(new Set([
  'hooks/lib/ecl-graphify-rebuild.sh',
]));

// Classify a blocked prompt-user action into one of the safe-default
// categories. Returns null when no safe default applies — caller must
// fall back to the hard assertion / interactive prompt for those.
//
// Stale SDK build artifacts live under evolv-coder-lite/sdk/{dist,src}/
// and are regenerated on every install, so removing them is lossless.
// User-facing skill anchors are the .md files that surface as commands
// to the user — these are user-owned and must be kept.
export function classifyPromptUserAction(action: MigrationAction): ClassifyResult | null {
  const relPath = action && action.relPath;
  if (typeof relPath !== 'string' || !relPath) return null;
  if (/^evolv-coder-lite\\/sdk\\/(dist|src)\\//.test(relPath)) {
    return { category: 'stale-sdk-build-artifact', choice: 'remove' };
  }
  if (/^skills\\/ecl-[^/]+\\/SKILL\\.md$/.test(relPath)) {
    return { category: 'user-facing-skill', choice: 'keep' };
  }
  // #3610 / #3628: bundled eCL hooks shipped under \`hooks/\`. The whitelist
  // is the explicit set of filenames in the npm distribution — files that
  // match the shape but are NOT in the whitelist (user-authored hooks,
  // retired hooks from prior versions) fall through to the block-or-prompt
  // flow so the user retains control. On a first-time-baseline scan the
  // installer can safely remove whitelisted hooks because it is about to
  // write the fresh bundled versions in their place.
  if (BUNDLED_GSD_HOOK_FILES.has(relPath)) {
    return { category: 'bundled-ecl-hook', choice: 'remove' };
  }
  // eCL #50: bundled eCL CLI files (extension of #3610 / #3628 pattern).
  if (BUNDLED_ECL_BIN_FILES.has(relPath)) {
    return { category: 'bundled-ecl-bin', choice: 'remove' };
  }
  // eCL #50: bundled eCL hook-helper files (extension of #3610 / #3628).
  if (BUNDLED_ECL_HOOK_LIB_FILES.has(relPath)) {
    return { category: 'bundled-ecl-hook-lib', choice: 'remove' };
  }
  return null;
}`,
  },
  {
    id: 'readme-ja-ci-badge',
    file: 'README.ja-JP.md',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    upstream: {
      status: 'inappropriate',
      detail: 'brand: CI badge workflow rename (test.yml -> ci.yml)',
    },
    note: 'Same workflow rename as readme-en-ci-badge, applied to the Japanese translation.',
    find: `[![Tests](https://img.shields.io/github/actions/workflow/status/evolvconsulting/evolv-coder-lite/test.yml?branch=main&style=for-the-badge&logo=github&label=Tests)](https://github.com/evolvconsulting/evolv-coder-lite/actions/workflows/test.yml)`,
    replace: `[![CI](https://img.shields.io/github/actions/workflow/status/evolvconsulting/evolv-coder-lite/ci.yml?branch=main&style=for-the-badge&logo=github&label=CI)](https://github.com/evolvconsulting/evolv-coder-lite/actions/workflows/ci.yml)`,
  },
  {
    id: 'readme-ko-ci-badge',
    file: 'README.ko-KR.md',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    upstream: {
      status: 'inappropriate',
      detail: 'brand: CI badge workflow rename (test.yml -> ci.yml)',
    },
    note: 'Same workflow rename as readme-en-ci-badge, applied to the Korean translation.',
    find: `[![Tests](https://img.shields.io/github/actions/workflow/status/evolvconsulting/evolv-coder-lite/test.yml?branch=main&style=for-the-badge&logo=github&label=Tests)](https://github.com/evolvconsulting/evolv-coder-lite/actions/workflows/test.yml)`,
    replace: `[![CI](https://img.shields.io/github/actions/workflow/status/evolvconsulting/evolv-coder-lite/ci.yml?branch=main&style=for-the-badge&logo=github&label=CI)](https://github.com/evolvconsulting/evolv-coder-lite/actions/workflows/ci.yml)`,
  },
  {
    id: 'readme-pt-ci-badge',
    file: 'README.pt-BR.md',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    upstream: {
      status: 'inappropriate',
      detail: 'brand: CI badge workflow rename (test.yml -> ci.yml)',
    },
    note: 'Same workflow rename as readme-en-ci-badge, applied to the Portuguese translation.',
    find: `[![Tests](https://img.shields.io/github/actions/workflow/status/evolvconsulting/evolv-coder-lite/test.yml?branch=main&style=for-the-badge&logo=github&label=Tests)](https://github.com/evolvconsulting/evolv-coder-lite/actions/workflows/test.yml)`,
    replace: `[![CI](https://img.shields.io/github/actions/workflow/status/evolvconsulting/evolv-coder-lite/ci.yml?branch=main&style=for-the-badge&logo=github&label=CI)](https://github.com/evolvconsulting/evolv-coder-lite/actions/workflows/ci.yml)`,
  },
  {
    id: 'readme-zh-ci-badge',
    file: 'README.zh-CN.md',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    upstream: {
      status: 'inappropriate',
      detail: 'brand: CI badge workflow rename (test.yml -> ci.yml)',
    },
    note: 'Same workflow rename as readme-en-ci-badge, applied to the Chinese translation.',
    find: `[![Tests](https://img.shields.io/github/actions/workflow/status/evolvconsulting/evolv-coder-lite/test.yml?branch=main&style=for-the-badge&logo=github&label=Tests)](https://github.com/evolvconsulting/evolv-coder-lite/actions/workflows/test.yml)`,
    replace: `[![CI](https://img.shields.io/github/actions/workflow/status/evolvconsulting/evolv-coder-lite/ci.yml?branch=main&style=for-the-badge&logo=github&label=CI)](https://github.com/evolvconsulting/evolv-coder-lite/actions/workflows/ci.yml)`,
  },
  {
    id: 'install-cyan-recolor-brand-orange',
    file: 'bin/install.js',
    issue: 'evolvconsulting/evolv-coder-lite#brand-banner',
    upstream: {
      status: 'inappropriate',
      detail: 'brand: ANSI accent color (cyan -> evolv orange)',
    },
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
    upstream: {
      status: 'inappropriate',
      detail: 'brand: installer ASCII-art wordmark (GSD -> evolv)',
    },
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
    upstream: {
      status: 'inappropriate',
      detail: 'brand: post-install Discord link removal (claude+global path)',
    },
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
    upstream: {
      status: 'inappropriate',
      detail: 'brand: post-install Discord link removal (default path)',
    },
    note: [
      'Companion to install-postinstall-discord-link-claude-global: same',
      'Discord link printed in the default post-install branch (non-claude',
      'or non-global paths). Strip identically.',
    ].join(' '),
    find: `  \${green}Done!\${reset} Open a blank directory in \${program} and run \${cyan}\${command}\${reset}.\n\n  \${cyan}Join the community:\${reset} https://discord.gg/mYgfVNfA2r\n`,
    replace: `  \${green}Done!\${reset} Open a blank directory in \${program} and run \${cyan}\${command}\${reset}.\n`,
  },
  {
    id: 'shell-projection-bash-lc-win32',
    // v1.4.0 (upstream TS migration): patch the .cts SOURCE; the win32 `-lc`
    // branch compiles through to evolv-coder-lite/bin/lib/shell-command-projection.cjs.
    file: 'src/shell-command-projection.cts',
    issue: 'evolvconsulting/evolv-coder-lite#51',
    upstream: {
      status: 'pending',
    },
    note: [
      'On Windows, Claude Code routes hook commands through a shell. The',
      'previous form "bash.exe" "path/to/hook.sh" causes bash to treat the',
      'second argument as a binary script, emitting "cannot execute binary',
      'file". Fix: use -lc form so bash interprets the path as a command',
      'string. Only applies to .sh hooks on win32; .js hooks use .cmd shims.',
    ].join(' '),
    find: [
      `export function projectManagedHookCommand({ absoluteRunner, scriptPath, runtime = 'generic', platform = process.platform }: {`,
      `  absoluteRunner?: string | null;`,
      `  scriptPath?: string | null;`,
      `  runtime?: string;`,
      `  platform?: string;`,
      `}): string | null {`,
      `  if (!absoluteRunner || !scriptPath) return null;`,
      `  const normalizedScriptPath = platform === 'win32' ? scriptPath.replace(/\\\\/g, '/') : scriptPath;`,
      `  return projectShellCommandText({`,
      `    runnerToken: absoluteRunner,`,
      `    argTokens: [JSON.stringify(normalizedScriptPath)],`,
      `    runtime,`,
      `    platform,`,
      `  });`,
      `}`,
    ].join('\n'),
    replace: [
      `export function projectManagedHookCommand({ absoluteRunner, scriptPath, runtime = 'generic', platform = process.platform }: {`,
      `  absoluteRunner?: string | null;`,
      `  scriptPath?: string | null;`,
      `  runtime?: string;`,
      `  platform?: string;`,
      `}): string | null {`,
      `  if (!absoluteRunner || !scriptPath) return null;`,
      `  const normalizedScriptPath = platform === 'win32' ? scriptPath.replace(/\\\\/g, '/') : scriptPath;`,
      `  if (platform === 'win32' && scriptPath.endsWith('.sh')) {`,
      `    return projectShellCommandText({`,
      `      runnerToken: absoluteRunner,`,
      `      argTokens: ['-lc', "'" + normalizedScriptPath + "'"],`,
      `      runtime,`,
      `      platform,`,
      `    });`,
      `  }`,
      `  return projectShellCommandText({`,
      `    runnerToken: absoluteRunner,`,
      `    argTokens: [JSON.stringify(normalizedScriptPath)],`,
      `    runtime,`,
      `    platform,`,
      `  });`,
      `}`,
    ].join('\n'),
  },
  {
    id: 'install-localShellCmd-bash-lc-win32',
    // v1.4.0: upstream centralized the local-install path's hook-command
    // construction into buildLocalShellHookCommand() (was an inline
    // localShellCmd lambda in bin/install.js). Re-target the eCL #51 win32
    // `-lc` fix onto that .cts builder, layered AFTER upstream's
    // shellHookOmitsBashRunner() omit-guard so both behaviours compose.
    // Compiles through to evolv-coder-lite/bin/lib/shell-command-projection.cjs.
    file: 'src/shell-command-projection.cts',
    issue: 'evolvconsulting/evolv-coder-lite#51',
    upstream: {
      status: 'pending',
    },
    note: [
      'Companion to shell-projection-bash-lc-win32 for the LOCAL-install path.',
      'buildLocalShellHookCommand() builds `<bashRunner> <scriptPath>` for .sh',
      'hooks; on win32 bash treats the bare path as a binary ("cannot execute',
      'binary file"). Inject a win32 .sh branch using the `-lc` form with a',
      'single-quoted, double-quote-stripped script path. Sits after upstream\'s',
      'shellHookOmitsBashRunner() guard (#166/#377/#580) so the win32+claude',
      'omit-bash-runner path is unaffected. Drop when upstream adopts -lc.',
    ].join(' '),
    find: [
      `  if (!bashRunner) return null;`,
      `  return projectShellCommandText({`,
      `    runnerToken: bashRunner,`,
      `    argTokens: [scriptPath],`,
      `    runtime,`,
      `    platform,`,
      `  });`,
    ].join('\n'),
    replace: [
      `  if (!bashRunner) return null;`,
      `  if (platform === 'win32' && hookFile.endsWith('.sh')) {`,
      `    return projectShellCommandText({`,
      `      runnerToken: bashRunner,`,
      `      argTokens: ['-lc', "'" + scriptPath.replace(/"/g, '') + "'"],`,
      `      runtime,`,
      `      platform,`,
      `    });`,
      `  }`,
      `  return projectShellCommandText({`,
      `    runnerToken: bashRunner,`,
      `    argTokens: [scriptPath],`,
      `    runtime,`,
      `    platform,`,
      `  });`,
    ].join('\n'),
  },
  {
    id: 'bug-2979-test-sh-hook-bash-lc-win32',
    file: 'tests/bug-2979-hook-absolute-node.test.cjs',
    issue: 'evolvconsulting/evolv-coder-lite#51',
    upstream: {
      status: 'pending',
      detail: 'companion to shell-projection-bash-lc-win32; upstream #3393 asserts the pre-#51 bare-path form',
    },
    note: [
      'eCL routes win32 .sh hooks through `bash -lc` (issue #51, patch',
      'shell-projection-bash-lc-win32) so bash interprets the .sh path as a',
      'command string instead of trying to exec it as a binary. The upstream',
      '#3393 assertion still expects the pre-#51 `"<bash>" "<path>"` form;',
      'update the expected command to the -lc form so the test tracks eCL',
      'behavior. Drop when upstream adopts the -lc form.',
    ].join(' '),
    find: `      '"C:/Program Files/Git/bin/bash.exe" "C:/Users/me/.codex/hooks/ecl-validate-commit.sh"',`,
    replace: '      `"C:/Program Files/Git/bin/bash.exe" -lc \'C:/Users/me/.codex/hooks/ecl-validate-commit.sh\'`,',
  },
  {
    id: 'workflow-guard-test-exclude-worker-scripts',
    file: 'tests/workflow-guard-registration.test.cjs',
    issue: 'evolvconsulting/evolv-coder-lite#upstream-sync-v1.2.0',
    upstream: {
      status: 'pending',
      detail: 'companion to install-uninstall-removes-check-update-worker',
    },
    note: [
      'install-uninstall-removes-check-update-worker adds',
      'ecl-check-update-worker.js to ECL_UNINSTALL_HOOKS so uninstall removes',
      'it. That worker is spawned by ecl-check-update.js, not registered as a',
      'settings.json hook, so it has no command construction and trips this',
      'completeness guard. Exclude *-worker.js scripts (spawned, not',
      'registered) from the check. Drop alongside the uninstall patch.',
    ].join(' '),
    find: `    const jsHooks = ECL_UNINSTALL_HOOKS.filter(h => h.endsWith('.js'));`,
    replace: `    const jsHooks = ECL_UNINSTALL_HOOKS.filter(h => h.endsWith('.js') && !h.endsWith('-worker.js'));`,
  },
];

export async function applyTextPatches(srcDir, { onlyFiles } = {}) {
  validatePatches(PATCHES);
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

export { PATCHES, VALID_UPSTREAM_STATUSES, validatePatches };
