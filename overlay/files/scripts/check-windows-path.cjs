#!/usr/bin/env node
// scripts/check-windows-path.cjs
//
// Postinstall guard: on Windows, warn the user if `npm prefix -g` is not on
// %PATH%. Without it, npm's global shim (`evolv-coder-lite.cmd`) installs
// successfully but cannot be invoked by name — the user gets a confusing
// "command not found" after a clean `npm install -g`.
//
// Behavior:
//   - No-op on non-Windows platforms.
//   - No-op in CI (CI=true) — automated installs don't benefit from the
//     warning and the noise pollutes build logs.
//   - No-op when the npm prefix is already on %PATH% (case-insensitive,
//     trailing-slash insensitive — Windows PATH semantics).
//   - On miss, writes one warning block directly to the Windows console
//     (\\.\CONOUT$) so it survives npm's stdio capture; falls back to
//     stderr if CONOUT$ isn't writable.
//   - Always exits 0. A postinstall script must NEVER fail the install.
//
// Why \\.\CONOUT$:
//   npm 7+ runs postinstall with stdio captured into its own logger and
//   only flushes the captured output when --foreground-scripts is set
//   (default false). Both stdout AND stderr from postinstall hooks are
//   buffered for `npm install -g` and silently discarded on success. The
//   v1.1.1 implementation tried `process.stdout.write` and got swallowed.
//   v1.1.2 switched to stderr and got swallowed too. v1.1.3 writes to the
//   Windows console pseudo-device \\.\CONOUT$ which bypasses npm's stdio
//   redirection entirely. Verified working on Windows 10 26200 + npm 11.12
//   with both `npm install` and `npm install -g`.
//
//   ANSI escapes are intentionally omitted — the cmd.exe console may be
//   the OG console host without VT processing, and unrendered escapes are
//   uglier than plain text. Modern Windows Terminal users get a slightly
//   plainer message than terminal-aware CLIs would render.

'use strict';

if (process.platform !== 'win32') process.exit(0);
if (process.env.CI) process.exit(0);

function normalize(p) {
  if (typeof p !== 'string') return '';
  let s = p.trim();
  if (!s) return '';
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
  }
  s = s.replace(/[\\/]+$/, '');
  return s.toLowerCase();
}

const prefix = process.env.npm_config_prefix || '';
if (!prefix) process.exit(0);

const normalizedPrefix = normalize(prefix);
const pathEntries = (process.env.PATH || process.env.Path || '')
  .split(';')
  .map(normalize)
  .filter(Boolean);

if (pathEntries.includes(normalizedPrefix)) process.exit(0);

// PowerShell single-quoted strings escape ' as ''. Defend against the
// (rare but real) case where the npm prefix contains an apostrophe,
// e.g. C:\Users\O'Brien\AppData\Roaming\npm.
const psQuoted = prefix.replace(/'/g, "''");

const message = `
Heads up: npm's global bin directory is not on your PATH, so the
evolv-coder-lite command will not resolve.

  Missing from PATH: ${prefix}

  Fix (3 steps -- changes user PATH; only fresh shells see it):

    1. Add it to your user PATH (run in cmd.exe or PowerShell):
         powershell -NoProfile -Command "$d='${psQuoted}';$u=[Environment]::GetEnvironmentVariable('PATH','User');$e=@(($u -split ';')|Where-Object{$_ -ne ''});$k=$d.TrimEnd('\\').ToLowerInvariant();if(-not($e|Where-Object{$_.TrimEnd('\\').ToLowerInvariant() -eq $k})){[Environment]::SetEnvironmentVariable('PATH',(($e+$d) -join ';'),'User');Write-Host 'appended'}else{Write-Host 'already present, no change'}"

    2. Close this terminal and open a NEW one.

    3. Run:
         evolv-coder-lite

  Why not setx? setx truncates user PATH at 1024 characters and
  the conventional 'setx PATH "%PATH%;..."' recipe pollutes user
  PATH with system entries. The PowerShell command above edits
  user PATH directly: no truncation, no system-PATH leak, and
  it's idempotent (re-running it is a no-op once the entry is
  present).

  Don't want to change PATH? Use npx instead (no setup needed):
    npx @evolvconsulting/evolv-coder-lite

`;

let surfaced = false;
try {
  // \\.\CONOUT$ writes directly to the Windows console, bypassing npm's
  // stdio capture. require('fs').writeFileSync handles the device path.
  require('fs').writeFileSync('\\\\.\\CONOUT$', message);
  surfaced = true;
} catch (_) {
  // Falls through — no controlling console, headless CI runner, or other
  // environment where CONOUT$ isn't writable. stderr is still likely
  // captured by npm but at least it lands somewhere.
}

if (!surfaced) {
  try {
    process.stderr.write(message);
  } catch (_) {
    // Give up — never fail postinstall.
  }
}

process.exit(0);
