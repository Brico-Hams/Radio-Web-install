# Bricohams satellite antennas

[Español](README.md) · [English (US)](README.en.md) · [Français](README.fr.md) · [Deutsch](README.de.md)

Original Bricohams designs: a handheld dual-band 2 m/70 cm Yagi and a horizontal 2 m V-dipole. Includes four printable parts in `stl/`.

- `mom.py`: wire solver using the method of moments.
- `disenar.py`: optimization and verification; writes `resultados.json`.
- `generar_stl.py`: generates STL parts; writes `piezas.json`.
- `vistas.py`: generates SVG drawings in `docs/atlas`.

Documentation, dimensions, assembly, and limitations:
[satellite antenna guide](../../docs/i18n/en/ANTENAS-SATELITE.md).

**Simulated design, neither built nor measured.** Always adjust antennas using an analyzer before transmitting.

Authors: Anatol Emilio Lopez Maitchovcow EA5KAO, Diego Roca EA5JEF, and Pedro Roca, Bricohams. More information at bricohams.org and bricohams.com.
