/**
 * Regression test for bug #3359.
 *
 * `npx @evolvconsulting/evolv-coder-lite@latest` can refresh runtime files while an older
 * global `ecl-sdk` earlier on PATH remains the executable workflows call.
 * The installer must not report SDK readiness when the resolved `ecl-sdk`
 * version differs from the package/runtime version being installed.
 */

'use strict';

process.env.ECL_TEST_MODE = '1';

const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { installSdkIfNeeded, readGsdSdkVersion } = require('../bin/install.js');
const cp = require('node:child_process');
const pkg = require('../package.json');
const { createTempDir, cleanup, captureConsole } = require('./helpers.cjs');

const isWindows = process.platform === 'win32';

describe('bug #3359: installer detects stale ecl-sdk earlier on PATH',
  { skip: isWindows ? 'POSIX-only: stages bare ecl-sdk shebang shims in a PATH dir; Windows uses .cmd + PATHEXT resolution' : false },
  () => {
  let tmpRoot;
  let sdkDir;
  let pathDir;
  let homeDir;
  let savedEnv;

  beforeEach(() => {
    tmpRoot = createTempDir('ecl-3359-');
    sdkDir = path.join(tmpRoot, 'sdk');
    pathDir = path.join(tmpRoot, 'global-bin');
    homeDir = path.join(tmpRoot, 'home');
    fs.mkdirSync(path.join(sdkDir, 'dist'), { recursive: true });
    fs.writeFileSync(
      path.join(sdkDir, 'dist', 'cli.js'),
      '#!/usr/bin/env node\nconsole.log("sdk cli");\n',
      { mode: 0o755 },
    );
    fs.mkdirSync(pathDir, { recursive: true });
    fs.mkdirSync(homeDir, { recursive: true });
    savedEnv = {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      SHELL: process.env.SHELL,
    };
    process.env.PATH = pathDir;
    process.env.HOME = homeDir;
    delete process.env.SHELL;
  });

  afterEach(() => {
    if (savedEnv.PATH == null) delete process.env.PATH;
    else process.env.PATH = savedEnv.PATH;
    if (savedEnv.HOME == null) delete process.env.HOME;
    else process.env.HOME = savedEnv.HOME;
    if (savedEnv.SHELL == null) delete process.env.SHELL;
    else process.env.SHELL = savedEnv.SHELL;
    cleanup(tmpRoot);
  });

	  test('does not print ready when resolved ecl-sdk version differs from installer package version', () => {
    const staleSdk = path.join(pathDir, 'ecl-sdk');
    fs.writeFileSync(
      staleSdk,
      '#!/bin/sh\nprintf "%s\\n" "ecl-sdk v0.0.1"\n',
      { mode: 0o755 },
    );

    const { stdout, stderr } = captureConsole(() => {
      installSdkIfNeeded({ sdkDir });
    });
    const combined = `${stdout}\n${stderr}`;

    assert.ok(
      /version mismatch|different version|stale/i.test(combined),
      `installer must warn that resolved ecl-sdk is stale. Output:\n${combined}`,
    );
    assert.ok(
      combined.includes(staleSdk),
      `warning must include resolved ecl-sdk path. Output:\n${combined}`,
    );
    assert.ok(
      combined.includes('0.0.1') && combined.includes(pkg.version),
      `warning must include detected and installer versions. Output:\n${combined}`,
    );
    assert.ok(
      /npm install -g @evolvconsulting\/evolv-coder-lite@latest/.test(combined),
      `warning must include global update remediation. Output:\n${combined}`,
    );
    assert.ok(
      !/eCL SDK ready/.test(combined),
      `installer must not report ready while PATH resolves a stale ecl-sdk. Output:\n${combined}`,
    );
	  });

	  test('prints ready when no stale ecl-sdk is on PATH', () => {
	    const currentSdk = path.join(pathDir, 'ecl-sdk');
	    fs.writeFileSync(
	      currentSdk,
	      `#!/bin/sh\nprintf "%s\\n" "ecl-sdk v${pkg.version}"\n`,
	      { mode: 0o755 },
	    );

	    const { stdout, stderr } = captureConsole(() => {
	      installSdkIfNeeded({ sdkDir });
	    });
	    const combined = `${stdout}\n${stderr}`;

	    assert.ok(
	      /eCL SDK ready/.test(combined),
	      `installer must report ready when no stale ecl-sdk exists. Output:\n${combined}`,
	    );
	  });

	  test('reads Windows cmd shim versions through cmd.exe', () => {
	    const originalSpawnSync = cp.spawnSync;
	    const platformDescriptor = Object.getOwnPropertyDescriptor(process, 'platform');
	    const calls = [];
	    cp.spawnSync = (command, args, options) => {
	      calls.push({ command, args, options });
	      return { status: 0, stdout: `ecl-sdk v${pkg.version}\n`, stderr: '' };
	    };
	    Object.defineProperty(process, 'platform', { value: 'win32' });

	    try {
	      assert.equal(readGsdSdkVersion('C:\\tools\\ecl-sdk.cmd'), pkg.version);
	    } finally {
	      cp.spawnSync = originalSpawnSync;
	      Object.defineProperty(process, 'platform', platformDescriptor);
	    }

	    assert.deepEqual(calls.map(({ command, args }) => ({ command, args })), [{
	      command: 'cmd.exe',
	      args: ['/c', 'C:\\tools\\ecl-sdk.cmd', '--version'],
	    }]);
	    assert.equal(calls[0].options.encoding, 'utf8');
	    assert.equal(calls[0].options.timeout, 2000);
	  });
	});
