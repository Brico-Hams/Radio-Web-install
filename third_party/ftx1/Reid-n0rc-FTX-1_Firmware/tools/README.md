# tools/

Every script in this directory and in `tools/ghidra/`: what it does, what it reads and writes, and the task that made it. Install
notes and versions are in [docs/tooling.md](../docs/tooling.md).

Conventions:
- Python tools are standard library only. Run them from the repo root with `python3 -I tools/<script>.py`; `-I` keeps a planted
  module next to the firmware data from being imported.
- Inputs come from the gitignored `Firmware/` and `build/` folders. Outputs derived from Yaesu's firmware go to `build/` and are never
  committed; only `decomp/` and the docs are.
- A script copied from [FT-710_Firmware](https://github.com/Reid-n0rc/FT-710_Firmware/tree/main/tools) says so in the "Origin" column.

| Script | What it does | Inputs → outputs | Task | Origin |
|---|---|---|---|---|
| `ghidra-headless.sh` | Runs Ghidra's `analyzeHeadless` with JDK 21 (Homebrew paths if present, else `~/opt`); override with `GHIDRA_JAVA_HOME`, `GHIDRA_HEADLESS` | Ghidra args | T01 | FT-710 |
| `issues_sync.py` | Mirrors `docs/tasks/` to GitHub issues (epic, sub-issues, labels, status comments) and keeps `docs/tasks/issues.json`. **The parent agent / owner runs it, nobody else** | `docs/tasks/` → GitHub | (board setup) | FT-710 |
| `ghidra/ExportDecomp.java` | Exports decompiled C per function into `decomp/<image>/*.c` plus `functions.tsv` | Ghidra program → `decomp/<image>/` | T05 | FT-710 |
| `ghidra/ApplyNames.java` | Applies function/data names and plate comments from a TSV (`address<TAB>name[<TAB>comment]`) | `tools/ghidra/names_<image>.tsv` → Ghidra program | T05 | FT-710 |
