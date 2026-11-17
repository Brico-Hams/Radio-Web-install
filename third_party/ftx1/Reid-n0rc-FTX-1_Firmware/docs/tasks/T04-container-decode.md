# T04 — Firmware container format + decoder

**Status:** todo · **Depends on:** T02

## Goal
Specify the update file container and decode every payload to a flat image.

## Deliverables
- `docs/firmware-format.md` (container, encoding, checksum).
- `tools/<format>_decode.py` plus a round-trip or checksum test, output in `build/`.

## Notes / hints
- First test the FT-710 hypothesis: an ASCII `*` comment box, a `<tag> <length> <crc>` line, payload byte-wise subtracted by a 43-byte key, salted CRC-32 (FT-710_Firmware `docs/sfl-format.md`, `tools/sfl_decode.py`). The key or salt may differ per model.
- Process the images one at a time and keep the decoded output out of git.

## Plan
_(fill in before starting)_

## Findings
_(fill in)_

## Follow-ups
_(fill in)_
