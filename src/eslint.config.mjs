import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import pluginN from 'eslint-plugin-n';
import noOnlyTests from 'eslint-plugin-no-only-tests';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Local plugin with custom AST rules
import noSourceGrep from './eslint-rules/no-source-grep.cjs';
import noMagicSleepInTests from './eslint-rules/no-magic-sleep-in-tests.cjs';
import noElapsedAssertion from './eslint-rules/no-elapsed-assertion.cjs';
import noRawRmsyncInTests from './eslint-rules/no-raw-rmsync-in-tests.cjs';
import noTautologicalAssert from './eslint-rules/no-tautological-assert.cjs';

const localPlugin = {
  rules: {
    'no-source-grep': noSourceGrep,
    'no-magic-sleep-in-tests': noMagicSleepInTests,
    'no-elapsed-assertion': noElapsedAssertion,
    'no-raw-rmsync-in-tests': noRawRmsyncInTests,
    'no-tautological-assert': noTautologicalAssert,
  },
};

export default tseslint.config(
  // ── Global ignores ─────────────────────────────────────────────────────────
  {
    ignores: [
      'node_modules/**',
      '**/dist/**',
      '.worktrees/**',
      '.claude/**',
      'coverage/**',
      '**/*.generated.cjs',
      // ADR-457: tsc-generated runtime artifact — lint the src/*.cts source, not the emitted .cjs.
      'evolv-coder-lite/bin/lib/semver-compare.cjs',
      'evolv-coder-lite/bin/lib/plan-drift-guard.cjs',
      'evolv-coder-lite/bin/lib/cli-exit.cjs',
      'evolv-coder-lite/bin/lib/edge-probe.cjs',
      'evolv-coder-lite/bin/lib/probe-core.cjs',
      'evolv-coder-lite/bin/lib/prohibition-enforcement.cjs',
      'evolv-coder-lite/bin/lib/code-review-flags.cjs',
      'evolv-coder-lite/bin/lib/context-utilization.cjs',
      'evolv-coder-lite/bin/lib/artifacts.cjs',
      'evolv-coder-lite/bin/lib/command-arg-projection.cjs',
      'evolv-coder-lite/bin/lib/clock.cjs',
      'evolv-coder-lite/bin/lib/ui-safety-gate.cjs',
      'evolv-coder-lite/bin/lib/review-reviewer-selection.cjs',
      'evolv-coder-lite/bin/lib/clusters.cjs',
      'evolv-coder-lite/bin/lib/installer-migrations/001-legacy-orphan-files.cjs',
      'evolv-coder-lite/bin/lib/observability/redaction.cjs',
      'evolv-coder-lite/bin/lib/installer-migration-report.cjs',
      'evolv-coder-lite/bin/lib/prompt-budget.cjs',
      'evolv-coder-lite/bin/lib/secrets.cjs',
      'evolv-coder-lite/bin/lib/phase-lifecycle.cjs',
      'evolv-coder-lite/bin/lib/workstream-name-policy.cjs',
      'evolv-coder-lite/bin/lib/decisions.cjs',
      'evolv-coder-lite/bin/lib/validate.cjs',
      'evolv-coder-lite/bin/lib/schema-detect.cjs',
      'evolv-coder-lite/bin/lib/runtime-name-policy.cjs',
      'evolv-coder-lite/bin/lib/runtime-slash.cjs',
      'evolv-coder-lite/bin/lib/observability/event.cjs',
      'evolv-coder-lite/bin/lib/workstream-inventory-builder.cjs',
      'evolv-coder-lite/bin/lib/plan-scan.cjs',
      'evolv-coder-lite/bin/lib/fallow-runner.cjs',
      'evolv-coder-lite/bin/lib/project-root.cjs',
      'evolv-coder-lite/bin/lib/installer-migration-authoring.cjs',
      'evolv-coder-lite/bin/lib/update-context.cjs',
      'evolv-coder-lite/bin/lib/installer-migrations/000-first-time-baseline.cjs',
      'evolv-coder-lite/bin/lib/runtime-homes.cjs',
      'evolv-coder-lite/bin/lib/model-catalog.cjs',
      'evolv-coder-lite/bin/lib/configuration.cjs',
      'evolv-coder-lite/bin/lib/state-document.cjs',
      'evolv-coder-lite/bin/lib/shell-command-projection.cjs',
      'evolv-coder-lite/bin/lib/security.cjs',
      'evolv-coder-lite/bin/lib/command-aliases.cjs',
      'evolv-coder-lite/bin/lib/config-schema.cjs',
      'evolv-coder-lite/bin/lib/model-profiles.cjs',
      'evolv-coder-lite/bin/lib/model-resolver.cjs',
      'evolv-coder-lite/bin/lib/loop-resolver.cjs',
      'evolv-coder-lite/bin/lib/capability-state.cjs',
      'evolv-coder-lite/bin/lib/capability-activation.cjs',
      'evolv-coder-lite/bin/lib/federated-config.cjs',
      'evolv-coder-lite/bin/lib/installer-migrations/002-codex-legacy-hooks-json.cjs',
      'evolv-coder-lite/bin/lib/installer-migrations/003-rename-evolv-coder-lite-to-evolv-coder-lite.cjs',
      'evolv-coder-lite/bin/lib/installer-migrations/004-prune-stale-pristine-snapshots.cjs',
      'evolv-coder-lite/bin/lib/observability/logger.cjs',
      'evolv-coder-lite/bin/lib/active-workstream-store.cjs',
      'evolv-coder-lite/bin/lib/adr-parser.cjs',
      'evolv-coder-lite/bin/lib/graphify.cjs',
      'evolv-coder-lite/bin/lib/graphify-command-router.cjs',
      'evolv-coder-lite/bin/lib/audit-command-router.cjs',
      'evolv-coder-lite/bin/lib/intel-command-router.cjs',
      'evolv-coder-lite/bin/lib/install-profiles.cjs',
      'evolv-coder-lite/bin/lib/intel.cjs',
      'evolv-coder-lite/bin/lib/installer-migrations.cjs',
      'evolv-coder-lite/bin/lib/worktree-safety.cjs',
      'evolv-coder-lite/bin/lib/worktree-base-ref.cjs',
      'evolv-coder-lite/bin/lib/planning-workspace.cjs',
      'evolv-coder-lite/bin/lib/command-roster.cjs',
      'evolv-coder-lite/bin/lib/runtime-artifact-conversion.cjs',
      'evolv-coder-lite/bin/lib/runtime-artifact-layout.cjs',
      'evolv-coder-lite/bin/lib/runtime-config-adapter-registry.cjs',
      'evolv-coder-lite/bin/lib/runtime-hooks-surface.cjs',
      'evolv-coder-lite/bin/lib/command-routing-hub.cjs',
      'evolv-coder-lite/bin/lib/core-utils.cjs',
      'evolv-coder-lite/bin/lib/io.cjs',
      'evolv-coder-lite/bin/lib/phase-id.cjs',
      'evolv-coder-lite/bin/lib/config-loader.cjs',
      'evolv-coder-lite/bin/lib/phase-locator.cjs',
      'evolv-coder-lite/bin/lib/roadmap-parser.cjs',
      'evolv-coder-lite/bin/lib/drift.cjs',
      'evolv-coder-lite/bin/lib/cjs-command-router-adapter.cjs',
      'evolv-coder-lite/bin/lib/phase-command-router.cjs',
      'evolv-coder-lite/bin/lib/surface.cjs',
      'evolv-coder-lite/bin/lib/roadmap-upgrade.cjs',
      'evolv-coder-lite/bin/lib/config-types.cjs',
      'evolv-coder-lite/bin/lib/phases-command-router.cjs',
      'evolv-coder-lite/bin/lib/verify-command-router.cjs',
      'evolv-coder-lite/bin/lib/verification.cjs',
      'evolv-coder-lite/bin/lib/verification-command-router.cjs',
      'evolv-coder-lite/bin/lib/init-command-router.cjs',
      'evolv-coder-lite/bin/lib/agent-command-router.cjs',
      'evolv-coder-lite/bin/lib/agent-install-check.cjs',
      'evolv-coder-lite/bin/lib/task-command-router.cjs',
      'evolv-coder-lite/bin/lib/validate-command-router.cjs',
      'evolv-coder-lite/bin/lib/workstream-inventory.cjs',
      'evolv-coder-lite/bin/lib/roadmap-command-router.cjs',
      'evolv-coder-lite/bin/lib/state-command-router.cjs',
      'evolv-coder-lite/bin/lib/gap-checker.cjs',
      'evolv-coder-lite/bin/lib/config.cjs',
      'evolv-coder-lite/bin/lib/profile-output.cjs',
      'evolv-coder-lite/bin/lib/commands.cjs',
      'evolv-coder-lite/bin/lib/state.cjs',
      'evolv-coder-lite/bin/lib/milestone.cjs',
      'evolv-coder-lite/bin/lib/phase.cjs',
      'evolv-coder-lite/bin/lib/verify.cjs',
      'evolv-coder-lite/bin/lib/init.cjs',
      'evolv-coder-lite/bin/lib/docs.cjs',
      'evolv-coder-lite/bin/lib/check-command-router.cjs',
      'evolv-coder-lite/bin/lib/frontmatter.cjs',
      'evolv-coder-lite/bin/lib/learnings.cjs',
      'evolv-coder-lite/bin/lib/ecl2-import.cjs',
      'evolv-coder-lite/bin/lib/profile-pipeline.cjs',
      'evolv-coder-lite/bin/lib/template.cjs',
      'evolv-coder-lite/bin/lib/uat.cjs',
      'evolv-coder-lite/bin/lib/uat-predicate.cjs',
      'evolv-coder-lite/bin/lib/workstream.cjs',
      'evolv-coder-lite/bin/lib/roadmap.cjs',
      'evolv-coder-lite/bin/lib/audit.cjs',
      'evolv-coder-lite/bin/lib/research-store.cjs',
      'evolv-coder-lite/bin/lib/research-provider.cjs',
      'evolv-coder-lite/bin/lib/package-legitimacy.cjs',
      // ADR-457: tsc-generated runtime artifact — lint the src/git-base-branch.cts source.
      'evolv-coder-lite/bin/lib/git-base-branch.cjs',
      // ADR-1213: tsc-generated runtime artifact — lint the src/capability-writer.cts source.
      'evolv-coder-lite/bin/lib/capability-writer.cjs',
      // issue #1355: tsc-generated runtime artifact — lint the src/teams-status.cts source.
      'evolv-coder-lite/bin/lib/teams-status.cjs',
    ],
  },

  // ── src/**/*.cts — TypeScript runtime sources (ADR-457 build-at-publish) ─────
  // First-class type-aware linting on the migrated source. The TS compiler
  // (`npm run build:lib`, strict + noEmitOnError) is the primary type gate;
  // these rules add lint-level coverage. warn-first per the harness convention.
  {
    files: ['src/**/*.cts'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.build.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // ── evolv-coder-lite/bin/**/*.cjs + scripts/**/*.cjs ───────────────────────────
  // CommonJS Node files: js.recommended + eslint-plugin-n + local plugin rules
  {
    files: ['evolv-coder-lite/bin/**/*.cjs', 'scripts/**/*.cjs'],
    plugins: {
      n: pluginN,
      local: localPlugin,
    },
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Generic quality rules
      'no-var': 'error',
      'prefer-const': 'warn',
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      // Downgraded from recommended error → warn (pre-existing violations; follow-up to fix)
      'no-useless-escape': 'warn',
      'no-unsafe-finally': 'warn',
      // eslint-plugin-n rules
      'n/no-process-exit': 'error',
      'n/no-path-concat': 'error',
      // Local rules — warn for now; flip to error after cleanup phases
      'local/no-source-grep': 'warn',
    },
  },

  // ── tests/**/*.test.cjs ─────────────────────────────────────────────────────
  {
    files: ['tests/**/*.test.cjs'],
    plugins: {
      'no-only-tests': noOnlyTests,
      local: localPlugin,
    },
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-only-tests/no-only-tests': 'error',
      // Timing anti-patterns — ratcheted to error after cleanup (all violations fixed)
      'local/no-magic-sleep-in-tests': 'error',
      'local/no-elapsed-assertion': 'warn',
      // Ban raw fs.rmSync in tests — use helpers.cleanup() for Windows-EBUSY retry budget
      'local/no-raw-rmsync-in-tests': 'error',
      // Ban tautological assertions (always-truthy arg or identical-literal equality)
      'local/no-tautological-assert': 'error',
      // Ban source-grep pattern in tests — use require() + behavior assertions instead
      'local/no-source-grep': 'error',
      // Ban raw setTimeout sync + elapsed/duration-style assertions via no-restricted-syntax
      'no-restricted-syntax': [
        'error',
        {
          selector: 'AwaitExpression > NewExpression[callee.name="Promise"] ArrowFunctionExpression CallExpression[callee.name="setTimeout"]',
          message: 'Raw setTimeout used for synchronization in tests. Use proper async patterns instead.',
        },
        {
          selector: 'CallExpression[callee.object.name="Atomics"][callee.property.name="wait"]',
          message: 'Atomics.wait() used as a sleep in tests. Use a proper async wait pattern instead.',
        },
      ],
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      // Downgraded from recommended error → warn (pre-existing violations; follow-up to fix)
      'no-useless-escape': 'warn',
      'no-regex-spaces': 'warn',
      'no-control-regex': 'error',
      'no-irregular-whitespace': 'warn',
    },
  },

  // ── #1279 lint-rule fail-first fixture ──────────────────────────────────────
  // `tests/_ff_lint_violation.cjs` is a PLAIN `.cjs` (NOT `*.test.cjs`) on purpose: it is a KNOWN
  // `local/no-source-grep` violation that `defaultProveFailFirst` lints to machine-prove the rule
  // has teeth, and it must stay OFF the `node --test` runner glob (executing it ENOENTs on the
  // intentional `lib/foo.cjs` path). It still needs the `local` plugin registered so its inline
  // `/* eslint-disable local/no-source-grep */` resolves (otherwise `eslint .` errors "rule not
  // found") and the violation lands in `suppressedMessages` (which the prover reads), keeping the
  // project's own `eslint .` green. (#1279)
  {
    files: ['tests/_ff_lint_violation.cjs'],
    plugins: { local: localPlugin },
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } },
    rules: { 'local/no-source-grep': 'error' },
  },
);
