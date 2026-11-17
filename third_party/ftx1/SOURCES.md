# Yaesu FTX-1 third-party sources

Each folder is an unmodified shallow clone (`git clone --depth 1`) of the upstream repository,
pinned to the commit below and fetched on 2026-11-17. The `.git` folders were removed; every
upstream LICENSE/NOTICE file is kept in place. Nothing here is served by `server.cjs` or
published by `scripts/build-pages.cjs`: these trees are reference material for
`docs/FTX1-KNOWLEDGE.md`. Code in this repository that uses facts from them is a
reimplementation (CAT command syntax and protocol facts), not a copy, unless a file says
otherwise.

To update one: re-clone at the new commit, replace the folder, update this table.

| Folder | Upstream URL | Commit | Licence |
| --- | --- | --- | --- |
| `evertonma-FTX-1CAT_PR2EM_Android` | https://github.com/evertonma/FTX-1CAT_PR2EM_Android | `80aa3a2e4939cdc6febfd3987cc77427001c30a3` | PolyForm Noncommercial 1.0.0 (`LICENSE`, `THIRD_PARTY_NOTICES.md`) |
| `Evgeny161rus-ftx1-region-tool` | https://github.com/Evgeny161rus/ftx1-region-tool | `ba3692ed3dbf3f809387bead765cba9235967c3d` | Licence not declared upstream; MIT permission stated by the repository owner to EA5KGV, per the user, 2026-11-17 |
| `Semyonic-ftx1-programmer` | https://github.com/Semyonic/ftx1-programmer | `304d4861a56481d8b405d23ad7a900fbd50734f9` | GPL-3.0 (`LICENSE`) |
| `evertonma-FTX-1CAT_PR2EM` | https://github.com/evertonma/FTX-1CAT_PR2EM | `9f15f99e0b8fe4e521f3ee616f0e938c59584ee7` | PolyForm Noncommercial 1.0.0 (`LICENSE`) |
| `hatandspecs-ftx1-tuner-sweep` | https://github.com/hatandspecs/ftx1-tuner-sweep | `473e05a79578c22d3fec79d4a952ba1a1703d29e` | MIT (`LICENSE`) |
| `juanmmmmmmm-Look4Sat-FTX1` | https://github.com/juanmmmmmmm/Look4Sat-FTX1 | `b4f93d0f0d354aa5dacec8b76e606604873a7550` | GPL-3.0 (`LICENSE`) |
| `gnfrazier-ftxcat` | https://github.com/gnfrazier/ftxcat | `08dbd7d63b8862f0e1d424e3bbdba97f711b461a` | MIT (`LICENSE`) |
| `git-jcw-FTX-1-WebUI` | https://github.com/git-jcw/FTX-1-WebUI | `0b89d460eb10d8de9db34691f39fa591f75c5386` | MIT (`LICENSE`) |
| `iTracMan-FTX1WinController` | https://github.com/iTracMan/FTX1WinController | `9f5d8f7211c208af9f6ee34629d915bb2d2e0ee3` | MIT (`LICENSE`) |
| `pokibon3-FTX1Controller` | https://github.com/pokibon3/FTX1Controller | `adf730af72f1e2ab936f3234088eb3a73af55a5a` | Licence not declared upstream; MIT permission stated by the repository owner to EA5KGV, per the user, 2026-11-17. Exception: `js/cwdec/` (`cw-worklet.js`, `cwcore.wasm`, `js/cwview.js`) comes from pokibon3/cw_decoder4 and is GPL per its own README; that statement does not change it |
| `radiohyperactivity-ftx1-front-cover` | https://github.com/radiohyperactivity/ftx1-front-cover | `df6813b8a86f50e83325deea2c8be1dd9a3221e2` | GPL-3.0 (`LICENSE`) |
| `Reid-n0rc-FTX-1_Firmware` | https://github.com/Reid-n0rc/FTX-1_Firmware | `38f3ed906e9c4fb5b9f16114eb7c44f37d42beda` | Licence not declared upstream; MIT permission stated by the repository owner to EA5KGV, per the user, 2026-11-17. Yaesu firmware itself remains Yaesu's |
| `ew1abz-yaesu-ftx-1-control` | https://github.com/ew1abz/yaesu-ftx-1-control | `273d6c3b44b5db8cba82aeffd5421097de7cbb4d` | Licence not declared upstream; MIT permission stated by the repository owner to EA5KGV, per the user, 2026-11-17 |
| `Eugen68-Yaesu-FTX1-CAT-Control` | https://github.com/Eugen68/Yaesu-FTX1-CAT-Control | `ea922b9aae3a74a4660952db1c2dac10f278ad36` | MIT (`LICENSE`) |
| `fritzsche-yaesu-ftx1` | https://github.com/fritzsche/yaesu-ftx1 | `a53baa30f3eb73ac5feda7ae3dcaa6418707a95c` | Licence not declared upstream (README: "provided as-is"); MIT permission stated by the repository owner to EA5KGV, per the user, 2026-11-17 |
| `byf3332-Yaesu-FTX1-Cat-Tunnel` | https://github.com/byf3332/Yaesu-FTX1-Cat-Tunnel | `7df422a80652a3a8705e57bf252585da8d5d64d1` | WTFPL 2 (`LICENSE`) |
| `ew1abz-yaesu-ftx-1-memory-manipulator` | https://github.com/ew1abz/yaesu-ftx-1-memory-manipulator | `bad68d59d8b1790bf20070101e00443206c19037` | MIT (declared in `Cargo.toml`; no LICENSE file upstream) |
| `sq9pd-Yaesu-FTX-1-mod` | https://github.com/sq9pd/Yaesu-FTX-1-mod | `ee71225da9db6200a8098547f4f00b6caf438371` | Licence not declared upstream; MIT permission stated by the repository owner to EA5KGV, per the user, 2026-11-17 |
| `captobie-ftx1-remote` | https://github.com/captobie/ftx1-remote | `0fb8dd5fe60b8b1f9c78db7206a27e014c03de68` | MIT (`LICENSE`); bundled Hamlib binaries under `Vendor/` are LGPL/GPL (Hamlib) |
| `bg7nzl-ftx1ctl` | https://github.com/bg7nzl/ftx1ctl | `36ceffc7fed6e8e9f6e83a164b6309037701d60f` | Licence not declared upstream; MIT permission stated by the repository owner to EA5KGV, per the user, 2026-11-17 |
| `rigplane-rigplane-core` | https://github.com/rigplane/rigplane-core | `71a5bff6c2c75268c9d086c041c294f5234f7651` | MIT (`LICENSE`) |
| `rzochowski-cat-ftx1` | https://github.com/rzochowski/cat-ftx1 | `e77b599dbb27eff5b4bd49c01a689989cfcc9495` | Licence not declared upstream; MIT permission stated by the repository owner to EA5KGV, per the user, 2026-11-17 |

## Notes for auditors

- The MIT statements above come from the user (EA5KGV), who says they spoke with each author.
  No written grant is stored in this repository; ask the user for it before relying on it
  outside this project.
- PolyForm Noncommercial code (evertonma) is not GPL-compatible: it is kept only as reference
  and no code from it is copied into this GPL-3.0 project.
- Some trees contain prebuilt binaries (`.exe`, `.apk`, `.dll`, `rigctld`, ONNX models).
  They are kept unchanged for completeness and are never executed or served by this project.
