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
