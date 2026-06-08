# Cleaning Up evolv-coder-lite-cc

Use this procedure when you see a persistent `⬆ /ecl:update` indicator in
your statusline even though `@evolvconsulting/evolv-coder-lite` is already up to date.  It
removes leftover files from the old `evolv-coder-lite-cc` package that was
renamed to `@evolvconsulting/evolv-coder-lite` in issue [#607](https://github.com/evolvconsulting/evolv-coder-lite/issues/607).

## Why this happens

When the package was renamed, its version counter reset — `evolv-coder-lite-cc`
reached `1.42.x` while `@evolvconsulting/evolv-coder-lite` started at `1.2.0`.  If the old
package is still installed in any runtime config directory (e.g. `~/.gemini`),
its update checker writes a higher `latest` version into the shared update
cache (`~/.cache/ecl/ecl-update-check.json`), and older versions of the new
tooling accepted those foreign writes.  The statusline then permanently shows
an upgrade that does not exist.  The current installer detects and removes
these leftovers automatically, and the update cache is now per-package with a
`package_name` lineage field that readers validate — so a foreign package can
no longer poison it.

## Steps

### 1. Preview the cleanup (dry run)

Run the installer with `--dry-run` to see exactly what it would change without
touching anything:

```bash
npx -y --package=@evolvconsulting/evolv-coder-lite@latest -- evolv-coder-lite --claude --global --dry-run
```

The command prints the removal plan — each file path and the reason it would
be deleted — and lists any stale update-cache files it would clear, then exits
without making any modifications.

Swap `--claude` for the flag matching your runtime if you use a different one
(see the [runtime flags table](manual-update.md#runtime-flags)).

### 2. Apply the cleanup

Run the same installer without `--dry-run`:

```bash
npx -y --package=@evolvconsulting/evolv-coder-lite@latest -- evolv-coder-lite --claude --global
```

The installer:

- Detects leftover `evolv-coder-lite-cc` artifacts across all runtime config
  directories (`~/.claude`, `~/.gemini`, `~/.codex`, `~/.config/opencode`,
  `~/.kilo`, and others).
- Removes orphaned hooks, commands, and any file that references the old
  package name.
- Clears the stale shared update cache.
- Preserves user-owned artifacts such as `dev-preferences.md`, custom agents,
  and any file not managed by eCL.

### 3. Manual fallback

If the installer cannot resolve `evolv-coder-lite-cc` in your environment, or you
prefer to clean up by hand:

1. **Check each runtime config directory** for a `evolv-coder-lite/` subtree left
   by the old package:

   ```bash
   ls ~/.claude/evolv-coder-lite/
   ls ~/.gemini/evolv-coder-lite/
   ls ~/.codex/evolv-coder-lite/
   ls ~/.config/opencode/evolv-coder-lite/
   ls ~/.kilo/evolv-coder-lite/
   ```

   Remove any directories found there that were written by `evolv-coder-lite-cc`
   (the new package installs under the same path, so only remove the directory
   if you have not yet run the new installer for that runtime).

2. **Uninstall the old package** if it is still resolvable:

   ```bash
   npx evolv-coder-lite-cc --uninstall
   ```

3. **Delete the stale shared cache**:

   ```bash
   rm -f ~/.cache/ecl/ecl-update-check.json
   ```

### 4. Verify

Open a new terminal session (or restart your AI runtime).  The `⬆ /ecl:update`
indicator should no longer appear in the statusline.  You can confirm the
installed version with:

```bash
npx @evolvconsulting/evolv-coder-lite@latest -- evolv-coder-lite --version
```
