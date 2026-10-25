/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "bricohams/ardf.h"
#include "scheduler.h"

static bh_ardf bhArdf;
static bh_ardf_view bhArdfView;
static bh_ardf_config bhArdfConfig;
static uint8_t bhArdfSelected;
static bool bhArdfSynced;
static bool bhArdfError;
static bool bhArdfActive;
static bool bhArdfStatsSaturated;
static uint32_t bhArdfSession;
static uint32_t bhArdfSessionStart;
static uint32_t bhArdfSessionElapsed;
static struct {
    uint16_t observations;
    uint8_t gain;
    uint32_t first_ms;
    uint32_t last_ms;
} bhArdfStats[BH_ARDF_MAX_FOXES];

static uint32_t BH_ARDF_Now(void)
{
    return SCHEDULER_GetTick10ms() * UINT32_C(10);
}

static void BH_ARDF_Reset(void)
{
    memset(bhArdfStats, 0, sizeof(bhArdfStats));
    bhArdfStatsSaturated = false;
    bhArdfSession++;
    if (bhArdfSession == 0)
        bhArdfSession = 1;
    bhArdfSessionStart = BH_ARDF_Now();
    bhArdfSessionElapsed = 0;
    bhArdfSynced = false;
    memset(&bhArdfView, 0, sizeof(bhArdfView));
    bhArdfError = bh_ardf_init(&bhArdf, &bhArdfConfig, BH_ARDF_Now()) != BH_ARDF_OK;
    bhArdfSelected = 1;
}

static void BH_ARDF_Start(void)
{
    bhArdfActive = true;
    bhArdfConfig = (bh_ardf_config){0, 60000, 5000, 0, 1, FOXHUNT_ATT_COUNT - 1};
    BH_ARDF_Reset();
}

static void BH_ARDF_Update(void)
{
    if (bhArdfActive)
        bhArdfSessionElapsed = BH_ARDF_Now() - bhArdfSessionStart;
    if (bhArdfActive && !bhArdfError && bhArdfSynced)
        bhArdfError = bh_ardf_update(&bhArdf, BH_ARDF_Now(), &bhArdfView) != BH_ARDF_OK;
}

static bool BH_ARDF_Key(KEY_Code_t key)
{
    if (key < KEY_4 || key > KEY_9)
        return false;
    if (key == KEY_4) {
        bhArdfConfig.fox_count = (uint8_t)((bhArdfConfig.fox_count + 1U) % 11U);
        BH_ARDF_Reset();
    } else if (key == KEY_5) {
        bhArdfConfig.duration_ms = bhArdfConfig.duration_ms >= 120000 ? 15000 : bhArdfConfig.duration_ms + 15000;
        BH_ARDF_Reset();
    } else if (key == KEY_6 && bhArdfConfig.fox_count != 0) {
        bhArdfSelected = (uint8_t)(bhArdfSelected % bhArdfConfig.fox_count + 1);
    } else if (key == KEY_7 && bhArdfConfig.fox_count != 0) {
        bhArdfError = bh_ardf_sync(&bhArdf, bhArdfSelected, 0, BH_ARDF_Now()) != BH_ARDF_OK;
        bhArdfSynced = !bhArdfError;
        BH_ARDF_Update();
    } else if (key == KEY_8 && bhArdfSynced && !bhArdfError) {
        BH_ARDF_Update();
        if (bhArdfError)
            return true;
        bhArdfError = bh_ardf_save_gain(&bhArdf, 0, bhArdfView.fox, attStep) != BH_ARDF_OK;
        if (!bhArdfError) {
            const uint8_t index = (uint8_t)(bhArdfView.fox - 1U);
            if (bhArdfStats[index].observations == 0)
                bhArdfStats[index].first_ms = bhArdfSessionElapsed;
            if (bhArdfStats[index].observations < UINT16_MAX)
                bhArdfStats[index].observations++;
            else
                bhArdfStatsSaturated = true;
            bhArdfStats[index].last_ms = bhArdfSessionElapsed;
            bhArdfStats[index].gain = attStep;
        }
    } else if (key == KEY_9 && bhArdfSynced && !bhArdfError) {
        uint8_t index = 0;
        bool available = false;
        bhArdfError = bh_ardf_load_gain(&bhArdf, 0, bhArdfView.fox, &index, &available) != BH_ARDF_OK;
        if (!bhArdfError && available && index != attStep) {
            attStep = index;
            FOXHUNT_ApplyAtt();
            SYSTEM_DelayMs(FOXHUNT_ATT_SETTLE_MS);
            FOXHUNT_RebaseMeasurements();
        }

    }
    return true;
}

static void BH_ARDF_Stop(void)
{
    BH_ARDF_Update();
    bhArdfActive = false;
}

static void BH_ARDF_Put32(uint8_t *output, uint32_t value)
{
    for (unsigned i = 0; i < 4; ++i)
        output[i] = (uint8_t)(value >> (8U * i));
}

void BH_ARDF_StatsRequest(const uint8_t *input, uint16_t length, uint8_t output[BH_ARDF_STATS_BYTES])
{
    memset(output, 0, BH_ARDF_STATS_BYTES);
    output[0] = 1;
    output[1] = 2;
    if (input == NULL || length != 4)
        return;
    output[4] = input[2];
    output[5] = input[3];
    if (input[0] != 1 || input[1] != 0)
        return;
    if (bhArdfSession == 0) {
        output[1] = 3;
        return;
    }
    BH_ARDF_Update();
    output[1] = 0;
    output[2] = (uint8_t)((bhArdfActive ? 1U : 0U) | (bhArdfSynced ? 2U : 0U) |
        (bhArdfError ? 4U : 0U) | (bhArdfStatsSaturated ? 8U : 0U));
    output[3] = bhArdfConfig.fox_count;
    BH_ARDF_Put32(output + 8, bhArdfSession);
    BH_ARDF_Put32(output + 12, bhArdfConfig.duration_ms);
    BH_ARDF_Put32(output + 16, bhArdfSessionElapsed);
    for (unsigned i = 0; i < BH_ARDF_MAX_FOXES; ++i) {
        uint8_t *record = output + 20 + i * 12U;
        record[0] = (uint8_t)bhArdfStats[i].observations;
        record[1] = (uint8_t)(bhArdfStats[i].observations >> 8);
        record[2] = bhArdfStats[i].gain;
        record[3] = bhArdfStats[i].observations != 0 ? 1 : 0;
        BH_ARDF_Put32(record + 4, bhArdfStats[i].first_ms);
        BH_ARDF_Put32(record + 8, bhArdfStats[i].last_ms);
    }
}

static void BH_ARDF_Draw(void)
{
    char line[24];
    if (bhArdfError)
        strcpy(line, "ARDF ERROR");
    else if (bhArdfConfig.fox_count == 0)
        strcpy(line, "ARDF OFF 4=ON");
    else if (!bhArdfSynced)
        sprintf(line, "N%u %lus S%u K7", (unsigned)bhArdfConfig.fox_count,
            (unsigned long)(bhArdfConfig.duration_ms / 1000), (unsigned)bhArdfSelected);
    else
        sprintf(line, "F%u/%u %lus%s", (unsigned)bhArdfView.fox, (unsigned)bhArdfConfig.fox_count,
            (unsigned long)((bhArdfView.remaining_ms + 999) / 1000), bhArdfView.end_notice ? " !" : "");
    memset(gFrameBuffer[2], 0, sizeof(gFrameBuffer[2]));
    UI_PrintStringSmallNormal(line, 0, 127, 2);
}
