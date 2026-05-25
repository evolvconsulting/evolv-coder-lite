import { chmod, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function modeFor(srcMode) {
  return (srcMode & 0o111) ? 0o755 : 0o644;
}

export async function propagateMode(destPath, srcMode) {
  await chmod(destPath, modeFor(srcMode));
}

export function deepMerge(target, patch) {
  if (Array.isArray(patch)) return patch;
  if (typeof patch !== 'object' || patch === null) return patch;
  const out = { ...(target ?? {}) };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function writeManifest(srcDir, { upstreamRepo, upstreamRef, upstreamSha, counts, ruleHits }) {
  const manifest = {
    bakedAt: new Date().toISOString(),
    upstream: { repo: upstreamRepo, ref: upstreamRef, tarball_sha256: upstreamSha },
    counts,
    ruleHits,
  };
  await writeFile(join(srcDir, 'REBRAND-MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}
