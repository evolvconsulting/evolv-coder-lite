'use strict';

const assert = require('node:assert/strict');
const { describe, test } = require('node:test');
const {
  buildDiscordReleasePayload,
  cleanBullet,
  collectSections,
  extractInstallCommand,
} = require('../scripts/release-notes/discord-release-summary.cjs');

const sampleRelease = {
  tagName: 'v1.4.0-rc.1',
  name: 'v1.4.0-rc.1',
  isPrerelease: true,
  url: 'https://github.com/evolvconsulting/evolv-coder-lite/releases/tag/v1.4.0-rc.1',
  body: [
    '## Install',
    '',
    'This pre-release is published to npm under the `next` dist-tag.',
    '',
    '```bash',
    'npm i @evolvconsulting/evolv-coder-lite@1.4.0-rc.1',
    '# or',
    'npm i @evolvconsulting/evolv-coder-lite@next',
    '```',
    '',
    '## What\'s Changed',
    '',
    '### Feature',
    '* feat(#656): Research module cache by @trek-e in https://github.com/evolvconsulting/evolv-coder-lite/pull/664',
    '* feat(#717): size budget on bytes by @trek-e in https://github.com/evolvconsulting/evolv-coder-lite/pull/719',
    '* feat(#159): auto-use existing RESEARCH.md by @trek-e in https://github.com/evolvconsulting/evolv-coder-lite/pull/718',
    '* feat(#703): add --granularity override by @trek-e in https://github.com/evolvconsulting/evolv-coder-lite/pull/750',
    '* feat(#25): scope verifier Step 7b by @trek-e in https://github.com/evolvconsulting/evolv-coder-lite/pull/753',
    '',
    '### Fix',
    '* fix(#663): resolve CodeQL alerts by @trek-e in https://github.com/evolvconsulting/evolv-coder-lite/pull/665',
    '',
    '**Full Changelog**: https://github.com/evolvconsulting/evolv-coder-lite/compare/v1.3.1...v1.4.0-rc.1',
  ].join('\n'),
};

describe('discord release summary', () => {
  test('builds a hybrid payload with a preserved full changelog URL', () => {
    const payload = buildDiscordReleasePayload({
      release: sampleRelease,
      packageName: '@evolvconsulting/evolv-coder-lite',
      maxContent: 1850,
    });

    assert.equal(payload.username, 'eCL Releases');
    assert.match(payload.content, /\*\*@evolvconsulting\/evolv-coder-lite v1\.4\.0-rc\.1 pre-release is out\*\*/);
    assert.match(payload.content, /`npm i @evolvconsulting\/evolv-coder-lite@1\.4\.0-rc\.1`/);
    assert.match(payload.content, /Full changelog: https:\/\/github\.com\/evolvconsulting\/evolv-coder-lite\/releases\/tag\/v1\.4\.0-rc\.1/);
    assert.doesNotMatch(payload.content, /\*\*Full Changelog\*\*:\s*$/m);
    assert.match(payload.content, /Research module cache \(#664\)/);
    assert.match(payload.content, /\.\.\.and 1 more features/);
    assert.equal(payload.embeds[0].fields[1].value, '`next`');
  });

  test('summarizes auto-generated What Changed bullets when release notes are not yet curated', () => {
    const sections = collectSections([
      '## What\'s Changed',
      '* feat: add thing by @trek-e in https://github.com/evolvconsulting/evolv-coder-lite/pull/10',
      '* fix: repair thing by @trek-e in https://github.com/evolvconsulting/evolv-coder-lite/pull/11',
      '* docs: explain thing by @trek-e in https://github.com/evolvconsulting/evolv-coder-lite/pull/12',
    ].join('\n'));

    assert.deepEqual(sections.get('Feature'), ['add thing (#10)']);
    assert.deepEqual(sections.get('Fix'), ['repair thing (#11)']);
    assert.deepEqual(sections.get('Enhancement'), ['explain thing (#12)']);
  });

  test('cleans common GitHub release-note link noise without deleting issue references', () => {
    assert.equal(
      cleanBullet('* fix: repair [#670](https://github.com/evolvconsulting/evolv-coder-lite/issues/670) by @trek-e in https://github.com/evolvconsulting/evolv-coder-lite/pull/675'),
      'repair #670 (#675)'
    );
  });

  test('falls back to the release channel when no install block exists', () => {
    assert.equal(
      extractInstallCommand('', '@evolvconsulting/evolv-coder-lite', { tagName: 'v1.4.0-rc.1', isPrerelease: true }),
      'npm i @evolvconsulting/evolv-coder-lite@next'
    );
    assert.equal(
      extractInstallCommand('', '@evolvconsulting/evolv-coder-lite', { tagName: 'v1.4.0', isPrerelease: false }),
      'npm i @evolvconsulting/evolv-coder-lite@latest'
    );
  });
});
