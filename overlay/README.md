# Evolv asset replacements

Drop evolv-branded replacements for upstream logo files here. The bake
copies anything in `overlay/files/**` over `src/**` after the upstream
transform, so files at the right relative path here win.

Upstream ships:

| Upstream path                              | Drop your replacement at                   |
| ------------------------------------------ | ------------------------------------------ |
| `assets/gsd-logo-2000.png`                 | `overlay/files/assets/ecl-logo-2000.png`   |
| `assets/gsd-logo-2000.svg`                 | `overlay/files/assets/ecl-logo-2000.svg`   |
| `assets/gsd-logo-2000-transparent.png`     | `overlay/files/assets/ecl-logo-2000-transparent.png` |
| `assets/gsd-logo-2000-transparent.svg`     | `overlay/files/assets/ecl-logo-2000-transparent.svg` |

Note the path-rebrand (`gsd-` → `ecl-`) — the rebrand map renames the
upstream filenames during bake, and the overlay drop-in must use the
post-rebrand names so it lands at the same `src/` path.

`assets/terminal.svg` is not a logo and contains no GSD branding after
text transform; it does not need replacement.

Until you drop replacements in here, `src/assets/ecl-logo-*.{png,svg}`
will contain the upstream GSD logo bytes under evolv-renamed file paths.
The verifier won't flag this (it only scans text), but anyone consuming
the package will see GSD imagery. Replace before publishing.
