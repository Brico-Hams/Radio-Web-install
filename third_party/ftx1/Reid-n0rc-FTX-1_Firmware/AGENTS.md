# AGENTS.md — FTX-1 Firmware Analysis

Instructions for any agent (Claude, Codex, etc.) working in this repo. `CLAUDE.md` points here.

This project follows the same method as the owner's FT-710 analysis,
[Reid-n0rc/FT-710_Firmware](https://github.com/Reid-n0rc/FT-710_Firmware). It is the template for this repo's rules, tools and
documentation standard. Its findings (SFL format, CPU links, CAT tables) are a strong starting hypothesis for the FTX-1, since both are
recent Yaesu SDR designs, but **they are not facts about the FTX-1 until they have been checked against FTX-1 data**. Cite the FT-710
page when you reuse an idea, and tag the claim **[inference]** until it is verified here.

## Goals (in order)

1. Understand how the owner's Yaesu FTX-1 works internally.
2. Find undocumented remote-control (CAT) commands and settings.
3. Eventually build custom firmware that extends the radio. When that starts, it gets its own companion repository (as the FT-710 has
   [Reid-n0rc/FT-710_Custom_Firmware](https://github.com/Reid-n0rc/FT-710_Custom_Firmware)); facts about the stock firmware stay here.

The first milestone is decoding every firmware image and committing Ghidra's decompiled output to `decomp/`.

## Ground rules

- **Analyze and plan before acting.** Before you change anything, read the task file, check what the previous tasks produced, and write your approach into the task file's `## Plan` section.
- **Tasks and sub-tasks.** A session may work through as many tasks and sub-tasks as needed, but plan first: write the approach into the task file before executing. Split any task that won't fit in one context window into sub-task files (`T05a`, `T05b`, ...), and add each one as a row on the board so it is tracked as a GitHub sub-issue. Finish, document and commit each (sub-)task before starting the next.
- **Record findings as you go.** Facts go in `docs/` (hardware, formats, memory maps). Status goes in the task file. Never leave a finding only in chat.
- **Repo visibility: public, by the owner's decision (2026-10-28).** The repo will hold output derived from Yaesu's copyrighted firmware (`decomp/`, the docs), which the owner accepts. Never commit raw firmware, decoded binaries, manuals or Ghidra projects (`Firmware/`, `build/`, `Manuals/`, `ghidra/` are gitignored). Committing manuals or Ghidra projects, as the FT-710 repo now does, needs the owner's decision first. Never publish anything from this project anywhere other than `origin` and its wiki.
- **Git:** make incremental commits with clear messages. The owner has authorized pushing `main` to `origin` (github.com/Reid-n0rc/FTX-1_Firmware) after commits. Never change the repo's visibility, and never tag, release, or push to any other remote.
- **Contributions (owner rule, 2026-10-28).** Anyone other than the repository owner or an admin must start every change with a GitHub issue and get it in through a pull request that links the issue (`Closes #N`). Nobody but the owner or an admin commits to `main` directly. This is enforced by the `main` branch ruleset (id 26058703, created 2026-10-28; the admin role bypasses it, and the owner holds that role) and the `issue-link` workflow; details in [CONTRIBUTING.md](CONTRIBUTING.md). Agents running with the owner's credentials (`gh` as Reid-n0rc) act as the owner.
- **Don't touch the radio.** Anything that writes to the radio (flashing, EEPROM writes, untested CAT set-commands) needs the owner's explicit approval each time.

## Sources (not in git)

Fill this table in during T02. Record each URL and the SHA-256 of every input in `docs/inputs.sha256`.

| Folder | Contents | Where to get it |
|---|---|---|
| `Firmware/` | FTX-1 firmware update package (images + update manual). Versions reported in March 2026: DISPLAY V01-09, MAIN V01-12, DSP V01-07, SDR V01-06 **[unverified; retailer blog]** | yaesu.com → FTX-1 product page → "Files" tab (T02) |
| `Manuals/` | Operating manual, CAT manual, firmware update manual, service manual if one exists | yaesu.com product page; see T02 |

yaesu.com may reset connections from scripts; the owner can download in a browser instead.

## Repo layout

```
AGENTS.md            this file
docs/
  hardware.md        CPUs, DSPs, FPGA, flash, buses per board            (T03)
  firmware-format.md update container + payload encoding                 (T04)
  memory-maps.md     load addresses / memory maps per image              (T05)
  cat-commands.md    documented vs firmware-discovered CAT commands      (T07)
  ft710-comparison.md what carries over from the FT-710, verified or not (T08)
  manuals.md         every manual/datasheet used, with source links
  tooling.md         installed tools and versions
  inputs.sha256      SHA-256 of the firmware download and decoded images
  tasks/             one file per task; README.md is the index/status board
tools/               scripts (Python 3, stdlib preferred), catalogued in tools/README.md
decomp/<image>/      committed Ghidra decompiled C output per image
build/               (ignored) decoded .bin images
ghidra/              (ignored) Ghidra projects FTX1_<IMAGE>
```

## Firmware images

Unknown until T02/T04. Fill in: file name, header tag, version, date, role. The FT-710 had four (MAIN on a Renesas RX651, DISPLAY on an
RZ/A1H, IFDSP on an i.MX RT685, SDR as an Artix-7 bitstream) in Yaesu's `.SFL` container; check whether the FTX-1 follows the same
pattern. The FTX-1 has a detachable head (Field) and an optional amplifier body (Optima), so look for images or update paths for each.

## Tooling

- Ghidra 12.1.4 (Homebrew formula) + `openjdk@21`. Always run headless through `tools/ghidra-headless.sh`, which sets the JAVA_HOME Ghidra needs (the system default Java 11 won't work). Put projects under `ghidra/`, named `FTX1_<IMAGE>`. Details are in `docs/tooling.md`.
- Python 3 for the decoding tools. Run scripts that read firmware data with `python3 -I`.
- Record installed versions in `docs/tooling.md`.
- The owner authorizes installing community tooling (Ghidra extensions/processor modules, Homebrew/pip packages, source builds) when a task needs it. Prefer reputable sources, avoid sudo and system-wide default changes, and record each install (source, version, method, location) in `docs/tooling.md`.
- Reusing FT-710 tools: copy a script from the FT-710 repo when a task needs it (for example `sfl_decode.py`, `SetupRX651.java`, the `xc7_*` chain), adapt it, and note its origin in `tools/README.md`. Don't copy speculatively.

## Task sizing

- One task has one clear deliverable that you can verify (a doc section, a script plus a test, or one image's decompile export).
- Never read a whole PDF or a whole decompile dump into context. Use `pdftotext` with page ranges, `grep`, and targeted reads.
- Process one firmware image per task. For huge output (decomp), commit it file by file and summarize it in docs. Don't paste it into chat.
- Finish each task with: the task file updated (status, findings, follow-ups), docs updated, and a local commit.

## Documentation standard (owner requirement)

The owner wants **full documentation of all the code**, with figures wherever they show how things connect. Raw decomp output alone is not a deliverable.

- Code documentation lives in `docs/code/<image>/` plus `docs/code/system.md` for the whole radio.
- Each image has a `README.md` overview (purpose, boot flow, memory map summary, task/main-loop structure, subsystem list with links) and one page per subsystem (for example CAT parser, band/VFO control, SD/update loader, UI, inter-CPU link, audio path). Each subsystem page has function tables (address, Ghidra name, inferred name, purpose), data structures and globals.
- **Figures:** use Mermaid in Markdown (it renders on GitHub). Use `flowchart` for module and call structure, `sequenceDiagram` for protocols and boot/update flows, and `stateDiagram-v2` for modes. Every overview needs at least a block diagram and a boot/control-flow figure. Keep each figure readable (around 25 nodes or fewer); split it rather than cram.
- Mark each claim **[fact]** (seen in code/data, cite the address), **[inference]** or **[guess]**.
- When you name functions in Ghidra, keep the names files (`tools/ghidra/names_<image>.tsv`, applied with `ApplyNames.java`) as the source of truth, re-export `decomp/<image>/` with `tools/ghidra/ExportDecomp.java`, and use the same names in the docs.

## Issue tracking (owner requirement)

Every task is mirrored as a GitHub issue in the repo: an epic, one issue per task, and sub-tasks (`T05a`...) as sub-issues of their parent. `docs/tasks/` stays the source of truth. After any change to the board or a task file's status/findings, the parent agent runs `python3 -I tools/issues_sync.py`. It updates titles, bodies and status labels, comments on status changes, closes done tasks, and keeps `docs/tasks/issues.json`, which is committed along with the change. Background task agents don't run it, because the parent does. When you split a task, add the sub-task rows to the board so the sync creates the sub-issues.

## Watchdog / long-running work

- Give every long command a hard timeout. Ghidra headless runs take `-analysisTimeoutPerFile <sec>`, and the decompiler has a 60 s per-function limit inside `ExportDecomp.java`.
- Background agents write a heartbeat: append `<ISO time> <task> <step>` to `$HB_DIR/<task>` (the parent gives you `HB_DIR`) after each major step, at least every ~10 minutes of work. The parent's watchdog treats a heartbeat older than 30 minutes as stalled.
- If a tool or connection fails, retry with backoff before giving up. Record unrecoverable failures in the task file.
