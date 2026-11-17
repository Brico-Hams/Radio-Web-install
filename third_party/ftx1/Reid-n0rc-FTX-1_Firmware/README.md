# FTX-1_Firmware

An analysis of the Yaesu FTX-1 firmware. The goals are to understand the radio, find undocumented CAT commands, and eventually build
custom firmware.

This project follows the method of the FT-710 analysis, **[Reid-n0rc/FT-710_Firmware](https://github.com/Reid-n0rc/FT-710_Firmware)**:
decode the update package, decompile each image in Ghidra, commit the decompiled output, and document the code with figures and
evidence tags. Many FT-710 findings are likely to carry over, and each one is checked against FTX-1 data before it is reused here.

**Agents and contributors: start with [AGENTS.md](AGENTS.md).** The task board is in [docs/tasks/README.md](docs/tasks/README.md).

## Status

Just started: nothing is decoded yet. The first milestone is getting the firmware package (T02), identifying its container format (T04)
and committing a decompile of every image to `decomp/` (T05).

## What is (and is not) in the repo

Committed: docs, tools, task files and, once produced, Ghidra's decompiled output in `decomp/`. Not committed: Yaesu's firmware
download (`Firmware/`), decoded images (`build/`), manuals (`Manuals/`) and Ghidra projects (`ghidra/`). Their sources are listed in
[AGENTS.md](AGENTS.md#sources-not-in-git) and [docs/manuals.md](docs/manuals.md). Tools are catalogued in [tools/README.md](tools/README.md).

Open questions are GitHub issues (see [CONTRIBUTING.md](CONTRIBUTING.md)).
