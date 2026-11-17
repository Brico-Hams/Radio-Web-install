# T05 — Decompile each image (split into one sub-task per image)

**Status:** todo · **Depends on:** T01 T03 T04

## Goal
For each decoded image: pin down the architecture and base address, import it into Ghidra (`ghidra/FTX1_<IMAGE>`), analyze it, and commit the decompile export to `decomp/<image>/`.

## Deliverables
- One sub-task row per image (T05a, T05b, ...) once T04 lists them.
- `decomp/<image>/` from `tools/ghidra/ExportDecomp.java`, plus `docs/memory-maps.md`.

## Notes / hints
- FT-710 setup scripts to adapt as needed: `SetupRX651.java`, `DisplaySetup.java`, `IfdspM33Setup.java`, `IfdspHifi4Setup.java`, and the `xc7_*` chain for an FPGA bitstream.

## Plan
_(fill in before starting)_

## Findings
_(fill in)_

## Follow-ups
_(fill in)_
