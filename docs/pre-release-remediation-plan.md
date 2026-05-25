# Pre-Release Remediation Plan

This plan captures the first npm release audit for eCL. eCL is the Evolv
Consulting rebrand and package release path for the upstream GSD-redux project;
it is not an independent rewrite. The release work should separate issues that
eCL owns from issues inherited from upstream GSD-redux but still blocking or
affecting the eCL npm release.

## Current Release Readiness

The package should not be published yet.

Checks that passed during the audit:

- Root rebrand verification.
- Synthetic sync smoke test.
- Production `npm audit` for `src`.
- Production `npm audit` for `src/sdk`.
- `npm pack --dry-run --json` for `src`.
- Release tarball smoke for `src`.

Checks or inspections that found release work:

- `node scripts/run-tests.cjs --suite unit` from `src` failed with 15 unit test
  failures.
- The active root release workflow installs dependencies and publishes, but it
  does not run the package unit suite, audit, SDK build checks, or tarball smoke.
- The npm README references docs, changelog, security files, and assets that are
  not included in the current parent package tarball.
- The standalone SDK package name is documented, but it was not published at the
  time of audit and is not published by the active root release workflow.

## eCL-Owned Release And Rebrand Issues

These are true eCL issues because they come from the rebrand overlay, package
metadata, release workflow, npm-facing docs, or validation around the eCL package.

### Rebrand Drift

- Replace stale `gsd-*` expectations in eCL tests with `ecl-*`.
- Replace stale `get-shit-done` require paths with the eCL package path.
- Improve the rebrand verifier so it catches:
  - Encoded upstream references such as `%40opengsd`.
  - Regex literals that still target `gsd-*`.
  - Text-like test fixtures that contain embedded null bytes.

### Npm Package Surface

- Rewrite the npm README intro so it accurately presents eCL as the Evolv
  Consulting rebrand of upstream GSD-redux.
- Remove or clearly separate any upstream status commentary from official eCL
  package metadata.
- Fix badge image URLs that still reference encoded upstream package names.
- Ensure all README-linked docs, changelog, security files, and assets are
  included in the npm package or linked to stable GitHub URLs.

### Release Workflow

- Harden the active root release workflow before the first publish:
  - Run the `src` unit suite.
  - Run production audit from `src`.
  - Run SDK build or prepublish-equivalent checks.
  - Run release tarball smoke.
  - Add a pack-contents check for README-linked files and required package
    assets.

### Tarball Smoke Coverage

- Update the stale `gsd-sdk query` smoke check to validate `ecl-sdk`.
- Decide that namespace or fallback drift diagnostics should fail the release
  when they indicate user-visible eCL packaging drift.

> **2026-05-25 update — diagnostics retired.** The colon-namespace
> (`WORKFLOW_BODY_COLON_LEAK`) and missing-SDK-fallback
> (`WORKFLOW_MISSING_SDK_FALLBACK`) scanners were removed from
> `scripts/release-tarball-smoke.cjs`. Re-investigation showed:
>
> - `/ecl:cmd` is a valid Claude Code skill invocation form (plugin
>   `plugin-name:skill-name` namespace per the official skills docs), not
>   eCL-owned drift. The 78 "leak" hits were valid invocations.
> - All 5 missing-fallback hits were false positives — bash `#` comments or
>   prose narration inside `bash` code fences, not executable shell that
>   would ever invoke a bare `ecl-sdk` at install time.
>
> The "Workflow Namespace Behavior" item below is resolved by deletion: there
> is no namespace drift to classify. If a future regression of the #3668 class
> appears (a real bare `ecl-sdk` call in user-runnable shell with no fallback),
> add a targeted check then rather than reviving the broad scanner.

### SDK Publishing Policy

- Choose one SDK release policy before publishing eCL:
  - Publish `@evolvconsulting/ecl-sdk` as part of the first release.
  - Or remove standalone SDK install instructions until that package is
    published.

## Upstream GSD-Redux Issues Inherited By eCL

These issues appear to be inherited from upstream behavior or upstream tests.
They are not caused by the eCL rebrand itself, but they still affect the eCL
release and should be resolved, accepted, or documented before publishing.

### Non-Rebrand Unit Test Failures

- Planner size budget failure:
  - Either trim the planner prompt below the current budget.
  - Or intentionally raise the test budget with a clear rationale.
- Skill manifest ordering failure:
  - Update the expected order.
  - Or change the inventory sort behavior if the current order is incorrect.

### Package Contents

- Review whether the parent npm package should ship SDK source tests through
  `sdk/src`.
- If preserving upstream packaging exactly is intentional, document that choice.
- If not intentional, trim non-runtime SDK tests from the parent package while
  preserving the standalone SDK package contents.

### Workflow Namespace Behavior

- Review tarball smoke diagnostics for installed workflow colon-namespace
  references.
- Classify each reference as either:
  - Expected upstream GSD-redux workflow behavior that eCL intentionally carries.
  - Or eCL user-visible release drift that should fail CI.

## Verification Plan

Run these checks before tagging the first npm release.

From the repository root:

```sh
node scripts/verify-rebrand.mjs
node scripts/smoke-rebrand-map.mjs
node scripts/test-sync-synthetic.mjs
```

From `src`:

```sh
npm audit --omit=dev --audit-level=moderate
node scripts/run-tests.cjs --suite unit
npm pack --dry-run --json
node scripts/release-tarball-smoke.cjs --json
```

From `src/sdk`, if publishing or documenting the standalone SDK:

```sh
npm audit --omit=dev --audit-level=moderate
npm pack --dry-run --json
```

## Release Gate

Do not publish the first npm package until:

- All `src` unit tests pass or any remaining failures are explicitly documented
  as accepted upstream carry-forward behavior.
- The active root release workflow runs the release-blocking checks.
- The npm README has no broken package-relative links.
- eCL-owned rebrand drift is fixed.
- The SDK publishing policy is reflected in both docs and release automation.
- The dirty worktree is reviewed, and executable-bit changes are committed
  deliberately before tagging.
