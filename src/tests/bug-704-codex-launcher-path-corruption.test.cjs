// allow-test-rule: source-text-is-the-product
'use strict';

/**
 * Regression test for issue #704:
 * "v1.3.1 global install ships literal $evolv-coder-lite launcher paths in workflows"
 *
 * ROOT CAUSE: `convertSlashCommandsToCodexSkillMentions` had a regex
 *   /(?<![a-zA-Z0-9./])\/ecl-([a-z0-9-]+)/
 * The lookbehind did NOT include `}`, so shell variable expressions like
 *   `${_GSD_RUNTIME_ROOT}/evolv-coder-lite/bin/...`
 * had their `/evolv-coder-lite` matched (the char before `/` was `}`, not in the
 * exclusion set), converting it to `$evolv-coder-lite` and breaking all Codex
 * workflow launcher paths.
 *
 * FIX: Add `}` to the lookbehind set so `${VAR}/evolv-coder-lite/` is excluded.
 */

process.env.ECL_TEST_MODE = '1';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  convertClaudeCommandToCodexSkill,
  convertSlashCommandsToCodexSkillMentions,
} = require('../bin/install.js');

// The canonical launcher snippet path that was being corrupted
const RUNTIME_ROOT_PATH = '${_GSD_RUNTIME_ROOT}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}';
// The exact bad token reported in issue #704
const BAD_TOKEN = '$evolv-coder-lite';

describe('#704 — Codex global install launcher path corruption', () => {
  test('convertClaudeCommandToCodexSkill does not corrupt ${VAR}/evolv-coder-lite/ or $(cmd)/ecl-* paths', () => {
    // Minimal fixture with the launcher snippet and command-substitution patterns
    // that were being corrupted (#704).
    const input = [
      '---',
      'description: Test skill',
      '---',
      '',
      '```bash',
      '_GSD_SHIM_NAME="ecl-tools.cjs"',
      '_GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"',
      'ECL_TOOLS="${_GSD_RUNTIME_ROOT}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"',
      'if [ -f "$ECL_TOOLS" ]; then',
      '  ecl_run() { node "$ECL_TOOLS" "$@"; }',
      'elif [ -f "${_GSD_RUNTIME_ROOT}/.claude/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then',
      '  ECL_TOOLS="${_GSD_RUNTIME_ROOT}/.claude/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"',
      '  ecl_run() { node "$ECL_TOOLS" "$@"; }',
      'elif [ -f "$HOME/.claude/evolv-coder-lite/bin/${_GSD_SHIM_NAME}" ]; then',
      '  ECL_TOOLS="$HOME/.claude/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"',
      '  ecl_run() { node "$ECL_TOOLS" "$@"; }',
      'fi',
      '# Command-substitution path form (reapply-patches pattern)',
      'candidate="$(expand_home "$KILO_CONFIG_DIR")/ecl-local-patches"',
      '```',
    ].join('\n');

    const output = convertClaudeCommandToCodexSkill(input, 'ecl-test-704');

    // Shell-context corruption patterns from issue #704:
    //   - `}$ecl-*` from shell variable expressions `${VAR}/ecl-*`
    //   - `)$ecl-*` from command-substitution paths `$(cmd)/ecl-*`
    const shellCorruptionPatterns = [
      { pattern: '}' + BAD_TOKEN, description: 'shell-variable }$evolv-coder-lite' },
      { pattern: ')$ecl-local', description: 'command-substitution )$ecl-local-patches' },
    ];
    for (const { pattern, description } of shellCorruptionPatterns) {
      assert.ok(
        !output.includes(pattern),
        `Codex skill conversion must not produce "${pattern}" (${description}). ` +
          `Offending fragment: ${
            output.includes(pattern)
              ? output.substring(output.indexOf(pattern) - 50, output.indexOf(pattern) + 80)
              : '(not found)'
          }`,
      );
    }

    // The correct path forms must be preserved — the canonical launcher path
    // (RUNTIME_ROOT_PATH) must survive Codex conversion intact.
    assert.ok(
      output.includes(RUNTIME_ROOT_PATH),
      `Expected canonical launcher path "${RUNTIME_ROOT_PATH}" to appear in the converted output. ` +
        `Got:\n${output.substring(0, 500)}`,
    );
    assert.ok(
      output.includes(')/ecl-local-patches'),
      `Expected ")/ecl-local-patches" to appear in the converted output. ` +
        `Got:\n${output.substring(0, 500)}`,
    );
  });

  test('convertClaudeCommandToCodexSkill preserves all shell path forms (}, ) closers)', () => {
    // All these paths appear after a shell-closing character (} or )) and must
    // NOT be converted to $ecl-* by the Codex slash-command converter.
    const shellPaths = [
      // Shell variable expression forms (} closer)
      { path: '"${_GSD_RUNTIME_ROOT}/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"', corruptedForm: '}$evolv-coder-lite' },
      { path: '"${_GSD_RUNTIME_ROOT}/.claude/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"', corruptedForm: '}$evolv-coder-lite' },
      { path: '"$HOME/.claude/evolv-coder-lite/bin/${_GSD_SHIM_NAME}"', corruptedForm: '}$evolv-coder-lite' },
      // Command-substitution forms () closer) — reapply-patches pattern
      { path: 'candidate="$(expand_home "$KILO_CONFIG_DIR")/ecl-local-patches"', corruptedForm: ')$ecl-local' },
      { path: 'candidate="$(dirname "$(expand_home "$OPENCODE_CONFIG")")/ecl-local-patches"', corruptedForm: ')$ecl-local' },
    ];

    for (const { path: p, corruptedForm } of shellPaths) {
      const input = `---\ndescription: Test\n---\n\n\`\`\`bash\n${p}\n\`\`\``;
      const output = convertClaudeCommandToCodexSkill(input, 'ecl-test-704-paths');
      assert.ok(
        !output.includes(corruptedForm),
        `Path "${p}" was corrupted to contain "${corruptedForm}" after Codex conversion.\n` +
          `Got:\n${output}`,
      );
    }
  });

  test('convertClaudeCommandToCodexSkill still converts legitimate /ecl-<cmd> slash mentions', () => {
    // Slash-command mentions (not preceded by }) should still be converted
    const input = [
      '---',
      'description: Test',
      '---',
      '',
      'Use /ecl-discuss-phase to start a discussion.',
      'Or use /ecl-plan-phase for planning.',
      'Also: /ecl:capture --backlog adds items.',
    ].join('\n');

    const output = convertClaudeCommandToCodexSkill(input, 'ecl-test-704-cmds');

    assert.ok(
      output.includes('$ecl-discuss-phase'),
      'Expected /ecl-discuss-phase to be converted to $ecl-discuss-phase',
    );
    assert.ok(
      output.includes('$ecl-plan-phase'),
      'Expected /ecl-plan-phase to be converted to $ecl-plan-phase',
    );
    assert.ok(
      output.includes('$ecl-capture'),
      'Expected /ecl:capture to be converted to $ecl-capture',
    );
  });

  test('actual shipped workflow files: shell-variable launcher paths contain no $evolv-coder-lite', () => {
    // Walk evolv-coder-lite/workflows/ and assert that no file produces $evolv-coder-lite
    // inside a shell variable expansion context after Codex conversion.
    //
    // NOTE: The backtick-wrapped prose-path case (`/evolv-coder-lite/workflows/update.md`)
    // was a pre-existing gap with the #704 lookbehind fix and is now addressed by
    // the positive-boundary regex introduced in #712. That case is covered by the
    // "#712" describe block below.
    //
    // We probe for the specific shell-context pattern from the issue report:
    //   BAD:  ${_GSD_RUNTIME_ROOT}$evolv-coder-lite/bin/
    //   GOOD: ${_GSD_RUNTIME_ROOT}/evolv-coder-lite/bin/
    const workflowsDir = path.join(__dirname, '..', 'evolv-coder-lite', 'workflows');
    if (!fs.existsSync(workflowsDir)) {
      // If the directory doesn't exist, skip gracefully (non-standard layout)
      return;
    }

    const files = fs.readdirSync(workflowsDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => path.join(workflowsDir, f));

    assert.ok(files.length > 0, 'Expected at least one workflow .md file');

    // Shell-context corruption patterns from issue #704:
    //   - `}$ecl-*`: closing brace from `${VAR}/ecl-*` shell variable expressions
    //   - `)$ecl-*`: closing paren from `$(cmd)/ecl-*` command substitutions
    const SHELL_CORRUPTION_RE = /[})](\$ecl-[a-z])/;

    const offending = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const skillName = `ecl-${path.basename(file, '.md')}`;
      const converted = convertClaudeCommandToCodexSkill(content, skillName);
      const match = converted.match(SHELL_CORRUPTION_RE);
      if (match) {
        const idx = converted.indexOf(match[0]);
        offending.push({
          file: path.relative(workflowsDir, file),
          context: converted.substring(Math.max(0, idx - 40), idx + 80),
        });
      }
    }

    assert.deepStrictEqual(
      offending,
      [],
      `Found shell-context path corruption ([})]$ecl-*) in Codex-converted workflow files (#704):\n` +
        offending.map((o) => `  ${o.file}: ...${o.context}...`).join('\n'),
    );
  });

  test('commands/ecl/*.md: shell-variable launcher paths contain no $evolv-coder-lite', () => {
    // Walk commands/ecl/ and assert that no command file produces the shell-context
    // }$evolv-coder-lite corruption — since commands also go through
    // convertClaudeCommandToCodexSkill when installed globally for Codex.
    const commandsDir = path.join(__dirname, '..', 'commands', 'ecl');
    if (!fs.existsSync(commandsDir)) return;

    const files = fs.readdirSync(commandsDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => path.join(commandsDir, f));

    assert.ok(files.length > 0, 'Expected at least one command .md file');

    const SHELL_CORRUPTION_RE = /[})](\$ecl-[a-z])/;

    const offending = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const skillName = `ecl-${path.basename(file, '.md')}`;
      const converted = convertClaudeCommandToCodexSkill(content, skillName);
      const match = converted.match(SHELL_CORRUPTION_RE);
      if (match) {
        const idx = converted.indexOf(match[0]);
        offending.push({
          file: path.relative(commandsDir, file),
          context: converted.substring(Math.max(0, idx - 40), idx + 80),
        });
      }
    }

    assert.deepStrictEqual(
      offending,
      [],
      `Found shell-context path corruption ([})]$ecl-*) in Codex-converted command files (#704):\n` +
        offending.map((o) => `  ${o.file}: ...${o.context}...`).join('\n'),
    );
  });
});

describe('#712: positive-boundary slash-command conversion', () => {
  // Tests call convertSlashCommandsToCodexSkillMentions directly so the regex
  // is exercised in isolation — no frontmatter wrapping, no ADAPTER_CLOSE
  // stripping, no .claude→.codex rewrite masking the result.

  // ── MUST-NOT-CONVERT (negative) cases ─────────────────────────────────────
  // These inputs must be returned UNCHANGED — no $ecl-* substitution.

  test('backtick-wrapped path: `/evolv-coder-lite/workflows/update.md` is NOT converted (THE new fix)', () => {
    const input = 'See `/evolv-coder-lite/workflows/update.md` for details.';
    const result = convertSlashCommandsToCodexSkillMentions(input);
    assert.strictEqual(
      result,
      input,
      `Expected backtick-wrapped path to be unchanged. Got: ${result}`,
    );
  });

  test('backtick-wrapped path deeper: `/ecl-pi/bin/foo.cjs` is NOT converted', () => {
    const input = 'Run `/ecl-pi/bin/foo.cjs` directly.';
    const result = convertSlashCommandsToCodexSkillMentions(input);
    assert.strictEqual(
      result,
      input,
      `Expected deep backtick-wrapped path to be unchanged. Got: ${result}`,
    );
  });

  test('shell var expansion: ${_GSD_RUNTIME_ROOT}/evolv-coder-lite/bin/x is NOT converted (regression guard)', () => {
    const input = 'PATH="${_GSD_RUNTIME_ROOT}/evolv-coder-lite/bin/x"';
    const result = convertSlashCommandsToCodexSkillMentions(input);
    assert.ok(
      !result.includes('$evolv-coder-lite'),
      `Expected no $evolv-coder-lite substitution in shell var path. Got: ${result}`,
    );
    assert.ok(
      result.includes('/evolv-coder-lite/bin/x'),
      `Expected original path to be preserved. Got: ${result}`,
    );
  });

  test('command substitution: $(expand_home ~/.claude)/ecl-local-patches is NOT converted (regression guard)', () => {
    const input = 'candidate="$(expand_home ~/.claude)/ecl-local-patches"';
    const result = convertSlashCommandsToCodexSkillMentions(input);
    assert.ok(
      !result.includes(')$ecl-local'),
      `Expected no )$ecl-local substitution. Got: ${result}`,
    );
    assert.ok(
      result.includes(')/ecl-local-patches'),
      `Expected original path to be preserved. Got: ${result}`,
    );
  });

  test('plain path segment: bin/ecl-tools.cjs is NOT converted', () => {
    const input = 'node bin/ecl-tools.cjs --help';
    const result = convertSlashCommandsToCodexSkillMentions(input);
    assert.strictEqual(
      result,
      input,
      `Expected plain path segment to be unchanged. Got: ${result}`,
    );
  });

  test('plain path segment: .claude/evolv-coder-lite/agents — /evolv-coder-lite portion is NOT slash-command converted', () => {
    // Tests the regex in isolation: the .claude→.codex path rewrite that happens
    // inside convertClaudeToCodexMarkdown does NOT run here. We assert directly
    // that the slash-command regex leaves /evolv-coder-lite after the slash intact —
    // i.e. the `e` in `/evolv-coder-lite` is NOT treated as a command boundary.
    const input = 'Look in .claude/evolv-coder-lite/agents for the agent files.';
    const result = convertSlashCommandsToCodexSkillMentions(input);
    assert.ok(
      !result.includes('$evolv-coder-lite'),
      `Expected no $evolv-coder-lite substitution in .claude/evolv-coder-lite path. Got: ${result}`,
    );
    assert.ok(
      result.includes('/evolv-coder-lite/agents'),
      `Expected /evolv-coder-lite/agents to remain as a path segment. Got: ${result}`,
    );
  });

  // ── MUST-CONVERT (positive) cases ─────────────────────────────────────────
  // These inputs contain legitimate /ecl-<cmd> mentions that MUST be converted.

  test('space-preceded prose: Use /ecl-discuss-phase to start. → $ecl-discuss-phase', () => {
    const input = 'Use /ecl-discuss-phase to start.';
    const result = convertSlashCommandsToCodexSkillMentions(input);
    assert.ok(
      result.includes('$ecl-discuss-phase'),
      `Expected /ecl-discuss-phase to be converted. Got: ${result}`,
    );
    assert.ok(
      !result.includes('/ecl-discuss-phase'),
      `Expected original /ecl-discuss-phase to be replaced. Got: ${result}`,
    );
  });

  test('backtick-WRAPPED MENTION (single segment): Run `/ecl-execute-phase` now → `$ecl-execute-phase`', () => {
    // A backtick-wrapped COMMAND (single segment, no path continuation) MUST
    // still be converted — this guards against a naive whitespace-only fix.
    const input = 'Run `/ecl-execute-phase` now.';
    const result = convertSlashCommandsToCodexSkillMentions(input);
    assert.ok(
      result.includes('`$ecl-execute-phase`'),
      `Expected backtick-wrapped command to be converted to \`$ecl-execute-phase\`. Got: ${result}`,
    );
    assert.ok(
      !result.includes('`/ecl-execute-phase`'),
      `Expected original \`/ecl-execute-phase\` to be replaced. Got: ${result}`,
    );
  });

  test('parenthetical/backtick list like CONTEXT.md:59: (`/ecl-plan-phase`, `/ecl-progress`) → converted', () => {
    const input = 'Available commands: (`/ecl-plan-phase`, `/ecl-progress`) — pick one.';
    const result = convertSlashCommandsToCodexSkillMentions(input);
    assert.ok(
      result.includes('`$ecl-plan-phase`'),
      `Expected /ecl-plan-phase to be converted. Got: ${result}`,
    );
    assert.ok(
      result.includes('`$ecl-progress`'),
      `Expected /ecl-progress to be converted. Got: ${result}`,
    );
  });

  test('start-of-string: /ecl-manager runs → $ecl-manager runs (exercises the ^ branch of lookbehind)', () => {
    // This case is IMPOSSIBLE to test through the frontmatter-wrapping pipeline
    // (the body always has preceding chars). Direct call exercises the ^ branch.
    const input = '/ecl-manager runs the pipeline.';
    const result = convertSlashCommandsToCodexSkillMentions(input);
    assert.ok(
      result.includes('$ecl-manager'),
      `Expected /ecl-manager to be converted. Got: ${result}`,
    );
    assert.ok(
      !result.includes('/ecl-manager'),
      `Expected original /ecl-manager to be replaced. Got: ${result}`,
    );
  });

  test('double-quote wrapped: "/ecl-resume" → "$ecl-resume"', () => {
    const input = 'Call "/ecl-resume" to continue.';
    const result = convertSlashCommandsToCodexSkillMentions(input);
    assert.ok(
      result.includes('"$ecl-resume"'),
      `Expected "/ecl-resume" to be converted to "$ecl-resume". Got: ${result}`,
    );
    assert.ok(
      !result.includes('"/ecl-resume"'),
      `Expected original "/ecl-resume" to be replaced. Got: ${result}`,
    );
  });

  // ── End-to-end: headline #712 bug through the real install pipeline ────────

  test('end-to-end: backtick-wrapped path `/evolv-coder-lite/workflows/update.md` survives full Codex install pipeline', () => {
    // Uses convertClaudeCommandToCodexSkill (same pattern as #704 tests above)
    // to prove the real install path does not corrupt prose references to repo paths.
    const input = [
      '---',
      'description: Test',
      '---',
      '',
      'See `/evolv-coder-lite/workflows/update.md` for the update workflow.',
    ].join('\n');

    const output = convertClaudeCommandToCodexSkill(input, 'ecl-test-712-e2e');

    assert.ok(
      !output.includes('$evolv-coder-lite'),
      `Expected no $evolv-coder-lite in converted output. Got:\n${output}`,
    );
    assert.ok(
      output.includes('/evolv-coder-lite/workflows/update.md'),
      `Expected backtick-wrapped path to survive conversion. Got:\n${output}`,
    );
  });
});
