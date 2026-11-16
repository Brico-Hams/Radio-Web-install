"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const assert = require("node:assert/strict");
const { replaceOnce } = require("./bricohams-modules.cjs");

const MARKER = "BRICOHAMS_FAST_RETUNE";
const FILES = ["App/radio.c", "App/radio.h", "App/app/main.c", "App/app/app.c"];

const RADIO_STATE_BLOCK = `// BRICOHAMS_FAST_RETUNE: RX settings of the last full setup, to detect a frequency-only retune.
uint32_t gBhRetuneFrequency;

typedef struct {
    const VFO_Info_t *vfo;
    uint8_t modulation, bandwidth, codeType, code, compander;
    uint8_t squelch[6];
} BhRxSetup_t;

static BhRxSetup_t bhLastRxSetup;
static bool bhLastRxSetupValid;

static void BH_GetRxSetup(BhRxSetup_t *setup, BK4819_FilterBandwidth_t bandwidth)
{
    memset(setup, 0, sizeof(*setup)); // zero padding so memcmp is exact
    setup->vfo = gRxVfo;
    setup->modulation = (uint8_t)gRxVfo->Modulation;
    setup->bandwidth = (uint8_t)bandwidth;
    setup->codeType = (uint8_t)gRxVfo->pRX->CodeType;
    setup->code = (uint8_t)gRxVfo->pRX->Code;
    setup->compander = (uint8_t)gRxVfo->Compander;
    setup->squelch[0] = (uint8_t)gRxVfo->SquelchOpenRSSIThresh;
    setup->squelch[1] = (uint8_t)gRxVfo->SquelchCloseRSSIThresh;
    setup->squelch[2] = (uint8_t)gRxVfo->SquelchOpenNoiseThresh;
    setup->squelch[3] = (uint8_t)gRxVfo->SquelchCloseNoiseThresh;
    setup->squelch[4] = (uint8_t)gRxVfo->SquelchCloseGlitchThresh;
    setup->squelch[5] = (uint8_t)gRxVfo->SquelchOpenGlitchThresh;
}

`;

const FAST_PATH_BLOCK = `    // BRICOHAMS_FAST_RETUNE: a plain VFO step already tuned the PLL; keep audio and RX state.
    const uint32_t bhRetune = gBhRetuneFrequency;
    gBhRetuneFrequency = 0;
    BhRxSetup_t bhSetup;
    BH_GetRxSetup(&bhSetup, Bandwidth);
    if (bhRetune != 0 && switchToForeground && bhLastRxSetupValid
        && gCurrentFunction != FUNCTION_TRANSMIT
        && gRxVfo->pRX->Frequency == bhRetune
#ifdef ENABLE_NOAA
        && !IS_NOAA_CHANNEL(gRxVfo->CHANNEL_SAVE)
#endif
        && memcmp(&bhSetup, &bhLastRxSetup, sizeof(bhSetup)) == 0)
    {
        BK4819_PickRXFilterPathBasedOnFrequency(bhRetune);
        return;
    }
    bhLastRxSetup = bhSetup;
    bhLastRxSetupValid = true;

`;

const SETUP_ANCHOR = "    AUDIO_AudioPathOff();\n\n    gEnableSpeaker = false;\n\n    BK4819_ToggleGpioOut(BK4819_GPIO6_PIN2_GREEN, false);";

function patchFastRetuneSource(file, source) {
  assert(!source.includes(MARKER), `Integracion de retune rapido ya aplicada: ${file}`);
  let text = source.replace(/\r\n/g, "\n");
  const change = (before, after) => { text = replaceOnce(text, before, after, file); };
  if (file === "App/radio.c") {
    change("void RADIO_SetupRegisters(bool switchToForeground)\n{",
      `${RADIO_STATE_BLOCK}void RADIO_SetupRegisters(bool switchToForeground)\n{`);
    change(SETUP_ANCHOR, `${FAST_PATH_BLOCK}${SETUP_ANCHOR}`);
    change("void RADIO_SetTxParameters(void)\n{",
      "void RADIO_SetTxParameters(void)\n{\n    gBhRetuneFrequency = 0; // BRICOHAMS_FAST_RETUNE: after TX the receiver is always fully restored");
  } else if (file === "App/radio.h") {
    const anchor = "void     RADIO_SetupRegisters(bool switchToForeground);";
    change(anchor, `${anchor}\nextern uint32_t gBhRetuneFrequency; // BRICOHAMS_FAST_RETUNE: frequency a VFO step already tuned, 0 = none`);
  } else if (file === "App/app/main.c") {
    change("                BK4819_RX_TurnOn();\n                gRequestSaveChannel = 1;",
      "                BK4819_RX_TurnOn();\n                gBhRetuneFrequency = frequency; // BRICOHAMS_FAST_RETUNE\n                gRequestSaveChannel = 1;");
  } else if (file === "App/app/app.c") {
    change("        if (gMonitor)\n            ACTION_Monitor();   // 1of11",
      "        if (gMonitor && gCurrentFunction != FUNCTION_MONITOR) // BRICOHAMS_FAST_RETUNE: fast retune keeps monitor on\n            ACTION_Monitor();   // 1of11");
  } else {
    throw new Error(`Fuente de retune rapido no admitida: ${file}`);
  }
  return `/* BRICOHAMS_FAST_RETUNE: frequency-only VFO steps keep RX audio (Bricohams patch on F4HWN, Apache-2.0). */\n${text}`;
}

function integrateFastRetune(work) {
  // Validate every pinned-source anchor before changing any file.
  const staged = FILES.map(file => ({ file,
    text: patchFastRetuneSource(file, fs.readFileSync(path.join(work, file), "utf8")) }));
  for (const { file, text } of staged) fs.writeFileSync(path.join(work, file), text);
  return { version: 1, audioPathKeptOnFrequencyStep: true, fullSetupOnBandModeOrTx: true, hardwareValidated: false,
    sources: staged.map(({ file, text }) => ({ file, sha256: createHash("sha256").update(text).digest("hex") })) };
}

module.exports = { patchFastRetuneSource, integrateFastRetune };
