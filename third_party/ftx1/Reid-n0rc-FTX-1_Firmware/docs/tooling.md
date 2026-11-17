# Tooling

Installed tools, versions and how they were installed (AGENTS.md → Tooling). Verify and update in T01.

| Tool | Version | Method | Location | Notes |
|---|---|---|---|---|
| Ghidra | 12.1.4 (expected) | Homebrew formula `ghidra` | `/opt/homebrew/opt/ghidra` | already installed for the FT-710 work; run via `tools/ghidra-headless.sh` |
| OpenJDK | 21 (expected) | Homebrew `openjdk@21` | `/opt/homebrew/opt/openjdk@21` | Ghidra needs 21; the system Java 11 won't work |
| Python | 3.x | system / Homebrew | | stdlib only |
| poppler (`pdftotext`) | | Homebrew | | for targeted PDF reads |
