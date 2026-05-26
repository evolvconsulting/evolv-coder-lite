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
//   - On miss, writes one yellow warning block to stderr with the exact
//     `setx` command to fix it, plus the `npx` workaround.
//   - Always exits 0. A postinstall script must NEVER fail the install.
//
// Implementation notes:
//   - We do NOT check process.stdout.isTTY. Under `npm install`, npm pipes
//     postinstall stdout into its logger, so isTTY is false and a TTY gate
//     would suppress the warning in exactly the case it is most needed
//     (interactive terminal install). v1.1.1 shipped with that bug; v1.1.2
//     removes the gate.
//   - We write to stderr because npm buffers stdout from postinstall scripts
//     by default (loglevel=notice) but lets stderr through. With stderr the
//     warning appears in the install output stream the user actually sees.

'use strict';

if (process.platform !== 'win32') process.exit(0);
if (process.env.CI) process.exit(0);

function normalize(p) {
  if (typeof p !== 'string') return '';
  let s = p.trim();
  if (!s) return '';
  // Strip surrounding quotes Windows users sometimes add.
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
  }
  // Collapse trailing separators so "C:\\foo\\" matches "C:\\foo".
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

const yellow = '\x1b[33m';
const cyan = (() => {
  const truecolor = process.env.COLORTERM === 'truecolor' || process.env.COLORTERM === '24bit';
  return truecolor ? '\x1b[38;2;255;140;0m' : '\x1b[38;5;208m';
})();
const reset = '\x1b[0m';
const bold = '\x1b[1m';

process.stderr.write(`
${yellow}${bold}Heads up:${reset} npm's global bin directory is not on your PATH, so the
${cyan}evolv-coder-lite${reset} command will not resolve from a new terminal.

  Missing from PATH: ${cyan}${prefix}${reset}

  ${bold}Fix (run once, then open a new terminal):${reset}
    ${cyan}setx PATH "%PATH%;${prefix}"${reset}

  ${bold}Or use npx (no PATH change needed):${reset}
    ${cyan}npx @evolvconsulting/evolv-coder-lite${reset}

`);

process.exit(0);
