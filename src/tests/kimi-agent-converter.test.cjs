/**
 * Kimi CLI agent artifact contract tests.
 *
 * Kimi custom agents are explicit YAML files loaded with `kimi --agent-file`.
 * This suite tests the in-memory artifact contract only; install/layout wiring
 * belongs to the later Phase 3 slices.
 */

process.env.ECL_TEST_MODE = '1';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  buildKimiAgentArtifacts,
} = require('../bin/install.js');

const ROOT_AGENT = `---
name: ecl
description: Root eCL agent for Kimi CLI
tools: Agent, mcp__github__search, DefinitelyUnknownTool
color: blue
---

# eCL Root

Coordinate eCL workflows through subagents.
Read ~/.claude/evolv-coder-lite when source-package context is needed.`;

const EXECUTOR_AGENT = `---
name: ecl-executor
description: Execute planned eCL task slices with atomic commits.
tools: Read, Write, Edit, Bash, Grep, Glob
color: yellow
---

<role>
You are a eCL plan executor.
</role>`;

const INVALID_AGENT = `---
name: not a valid kimi agent
description: Invalid name should be diagnosed and skipped.
tools: Agent
---

This should not become a Kimi custom subagent.`;

describe('buildKimiAgentArtifacts', () => {
  test('builds a root Kimi agent YAML contract with explicit subagent paths', () => {
    const result = buildKimiAgentArtifacts({
      rootAgent: ROOT_AGENT,
      subagents: [
        { path: 'agents/ecl-executor.md', content: EXECUTOR_AGENT },
      ],
      requestedSubagents: ['ecl-executor', 'ecl-missing'],
    });

    assert.equal(result.root.yamlPath, 'agents/ecl.yaml');
    assert.equal(result.root.promptPath, 'agents/ecl.md');
    assert.ok(result.root.yaml.includes('version: 1'), 'root YAML includes Kimi version marker');
    assert.ok(result.root.yaml.includes('agent:'), 'root YAML includes agent object');
    assert.ok(result.root.yaml.includes('name: ecl'), 'root agent name is ecl');
    assert.ok(result.root.yaml.includes('extend: default'), 'root agent extends default Kimi behavior');
    assert.ok(result.root.yaml.includes('system_prompt_path: ./ecl.md'), 'root prompt path is relative');
    assert.ok(result.root.yaml.includes('tools:'), 'root YAML has a tools field');
    assert.ok(result.root.yaml.includes('kimi_cli.tools.agent:Agent'), 'root can call Kimi subagents');
    assert.ok(
      result.root.yaml.includes('kimi_cli.tools.agent:Agent'),
      'root tools use Kimi module paths'
    );
    assert.ok(!result.root.yaml.includes('- Agent'), 'root YAML does not emit raw Claude Agent tool');
    assert.ok(result.root.yaml.includes('subagents:'), 'root YAML declares custom subagents');
    assert.ok(result.root.yaml.includes('ecl-executor:'), 'known eCL subagent key is canonical');
    assert.ok(
      result.root.yaml.includes('path: ./subagents/ecl-executor.yaml'),
      'known eCL subagent path is relative to root YAML'
    );
    assert.ok(!result.root.yaml.includes('ecl-missing'), 'unknown requested subagent is excluded');
  });

  test('emits separate frontmatter-free Markdown prompts for root and subagents', () => {
    const result = buildKimiAgentArtifacts({
      rootAgent: ROOT_AGENT,
      subagents: [
        { path: 'agents/ecl-executor.md', content: EXECUTOR_AGENT },
      ],
      requestedSubagents: ['ecl-executor'],
    });

    const executor = result.subagents.find((artifact) => artifact.name === 'ecl-executor');
    assert.ok(executor, 'executor subagent artifact exists');

    assert.equal(executor.yamlPath, 'agents/subagents/ecl-executor.yaml');
    assert.equal(executor.promptPath, 'agents/subagents/ecl-executor.md');
    assert.ok(executor.yaml.includes('system_prompt_path: ./ecl-executor.md'));
    assert.ok(executor.yaml.includes('kimi_cli.tools.file:ReadFile'), 'Read maps to Kimi file tool');
    assert.ok(executor.yaml.includes('kimi_cli.tools.file:WriteFile'), 'Write maps to Kimi file tool');
    assert.ok(executor.yaml.includes('kimi_cli.tools.file:StrReplaceFile'), 'Edit maps to Kimi file tool');
    assert.ok(executor.yaml.includes('kimi_cli.tools.shell:Shell'), 'Bash maps to Kimi shell tool');
    assert.ok(executor.yaml.includes('kimi_cli.tools.file:Grep'), 'Grep maps to Kimi grep tool');
    assert.ok(executor.yaml.includes('kimi_cli.tools.file:Glob'), 'Glob maps to Kimi glob tool');
    assert.ok(!executor.yaml.includes('- Read'), 'subagent YAML does not emit raw Claude Read tool');
    assert.ok(!executor.yaml.includes('- Bash'), 'subagent YAML does not emit raw Claude Bash tool');
    assert.ok(!executor.yaml.includes('kimi_cli.tools.agent:Agent'), 'subagent does not inherit nested Agent tool');

    for (const prompt of [result.root.prompt, executor.prompt]) {
      assert.ok(!prompt.trimStart().startsWith('---'), 'source frontmatter is removed');
      assert.ok(!prompt.includes('tools:'), 'source frontmatter tools do not leak into prompt');
      assert.ok(!prompt.includes('color:'), 'source frontmatter color does not leak into prompt');
    }
    assert.ok(result.root.prompt.includes('# eCL Root'), 'root body content is preserved');
    assert.ok(executor.prompt.includes('You are a eCL plan executor.'), 'subagent body content is preserved');
    assert.ok(!result.root.prompt.includes('~/.claude/evolv-coder-lite'), 'Claude-specific path is neutralized');
  });

  test('diagnoses unknown subagents and unsupported inputs instead of emitting invalid names', () => {
    const result = buildKimiAgentArtifacts({
      rootAgent: ROOT_AGENT,
      subagents: [
        { path: 'agents/ecl-executor.md', content: EXECUTOR_AGENT },
        { path: 'agents/not-valid.md', content: INVALID_AGENT },
      ],
      requestedSubagents: ['ecl-executor', 'ecl-missing'],
    });

    assert.deepEqual(
      result.subagents.map((artifact) => artifact.name),
      ['ecl-executor'],
      'invalid and unknown subagents are not emitted'
    );
    assert.ok(
      result.diagnostics.some((item) => item.code === 'kimi_unknown_subagent' && item.value === 'ecl-missing'),
      'unknown requested subagent is diagnosed'
    );
    assert.ok(
      result.diagnostics.some((item) => item.code === 'kimi_invalid_subagent_name'),
      'invalid source subagent name is diagnosed'
    );
    assert.ok(
      result.diagnostics.some((item) => item.code === 'kimi_mcp_tool_excluded'),
      'MCP-managed tools are diagnosed and excluded'
    );
    assert.ok(
      result.diagnostics.some((item) => item.reason === 'mcp_managed'),
      'MCP diagnostics expose mapper reason'
    );
    assert.ok(
      result.diagnostics.some((item) => item.code === 'kimi_unsupported_tool'),
      'unsupported tools are diagnosed and excluded'
    );
    assert.ok(
      result.diagnostics.some((item) => item.reason === 'unsupported_tool'),
      'unsupported diagnostics expose mapper reason'
    );
    assert.ok(!result.root.yaml.includes('mcp__github__search'), 'MCP tool names are not emitted');
    assert.ok(!result.root.yaml.includes('DefinitelyUnknownTool'), 'unsupported tool names are not emitted');
  });
});
