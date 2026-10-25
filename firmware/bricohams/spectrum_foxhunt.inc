/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "bricohams/presets.h"
#include "scheduler.h"
#include "dcs.h"

static bh_spectrum bhSpec;
static bh_presets bhSpecPresets;
static uint32_t bhSpecCenter;
static uint8_t bhSpecStep;
static uint8_t bhSpecGain;
static uint8_t bhSpecSavedAudio;
static bool bhSpecPaused;
static bool bhSpecError;
static bool bhSpecCapture;
static bool bhSpecRegisters;
static bool bhSpecCaptureReady;
static uint32_t bhSpecCaptureFrequency;
static uint32_t bhSpecCaptureTick;
static uint16_t bhSpecCaptureRssi;
static const char *bhSpecNotice;
static bool bhSpecInputActive;
static char bhSpecInput[9];
static uint8_t bhSpecInputLength;
static bool bhSpecMulti;
static bool bhSpecNextPreset;
static uint32_t bhSpecBlacklist[16];
static uint8_t bhSpecBlacklistCount;
static uint8_t bhSpecGainField;
static bool bhSpecManualGain;
static bool bhSpecCssEnabled;
static uint16_t bhSpecCssSaved51;
static uint32_t bhSpecCssTick;
static uint32_t bhSpecCssLastHit;
static uint8_t bhSpecCssType;
static uint8_t bhSpecCssCode;
static uint8_t bhSpecCssCandidateType;
static uint8_t bhSpecCssCandidateCode;
static uint8_t bhSpecCssHits;
static const uint8_t bhSpecGainShifts[] = {8, 5, 3, 0};
static const uint8_t bhSpecGainMax[] = {3, 7, 3, 7};
static const char *const bhSpecGainNames[] = {"LNAs", "LNA", "MIX", "PGA"};
static const uint32_t bhSpecSteps[] = {125, 250, 625, 1250};
static bool bhSpecActive;
static uint8_t bhSpecTransfer[BH_PRESET_BLOB_BYTES];
static uint8_t bhSpecTransferState;
static uint32_t bhSpecTransferToken;
static uint32_t bhSpecTransferTick;
static bool BH_SPEC_InBand(uint32_t first, uint32_t last);

uint16_t BH_SPEC_PresetRequest(const uint8_t *input, uint16_t length, uint8_t output[BH_PRESET_REPLY_MAX])
{
    memset(output, 0, BH_PRESET_REPLY_MAX);
    output[0] = 1;
    output[1] = 2;
    if (input == NULL || length < 6)
        return 6;
    memcpy(output + 2, input + 2, 4);
    const uint8_t operation = input[1];
    const uint32_t token = (uint32_t)input[2] | ((uint32_t)input[3] << 8) |
        ((uint32_t)input[4] << 16) | ((uint32_t)input[5] << 24);
    if (input[0] != 1 || operation > 5 || token == 0 ||
        length != (operation == 2 || operation == 3 ? 6 + BH_PRESET_CHUNK_BYTES : 6))
        return 6;
    if (!bhSpecActive || !bhSpecPaused || bhSpecCapture || bhSpecMulti || foxLocked) {
        output[1] = 3;
        bhSpecTransferState = 0;
        return 6;
    }
    const uint32_t now = SCHEDULER_GetTick10ms() * 10U;
    if ((uint32_t)(now - bhSpecTransferTick) >= 5000U)
        bhSpecTransferState = 0;
    if (operation == 5) {
        bhSpecTransferState = 0;
        output[1] = 0;
        return 6;
    }
    if (operation == 0 || operation == 2) {
        if (operation == 0 && bh_presets_encode(&bhSpecPresets, bhSpecTransfer,
            sizeof(bhSpecTransfer)) != BH_PRESETS_OK) {
            output[1] = 4;
            return 6;
        }
        bhSpecTransferToken = token;
        bhSpecTransferTick = now;
        bhSpecTransferState = operation == 0 ? 1 : 2;
        if (operation == 2)
            memcpy(bhSpecTransfer, input + 6, BH_PRESET_CHUNK_BYTES);
        else
            memcpy(output + 6, bhSpecTransfer, BH_PRESET_CHUNK_BYTES);
        output[1] = 0;
        return operation == 0 ? BH_PRESET_REPLY_MAX : 6;
    }
    if (token != bhSpecTransferToken ||
        bhSpecTransferState != (operation == 1 ? 1 : operation == 3 ? 2 : 3)) {
        output[1] = 5;
        return 6;
    }
    if (operation == 1) {
        memcpy(output + 6, bhSpecTransfer + BH_PRESET_CHUNK_BYTES, BH_PRESET_CHUNK_BYTES);
        bhSpecTransferState = 0;
        output[1] = 0;
        return BH_PRESET_REPLY_MAX;
    }
    if (operation == 3) {
        memcpy(bhSpecTransfer + BH_PRESET_CHUNK_BYTES, input + 6, BH_PRESET_CHUNK_BYTES);
        bhSpecTransferState = 3;
        output[1] = 0;
        return 6;
    }
    bh_presets decoded;
    bhSpecTransferState = 0;
    if (bh_presets_decode(&decoded, bhSpecTransfer, sizeof(bhSpecTransfer)) != BH_PRESETS_OK) {
        output[1] = 6;
        return 6;
    }
    for (uint8_t i = 0; i < decoded.count; ++i) {
        const bh_spectrum_config *config = &decoded.entries[i].spectrum;
        if (config->bins != 128 || config->settle_ms != 20 ||
            !BH_SPEC_InBand(config->first_10hz, config->first_10hz + 127U * config->step_10hz) ||
            (config->step_10hz != 125 && config->step_10hz != 250 &&
             config->step_10hz != 625 && config->step_10hz != 1250) ||
            (config->samples_per_bin != 1 && config->samples_per_bin != 2 &&
             config->samples_per_bin != 4 && config->samples_per_bin != 8)) {
            output[1] = 7;
            return 6;
        }
    }
    bhSpecPresets = decoded;
    bhSpecNotice = "PRESETS IMPORTED";
    output[1] = 0;
    return 6;
}

static void BH_SPEC_CssReset(void)
{
    bhSpecCssTick = SCHEDULER_GetTick10ms() * 10U;
    bhSpecCssLastHit = bhSpecCssTick;
    bhSpecCssType = 0;
    bhSpecCssCode = 0xff;
    bhSpecCssCandidateType = 0;
    bhSpecCssCandidateCode = 0xff;
    bhSpecCssHits = 0;
}

static void BH_SPEC_CssStop(void)
{
    if (bhSpecCssEnabled)
        BK4819_WriteRegister(BK4819_REG_51, bhSpecCssSaved51);
    bhSpecCssEnabled = false;
    BH_SPEC_CssReset();
}

static void BH_SPEC_CssConfigure(void)
{
    const uint16_t gain = BK4819_ReadRegister(BK4819_REG_13);
    const uint16_t agc = BK4819_ReadRegister(BK4819_REG_7E);
    BK4819_SetScanFrequency(bhSpecCaptureFrequency);
    BK4819_WriteRegister(BK4819_REG_13, gain);
    BK4819_WriteRegister(BK4819_REG_7E, agc);
    BH_SPEC_CssReset();
}

static void BH_SPEC_CssUpdate(void)
{
    if (!bhSpecCssEnabled || !bhSpecCaptureReady)
        return;
    const uint32_t now = SCHEDULER_GetTick10ms() * 10U;
    if (now - bhSpecCssTick < 250U || now - bhSpecCaptureTick < 500U)
        return;
    bhSpecCssTick = now;
    if (now - bhSpecCssLastHit >= 1500U)
        bhSpecCssType = 0;
    uint32_t digital = 0;
    uint16_t tone = 0;
    uint8_t type = 0;
    uint8_t code = 0xff;
    const BK4819_CssScanResult_t result = BK4819_GetCxCSSScanResult(&digital, &tone);
    if (result == BK4819_CSS_RESULT_CTCSS) {
        code = DCS_GetCtcssCode(tone);
        if (code < 50) {
            const uint16_t nominal = CTCSS_Options[code];
            const uint16_t difference = tone > nominal ? (uint16_t)(tone - nominal) : (uint16_t)(nominal - tone);
            if (difference <= 5U)
                type = CODE_TYPE_CONTINUOUS_TONE;
        }
    } else if (result == BK4819_CSS_RESULT_CDCSS) {
        code = DCS_GetCdcssCode(digital);
        if (code < DCS_OPTION_COUNT)
            type = CODE_TYPE_DIGITAL;
        else {
            code = DCS_GetCdcssCode(digital ^ 0x7fffffU);
            if (code < DCS_OPTION_COUNT)
                type = CODE_TYPE_REVERSE_DIGITAL;
        }
    }
    if (type == 0) {
        bhSpecCssHits = 0;
        return;
    }
    if (type != bhSpecCssCandidateType || code != bhSpecCssCandidateCode) {
        bhSpecCssCandidateType = type;
        bhSpecCssCandidateCode = code;
        bhSpecCssHits = 1;
        return;
    }
    if (bhSpecCssHits < 2)
        bhSpecCssHits++;
    if (bhSpecCssHits >= 2) {
        bhSpecCssType = type;
        bhSpecCssCode = code;
        bhSpecCssLastHit = now;
    }
}

static bool BH_SPEC_IsExcluded(uint32_t frequency)
{
    for (uint8_t i = 0; i < bhSpecBlacklistCount; ++i)
        if (bhSpecBlacklist[i] == frequency)
            return true;
    return false;
}

static void BH_SPEC_ToggleExcluded(void)
{
    for (uint8_t i = 0; i < bhSpecBlacklistCount; ++i) {
        if (bhSpecBlacklist[i] != bhSpecCaptureFrequency)
            continue;
        bhSpecBlacklist[i] = bhSpecBlacklist[--bhSpecBlacklistCount];
        bhSpecNotice = "FREQ INCLUDED";
        return;
    }
    if (bhSpecBlacklistCount == 16) {
        bhSpecNotice = "BLACKLIST FULL";
        return;
    }
    bhSpecBlacklist[bhSpecBlacklistCount++] = bhSpecCaptureFrequency;
    bhSpecNotice = "FREQ EXCLUDED";
}

static void BH_SPEC_AdjustGain(bool increase)
{
    const uint8_t shift = bhSpecGainShifts[bhSpecGainField];
    const uint16_t mask = (uint16_t)((uint16_t)bhSpecGainMax[bhSpecGainField] << shift);
    const uint16_t current = BK4819_ReadRegister(BK4819_REG_13);
    uint16_t value = (uint16_t)((current & mask) >> shift);
    if ((increase && value == bhSpecGainMax[bhSpecGainField]) || (!increase && value == 0)) {
        bhSpecNotice = "GAIN LIMIT";
        return;
    }
    value = increase ? (uint16_t)(value + 1U) : (uint16_t)(value - 1U);
    BK4819_WriteRegister(BK4819_REG_13, (uint16_t)((current & (uint16_t)~mask) | (uint16_t)(value << shift)));
    bhSpecManualGain = true;
    bhSpecCaptureReady = false;
    bhSpecCaptureTick = SCHEDULER_GetTick10ms() * 10U;
    BH_SPEC_CssReset();
    bhSpecNotice = "RX GAIN SESSION";
}

static bool BH_SPEC_InBand(uint32_t first, uint32_t last)
{
    return (first >= 13600000 && last <= 17400000) ||
        (first >= 40000000 && last <= 47000000);
}

static void BH_SPEC_Reset(uint8_t samples)
{
    bhSpecNotice = NULL;
    bhSpecNextPreset = false;
    const uint32_t step = bhSpecSteps[bhSpecStep];
    const uint32_t below = 64U * step;
    bhSpecError = bhSpecCenter <= below || bhSpecCenter > UINT32_MAX - 63U * step;
    if (bhSpecError)
        return;
    const bh_spectrum_config config = {bhSpecCenter - below, step, 128, 20, samples};
    bhSpecError = !BH_SPEC_InBand(config.first_10hz, bhSpecCenter + 63U * step) ||
        bh_spectrum_init(&bhSpec, &config) != BH_SPECTRUM_OK;
    bhSpecGain = attStep;
}

static void BH_SPEC_Tune(uint32_t frequency)
{
    BK4819_SetFrequency(frequency);
    BK4819_PickRXFilterPathBasedOnFrequency(frequency);
    const uint16_t receive = BK4819_ReadRegister(BK4819_REG_30);
    BK4819_WriteRegister(BK4819_REG_30, 0);
    BK4819_WriteRegister(BK4819_REG_30, receive);
}

static void BH_SPEC_CaptureTune(uint32_t frequency)
{
    BH_SPEC_Tune(frequency);
    bhSpecCaptureFrequency = frequency;
    bhSpecCaptureTick = SCHEDULER_GetTick10ms() * 10U;
    bhSpecCaptureReady = false;
    bhSpecNotice = NULL;
    if (bhSpecCssEnabled)
        BH_SPEC_CssConfigure();
}

static void BH_SPEC_Recall(void)
{
    const bh_spectrum_config *config = &bhSpecPresets.entries[bhSpecPresets.selected].spectrum;
    for (bhSpecStep = 0; bhSpecStep < 4; ++bhSpecStep)
        if (bhSpecSteps[bhSpecStep] == config->step_10hz)
            break;
    if (bhSpecStep == 4) {
        bhSpecError = true;
        bhSpecStep = 0;
    } else {
        bhSpecCenter = config->first_10hz + 64U * config->step_10hz;
        BH_SPEC_Reset(config->samples_per_bin);
    }
}

static void BH_SPEC_Start(void)
{
    bhSpecActive = true;
    bhSpecTransferState = 0;
    memset(&bhSpec, 0, sizeof(bhSpec));
    memset(&bhSpecPresets, 0, sizeof(bhSpecPresets));
    bhSpecCenter = gRxVfo->pRX->Frequency;
    bhSpecStep = 0;
    bhSpecPaused = false;
    bhSpecCapture = false;
    bhSpecRegisters = false;
    bhSpecCaptureReady = false;
    bhSpecInputActive = false;
    bhSpecMulti = false;
    bhSpecNextPreset = false;
    bhSpecBlacklistCount = 0;
    bhSpecGainField = 0;
    bhSpecManualGain = false;
    bhSpecCssEnabled = false;
    BH_SPEC_CssReset();
    bhSpecSavedAudio = foxAudioMode;
    foxAudioMode = FOXHUNT_AUDIO_OFF;
    BH_SPEC_Reset(1);
}

static void BH_SPEC_Update(void)
{
    if (bhSpecCapture) {
        if (attStep != bhSpecGain) {
            bhSpecManualGain = false;
            bhSpecGain = attStep;
            bhSpecCaptureTick = SCHEDULER_GetTick10ms() * 10U;
            bhSpecCaptureReady = false;
            BH_SPEC_CssReset();
        }
        if (SCHEDULER_GetTick10ms() * 10U - bhSpecCaptureTick >= 20U) {
            bhSpecCaptureRssi = BK4819_GetRSSI();
            bhSpecCaptureReady = true;
            BH_SPEC_CssUpdate();
        }
        return;
    }
    if (attStep != bhSpecGain && !bhSpecError) {
        bhSpecManualGain = false;
        BH_SPEC_Reset(bhSpec.config.samples_per_bin);
    }
    if (bhSpecError || bhSpecPaused)
        return;
    if (bhSpecMulti && bhSpecNextPreset) {
        bhSpecNextPreset = false;
        bhSpecPresets.selected = (uint8_t)((bhSpecPresets.selected + 1U) % bhSpecPresets.count);
        BH_SPEC_Recall();
        if (bhSpecError)
            return;
    }
    if (bhSpec.tune_required) {
        uint32_t frequency;
        bhSpecError = bh_spectrum_frequency(&bhSpec, &frequency) != BH_SPECTRUM_OK;
        if (bhSpecError)
            return;
        if (BH_SPEC_IsExcluded(frequency)) {
            bhSpecError = bh_spectrum_skip(&bhSpec) != BH_SPECTRUM_OK;
            if (!bhSpecError && bhSpec.bin == 0)
                bhSpecNextPreset = bhSpecMulti;
            return;
        }
        BH_SPEC_Tune(frequency);
        bhSpecError = bh_spectrum_tuned(&bhSpec, SCHEDULER_GetTick10ms() * 10U) != BH_SPECTRUM_OK;
        return;
    }
    const uint32_t now = SCHEDULER_GetTick10ms() * 10U;
    if (now - bhSpec.tune_tick < bhSpec.config.settle_ms)
        return;
    bool complete;
    bhSpecError = bh_spectrum_sample(&bhSpec, now, BK4819_GetRSSI(), &complete) != BH_SPECTRUM_OK;
    if (!bhSpecError && complete)
        bhSpecNotice = NULL;
    if (!bhSpecError && complete && bhSpec.bin == 0)
        bhSpecNextPreset = bhSpecMulti;
}

static bool BH_SPEC_Key(KEY_Code_t key)
{
    bhSpecTransferState = 0;
    if (bhSpecCapture) {
        if (bhSpecInputActive) {
            if (key >= KEY_0 && key <= KEY_9) {
                if (bhSpecInputLength < 8) {
                    bhSpecInput[bhSpecInputLength++] = (char)('0' + key - KEY_0);
                    bhSpecInput[bhSpecInputLength] = '\0';
                    bhSpecNotice = NULL;
                } else {
                    bhSpecNotice = "FULL: 8 DIGITS";
                }
            } else if (key == KEY_EXIT) {
                bhSpecInputActive = false;
                bhSpecNotice = NULL;
            } else if (key == KEY_STAR) {
                if (bhSpecInputLength != 0)
                    bhSpecInput[--bhSpecInputLength] = '\0';
                else
                    bhSpecInputActive = false;
                bhSpecNotice = NULL;
            } else if (key == KEY_MENU) {
                uint32_t frequency = 0;
                for (uint8_t i = 0; i < bhSpecInputLength; ++i)
                    frequency = frequency * 10U + (uint32_t)(bhSpecInput[i] - '0');
                if (bhSpecInputLength != 8)
                    bhSpecNotice = "ENTER 8 DIGITS";
                else if (!BH_SPEC_InBand(frequency, frequency))
                    bhSpecNotice = "RX OUT OF BAND";
                else {
                    BH_SPEC_CaptureTune(frequency);
                    bhSpecInputActive = false;
                }
            }
            return true;
        }
        if (key == KEY_EXIT) {
            BH_SPEC_CssStop();
            bhSpecCapture = false;
            foxAudioMode = FOXHUNT_AUDIO_OFF;
            FOXHUNT_SetAudio();
            BH_SPEC_Reset(bhSpec.config.samples_per_bin);
            bhSpecNextPreset = false;
        } else if (key == KEY_4) {
            BH_SPEC_ToggleExcluded();
        } else if (key == KEY_9) {
            if (bhSpecCssEnabled) {
                BH_SPEC_CssStop();
            } else if (gRxVfo->Modulation != MODULATION_FM) {
                bhSpecNotice = "CSS NEEDS FM";
            } else {
                bhSpecCssSaved51 = BK4819_ReadRegister(BK4819_REG_51);
                bhSpecCssEnabled = true;
                BH_SPEC_CssConfigure();
                bhSpecCaptureTick = SCHEDULER_GetTick10ms() * 10U;
                bhSpecCaptureReady = false;
                bhSpecNotice = "CSS SEARCH ON";
            }
        } else if (bhSpecRegisters && key == KEY_6) {
            bhSpecGainField = (uint8_t)((bhSpecGainField + 1U) % 4U);
            bhSpecNotice = NULL;
        } else if (bhSpecRegisters && (key == KEY_1 || key == KEY_7)) {
            BH_SPEC_AdjustGain(key == KEY_7);
        } else if (key == KEY_STAR) {
            bhSpecInputActive = true;
            bhSpecInputLength = 0;
            bhSpecInput[0] = '\0';
            bhSpecNotice = NULL;
        } else if (key == KEY_5) {
            const uint32_t step = bhSpec.config.step_10hz;
            const uint32_t first = bhSpecCaptureFrequency - 64U * step;
            const uint32_t last = bhSpecCaptureFrequency + 63U * step;
            if (BH_SPEC_InBand(first, last)) {
                BH_SPEC_CssStop();
                bhSpecCenter = bhSpecCaptureFrequency;
                bhSpecCapture = false;
                foxAudioMode = FOXHUNT_AUDIO_OFF;
                FOXHUNT_SetAudio();
                BH_SPEC_Reset(bhSpec.config.samples_per_bin);
                bhSpecNextPreset = false;
            } else {
                bhSpecNotice = "SPAN OUT OF BAND";
            }
        } else if (key == KEY_UP || key == KEY_DOWN) {
            const uint32_t step = bhSpec.config.step_10hz;
            const uint32_t frequency = key == KEY_UP
                ? bhSpecCaptureFrequency + step : bhSpecCaptureFrequency - step;
            if (BH_SPEC_InBand(frequency, frequency))
                BH_SPEC_CaptureTune(frequency);
            else
                bhSpecNotice = "BAND LIMIT";
        } else if (key == KEY_2) {
            foxAudioMode = foxAudioMode == FOXHUNT_AUDIO_OFF
                ? FOXHUNT_AUDIO_STATION : FOXHUNT_AUDIO_OFF;
            FOXHUNT_SetAudio();
        } else if (key == KEY_MENU) {
            bhSpecRegisters = !bhSpecRegisters;
        } else if (key == KEY_3) {
            return false;
        }
        return true;
    }
    if (key == KEY_PTT) {
        if (bhSpecError)
            return true;
        const uint16_t count = bhSpec.frames ? bhSpec.config.bins : bhSpec.bin;
        if (count == 0) {
            bhSpecNotice = "WAIT SAMPLES";
            return true;
        }
        uint16_t strongest = count;
        for (uint16_t bin = 0; bin < count; ++bin) {
            const uint32_t frequency = bhSpec.config.first_10hz + (uint32_t)bin * bhSpec.config.step_10hz;
            if (BH_SPEC_IsExcluded(frequency))
                continue;
            if (strongest == count || bhSpec.levels[bin] > bhSpec.levels[strongest])
                strongest = bin;
        }
        if (strongest == count) {
            bhSpecNotice = "POINTS EXCLUDED";
            return true;
        }
        bhSpecCapture = true;
        bhSpecRegisters = false;
        BH_SPEC_CaptureTune(bhSpec.config.first_10hz + (uint32_t)strongest * bhSpec.config.step_10hz);
        return true;
    }
    if (key == KEY_0) {
        if (bhSpecMulti) {
            bhSpecMulti = false;
            bhSpecNextPreset = false;
        } else if (bhSpecPresets.count >= 2 && !bhSpecError) {
            bhSpecMulti = true;
            bhSpecNextPreset = false;
            BH_SPEC_Recall();
        } else {
            bhSpecNotice = "SAVE 2 PRESETS";
        }
        return true;
    }
    if (key == KEY_1) {
        bhSpecBlacklistCount = 0;
        if (!bhSpecError)
            BH_SPEC_Reset(bhSpec.config.samples_per_bin);
        bhSpecNotice = "BLACKLIST CLEARED";
        return true;
    }
    if (key == KEY_2)
        return true;
    if (key == KEY_4) {
        bhSpecPaused = !bhSpecPaused;
    } else if (key == KEY_5) {
        if (!bhSpecError)
            bhSpecError = bh_spectrum_clear_peaks(&bhSpec) != BH_SPECTRUM_OK;
    } else if (key == KEY_6) {
        bhSpecStep = (uint8_t)((bhSpecStep + 1U) % 4U);
        BH_SPEC_Reset(bhSpec.initialized ? bhSpec.config.samples_per_bin : 1);
    } else if (key == KEY_7) {
        const uint8_t samples = bhSpec.initialized ? bhSpec.config.samples_per_bin : 1;
        BH_SPEC_Reset(samples >= 8 ? 1 : (uint8_t)(samples * 2U));
    } else if (key == KEY_8) {
        if (!bhSpecError) {
            if (bhSpecPresets.count < BH_PRESET_MAX)
                bhSpecPresets.selected = bhSpecPresets.count++;
            bh_spectrum_preset *preset = &bhSpecPresets.entries[bhSpecPresets.selected];
            sprintf(preset->name, "RAM%u", (unsigned)(bhSpecPresets.selected + 1U));
            preset->spectrum = bhSpec.config;
            bhSpecError = bh_presets_validate(&bhSpecPresets) != BH_PRESETS_OK;
        }
    } else if (key == KEY_9) {
        if (bhSpecPresets.count != 0) {
            bhSpecPresets.selected = (uint8_t)((bhSpecPresets.selected + 1U) % bhSpecPresets.count);
            BH_SPEC_Recall();
            bhSpecNextPreset = false;
        }
    } else {
        return false;
    }
    return true;
}

static void BH_SPEC_Draw(void)
{
    // Sized for the worst case GCC derives from the formats (27 chars + NUL), not only validated values.
    char line[32];
    memset(gFrameBuffer, 0, sizeof(gFrameBuffer));
    if (bhSpecInputActive) {
        char digits[9] = "--------";
        memcpy(digits, bhSpecInput, bhSpecInputLength);
        UI_PrintStringSmallNormal("VFO RX INPUT", 0, 127, 0);
        sprintf(line, "%c%c%c.%c%c%c%c%c MHz", digits[0], digits[1], digits[2],
            digits[3], digits[4], digits[5], digits[6], digits[7]);
        UI_PrintStringSmallNormal(line, 0, 127, 2);
        UI_PrintStringSmallNormal("*=BACK M=APPLY", 0, 127, 4);
        UI_PrintStringSmallNormal("EXIT=CANCEL", 0, 127, 5);
        if (bhSpecNotice)
            UI_PrintStringSmallNormal(bhSpecNotice, 0, 127, 6);
        return;
    }
    if (bhSpecCapture) {
        UI_PrintStringSmallNormal("VFO-PRO RX ONLY", 0, 127, 0);
        sprintf(line, "%lu.%05lu MHz", (unsigned long)(bhSpecCaptureFrequency / 100000U),
            (unsigned long)(bhSpecCaptureFrequency % 100000U));
        UI_PrintStringSmallNormal(line, 0, 127, 1);
        if (bhSpecCaptureReady)
            sprintf(line, "RSSI RAW %u", (unsigned)bhSpecCaptureRssi);
        else
            strcpy(line, "SETTLING");
        UI_PrintStringSmallNormal(line, 0, 127, 2);
        if (bhSpecRegisters) {
            sprintf(line, "R13 %04X R43 %04X", (unsigned)BK4819_ReadRegister(BK4819_REG_13),
                (unsigned)BK4819_ReadRegister(BK4819_REG_43));
            UI_PrintStringSmallNormal(line, 0, 127, 3);
            const uint16_t gain = BK4819_ReadRegister(BK4819_REG_13);
            sprintf(line, "%s=%u 6=SEL 1-/7+", bhSpecGainNames[bhSpecGainField],
                (unsigned)((gain >> bhSpecGainShifts[bhSpecGainField]) & bhSpecGainMax[bhSpecGainField]));
            UI_PrintStringSmallNormal(line, 0, 127, 4);
        } else {
            snprintf(line, sizeof(line), "STEP %luHz %s%u", (unsigned long)(bhSpec.config.step_10hz * 10U),
                bhSpecManualGain ? "MAN" : "ATT", (unsigned)attStep);
            UI_PrintStringSmallNormal(line, 0, 127, 3);
            UI_PrintStringSmallNormal("M=REG *=RX 5=SCAN", 0, 127, 4);
        }
        sprintf(line, "2=AUD %s BL%u %s", foxAudioMode == FOXHUNT_AUDIO_OFF ? "OFF" : "ON",
            (unsigned)bhSpecBlacklistCount, BH_SPEC_IsExcluded(bhSpecCaptureFrequency) ? "X" : "");
        if (bhSpecCssEnabled) {
            if (bhSpecCssType == CODE_TYPE_CONTINUOUS_TONE) {
                const unsigned tone = CTCSS_Options[bhSpecCssCode];
                sprintf(line, "CTCSS %u.%u Hz", tone / 10U, tone % 10U);
            } else if (bhSpecCssType == CODE_TYPE_DIGITAL || bhSpecCssType == CODE_TYPE_REVERSE_DIGITAL) {
                sprintf(line, "DCS %03o%c", (unsigned)DCS_GetOption(bhSpecCssCode),
                    bhSpecCssType == CODE_TYPE_DIGITAL ? 'N' : 'I');
            } else {
                strcpy(line, "CSS SEARCH...");
            }
        }
        UI_PrintStringSmallNormal(line, 0, 127, 5);
        UI_PrintStringSmallNormal(bhSpecNotice ? bhSpecNotice : "EXIT=SCAN PTT=RX", 0, 127, 6);
        return;
    }
    if (bhSpecError) {
        UI_PrintStringSmallNormal("SPECTRUM ERROR", 0, 127, 1);
        UI_PrintStringSmallNormal("136-174/400-470", 0, 127, 3);
        UI_PrintStringSmallNormal("SPAN MUST FIT BAND", 0, 127, 5);
        return;
    }
    sprintf(line, "%lu.%05lu %s", (unsigned long)(bhSpecCenter / 100000U),
        (unsigned long)(bhSpecCenter % 100000U), bhSpecPaused ? "HOLD" : bhSpecMulti ? "MULTI" : "SCAN");
    UI_PrintStringSmallNormal(line, 0, 127, 0);
    snprintf(line, sizeof(line), "d%luHz A%u P%u/%u", (unsigned long)(bhSpec.config.step_10hz * 10U),
        (unsigned)bhSpec.config.samples_per_bin,
        bhSpecPresets.count ? (unsigned)(bhSpecPresets.selected + 1U) : 0U,
        (unsigned)bhSpecPresets.count);
    UI_PrintStringSmallNormal(bhSpecNotice ? bhSpecNotice : line, 0, 127, 6);
    uint16_t ceiling = 1;
    for (unsigned x = 0; x < BH_SPECTRUM_MAX_BINS; ++x)
        if (!BH_SPEC_IsExcluded(bhSpec.config.first_10hz + x * bhSpec.config.step_10hz) &&
            bhSpec.peaks[x] > ceiling)
            ceiling = bhSpec.peaks[x];
    for (unsigned x = 0; x < BH_SPECTRUM_MAX_BINS; ++x) {
        if (BH_SPEC_IsExcluded(bhSpec.config.first_10hz + x * bhSpec.config.step_10hz)) {
            gFrameBuffer[5][x] = 1U;
            continue;
        }
        const unsigned height = (uint32_t)bhSpec.levels[x] * 38U / ceiling;
        const unsigned peak = (uint32_t)bhSpec.peaks[x] * 38U / ceiling;
        for (unsigned y = 0; y < height; ++y)
            gFrameBuffer[(47U - y) / 8U][x] |= (uint8_t)(1U << ((47U - y) % 8U));
        if (peak != 0)
            gFrameBuffer[(48U - peak) / 8U][x] |= (uint8_t)(1U << ((48U - peak) % 8U));
    }
}

static void BH_SPEC_Stop(void)
{
    bhSpecActive = false;
    bhSpecTransferState = 0;
    BH_SPEC_CssStop();
    foxAudioMode = bhSpecSavedAudio;
}
