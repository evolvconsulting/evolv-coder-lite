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
  {
    id: 'release-tarball-smoke-sdk-query-regex',
    file: 'scripts/release-tarball-smoke.cjs',
    issue: 'evolvconsulting/evolv-coder-lite#pre-release-remediation',
    note: [
      'The release-tarball-smoke scans installed workflow .md files for bare',
      'gsd-sdk query invocations that lack a `command -v gsd-sdk` guard. The',
      'detector regex literal /\\bgsd-sdk\\s+query\\b/ is preceded by another',
      'regex word-boundary literal `\\b` whose closing character is `b` (a word',
      'character). The bin:sdk rebrand-rule /\\bgsd-sdk\\b/ therefore cannot',
      'match because there is no word boundary between `b` and `g`. As a result',
      'the smoke\'s missingFallbackCount reports 0 against any rebranded eCL',
      'workflow, which is a false-negative — fallback drift will not surface.',
      'Patch: rewrite the literal to ecl-sdk so the smoke matches eCL workflows.',
      'Drop this patch when rebrand-map handles `\\bgsd-` after a regex `\\b`',
      'literal, or when upstream renames the binary.',
    ].join(' '),
    find: `  const SDK_QUERY = /\\bgsd-sdk\\s+query\\b/;`,
    replace: `  const SDK_QUERY = /\\becl-sdk\\s+query\\b/;`,
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
];

export async function applyTextPatches(srcDir) {
  const applied = [];
  for (const patch of PATCHES) {
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
