# Quansheng ARDF: reception and configuration guide

Revision: 25-10-2026. Primary evidence: `ARDFv05/ARDF.md` and the reald V3/UV-K1
repository. This is an original configuration summary, not a copy of the manual.
The names and ranges below correspond to the inspected document; they are not
attributed without review to v0.2/v0.4 or V1/V2 branches.

## Hardware, versions, and limits

| Family | Corresponding source | Relationship to this website |
| --- | --- | --- |
| V1 DP32 | reald/uv-k5-firmware-custom | Not installed with the PY32 connector |
| V2 | DL9CAT V2 project linked by reald | Outside the catalog/connector |
| V3 / UV-K1 PY32 | reald/uv-k1-k5v3-firmware-custom | Stable releases recognized for download |

The catalog recognizes `ARDF-K5v3_K1-vX.Y[.Z]` tags from the V3 source, not
arbitrary files just because their name contains “ARDF.” On this website they
remain **download only**, even with PY32 vectors: ARDF slot validation is not
enabled. The ARDFv05 folder contains source and legacy files; it does not make
every binary in its archive a current ARDF build.

Upstream documents TX as disabled in its official ARDF releases. Do not assume
this for an unrelated build: check `ENABLE_PREVENT_TX` and the version.
Direction-finding firmware does not turn the radio into an 80-meter receiver;
the document gives the chip's lower limit as approximately 18 MHz, so it is
not suitable for 3.5 MHz ARDF.

## Modes and settings

| Setting | What it controls | Choice and verification |
| --- | --- | --- |
| ARDF=OFF | Operation outside the ARDF screen/mode | Does not prove TX is compiled or permitted |
| ARDF=DF Simple | Simple direction finding with manual gain | For searching without cycles; no cycle-clock correction needed |
| ARDF=ARDF | Cycles and fox presentation | Configure synchronization to the actual event |
| Mode=AM | AM signal demodulation for the activity | Match the actual signal; does not enable AM TX |
| Step | Tuning step | Manual suggests 1 kHz; prevent rounding of the desired frequency |
| Sql | Squelch | Manual suggests 0 for continuous listening; adjust volume carefully |
| RxMode | VFO listening | MAIN ONLY avoids toggling and gain-history flashing |
| Manual gain | Sensitivity/attenuation by index | Lower index reduces sensitivity; decrease near a strong signal |
| NumFox | Number of transmitters in a cycle | Document: 1-10; 0 disables timing; default 5 |
| FoxDur | Duration of each turn | Document: default 60 s, range 1.00-999.99 s; verify input units for the build |
| EndSig | Warning before turn ends | 0 disables; document says 1-30 s. Lower volume before using headphones |
| GainRe | Remember gain per fox/VFO | OFF, VFO A, VFO B, or BOTH according to the document |
| RSS100 | Reference for estimating distance | Zero disables; not an RF calibration of the whole radio |
| ClkCor | Internal timer correction | Only after measuring drift; do not copy another unit's value |
| SetNav | K1/K5 key orientation | Correct if UP/DOWN seem reversed |
| ChSave | Persist memory configuration | Needed when working in MR; VFO and MR are not the same |

Gain changes by index are described as approximately 5 dB; this is not a
certified attenuator. A very nearby signal can overload the receiver despite
lowering gain. Antenna, polarization, orientation, and environment matter.

## Receive-only startup

1. Identify the exact ARDF hardware and firmware; save the original configuration.
2. Connect an antenna and set the volume low; raise it gradually, especially
   when using headphones.
3. Choose DF Simple to check reception without a clock.
4. Select modulation, step, and frequency for the event's authorized signal.
5. Use MAIN ONLY; check that you are in VFO when entering a frequency.
6. Adjust gain and orientation without mistaking maximum noise for a useful signal.
7. For a timed competition, configure NumFox/FoxDur and synchronize to the
   actual cycle by following the installed version's screen/guide.
8. Save if applicable; check again after reloading VFO/memory.

Universal synchronization key sequences are not recommended: keys and modes
may change between versions. Do not transmit a test signal without permission.

## Gain reminder

GainRe retains values per fox at the start of its turn. One useful setup is VFO A
for fox frequency with gain memory, and VFO B for a continuous beacon without
it. If NumFox=0 or GainRe does not include the active VFO, do not expect a
per-fox history table. The document warns that the visible table may have a
different limit than the maximum NumFox: do not infer 10 histories just because
10 turns can be shown.

## Distance: an estimate, not navigation

The prediction uses an approximate propagation model and an RSS100 reference
for the transmitter-antenna-receiver system. Terrain, power, height, and
obstacles change the result; do not rely on the number as the actual distance.
The manual describes taking a reference 100 m from the event transmitter,
with a stable signal and known orientation. Zero disables the feature. It does
not replace maps, personal safety, or organizer instructions.

## Clock correction

The manual describes drift in the internal resonator. For the specific case of
measuring how many real seconds elapse while the device indicates a given time:

```text
correccion = 6000 - (segundos_reales * 100 / 60)
```

The document gives a range of -500 to 500 for ClkCor. This formula applies only
to the procedure for that version, not every clock menu on another radio. It is
not an RF oscillator correction and does not require changing RF calibration.
After changing it, repeat a measurement and check synchronization.

## Verifiable historical differences

- The document says that before v0.4, SetNav was in a hidden menu; do not assume
  the same location in every version.
- To learn what changed between v0.2, v0.4, v0.5, and v0.5.1, consult each release;
  a newer label alone does not prove data compatibility.
- Use the CHIRP module that comes with the release. The standard UV-K5 driver
  does not necessarily represent its ARDF settings.
- Do not extrapolate V1/V2 flashing to V3. The manual warns that k5prog/k5prog_win
  V1 are not the right tools for V3.

## Troubleshooting

| Problem | Non-destructive check |
| --- | --- |
| Only three digits are entered | It may be in memory mode, not VFO |
| Entered frequency changes | Check Step/raster and band limits |
| Gain history flashes | Disable dual listening |
| Fox table does not appear | Check NumFox and GainRe for the active VFO |
| CHIRP shows different settings | Save memory and verify module/version |
| Arrows reversed | SetNav; do not change firmware based on similar appearance |
| Error Header short read | Close programs; check data cable/port, mode, and firmware; do not erase memory |
| Inconsistent distance | RSS100 reference, antenna, power, and terrain; do not blindly recalibrate RF |

## Sources

- [V3 and UV-K1 ARDF project](https://github.com/reald/uv-k1-k5v3-firmware-custom).
- [Project ARDF manual](https://github.com/reald/uv-k1-k5v3-firmware-custom/blob/main/ARDF.md).
- [V3 ARDF releases](https://github.com/reald/uv-k1-k5v3-firmware-custom/releases).
- [V1 ARDF project](https://github.com/reald/uv-k5-firmware-custom).
- [Common configuration](AYUDA-CONFIGURACION.md).

The remote branch may evolve. To repeat the configuration, record the exact
manual, firmware, and driver versions along with your copy.