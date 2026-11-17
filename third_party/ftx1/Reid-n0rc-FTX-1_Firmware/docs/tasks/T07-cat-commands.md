# T07 — CAT command table recovery

**Status:** todo · **Depends on:** T05

## Goal
Recover the firmware's CAT command table and compare it with the FTX-1 CAT manual, to list undocumented commands.

## Deliverables
- `docs/cat-commands.md` (documented vs firmware-found, with handler addresses).
- Ghidra names for the handlers in `tools/ghidra/names_<image>.tsv`, and a re-export.

## Notes / hints
- FT-710 equivalent: T09/T09a/T09b and `tools/ghidra/CatDispatch.java`.
- Read-only CAT queries to a radio are fine; set-commands need the owner's approval each time.

## Plan
_(fill in before starting)_

## Findings
_(fill in)_

## Follow-ups
_(fill in)_
