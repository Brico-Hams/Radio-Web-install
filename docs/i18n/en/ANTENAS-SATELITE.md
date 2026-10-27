# Satellite antennas: Bricohams designs and printable parts

Authors: Anatol Emilio Lopez Maitchovcow EA5KAO, Diego Roca EA5JEF, and Pedro
Roca, Bricohams founders and board members.
Information: <https://bricohams.org> and <https://bricohams.com>.

Antenna section of the [Satellite Basics](INICIACION-SATELITE.md) guide.
The designs and parts are **original to Bricohams**: dimensions calculated
with a method-of-moments solver written for this project and parts modeled in
code. They do not reproduce the antenna projects by PY4ZBZ or PY5LO included
in PT2VM's guide, whose permission was granted to that author.

> **Status: simulated design, not built or measured.** The figures come from
> free-space simulation. No antenna has yet been built or measured with an
> analyzer. Cut the rods 3-5 mm longer and tune them with an antenna analyzer
> (NanoVNA or similar) before transmitting.

## Which antenna to choose

| Antenna | Use | Simulated gain | Difficulty |
| --- | --- | --- | --- |
| [Handheld dual-band Yagi](#handheld-dual-band-yagi) | FM satellites with uplink and downlink on different bands (SO-50, ISS repeater, PO-101) | 8,4 dBi VHF / 11,4 dBi UHF | Medium |
| [Horizontal 2 m V dipole](#horizontal-2-m-v-dipole) | Fixed listening without tracking: ISS SSTV and APRS, VHF downlinks | 1,8 dBi at zenith | Low |
| Radio's original antenna | First ISS listening attempts on high passes | Far below the antennas above | None |

You can hear the ISS with the original antenna on high passes, but working
low-power FM satellites usually calls for a hand-aimed directional antenna. A
long whip or counterpoise helps somewhat but does not replace a directional
antenna.

## Handheld dual-band Yagi

![Dimensioned drawing of the dual-band Yagi](../../atlas/sat-antena-yagi.svg)

Two Yagis share a non-conductive boom: 3 elements for 2 m in the horizontal
plane and 5 elements for 70 cm in the vertical plane, rotated 90 degrees.
With orthogonal, centered planes, the simulation shows no appreciable
cross-band coupling: each Yagi performs the same with or without the other
present. Real misalignment of the elements does introduce some coupling.

### Dimensions

Dimensions in mm, measured from the VHF reflector (x = 0). Lengths are
end-to-end; the driven elements include the 16 mm center gap in the printed
block, so each half measures (length − 16) / 2.

| Band | Element | Length (mm) | Position x (mm) | Each half (mm) |
| --- | --- | ---: | ---: | ---: |
| VHF | Reflector | 1011 | 0 | — |
| VHF | Driven element | 969 | 532 | 476,5 |
| VHF | Director | 904 | 950 | — |
| UHF | Reflector | 337 | 75 | — |
| UHF | Driven element | 320 | 231 | 152 |
| UHF | Director 1 | 304 | 365 | — |
| UHF | Director 2 | 301 | 572 | — |
| UHF | Director 3 | 294 | 751 | — |

Use a 20 mm PVC tube, such as rigid electrical conduit, about 1030 mm long.
The VHF and UHF parts are at least 35 mm apart along the boom; the design
script checks this.

### Simulated performance

| MHz | Z (Ω) | SWR 50 Ω | Gain (dBi) | Front/back (dB) |
| --- | --- | ---: | ---: | ---: |
| 145,8 | 38,0 + j2,6 | 1,32 | 8,43 | 15,0 |
| 145,9 | 37,9 + j3,3 | 1,33 | 8,44 | 15,0 |
| 146,0 | 37,9 + j4,1 | 1,34 | 8,45 | 14,9 |
| 435,0 | 39,1 − j0,7 | 1,28 | 11,32 | 15,2 |
| 436,5 | 38,6 − j0,3 | 1,30 | 11,37 | 15,6 |
| 438,0 | 37,1 + j0,0 | 1,35 | 11,42 | 16,2 |

The design prioritizes gain and front-to-back ratio with SWR below 1,4 across
the satellite segment, feeding the driven element directly with 50 Ω coax and
no matching network. An SWR of 1,3-1,35 reflects about 2% of the power; this
is acceptable for a handheld radio.

### Materials

- 20 mm PVC tube, 1030 mm.
- 4 mm aluminum rod, about 5,5 m total. Brass rod also works; the measuring
tape requires a different block.
- Printed parts: 6 element clamps, 2 driven-element blocks, and 1 handle; see
  [STL parts](#printable-stl-parts).
- M3 x 8 screws to secure rods and parts, and M3 x 10 screws with ring
  terminals for the driven elements.
- Two lengths of thin 50 Ω coax, such as RG-316 or RG-58, with a common-mode
  choke on each: several ferrite beads near the block or 4-5 coax turns about
  3 cm in diameter. Check the choke with the analyzer.
- A VHF/UHF diplexer to combine both driven elements into one downlead if you
  use one radio, such as the UV-K5. With two radios, connect each coax to its
  own radio.

### Assembly

1. Cut the rods 3-5 mm longer than the table values and file the ends. Put
   guards on the tips: heat-shrink tubing or caps. It is easy to bring a tip
   close to your face while turning a handheld antenna.
2. Mark the x positions on the boom with tape. Install VHF clamps with the rod
   horizontal and UHF clamps rotated 90 degrees on the boom.
3. Center the rod in each clamp and tighten it with the top M3 screw. Secure
   the clamp to the boom with the bottom M3 screw.
4. In the driven-element blocks, insert each half to the bottom of its hole.
   The top screw secures it and acts as a terminal: braid on one side and
   center conductor on the other, with a ring terminal. Seal connections
   against moisture.
5. Route coax along the boom toward the reflector, securing it with ties
   through the block peg, with the choke near the feed point.
6. Fit the handle between the UHF driven element (231) and UHF director 1
   (365), around x ≈ 300. Move it until the antenna is balanced.

### Tuning with an analyzer

- Measure the SWR of each band separately, with the other coax terminated in
  50 Ω or connected to the diplexer.
- If the minimum falls below the segment, shorten the driven element equally
  on both sides, in 1-2 mm steps. If it falls above, the driven element is too
  short: replace it.
- Do not chase an SWR of 1,0: the direct-fed driven element is around 38 Ω by
  design. What matters is that the minimum falls at 145,9 and 436,5 MHz.
- Keep away from metal tables and people during measurement. Aim the antenna
  at the sky.

## Horizontal 2 m V dipole

![Dimensioned drawing of the V dipole](../../atlas/sat-antena-dipolo-v.svg)

Fixed, non-tracking antenna for listening to the ISS, such as SSTV on
145,800 MHz and APRS on 145,825 MHz, and VHF downlinks. The 100-degree V arms
partly fill the nulls of a straight dipole and bring the impedance closer to
50 Ω.

| Parameter | Value |
| --- | --- |
| Angle between arms | 100 degrees |
| Arm from center | 505 mm |
| Rod for each arm | 497 mm: starts 8 mm from the axis, inside the printed hub |
| Simulated Z at 145,8 / 145,9 / 146,0 MHz | 48,7 + j2,0 / 48,9 + j2,6 / 49,0 + j3,3 Ω |
| SWR 50 Ω | 1,05-1,07 |
| Gain at zenith | 1,82 dBi |
| Azimuth ripple at 30 degrees elevation | 5,5 dB |

Mount it horizontally on a 20 mm PVC mast, with the printed hub and a
common-mode choke on the coax, about 0,5-1 m above the roof or ground. Height
above ground changes the real pattern; the simulation is in free space. The
Yagi is preferable for transmitting on low passes.

## Printable STL parts

![View of the printable parts](../../atlas/sat-piezas-stl.svg)

| Part | File | Quantity | Function |
| --- | --- | ---: | --- |
| Element clamp | [pinza-elemento.stl](../../../hardware/antenas/stl/pinza-elemento.stl) | 6 | Holds a 4 mm passive element on the 20 mm boom |
| Driven-element block | [bloque-excitado.stl](../../../hardware/antenas/stl/bloque-excitado.stl) | 2 | Two isolated halves with 16 mm gap, M3 terminals, and coax channel |
| Handle | [empunadura.stl](../../../hardware/antenas/stl/empunadura.stl) | 1 | 32 mm, hollow, ribbed grip secured to the boom |
| V dipole hub | [cubo-dipolo-v.stl](../../../hardware/antenas/stl/cubo-dipolo-v.stl) | 1 | 100-degree arms, M3 terminals, and socket for a 20 mm mast |

Recommended print settings:

- Material: PETG or ASA. PLA warps in the sun.
- Perimeters and infill: 4 perimeters and 40% infill.
- Layer height: 0,2 mm.
- Orientation: boom ring horizontal and resting on the flat face of the tab.
  Print the hub with the socket facing down.

Hole clearances:

- Boom: 20,4 mm.
- Rod: 4,3 mm.
- Direct M3 thread: 2,8 mm.

If your printer closes the holes, change the `BOOM`, `ROD`, and `M3_TAP`
constants in `generar_stl.py` and regenerate the parts.

The script checks that each STL is a single, watertight solid. Volume and
dimension data are in [piezas.json](../../../hardware/antenas/piezas.json).

## Calculation method and verification

Files in [hardware/antenas](../../../hardware/antenas/README.en.md):

| Script | What it does |
| --- | --- |
| `mom.py` | Custom thin-wire method-of-moments solver (Harrington): node currents, segment loads, reduced kernel, and analytically integrated static term |
| `disenar.py` | Optimizes dimensions with Nelder-Mead for maximum gain with SWR ≤ 1,3-1,35 and front/back ≥ 15 dB; verifies the dual-band combination and part spacing, and writes `resultados.json` |
| `generar_stl.py` | Models parts with manifold3d and writes STL files and `piezas.json` |
| `vistas.py` | Draws dimensioned plans and part views in `docs/atlas` |

Solver validation against the reference λ/2 dipole:

- With a 10⁻⁵ λ radius, it gives Z ≈ 78 + j43 Ω, compared with the classic
  value of 73 + j42,5 Ω. The difference comes from the delta-gap feed.
- With a 10⁻³ λ radius, the 0,475 λ dipole resonates at 71 − j3,5 Ω.
- Directivity is 2,15 dBi. Gain calculated from input power agrees with the
  pattern integral, so power is conserved.

Expected resonant-frequency error: a few percent. That is why the elements
are cut long and then tuned.

Model limitations:

- Free space, without ground or the operator's body.
- Perfect conductors.
- Does not model the clamp plastic, which lowers resonance slightly, the boom,
  coax, or the diplexer.
- This is not a measurement or performance certificate.

To regenerate from the `hardware/antenas` folder:

```text
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python disenar.py
.venv\Scripts\python generar_stl.py
.venv\Scripts\python vistas.py
```

## Safety and legality

- Transmitting requires an amateur radio authorization. Listening does not.
- With 5 W and an 11 dBi Yagi, do not point at nearby people and keep the
  elements away from your face while transmitting.
- Do not use these antennas on unauthorized bands or satellites, such as
  military UHF satellites.