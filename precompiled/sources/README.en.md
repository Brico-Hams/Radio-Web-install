# Local firmware sources

[Español](README.md) · [English (US)](README.en.md) · [Français](README.fr.md) · [Deutsch](README.de.md)

These packages retain the sources, licenses, and notices of their original projects. They are neither stock firmware nor radio memory backups.

| File | Origin | Commit |
| --- | --- | --- |
| `f4hwn-fusion-v6.1.0-source.zip` | https://github.com/armel/uv-k1-k5v3-firmware-custom | `f556a96e73c3e423a00cf473aeb37f827cac05a5` |
| `ardf-v05-source.zip` | https://github.com/reald/uv-k1-k5v3-firmware-custom | `e2bb5b011f39b8c2777a21206086dd556b0e9e2d` |

The ZIP files export the specified commits without Git metadata or build directories. To reproduce the local Fusion state, extract its ZIP and apply `fusion-local-settings.patch` from the root:

```sh
git apply fusion-local-settings.patch
```

The patch preserves local ARDF navigation, step, and AM-mode settings; it is not automatically applied when any image is installed. Bricohams modules and build tools are in `firmware/bricohams` and `scripts` in the main repository. The distributable image catalog is `precompiled/catalog.json`, with hashes and provenance for each image.

Use `SHA256SUMS` to verify packages and the patch. Original licenses and attributions remain in effect. Local clone directories are excluded from Git to avoid references to nested repositories that would not be recovered when cloning this project.
