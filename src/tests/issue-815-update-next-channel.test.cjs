'use strict';
// allow-test-rule: reads product workflow/command markdown to verify the --next RC channel contract — not a source-grep test

// Issue #815: `/ecl-update --next` (alias `--rc`) must thread the @next dist-tag
// through the whole update flow (version check + install) while leaving the
// default @latest path unchanged.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const WF = fs.readFileSync(path.join(ROOT, 'evolv-coder-lite', 'workflows', 'update.md'), 'utf8');
const CMD = fs.readFileSync(path.join(ROOT, 'commands', 'ecl', 'update.md'), 'utf8');

test('issue #815: workflow parses --next/--rc into a TAG channel', () => {
  assert.match(WF, /--next/);
  assert.match(WF, /--rc/);
  assert.match(WF, /TAG="next"/);
  assert.match(WF, /TAG="latest"/);
});

test('issue #815: version check threads the tag through check-latest-version.cjs', () => {
  // The script path is double-quoted in the shell command, so the line is:
  //   node "$ECL_DIR/evolv-coder-lite/bin/check-latest-version.cjs" --json --tag "$TAG"
  // The closing " on the script path sits between .cjs and --json.
  assert.match(WF, /check-latest-version\.cjs"? --json --tag "\$TAG"/);
});

test('issue #815: install uses the selected tag, not a hardcoded @latest', () => {
  const robust = WF.match(/npx -y --package=@evolvconsulting\/evolv-coder-lite@"\$TAG" -- evolv-coder-lite/g) || [];
  assert.ok(robust.length >= 3, `expected >=3 tag-parameterized npx invocations, found ${robust.length}`);
  assert.doesNotMatch(WF, /--package=@evolvconsulting\/evolv-coder-lite@latest -- evolv-coder-lite/,
    'install lines must not hardcode @latest once --next exists');
  assert.doesNotMatch(WF, /--package=@evolvconsulting\/evolv-coder-lite@(?:latest|next|beta|canary|rc) -- evolv-coder-lite/,
    'install lines must use the $TAG variable, never a hardcoded dist-tag literal');
});

test('issue #815: command documents --next/--rc and routes it to the update workflow', () => {
  assert.match(CMD, /--next/);
  assert.match(CMD, /--rc/);
  assert.match(CMD, /argument-hint:.*--next/);
});
