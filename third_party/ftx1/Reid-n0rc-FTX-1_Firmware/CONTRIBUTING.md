# Contributing

Thanks for helping. This project reverse-engineers the Yaesu FTX-1's firmware, following the method of
[Reid-n0rc/FT-710_Firmware](https://github.com/Reid-n0rc/FT-710_Firmware). [AGENTS.md](AGENTS.md) is the rule book for humans and AI
agents alike.

## How changes get in

```mermaid
flowchart LR
  I["1. Open an issue<br/>(template)"] --> F["2. Fork or branch"]
  F --> C["3. Commit on your branch"]
  C --> P["4. Pull request<br/>'Closes #N'"]
  P --> K{"issue-link check<br/>+ owner review"}
  K -->|pass| M["5. Merged to main"]
  K -->|changes asked| C
```

1. **Every change starts with an issue.** Open one with a template (correction, new analysis or tool, question) before you write code
   or docs. Say what you want to change and the evidence for it.
2. **Every commit goes through a pull request.** Nobody pushes to `main` directly, except the repository owner and admins. Work on a
   branch (or a fork) and open a pull request.
3. **Link the issue in the PR description** with a closing keyword: `Closes #12`, `Fixes #12` or `Resolves #12`. The `issue-link`
   check fails without it.
4. **Review.** The repository owner reviews every pull request (`.github/CODEOWNERS`). Answer the review on the same branch.

The repository owner and admins may commit to `main` directly (the branch ruleset lets them bypass it). That includes AI agents working
on the owner's behalf with the owner's credentials.

## Signed commits (please, but not required)

Please sign your commits so GitHub shows them as **Verified**. SSH signing is the simplest option:

```sh
git config gpg.format ssh
git config user.signingkey ~/.ssh/id_ed25519.pub   # any SSH key; add it on GitHub as a *signing* key
git config commit.gpgsign true
```

## What a good change looks like

- **Evidence tags.** Mark claims **[fact]** (seen in code or data, with the address), **[inference]** or **[guess]**. An FT-710 finding
  reused here stays **[inference]** until it is checked against FTX-1 data.
- **Figures.** Use Mermaid in Markdown, about 25 nodes or fewer.
- **Ghidra names.** Keep the names files in `tools/ghidra/` as the source of truth, and re-export `decomp/<image>/` with
  `tools/ghidra/ExportDecomp.java` when names change. Send name changes as `tools/ghidra/names_*.tsv` edits plus the `decomp/`
  re-export; Ghidra databases can't be merged.
- **What is in the repo.** The firmware download (`Firmware/`), decoded images (`build/`), manuals (`Manuals/`) and Ghidra projects
  (`ghidra/`) are not committed.
- **Don't touch someone's radio without asking.** Anything that writes to a radio (flashing, EEPROM writes, untested CAT set-commands,
  JTAG loads) needs that radio owner's explicit approval each time.
- **Licence conditions.** Changes that affect transmit (power, band limits, the TX path) must keep the radio within its operator's
  licence.
