# Task board

Mirrored to GitHub issues (an epic; numbers in [issues.json](issues.json)) by `tools/issues_sync.py`. Plan before you act, and split big
tasks into sub-tasks (see AGENTS.md → Ground rules, Task sizing). Update the status here when you start or finish a task.

| ID | Task | Depends on | Status |
|---|---|---|---|
| T01 | [Tooling: check Ghidra + JDK 21 and the base tools](T01-tooling.md) | — | todo |
| T02 | [Sources: firmware package, manuals, hashes](T02-sources.md) | — | todo |
| T03 | [Hardware survey (manuals, FCC filing, teardowns)](T03-hardware-survey.md) | T02 | todo |
| T04 | [Firmware container format + decoder](T04-container-decode.md) | T02 | todo |
| T05 | [Decompile each image (split into one sub-task per image)](T05-decomp.md) | T01 T03 T04 | todo |
| T06 | [Update path: who loads what, and how](T06-update-path.md) | T05 | todo |
| T07 | [CAT command table recovery](T07-cat-commands.md) | T05 | todo |
| T08 | [FT-710 comparison: shared code, names that carry over](T08-ft710-comparison.md) | T05 | todo |
| T09 | [Document the code per image (split into sub-tasks)](T09-docs-code.md) | T05–T08 | todo |
| T10 | [System-level documentation + figures](T10-docs-system.md) | T09 | todo |
| T11 | [Onboarding: getting-started guide and bootstrap script](T11-onboarding.md) | T04 T05 | todo |
