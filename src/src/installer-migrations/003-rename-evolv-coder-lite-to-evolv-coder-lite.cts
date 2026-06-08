/**
 * Installer migration 003: remove stale legacy evolv-coder-lite/ runtime directory // ecl-allow-legacy-name
 * files after the rename to evolv-coder-lite/ (#604).
 *
 * Background: the eCL runtime config subdirectory was renamed from
 * evolv-coder-lite/ to evolv-coder-lite/ in #604. On upgrade, both directories can exist // ecl-allow-legacy-name
 * simultaneously. This migration removes prior-manifest-managed files from the
 * legacy evolv-coder-lite/ directory during install. Migrations run BEFORE the new // ecl-allow-legacy-name
 * runtime is materialized, so evolv-coder-lite/ will not yet exist on the first upgrade
 * run — the migration must not gate on its presence. If the install fails after
 * migrations apply, the framework rolls back by restoring files from rollback
 * storage (copied before deletion), so removing legacy files pre-materialization
 * is safe.
 *
 * Per-file approach: the migration framework has no recursive directory-removal
 * primitive — all actions operate on individual files identified by relPath. As
 * a result, any empty subdirectory shells left under the legacy tree after all
 * files are removed will remain on disk. Users can remove them manually if
 * desired. This is a known, intentional limitation of the ADR-0008 design: the
 * framework never removes directories, only files.
 *
 * User file preservation: files classified 'unknown' (not in the prior manifest)
 * receive a 'baseline-preserve-user' action and are explicitly NOT removed.
 */

import fs from 'node:fs';
import path from 'node:path';

interface ClassifiedArtifact {
  classification: string;
  [key: string]: unknown;
}

interface MigrationAction {
  type: string;
  relPath: string;
  reason: string;
  ownershipEvidence: string;
}

interface MigrationPlanContext {
  configDir: string;
  classifyArtifact(relPath: string): ClassifiedArtifact;
}

interface InstallerMigration {
  id: string;
  title: string;
  description: string;
  introducedIn: string;
  scopes: string[];
  destructive: boolean;
  plan(ctx: MigrationPlanContext): MigrationAction[];
}

function walkLegacyFiles(root: string, relDir: string, baseResolved: string, results: string[]): void {
  const dir = path.join(root, relDir);
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    // Do not follow symlinks — skip them entirely to avoid out-of-tree traversal.
    if (entry.isSymbolicLink()) continue; // ecl-allow-legacy-name (entry under legacy evolv-coder-lite/ dir)
    const relPath = path.posix.join(relDir, entry.name);
    // Bounds check: ensure the resolved path stays under configDir.
    const resolved = path.resolve(root, relPath);
    if (resolved !== baseResolved && !resolved.startsWith(baseResolved + path.sep)) continue;
    if (entry.isDirectory()) {
      walkLegacyFiles(root, relPath, baseResolved, results);
    } else if (entry.isFile()) {
      results.push(relPath);
    }
  }
}

const REASON = 'legacy runtime directory renamed to evolv-coder-lite (#604)';

const migration: InstallerMigration = {
  id: '2026-06-02-rename-evolv-coder-lite-to-evolv-coder-lite', // ecl-allow-legacy-name
  title: 'Remove stale legacy evolv-coder-lite/ runtime directory files (#604)', // ecl-allow-legacy-name
  description:
    'After the config dir rename from evolv-coder-lite/ to evolv-coder-lite/ (#604), remove prior-manifest-managed files ' + // ecl-allow-legacy-name
    'from the stale legacy directory during install (framework rollback restores them if install fails). User-added files are preserved.',
  introducedIn: '1.2.0',
  scopes: ['global', 'local'],
  destructive: true,
  plan(ctx: MigrationPlanContext): MigrationAction[] {
    const legacyRoot = path.join(ctx.configDir, 'evolv-coder-lite'); // ecl-allow-legacy-name

    // Idempotency: if the legacy directory doesn't exist, nothing to do.
    if (!fs.existsSync(legacyRoot)) return [];

    // Safety: if the legacy root itself is a symlink to an out-of-tree location,
    // do not process it — walking a symlinked dir could emit removes outside configDir.
    if (fs.lstatSync(legacyRoot).isSymbolicLink()) return []; // ecl-allow-legacy-name

    const baseResolved = path.resolve(ctx.configDir);
    const relPaths: string[] = [];
    walkLegacyFiles(ctx.configDir, 'evolv-coder-lite', baseResolved, relPaths); // ecl-allow-legacy-name

    const actions: MigrationAction[] = [];
    for (const relPath of relPaths) {
      // Bounds-check each relPath before emitting any action.
      const resolved = path.resolve(ctx.configDir, relPath);
      if (resolved !== baseResolved && !resolved.startsWith(baseResolved + path.sep)) continue;
      const { classification } = ctx.classifyArtifact(relPath);
      if (classification === 'managed-pristine') {
        actions.push({
          type: 'remove-managed',
          relPath,
          reason: REASON,
          ownershipEvidence:
            'present in prior install manifest as a managed eCL runtime file',
        });
      } else if (classification === 'managed-modified') {
        actions.push({
          type: 'backup-and-remove',
          relPath,
          reason: REASON,
          ownershipEvidence:
            'managed eCL runtime file, locally modified; backed up before removal',
        });
      } else if (classification === 'unknown') {
        actions.push({
          type: 'baseline-preserve-user',
          relPath,
          reason: 'user-added file under legacy runtime dir; preserved per ADR-0008',
          ownershipEvidence:
            'file is not present in the prior install manifest; treated as user-owned',
        });
      }
      // 'managed-missing', 'missing', and any other classification: skip (no action)
    }

    return actions;
  },
};

export = migration;
