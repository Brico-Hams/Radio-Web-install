"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const assert = require("node:assert/strict");
const { replaceOnce } = require("./bricohams-modules.cjs");

const MARKER = "BRICOHAMS_AMATEUR_GUARD";
const FILES = ["App/frequencies.c"];

// Own implementation of an idea seen (facts only) in the ta1js fork of the Telegram archive
// (ENABLE_AMATEUR_BAND_ONLY, a TX-frequency gate). The bands are the CE ones already shipped in
// F_LOCK_CE of this very file (144-146 MHz, 430-440 MHz), so no new limit is introduced.
// Off by default: it compiles only with -DENABLE_BRICOHAMS_AMATEUR_BAND_ONLY and can only deny TX.
const HELPER_BLOCK = `// ${MARKER}: opt-in extra TX gate (ENABLE_BRICOHAMS_AMATEUR_BAND_ONLY), never relaxes TX_freq_check.
#ifdef ENABLE_BRICOHAMS_AMATEUR_BAND_ONLY
static bool BH_InAmateurTxBand(const uint32_t Frequency)
{   // same CE ranges as F_LOCK_CE below, in units of 10 Hz
    return (Frequency >= 14400000 && Frequency < 14600000)
        || (Frequency >= 43000000 && Frequency < 44000000);
}
#endif

`;

const GATE_BLOCK = `#ifdef ENABLE_BRICOHAMS_AMATEUR_BAND_ONLY
    if (!BH_InAmateurTxBand(Frequency)) // ${MARKER}
        return -1;
#endif

`;

function patchAmateurGuardSource(file, source) {
  assert(!source.includes(MARKER), `Proteccion de banda de aficionado ya aplicada: ${file}`);
  if (file !== "App/frequencies.c") throw new Error(`Fuente de proteccion de banda no admitida: ${file}`);
  let text = source.replace(/\r\n/g, "\n");
  const change = (before, after) => { text = replaceOnce(text, before, after, file); };
  change("int32_t TX_freq_check(const uint32_t Frequency)\n{", `${HELPER_BLOCK}int32_t TX_freq_check(const uint32_t Frequency)\n{`);
  change("    if (RX_freq_check(Frequency))\n        return -1;\n\n    switch (gSetting_F_LOCK)",
    `    if (RX_freq_check(Frequency))\n        return -1;\n\n${GATE_BLOCK}    switch (gSetting_F_LOCK)`);
  return `/* ${MARKER}: optional amateur-band-only TX gate, off by default (Bricohams patch on F4HWN, Apache-2.0). */\n${text}`;
}

function integrateAmateurGuard(work) {
  // Validate every pinned-source anchor before changing any file.
  const staged = FILES.map(file => ({ file,
    text: patchAmateurGuardSource(file, fs.readFileSync(path.join(work, file), "utf8")) }));
  for (const { file, text } of staged) fs.writeFileSync(path.join(work, file), text);
  return { version: 1, enabledByDefault: false, buildFlag: "ENABLE_BRICOHAMS_AMATEUR_BAND_ONLY", onlyDeniesTx: true,
    hardwareValidated: false,
    sources: staged.map(({ file, text }) => ({ file, sha256: createHash("sha256").update(text).digest("hex") })) };
}

module.exports = { patchAmateurGuardSource, integrateAmateurGuard };
