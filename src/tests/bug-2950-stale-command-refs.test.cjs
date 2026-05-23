/**
 * Bug #2950: Stale deleted command references in workflow files
 *
 * Multiple workflow files referenced command names removed in #2790
 * (ecl-add-phase, ecl-insert-phase, ecl-remove-phase, ecl-add-todo,
 * ecl-set-profile, ecl-settings-integrations, ecl-settings-advanced,
 * ecl-spike-wrap-up, ecl-sketch-wrap-up, ecl-code-review-fix).
 *
 * Fix: Update every occurrence to the new consolidated forms:
 *   /ecl:phase (no flag | --insert | --remove)
 *   /ecl:capture
 *   /ecl:config (--profile | --integrations | --advanced)
 *   /ecl:spike --wrap-up
 *   /ecl:sketch --wrap-up
 *   /ecl:code-review --fix
 */

'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WORKFLOWS_DIR = path.join(__dirname, '..', 'evolv-coder-lite', 'workflows');

function read(filename) {
  return fs.readFileSync(path.join(WORKFLOWS_DIR, filename), 'utf-8');
}

// Deleted command names that must not appear anywhere in the fixed files.
const DELETED_COMMANDS = [
  '/ecl-add-phase',
  '/ecl-insert-phase',
  '/ecl-remove-phase',
  '/ecl-add-todo',
  '/ecl-set-profile',
  '/ecl-settings-integrations',
  '/ecl-settings-advanced',
  '/ecl-spike-wrap-up',
  '/ecl-sketch-wrap-up',
  '/ecl-code-review-fix',
];

// Per-file assertions: [file, deletedCmd, newForm]
const FILE_ASSERTIONS = [
  // help.md → moved to help/modes/full.md in #3039 tiered-help refactor
  ['help/modes/full.md', '/ecl-add-phase', '/ecl:phase "Add admin dashboard"'],
  ['help/modes/full.md', '/ecl-insert-phase', '/ecl:phase --insert 7 "Fix critical auth bug"'],
  ['help/modes/full.md', '/ecl-remove-phase', '/ecl:phase --remove 17'],
  ['help/modes/full.md', '/ecl-spike-wrap-up', '/ecl:spike --wrap-up'],
  ['help/modes/full.md', '/ecl-sketch-wrap-up', '/ecl:sketch --wrap-up'],
  ['help/modes/full.md', '/ecl-add-todo', '/ecl:capture'],
  ['help/modes/full.md', '/ecl-set-profile', '/ecl:config --profile budget'],

  // do.md
  ['do.md', '/ecl-spike-wrap-up', '/ecl:spike --wrap-up'],
  ['do.md', '/ecl-sketch-wrap-up', '/ecl:sketch --wrap-up'],
  ['do.md', '/ecl-add-phase', '/ecl:phase'],
  ['do.md', '/ecl-add-todo', '/ecl:capture'],

  // settings.md
  ['settings.md', '/ecl-code-review-fix', '/ecl:code-review --fix'],
  ['settings.md', '/ecl-settings-integrations', '/ecl:config --integrations'],
  ['settings.md', '/ecl-set-profile', '/ecl:config --profile'],
  ['settings.md', '/ecl-settings-advanced', '/ecl:config --advanced'],

  // discuss-phase.md
  ['discuss-phase.md', '/ecl-spike-wrap-up', '/ecl:spike --wrap-up'],
  ['discuss-phase.md', '/ecl-sketch-wrap-up', '/ecl:sketch --wrap-up'],

  // new-project.md
  ['new-project.md', '/ecl-spike-wrap-up', '/ecl:spike --wrap-up'],
  ['new-project.md', '/ecl-sketch-wrap-up', '/ecl:sketch --wrap-up'],

  // plan-phase.md
  ['plan-phase.md', '/ecl-insert-phase', '/ecl:phase --insert'],

  // spike.md
  ['spike.md', '/ecl-spike-wrap-up', '/ecl:spike --wrap-up'],

  // sketch.md
  ['sketch.md', '/ecl-sketch-wrap-up', '/ecl:sketch --wrap-up'],
];

describe('bug #2950: stale deleted-command references removed from workflow files', () => {
  // Build a map of file → content to avoid re-reading
  const files = [...new Set(FILE_ASSERTIONS.map(([f]) => f))];
  const contentMap = {};
  for (const f of files) {
    contentMap[f] = read(f);
  }

  // For each (file, deletedCmd) pair, assert the old name is absent
  for (const [file, deletedCmd] of FILE_ASSERTIONS) {
    test(`${file}: does not contain deleted command "${deletedCmd}"`, () => {
      const content = contentMap[file];
      assert.ok(
        !content.includes(deletedCmd),
        `${file} still contains deleted command "${deletedCmd}" — update to new form`
      );
    });
  }

  // For each (file, deletedCmd, newForm) triple, assert the new form is present
  for (const [file, , newForm] of FILE_ASSERTIONS) {
    test(`${file}: contains new form "${newForm}"`, () => {
      const content = contentMap[file];
      assert.ok(
        content.includes(newForm),
        `${file} is missing expected new form "${newForm}"`
      );
    });
  }

  // Blanket check: no affected workflow file contains any of the deleted command names
  // (catches any we might have missed in per-file assertions above)
  const affectedFiles = [
    'help.md',
    'help/modes/full.md',
    'help/modes/default.md',
    'help/modes/brief.md',
    'help/modes/topic.md',
    'do.md',
    'settings.md',
    'discuss-phase.md',
    'new-project.md',
    'plan-phase.md',
    'spike.md',
    'sketch.md',
  ];

  for (const file of affectedFiles) {
    const content = read(file);
    for (const deleted of DELETED_COMMANDS) {
      test(`${file}: blanket check — "${deleted}" not present`, () => {
        assert.ok(
          !content.includes(deleted),
          `${file} contains deleted command "${deleted}"`
        );
      });
    }
  }
});
