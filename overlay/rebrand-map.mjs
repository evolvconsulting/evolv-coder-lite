// overlay/rebrand-map.mjs
//
// Pure functions. No I/O. Used by:
//   - overlay/bake.mjs           (initial src/ generation)
//   - scripts/sync-and-patch.mjs (translating upstream diffs to src/ diffs)
//   - scripts/verify-rebrand.mjs (asserting nothing leaked)
//
// Two public entry points:
//   rebrandPath(upstreamRelPath: string): string
//   rebrandContent(content: string, upstreamRelPath: string): { text: string, hits: Record<string, number> }
//
// Both are case-aware and order-sensitive (longest-most-specific first).

import { basename, dirname, join, sep } from 'node:path';

// ---------- Allowlist: paths where strings are NOT transformed ----------
//
// These keep upstream attribution intact. Path renames still apply (a file
// in this list at upstream path foo/gsd-x.md still moves to foo/ecl-x.md
// in src/), but the *content* is copied verbatim.
//
// Path is the upstream-relative path. Glob support is intentionally minimal
// to keep this dependency-free.

const CONTENT_PRESERVE_PATTERNS = [
  /^LICENSE$/,
  /^NOTICE$/,
  /^upstream\//,           // never transform vendored sources
  /(^|\/)CHANGELOG(\.md)?$/i, // changelog references historical names; preserve
  /(^|\/)\.changeset\//,   // upstream changeset entries are part of upstream history
];

export function isContentPreserved(upstreamRelPath) {
  return CONTENT_PRESERVE_PATTERNS.some((re) => re.test(upstreamRelPath));
}

// ---------- String replacement rules ----------
//
// Rules are applied in array order. Each rule is global (replaceAll).
// Order matters: longer/more-specific patterns must come before their
// substrings to avoid partial-match drift.
//
// `track` is the human-readable rule key recorded in hit-count manifests.

const RULES = [
  // --- npm scopes / package names (longest first) ---
  { track: 'pkg:redux',     find: /@opengsd\/get-shit-done-redux/g, repl: '@evolvconsulting/evolv-coder-lite' },
  { track: 'pkg:gsd-sdk',   find: /@opengsd\/gsd-sdk/g,             repl: '@evolvconsulting/ecl-sdk' },
  // @opengsd in any context — package paths, escaped paths in test strings,
  // word-boundary mentions in prose. Catches @opengsd/ and @opengsd\/ alike.
  { track: 'pkg:scope',     find: /@opengsd\b/g,                    repl: '@evolvconsulting' },
  // URL-encoded scope embedded in shields.io badge URLs and similar links.
  // %40 → @, %2F → /. Without this rule the badges in README files keep
  // pointing at the original npm package — visible drift on npmjs.com.
  // Both upper- and lower-case forms appear in the wild, so we are case-
  // insensitive on the percent-encoded letters but anchor on `opengsd`.
  { track: 'pkg:scope-encoded', find: /%40opengsd%2F/gi,            repl: '%40evolvconsulting%2F' },

  // --- author attribution ---
  // TÂCHES is the original author; "100% rebranded" mode strips the name from
  // the user-visible product. Attribution survives in NOTICE and LICENSE
  // (which are content-preserved). The "by <author>" prefix is stripped
  // along with the name to avoid leaving "by ." in prose.
  { track: 'auth:by-taches', find: / by TÂCHES/g,                    repl: '' },
  { track: 'auth:dash-taches', find: /— \*\*TÂCHES\*\*/g,            repl: '— **evolv Consulting**' },
  { track: 'auth:bare-taches', find: /TÂCHES/g,                      repl: 'evolv Consulting' },

  // --- product/repo names ---
  // v1.2.0 renamed the upstream package get-shit-done-redux → gsd-core
  // (npm @opengsd/gsd-core, repo open-gsd/gsd-core, primary bin `gsd-core`).
  // Map it to the eCL package id, exactly as the redux name does. MUST precede
  // the generic `\bgsd-` rule below, which would otherwise yield the bogus
  // "ecl-core" (a package/repo that does not exist). The scope/org rules
  // (@opengsd→@evolvconsulting, open-gsd→evolvconsulting) compose with this to
  // produce @evolvconsulting/evolv-coder-lite and evolvconsulting/evolv-coder-lite.
  { track: 'name:gsd-core',  find: /gsd-core/g,                      repl: 'evolv-coder-lite' },
  { track: 'name:gsd-core:U', find: /GSD-core/g,                     repl: 'evolv-coder-lite' },
  { track: 'name:redux',    find: /get-shit-done-redux/g,           repl: 'evolv-coder-lite' },
  { track: 'name:redux:c',  find: /Get Shit Done Redux/g,           repl: 'evolv Coder Lite' },
  { track: 'name:gsd:upper', find: /GET SHIT DONE/g,                repl: 'EVOLV CODER LITE' },
  { track: 'name:gsd:c',    find: /Get Shit Done/g,                 repl: 'evolv Coder Lite' },
  { track: 'name:gsd:k',    find: /get-shit-done/g,                 repl: 'evolv-coder-lite' },

  // --- org references (preserve in attribution files via allowlist; replace elsewhere) ---
  { track: 'org:open-gsd',  find: /open-gsd/g,                      repl: 'evolvconsulting' },
  { track: 'org:gsd-build', find: /gsd-build/g,                     repl: 'evolvconsulting' },

  // --- bin / tool names ---
  { track: 'bin:sdk',       find: /\bgsd-sdk\b/g,                   repl: 'ecl-sdk' },
  // Trailing boundary only (no leading `\b`): v1.2.0's ecl-tools.cjs emits an
  // error string `...flag}\ngsd-tools does not accept...` where the `\n` puts a
  // word char before `gsd`, defeating a leading-boundary rule and shipping a
  // visible `gsd-tools` leak (verify-rebrand's own detector shares that blind
  // spot and misses it). Leading boundary is unnecessary — `gsd-tools` cannot
  // be a suffix of a larger identifier (the hyphen breaks camelCase).
  { track: 'bin:tools',     find: /gsd-tools\b/g,                   repl: 'ecl-tools' },
  // v1.2.0 (#373) ships a space-safe workflow launcher: a shell function
  // `gsd_run`. It appears not just as a bare identifier (handled by id:gsd-snake)
  // but inside regex literals (`/\bgsd_run\b/`) and after escape sequences
  // (`\ngsd_run query`), where the preceding `\` / word-char defeats the narrower
  // `\bgsd_` snake rule and leaves a leak. Match it with only a trailing boundary
  // so every form rebrands consistently — the parity test scans real workflows
  // that emit `ecl_run`, so a stale `gsd_run` regex would make the guard vacuous.
  // Trailing `\b` (not leading) avoids eating tokens like `gsd_runner`.
  { track: 'bin:gsd_run',   find: /gsd_run\b/g,                     repl: 'ecl_run' },

  // --- slash-command prefixes ---
  { track: 'cmd:dash',      find: /\/gsd-/g,                        repl: '/ecl-' },
  { track: 'cmd:colon',     find: /\/gsd:/g,                        repl: '/ecl:' },

  // --- file/identifier prefixes (kebab and snake) ---
  // These are intentionally narrower than \bgsd\b: only when followed by
  // - or _ to avoid eating fragments like "gsd2".
  { track: 'id:gsd2-import', find: /gsd2-import/g,                  repl: 'ecl2-import' },
  { track: 'id:gsd2',        find: /\bgsd2\b/g,                     repl: 'ecl2' },
  { track: 'id:gsd-dash',    find: /\bgsd-/g,                       repl: 'ecl-' },
  { track: 'id:dash-gsd',    find: /-gsd\b/g,                       repl: '-ecl' },
  { track: 'id:gsd-snake',   find: /\bgsd_/g,                       repl: 'ecl_' },
  { track: 'id:snake-gsd',   find: /_gsd\b/g,                       repl: '_ecl' },

  // --- env-var / SHOUTY_SNAKE_CASE prefixes (must come before tok:GSD;
  // \bGSD\b does NOT match GSD_FOO because _ is a word character, so there's
  // no boundary between D and _). Also handles trailing _GSD on env names.
  { track: 'env:GSD-snake',  find: /\bGSD_/g,                       repl: 'ECL_' },
  { track: 'env:snake-GSD',  find: /_GSD\b/g,                       repl: '_ECL' },

  // --- standalone tokens (last; broadest) ---
  { track: 'tok:GSD',        find: /\bGSD\b/g,                      repl: 'eCL' },
  { track: 'tok:gsd',        find: /\bgsd\b/g,                      repl: 'ecl' },
];

export function rebrandContent(text, upstreamRelPath) {
  const hits = Object.create(null);
  if (isContentPreserved(upstreamRelPath)) {
    return { text, hits };
  }
  let out = text;
  for (const { track, find, repl } of RULES) {
    let count = 0;
    out = out.replace(find, () => {
      count++;
      return repl;
    });
    if (count > 0) hits[track] = (hits[track] ?? 0) + count;
  }
  return { text: out, hits };
}

// ---------- Path renames ----------
//
// Whole-segment directory renames at the start of a path get special
// handling so e.g. `commands/gsd/foo.md` → `commands/ecl/foo.md`
// without accidentally matching deeper occurrences of /gsd/.
//
// File-basename transformation reuses RULES so the same gsd-foo → ecl-foo
// logic applies, but limited to the basename to avoid touching parent dirs.

const DIR_RENAMES = [
  // upstream segment → src segment
  ['get-shit-done', 'evolv-coder-lite'],
  ['gsd', 'ecl'],
];

export function rebrandPath(upstreamRelPath) {
  // Normalize to POSIX separators; we operate on rel paths, no leading slash.
  const segments = upstreamRelPath.split(/[\\/]/).filter(Boolean);
  const newSegments = segments.map((seg, i) => {
    const isLast = i === segments.length - 1;

    // Whole-segment directory rename (only for non-final segments and only
    // when the segment IS exactly the renamed directory).
    if (!isLast) {
      for (const [from, to] of DIR_RENAMES) {
        if (seg === from) return to;
      }
    }

    // For final segments (file basenames) AND non-final segments not matched
    // above, run the content rules against the segment string. Filenames
    // commonly contain things like "gsd-tools.ts" which need the same
    // gsd- → ecl- transformation as content does.
    const { text } = rebrandContent(seg, /* not preserved at path level */ '');
    return text;
  });

  return newSegments.join('/');
}

// ---------- Helpers used by callers ----------

export function mergeHits(...maps) {
  const total = Object.create(null);
  for (const m of maps) {
    if (!m) continue;
    for (const [k, v] of Object.entries(m)) {
      total[k] = (total[k] ?? 0) + v;
    }
  }
  return total;
}

// Heuristic: treat as text if all bytes are valid UTF-8 and < 1% are
// "weird" control bytes. Used by bake/patch to decide whether to apply
// content transformation.
export function looksLikeText(buf) {
  if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
  if (buf.length === 0) return true;
  // Quick BOM check
  if (buf[0] === 0x00 && buf.length > 1 && buf[1] === 0x00) return false; // UTF-32 / null bytes
  // Count non-printable, non-whitespace bytes in first 8KB
  const sample = buf.slice(0, 8192);
  let weird = 0;
  for (let i = 0; i < sample.length; i++) {
    const b = sample[i];
    if (b === 0) return false; // null byte → binary
    if (b < 9) weird++;
    else if (b > 13 && b < 32) weird++;
  }
  return (weird / sample.length) < 0.01;
}

export const RULE_KEYS = RULES.map((r) => r.track);
