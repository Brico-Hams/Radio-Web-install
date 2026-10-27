#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef enum { KEY_0, KEY_1, KEY_2, KEY_3, KEY_4, KEY_5,
    KEY_6, KEY_7, KEY_8, KEY_9, KEY_PTT, KEY_UP, KEY_DOWN, KEY_EXIT, KEY_MENU, KEY_STAR, KEY_INVALID } KEY_Code_t;
typedef struct { uint32_t Frequency; } frequency_t;
typedef struct { frequency_t *pRX; unsigned Modulation; } vfo_t;
#define MODULATION_FM 0
static frequency_t rx = {14550000};
static vfo_t vfo = {&rx, MODULATION_FM};
static vfo_t *gRxVfo = &vfo;
static uint8_t gFrameBuffer[7][128];
static uint8_t attStep, foxAudioMode = 2;
static bool foxLocked;
#define FOXHUNT_AUDIO_OFF 0
#define FOXHUNT_AUDIO_STATION 2
#define BK4819_REG_30 0x30
#define BK4819_REG_13 0x13
#define BK4819_REG_43 0x43
#define BK4819_REG_7E 0x7e
#define BK4819_REG_51 0x51
typedef enum { BK4819_CSS_RESULT_NOT_FOUND, BK4819_CSS_RESULT_CTCSS, BK4819_CSS_RESULT_CDCSS } BK4819_CssScanResult_t;
static BK4819_CssScanResult_t css_result;
static uint32_t css_digital;
static uint16_t css_tone;
static unsigned css_reads, css_configures;
const uint16_t CTCSS_Options[50] = {670, 885, 2541};
uint8_t DCS_GetCtcssCode(int value) { return value < 800 ? 0 : value < 2000 ? 1 : 2; }
uint8_t DCS_GetCdcssCode(uint32_t value) { return value == 0x123456 ? 0 : 0xff; }
uint16_t DCS_GetOption(uint8_t index) { (void)index; return 023; }
static uint32_t tick, tuned, filtered;
static unsigned tunes, reads, writes;
static unsigned audio_changes;
static uint16_t registers[128];
static uint8_t last_register;
static char lines[7][32];
uint32_t SCHEDULER_GetTick10ms(void) { return tick; }
static void BK4819_SetFrequency(uint32_t f) { tuned = f; tunes++; }
static void BK4819_PickRXFilterPathBasedOnFrequency(uint32_t f) { filtered = f; }
static uint16_t BK4819_ReadRegister(uint8_t reg) { return registers[reg]; }
static void BK4819_WriteRegister(uint8_t reg, uint16_t value) { registers[reg] = value; last_register = reg; writes++; }
static uint16_t BK4819_GetRSSI(void) { reads++; return 300; }
static BK4819_CssScanResult_t BK4819_GetCxCSSScanResult(uint32_t *digital, uint16_t *tone)
{
    css_reads++;
    *digital = css_digital;
    *tone = css_tone;
    return css_result;
}
static void BK4819_SetScanFrequency(uint32_t frequency)
{
    css_configures++;
    BK4819_SetFrequency(frequency);
    BK4819_WriteRegister(BK4819_REG_51, 0x300);
    BK4819_WriteRegister(BK4819_REG_13, 0xdead);
    BK4819_WriteRegister(BK4819_REG_7E, 0xbeef);
}
static void FOXHUNT_SetAudio(void) { audio_changes++; }
static void UI_PrintStringSmallNormal(const char *text, unsigned left, unsigned right, unsigned line)
{
    (void)left; (void)right;
    if (line >= 7 || strlen(text) > 18) abort();
    snprintf(lines[line], sizeof(lines[line]), "%s", text);
}
#include "bricohams/spectrum_foxhunt.inc"

#define CHECK(expression) do { if (!(expression)) { \
    fprintf(stderr, "FAIL line %d: %s\n", __LINE__, #expression); return EXIT_FAILURE; \
} } while (0)

int main(void)
{
    for (unsigned i = 0; i < 128; ++i) registers[i] = 0x1234;
    BH_SPEC_Start();
    CHECK(!bhSpecError && foxAudioMode == 0 && bhSpec.config.bins == 128);
    CHECK(bhSpec.config.first_10hz == 14542000 && bhSpec.config.step_10hz == 125);
    CHECK(rx.Frequency == 14550000);
    CHECK(BH_SPEC_Key(KEY_1) && BH_SPEC_Key(KEY_2) && BH_SPEC_Key(KEY_PTT) && !BH_SPEC_Key(KEY_3));
    CHECK(!bhSpecCapture && strcmp(bhSpecNotice, "WAIT SAMPLES") == 0);
    BH_SPEC_Key(KEY_0);
    CHECK(!bhSpecMulti && strcmp(bhSpecNotice, "SAVE 2 PRESETS") == 0);
    BH_SPEC_Update();
    CHECK(tuned == 14542000 && filtered == tuned && writes == 2 && reads == 0);
    tick++;
    BH_SPEC_Update();
    CHECK(reads == 0 && bhSpec.bin == 0);
    tick++;
    BH_SPEC_Update();
    CHECK(reads == 1 && bhSpec.bin == 1 && bhSpec.levels[0] == 300);
    while (bhSpec.frames < 1) {
        tick += 2;
        BH_SPEC_Update();
    }
    CHECK(reads == 128 && tunes == 128 && bhSpec.bin == 0);
    for (unsigned x = 0; x < 128; ++x) CHECK(bhSpec.levels[x] == 300);
    BH_SPEC_Draw();
    CHECK(strcmp(lines[0], "145.50000 SCAN") == 0);
    CHECK(strcmp(lines[6], "d1250Hz A1 P0/0") == 0);
    for (unsigned x = 0; x < 128; ++x)
        CHECK(gFrameBuffer[1][x] == 0xfc && gFrameBuffer[5][x] == 0xff);
    BH_SPEC_Key(KEY_4);
    const unsigned held_tunes = tunes;
    for (unsigned i = 0; i < 20; ++i) { tick += 2; BH_SPEC_Update(); }
    CHECK(tunes == held_tunes);
    BH_SPEC_Draw();
    CHECK(strstr(lines[0], "HOLD") != NULL);
    BH_SPEC_Key(KEY_4);
    BH_SPEC_Key(KEY_8);
    CHECK(bhSpecPresets.count == 1 && bh_presets_validate(&bhSpecPresets) == BH_PRESETS_OK);
    BH_SPEC_Key(KEY_6);
    CHECK(bhSpec.config.step_10hz == 250 && bhSpec.frames == 0);
    BH_SPEC_Key(KEY_7);
    CHECK(bhSpec.config.samples_per_bin == 2);
    BH_SPEC_Key(KEY_8);
    CHECK(bhSpecPresets.count == 2);
    BH_SPEC_Key(KEY_9);
    CHECK(bhSpec.config.step_10hz == 125 && bhSpec.config.samples_per_bin == 1);
    CHECK(!bhSpecCapture);
    bhSpec.levels[3] = 900;
    bhSpec.levels[60] = 1000;
    bhSpec.bin = 4;
    CHECK(BH_SPEC_Key(KEY_PTT) && bhSpecCapture);
    CHECK(bhSpecCaptureFrequency == bhSpec.config.first_10hz + 3U * 125U);
    CHECK(!bhSpecCaptureReady);
    const unsigned capture_reads = reads;
    BH_SPEC_Update();
    CHECK(reads == capture_reads);
    tick += 2;
    BH_SPEC_Update();
    CHECK(bhSpecCaptureReady && reads == capture_reads + 1 && bhSpecCaptureRssi == 300);
    BH_SPEC_Draw();
    CHECK(strcmp(lines[0], "VFO-PRO RX ONLY") == 0);
    CHECK(strcmp(lines[2], "RSSI RAW 300") == 0);
    const unsigned capture_tunes = tunes;
    CHECK(BH_SPEC_Key(KEY_PTT) && tunes == capture_tunes);
    CHECK(BH_SPEC_Key(KEY_UP) && tuned == bhSpec.config.first_10hz + 4U * 125U);
    CHECK(!bhSpecCaptureReady);
    CHECK(BH_SPEC_Key(KEY_DOWN) && tuned == bhSpec.config.first_10hz + 3U * 125U);
    CHECK(BH_SPEC_Key(KEY_2) && foxAudioMode == 2);
    CHECK(audio_changes == 1);
    CHECK(BH_SPEC_Key(KEY_MENU) && bhSpecRegisters);
    const unsigned before_registers = writes;
    BH_SPEC_Draw();
    CHECK(strcmp(lines[3], "R13 1234 R43 1234") == 0);
    CHECK(strcmp(lines[4], "LNAs=2 6=SEL 1-/7+") == 0 && writes == before_registers);
    CHECK(!BH_SPEC_Key(KEY_3));
    attStep++;
    BH_SPEC_Update();
    CHECK(!bhSpecCaptureReady && bhSpecGain == attStep);
    BH_SPEC_CaptureTune(13600000);
    const unsigned before_limit = tunes;
    BH_SPEC_Key(KEY_DOWN);
    CHECK(tunes == before_limit && strcmp(bhSpecNotice, "BAND LIMIT") == 0);
    BH_SPEC_Key(KEY_EXIT);
    CHECK(!bhSpecCapture && foxAudioMode == 0 && audio_changes == 2 && bhSpec.bin == 0);
    CHECK(rx.Frequency == 14550000);
    CHECK(!BH_SPEC_Key(KEY_EXIT));
    bhSpec.frames = 1;
    bhSpec.levels[90] = 400;
    bhSpec.levels[127] = 800;
    BH_SPEC_Key(KEY_PTT);
    CHECK(bhSpecCapture && tuned == bhSpec.config.first_10hz + 127U * 125U);
    BH_SPEC_CaptureTune(47000000);
    const unsigned before_upper_limit = tunes;
    BH_SPEC_Key(KEY_UP);
    CHECK(tunes == before_upper_limit && strcmp(bhSpecNotice, "BAND LIMIT") == 0);
    CHECK(BH_SPEC_Key(KEY_MENU) && bhSpecRegisters);
    CHECK(BH_SPEC_Key(KEY_MENU) && !bhSpecRegisters);
    CHECK(BH_SPEC_Key(KEY_2) && foxAudioMode == 2);
    CHECK(BH_SPEC_Key(KEY_2) && foxAudioMode == 0);
    BH_SPEC_Key(KEY_EXIT);
    CHECK(!bhSpecCapture && bhSpecPresets.count == 2);
    bhSpec.frames = 1;
    BH_SPEC_Key(KEY_PTT);
    BH_SPEC_Key(KEY_STAR);
    CHECK(bhSpecInputActive && bhSpecInputLength == 0);
    BH_SPEC_Key(KEY_MENU);
    CHECK(bhSpecInputActive && strcmp(bhSpecNotice, "ENTER 8 DIGITS") == 0);
    BH_SPEC_Key(KEY_4); BH_SPEC_Key(KEY_3); BH_SPEC_Key(KEY_5); BH_SPEC_Key(KEY_1);
    BH_SPEC_Key(KEY_2); BH_SPEC_Key(KEY_5); BH_SPEC_Key(KEY_0); BH_SPEC_Key(KEY_0);
    BH_SPEC_Draw();
    CHECK(strcmp(lines[2], "435.12500 MHz") == 0);
    BH_SPEC_Key(KEY_1);
    CHECK(bhSpecInputLength == 8 && strcmp(bhSpecNotice, "FULL: 8 DIGITS") == 0);
    BH_SPEC_Key(KEY_STAR);
    CHECK(bhSpecInputLength == 7);
    BH_SPEC_Key(KEY_0);
    const unsigned before_input = tunes;
    BH_SPEC_Key(KEY_MENU);
    CHECK(!bhSpecInputActive && tunes == before_input + 1 && tuned == 43512500);
    CHECK(rx.Frequency == 14550000);
    BH_SPEC_Key(KEY_STAR);
    BH_SPEC_Key(KEY_0); BH_SPEC_Key(KEY_0); BH_SPEC_Key(KEY_0); BH_SPEC_Key(KEY_0);
    BH_SPEC_Key(KEY_0); BH_SPEC_Key(KEY_0); BH_SPEC_Key(KEY_0); BH_SPEC_Key(KEY_0);
    BH_SPEC_Key(KEY_MENU);
    CHECK(bhSpecInputActive && strcmp(bhSpecNotice, "RX OUT OF BAND") == 0);
    CHECK(tunes == before_input + 1);
    BH_SPEC_Key(KEY_EXIT);
    CHECK(!bhSpecInputActive && bhSpecCapture);
    BH_SPEC_CaptureTune(13600000);
    BH_SPEC_Key(KEY_5);
    CHECK(bhSpecCapture && strcmp(bhSpecNotice, "SPAN OUT OF BAND") == 0);
    BH_SPEC_CaptureTune(43512500);
    BH_SPEC_Key(KEY_5);
    CHECK(!bhSpecCapture && bhSpecCenter == 43512500);
    BH_SPEC_Key(KEY_8);
    CHECK(bhSpecPresets.count == 3);
    BH_SPEC_Key(KEY_0);
    CHECK(bhSpecMulti && bhSpecCenter == 43512500 && bhSpecPresets.selected == 2);
    unsigned multi_ticks = 0;
    while (!bhSpecNextPreset && multi_ticks++ < 1000) {
        tick += 2;
        BH_SPEC_Update();
    }
    CHECK(bhSpecNextPreset && bhSpec.frames == 1);
    BH_SPEC_Draw();
    CHECK(strstr(lines[0], "MULTI") != NULL);
    BH_SPEC_Key(KEY_4);
    BH_SPEC_Update();
    CHECK(bhSpecPresets.selected == 2 && bhSpecNextPreset);
    BH_SPEC_Key(KEY_4);
    BH_SPEC_Update();
    CHECK(!bhSpecNextPreset && bhSpecPresets.selected == 0 && bhSpecCenter == 14550000);
    BH_SPEC_Key(KEY_0);
    CHECK(!bhSpecMulti && !bhSpecNextPreset);
    for (unsigned i = 0; i < 20; ++i) BH_SPEC_Key(KEY_8);
    CHECK(bhSpecPresets.count == 8 && bhSpecPresets.selected == 7);
    BH_SPEC_Key(KEY_9);
    CHECK(bhSpecPresets.selected == 0);
    bhSpec.peaks[0] = 600;
    bhSpec.levels[0] = 100;
    BH_SPEC_Key(KEY_5);
    CHECK(bhSpec.peaks[0] == 100);
    attStep++;
    BH_SPEC_Update();
    CHECK(bhSpec.levels[0] == 0 && bhSpecGain == attStep);
    BH_SPEC_Stop();
    CHECK(foxAudioMode == 2);
    const unsigned valid_tunes = tunes;
    rx.Frequency = 13600000;
    BH_SPEC_Start();
    BH_SPEC_Update();
    BH_SPEC_Draw();
    CHECK(bhSpecError && tunes == valid_tunes && strcmp(lines[1], "SPECTRUM ERROR") == 0);
    CHECK(bhSpecPresets.count == 0);
    rx.Frequency = 43500000;
    BH_SPEC_Start();
    CHECK(!bhSpecError);
    for (unsigned i = 0; i < 3; ++i) BH_SPEC_Key(KEY_6);
    CHECK(bhSpec.config.step_10hz == 1250);
    for (unsigned i = 0; i < 4; ++i) BH_SPEC_Key(KEY_7);
    CHECK(bhSpec.config.samples_per_bin == 1);
    tick = UINT32_MAX / 10U - 1U;
    BH_SPEC_Update();
    tick += 3;
    BH_SPEC_Update();
    CHECK(!bhSpecError && bhSpec.bin == 1);
    rx.Frequency = 14550000;
    BH_SPEC_Start();
    bhSpec.bin = 1;
    bhSpec.levels[0] = 999;
    BH_SPEC_Key(KEY_PTT);
    CHECK(bhSpecCapture);
    BH_SPEC_Key(KEY_4);
    CHECK(bhSpecBlacklistCount == 1 && BH_SPEC_IsExcluded(bhSpec.config.first_10hz));
    BH_SPEC_Draw();
    CHECK(strstr(lines[5], "BL1 X") != NULL && strcmp(lines[6], "FREQ EXCLUDED") == 0);
    BH_SPEC_Key(KEY_4);
    CHECK(bhSpecBlacklistCount == 0 && strcmp(bhSpecNotice, "FREQ INCLUDED") == 0);
    BH_SPEC_Key(KEY_4);
    BH_SPEC_Key(KEY_EXIT);
    const unsigned before_skip_tunes = tunes;
    const unsigned before_skip_reads = reads;
    BH_SPEC_Update();
    CHECK(bhSpec.bin == 1 && reads == before_skip_reads && tunes == before_skip_tunes);
    CHECK(bhSpec.levels[0] == 0 && bhSpec.peaks[0] == 0);
    BH_SPEC_Draw();
    CHECK(gFrameBuffer[5][0] == 1U);
    BH_SPEC_Key(KEY_PTT);
    CHECK(!bhSpecCapture && strcmp(bhSpecNotice, "POINTS EXCLUDED") == 0);
    bhSpec.bin = 2;
    bhSpec.levels[0] = 999;
    bhSpec.levels[1] = 400;
    BH_SPEC_Key(KEY_PTT);
    CHECK(bhSpecCapture && bhSpecCaptureFrequency == bhSpec.config.first_10hz + 125U);
    for (unsigned i = 1; i < 16; ++i) {
        BH_SPEC_CaptureTune(bhSpec.config.first_10hz + i * 125U);
        BH_SPEC_Key(KEY_4);
    }
    CHECK(bhSpecBlacklistCount == 16);
    BH_SPEC_CaptureTune(bhSpec.config.first_10hz + 20U * 125U);
    BH_SPEC_Key(KEY_4);
    CHECK(bhSpecBlacklistCount == 16 && strcmp(bhSpecNotice, "BLACKLIST FULL") == 0);
    CHECK(!BH_SPEC_IsExcluded(bhSpecCaptureFrequency));
    BH_SPEC_CaptureTune(bhSpec.config.first_10hz + 3U * 125U);
    BH_SPEC_Key(KEY_4);
    CHECK(bhSpecBlacklistCount == 15 && !BH_SPEC_IsExcluded(bhSpecCaptureFrequency));
    BH_SPEC_Key(KEY_EXIT);
    BH_SPEC_Key(KEY_6);
    CHECK(bhSpecBlacklistCount == 15);
    BH_SPEC_Key(KEY_1);
    CHECK(bhSpecBlacklistCount == 0 && strcmp(bhSpecNotice, "BLACKLIST CLEARED") == 0);
    BH_SPEC_Update();
    CHECK(tuned == bhSpec.config.first_10hz);
    tick += 2;
    BH_SPEC_Update();
    BH_SPEC_Key(KEY_PTT);
    CHECK(bhSpecCapture);
    BH_SPEC_Key(KEY_MENU);
    CHECK(bhSpecRegisters && bhSpecGainField == 0);
    for (uint8_t field = 0; field < 4; ++field) {
        CHECK(bhSpecGainField == field);
        const uint16_t mask = (uint16_t)((uint16_t)bhSpecGainMax[field] << bhSpecGainShifts[field]);
        registers[BK4819_REG_13] = 0xa800;
        const uint16_t other_bits = (uint16_t)(registers[BK4819_REG_13] & (uint16_t)~mask);
        const unsigned before_decrement = writes;
        BH_SPEC_Key(KEY_1);
        CHECK(writes == before_decrement && strcmp(bhSpecNotice, "GAIN LIMIT") == 0);
        for (unsigned i = 0; i < bhSpecGainMax[field]; ++i) {
            BH_SPEC_Key(KEY_7);
            CHECK(last_register == BK4819_REG_13);
            CHECK((registers[BK4819_REG_13] & (uint16_t)~mask) == other_bits);
            CHECK(!bhSpecCaptureReady && bhSpecManualGain);
        }
        CHECK((registers[BK4819_REG_13] & mask) == mask);
        const unsigned at_limit = writes;
        BH_SPEC_Key(KEY_7);
        CHECK(writes == at_limit && strcmp(bhSpecNotice, "GAIN LIMIT") == 0);
        BH_SPEC_Draw();
        CHECK(strstr(lines[4], bhSpecGainNames[field]) != NULL);
        BH_SPEC_Update();
        CHECK(!bhSpecCaptureReady);
        tick += 2;
        BH_SPEC_Update();
        CHECK(bhSpecCaptureReady);
        for (unsigned i = 0; i < bhSpecGainMax[field]; ++i) BH_SPEC_Key(KEY_1);
        CHECK(registers[BK4819_REG_13] == other_bits);
        BH_SPEC_Key(KEY_6);
    }
    CHECK(bhSpecGainField == 0);
    CHECK(registers[BK4819_REG_43] == 0x1234 && registers[BK4819_REG_7E] == 0x1234);
    BH_SPEC_Key(KEY_MENU);
    CHECK(!bhSpecRegisters);
    BH_SPEC_Key(KEY_7);
    CHECK(!bhSpecCaptureReady && bhSpecManualGain);
    BH_SPEC_Draw();
    CHECK(strstr(lines[3], "MAN") != NULL);
    attStep++;
    BH_SPEC_Update();
    CHECK(!bhSpecManualGain && !bhSpecCaptureReady);
    BH_SPEC_Key(KEY_EXIT);
    BH_SPEC_Start();
    CHECK(bhSpecBlacklistCount == 0 && !bhSpecManualGain && rx.Frequency == 14550000);
    bhSpec.bin = 127;
    bhSpecBlacklist[0] = bhSpec.config.first_10hz + 127U * bhSpec.config.step_10hz;
    bhSpecBlacklistCount = 1;
    const unsigned before_last_skip = tunes;
    BH_SPEC_Update();
    CHECK(tunes == before_last_skip && bhSpec.bin == 0 && bhSpec.frames == 1);
    BH_SPEC_Key(KEY_1);
    CHECK(bhSpec.frames == 0 && bhSpec.bin == 0 && bhSpecBlacklistCount == 0);
    for (uint8_t field = 0; field < 4; ++field) {
        bhSpecGainField = field;
        const unsigned shift = bhSpecGainShifts[field];
        const uint16_t mask = (uint16_t)((uint16_t)bhSpecGainMax[field] << shift);
        for (uint32_t raw = 0; raw <= UINT16_MAX; ++raw) {
            for (unsigned direction = 0; direction < 2; ++direction) {
                registers[BK4819_REG_13] = (uint16_t)raw;
                const uint16_t value = (uint16_t)((raw & mask) >> shift);
                const bool limited = direction ? value == bhSpecGainMax[field] : value == 0;
                const unsigned previous_writes = writes;
                BH_SPEC_AdjustGain(direction != 0);
                if (limited) {
                    CHECK(writes == previous_writes && registers[BK4819_REG_13] == raw);
                } else {
                    const uint16_t next = direction ? (uint16_t)(value + 1U) : (uint16_t)(value - 1U);
                    const uint16_t expected = (uint16_t)(((uint16_t)raw & (uint16_t)~mask) | (uint16_t)(next << shift));
                    CHECK(registers[BK4819_REG_13] == expected && writes == previous_writes + 1);
                    CHECK(last_register == BK4819_REG_13);
                }
            }
        }
    }
    BH_SPEC_Start();
    bhSpec.bin = 1;
    BH_SPEC_Key(KEY_PTT);
    CHECK(bhSpecCapture && !bhSpecCssEnabled);
    vfo.Modulation = 1;
    const unsigned before_css_invalid = writes;
    BH_SPEC_Key(KEY_9);
    CHECK(!bhSpecCssEnabled && writes == before_css_invalid && strcmp(bhSpecNotice, "CSS NEEDS FM") == 0);
    vfo.Modulation = MODULATION_FM;
    registers[BK4819_REG_51] = 0x918a;
    registers[BK4819_REG_13] = 0xabcd;
    registers[BK4819_REG_7E] = 0xb234;
    BH_SPEC_Key(KEY_9);
    CHECK(bhSpecCssEnabled && bhSpecCssSaved51 == 0x918a);
    CHECK(css_configures == 1 && registers[BK4819_REG_13] == 0xabcd && registers[BK4819_REG_7E] == 0xb234);
    css_result = BK4819_CSS_RESULT_CTCSS;
    css_tone = 885;
    tick += 49;
    BH_SPEC_Update();
    CHECK(css_reads == 0);
    tick++;
    BH_SPEC_Update();
    CHECK(css_reads == 1 && bhSpecCssHits == 1 && bhSpecCssType == 0);
    tick += 24;
    BH_SPEC_Update();
    CHECK(css_reads == 1);
    tick++;
    BH_SPEC_Update();
    CHECK(bhSpecCssType == CODE_TYPE_CONTINUOUS_TONE && bhSpecCssCode == 1);
    BH_SPEC_Draw();
    CHECK(strcmp(lines[5], "CTCSS 88.5 Hz") == 0);
    css_tone = 900;
    tick += 25;
    BH_SPEC_Update();
    CHECK(bhSpecCssHits == 0);
    css_result = BK4819_CSS_RESULT_NOT_FOUND;
    tick += 125;
    BH_SPEC_Update();
    BH_SPEC_Draw();
    CHECK(bhSpecCssType == 0 && strcmp(lines[5], "CSS SEARCH...") == 0);
    css_result = BK4819_CSS_RESULT_CDCSS;
    css_digital = 0;
    tick += 25; BH_SPEC_Update();
    CHECK(bhSpecCssType == 0 && bhSpecCssHits == 0);
    css_digital = 0x123456;
    tick += 25; BH_SPEC_Update();
    tick += 25; BH_SPEC_Update();
    BH_SPEC_Draw();
    CHECK(bhSpecCssType == CODE_TYPE_DIGITAL && strcmp(lines[5], "DCS 023N") == 0);
    css_digital ^= 0x7fffffU;
    tick += 25; BH_SPEC_Update();
    tick += 25; BH_SPEC_Update();
    BH_SPEC_Draw();
    CHECK(bhSpecCssType == CODE_TYPE_REVERSE_DIGITAL && strcmp(lines[5], "DCS 023I") == 0);
    BH_SPEC_Key(KEY_UP);
    CHECK(css_configures == 2 && bhSpecCssType == 0 && bhSpecCssHits == 0);
    CHECK(registers[BK4819_REG_13] == 0xabcd && registers[BK4819_REG_7E] == 0xb234);
    BH_SPEC_Key(KEY_9);
    CHECK(!bhSpecCssEnabled && registers[BK4819_REG_51] == 0x918a);
    BH_SPEC_Key(KEY_9);
    css_result = BK4819_CSS_RESULT_CTCSS;
    css_tone = 670;
    tick += 50; BH_SPEC_Update();
    css_result = BK4819_CSS_RESULT_NOT_FOUND;
    tick += 25; BH_SPEC_Update();
    css_result = BK4819_CSS_RESULT_CTCSS;
    tick += 25; BH_SPEC_Update();
    CHECK(bhSpecCssType == 0 && bhSpecCssHits == 1);
    tick += 25; BH_SPEC_Update();
    CHECK(bhSpecCssType == CODE_TYPE_CONTINUOUS_TONE && bhSpecCssCode == 0);
    BH_SPEC_Draw();
    CHECK(strcmp(lines[5], "CTCSS 67.0 Hz") == 0);
    BH_SPEC_Key(KEY_MENU);
    BH_SPEC_Key(KEY_6);
    BH_SPEC_Key(KEY_7);
    CHECK(bhSpecCssType == 0 && !bhSpecCaptureReady);
    BH_SPEC_Key(KEY_MENU);
    tick = UINT32_MAX / 10U - 10U;
    BH_SPEC_Key(KEY_UP);
    css_tone = 2541;
    tick += 50; BH_SPEC_Update();
    tick += 25; BH_SPEC_Update();
    BH_SPEC_Draw();
    CHECK(bhSpecCssType == CODE_TYPE_CONTINUOUS_TONE && strcmp(lines[5], "CTCSS 254.1 Hz") == 0);
    BH_SPEC_Key(KEY_EXIT);
    CHECK(!bhSpecCssEnabled && !bhSpecCapture && registers[BK4819_REG_51] == 0x918a);
    bhSpec.bin = 1;
    BH_SPEC_Key(KEY_PTT);
    BH_SPEC_Key(KEY_9);
    BH_SPEC_Key(KEY_5);
    CHECK(!bhSpecCapture && !bhSpecCssEnabled && registers[BK4819_REG_51] == 0x918a);
    bhSpec.bin = 1;
    BH_SPEC_Key(KEY_PTT);
    BH_SPEC_Key(KEY_9);
    BH_SPEC_Stop();
    CHECK(!bhSpecCssEnabled && registers[BK4819_REG_51] == 0x918a);
    uint8_t request[6 + BH_PRESET_CHUNK_BYTES] = {1, 0, 1, 2, 3, 4};
    uint8_t response[BH_PRESET_REPLY_MAX];
    uint8_t blob[BH_PRESET_BLOB_BYTES];
    CHECK(BH_SPEC_PresetRequest(request, 6, response) == 6 && response[1] == 3);
    BH_SPEC_Start();
    CHECK(BH_SPEC_PresetRequest(request, 6, response) == 6 && response[1] == 3);
    BH_SPEC_Key(KEY_4);
    CHECK(bhSpecPaused);
    CHECK(BH_SPEC_PresetRequest(request, 6, response) == 6 && response[1] == 4);
    BH_SPEC_Key(KEY_8);
    CHECK(BH_SPEC_PresetRequest(request, 6, response) == BH_PRESET_REPLY_MAX && response[1] == 0);
    memcpy(blob, response + 6, BH_PRESET_CHUNK_BYTES);
    request[1] = 1;
    CHECK(BH_SPEC_PresetRequest(request, 6, response) == BH_PRESET_REPLY_MAX && response[1] == 0);
    memcpy(blob + BH_PRESET_CHUNK_BYTES, response + 6, BH_PRESET_CHUNK_BYTES);
    bh_presets restored;
    CHECK(bh_presets_decode(&restored, blob, sizeof(blob)) == BH_PRESETS_OK);
    CHECK(restored.count == 1 && strcmp(restored.entries[0].name, "RAM1") == 0);
    CHECK(BH_SPEC_PresetRequest(request, 6, response) == 6 && response[1] == 5);
    strcpy(restored.entries[0].name, "FILE");
    CHECK(bh_presets_encode(&restored, blob, sizeof(blob)) == BH_PRESETS_OK);
    const unsigned before_transfer_tunes = tunes;
    for (unsigned stage = 0; stage < 2; ++stage) {
        request[1] = (uint8_t)(2U + stage);
        memcpy(request + 6, blob + stage * BH_PRESET_CHUNK_BYTES, BH_PRESET_CHUNK_BYTES);
        CHECK(BH_SPEC_PresetRequest(request, sizeof(request), response) == 6 && response[1] == 0);
        CHECK(strcmp(bhSpecPresets.entries[0].name, "RAM1") == 0);
    }
    request[1] = 4;
    CHECK(BH_SPEC_PresetRequest(request, 6, response) == 6 && response[1] == 0);
    CHECK(strcmp(bhSpecPresets.entries[0].name, "FILE") == 0 && tunes == before_transfer_tunes);
    CHECK(bhSpecPaused && strcmp(bhSpecNotice, "PRESETS IMPORTED") == 0);
    const bh_presets before = bhSpecPresets;
    for (unsigned mode = 0; mode < 5; ++mode) {
        if (mode == 1) restored.entries[0].spectrum.bins = 64;
        if (mode == 2) { restored.entries[0].spectrum.bins = 128; restored.entries[0].spectrum.first_10hz = 11800000; }
        if (mode == 3) { restored.entries[0].spectrum.first_10hz = 14500000; restored.entries[0].spectrum.samples_per_bin = 3; }
        if (mode == 4) { restored.entries[0].spectrum.samples_per_bin = 1; restored.entries[0].spectrum.settle_ms = 30; }
        CHECK(bh_presets_encode(&restored, blob, sizeof(blob)) == BH_PRESETS_OK);
        if (mode == 0) blob[50] ^= 1;
        for (unsigned stage = 0; stage < 2; ++stage) {
            request[1] = (uint8_t)(2U + stage);
            memcpy(request + 6, blob + stage * BH_PRESET_CHUNK_BYTES, BH_PRESET_CHUNK_BYTES);
            BH_SPEC_PresetRequest(request, sizeof(request), response);
            CHECK(response[1] == 0);
        }
        request[1] = 4;
        BH_SPEC_PresetRequest(request, 6, response);
        CHECK(response[1] == (mode == 0 ? 6 : 7));
        CHECK(memcmp(&before, &bhSpecPresets, sizeof(before)) == 0);
    }
    request[1] = 0;
    BH_SPEC_PresetRequest(request, 6, response);
    request[1] = 1; request[2] ^= 1;
    BH_SPEC_PresetRequest(request, 6, response);
    CHECK(response[1] == 5);
    request[2] ^= 1; tick += 500;
    BH_SPEC_PresetRequest(request, 6, response);
    CHECK(response[1] == 5);
    request[1] = 0;
    BH_SPEC_PresetRequest(request, 6, response);
    BH_SPEC_Key(KEY_5);
    request[1] = 1;
    BH_SPEC_PresetRequest(request, 6, response);
    CHECK(response[1] == 5);
    foxLocked = true;
    request[1] = 0;
    BH_SPEC_PresetRequest(request, 6, response);
    CHECK(response[1] == 3);
    foxLocked = false;
    CHECK(BH_SPEC_PresetRequest(NULL, 0, response) == 6 && response[1] == 2);
    request[0] = 2;
    BH_SPEC_PresetRequest(request, 6, response);
    CHECK(response[1] == 2);
    request[0] = 1; request[1] = 6;
    BH_SPEC_PresetRequest(request, 6, response);
    CHECK(response[1] == 2);
    request[1] = 5;
    BH_SPEC_PresetRequest(request, 6, response);
    CHECK(response[1] == 0 && bhSpecTransferState == 0);
    for (unsigned length = 0; length < 256; ++length) {
        if (length == 6) continue;
        BH_SPEC_PresetRequest(request, (uint16_t)length, response);
        CHECK(response[1] == 2);
        CHECK(memcmp(&before, &bhSpecPresets, sizeof(before)) == 0);
    }
    request[1] = 0;
    bhSpecCapture = true;
    BH_SPEC_PresetRequest(request, 6, response);
    CHECK(response[1] == 3);
    bhSpecCapture = false;
    bhSpecMulti = true;
    BH_SPEC_PresetRequest(request, 6, response);
    CHECK(response[1] == 3);
    bhSpecMulti = false;
    request[1] = 2;
    BH_SPEC_PresetRequest(request, sizeof(request), response);
    CHECK(response[1] == 0);
    request[1] = 4;
    BH_SPEC_PresetRequest(request, 6, response);
    CHECK(response[1] == 5 && memcmp(&before, &bhSpecPresets, sizeof(before)) == 0);
    tick = UINT32_MAX / 10U - 100U;
    request[1] = 0;
    BH_SPEC_PresetRequest(request, 6, response);
    CHECK(response[1] == 0);
    tick += 100;
    request[1] = 1;
    BH_SPEC_PresetRequest(request, 6, response);
    CHECK(response[1] == 0);
    BH_SPEC_Stop();
    BH_SPEC_Start();
    CHECK(bhSpecSettleMs == 20 && bhSpec.config.settle_ms == 20);
    const uint16_t delays[] = {40, 80, 10, 20};
    for (unsigned index = 0; index < 4; ++index) {
        CHECK(BH_SPEC_Key(KEY_STAR));
        CHECK(bhSpec.config.settle_ms == delays[index] && bhSpec.frames == 0);
        BH_SPEC_Draw();
        CHECK(strstr(lines[6], "SETTLE") != NULL);
        BH_SPEC_Update();
        const unsigned previous_reads = reads;
        tick += (uint32_t)(delays[index] / 10U - 1U);
        BH_SPEC_Update();
        CHECK(reads == previous_reads && bhSpec.bin == 0);
        tick++;
        BH_SPEC_Update();
        CHECK(reads == previous_reads + 1 && bhSpec.bin == 1);
        CHECK(BH_SPEC_Key(KEY_8));
        CHECK(bhSpecPresets.entries[index].spectrum.settle_ms == delays[index]);
    }
    for (unsigned index = 0; index < 4; ++index) {
        bhSpecPresets.selected = (uint8_t)index;
        BH_SPEC_Recall();
        CHECK(!bhSpecError && bhSpec.config.settle_ms == delays[index]);
    }
    CHECK(bh_presets_encode(&bhSpecPresets, blob, sizeof(blob)) == BH_PRESETS_OK);
    CHECK(bh_presets_decode(&restored, blob, sizeof(blob)) == BH_PRESETS_OK);
    for (unsigned index = 0; index < 4; ++index)
        CHECK(restored.entries[index].spectrum.settle_ms == delays[index]);
    BH_SPEC_Key(KEY_4);
    for (unsigned stage = 0; stage < 2; ++stage) {
        request[1] = (uint8_t)(2U + stage);
        memcpy(request + 6, blob + stage * BH_PRESET_CHUNK_BYTES, BH_PRESET_CHUNK_BYTES);
        CHECK(BH_SPEC_PresetRequest(request, sizeof(request), response) == 6 && response[1] == 0);
    }
    request[1] = 4;
    CHECK(BH_SPEC_PresetRequest(request, 6, response) == 6 && response[1] == 0);
    for (unsigned index = 0; index < 4; ++index)
        CHECK(bhSpecPresets.entries[index].spectrum.settle_ms == delays[index]);
    BH_SPEC_Start();
    CHECK(bhSpec.config.settle_ms == 20 && bhSpecSettleMs == 20);
    BH_SPEC_Stop();
    puts("Spectrum adapter: RF/display/presets/CSS/file transfer checked with mocks; not physical validation");
    return EXIT_SUCCESS;
}
