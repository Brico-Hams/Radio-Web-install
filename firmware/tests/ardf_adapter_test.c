#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef enum { KEY_INVALID, KEY_0, KEY_1, KEY_2, KEY_3, KEY_4, KEY_5,
    KEY_6, KEY_7, KEY_8, KEY_9, KEY_PTT } KEY_Code_t;
#define FOXHUNT_ATT_COUNT 6
#define FOXHUNT_ATT_SETTLE_MS 20
static uint8_t attStep;
static uint8_t gFrameBuffer[7][128];
static uint32_t tick;
static unsigned gain_writes;
static unsigned rebases;
static unsigned delays;
static char last_line[32];
uint32_t SCHEDULER_GetTick10ms(void) { return tick; }
static void FOXHUNT_ApplyAtt(void) { gain_writes++; }
static void SYSTEM_DelayMs(uint16_t delay) { delays += delay; }
static void FOXHUNT_RebaseMeasurements(void) { rebases++; }
static void UI_PrintStringSmallNormal(const char *text, unsigned left, unsigned right, unsigned line)
{
    (void)left; (void)right; (void)line;
    snprintf(last_line, sizeof(last_line), "%s", text);
}
#include "bricohams/ardf_foxhunt.inc"

#define CHECK(expression) do { if (!(expression)) { \
    fprintf(stderr, "FAIL line %d: %s\n", __LINE__, #expression); return EXIT_FAILURE; \
} } while (0)

int main(void)
{
    uint8_t request[4] = {1, 0, 0x12, 0x34};
    uint8_t reply[BH_ARDF_STATS_BYTES];
    BH_ARDF_StatsRequest(request, 4, reply);
    CHECK(reply[1] == 3);
    BH_ARDF_Start();
    BH_ARDF_Draw();
    CHECK(strcmp(last_line, "ARDF OFF 4=ON") == 0);
    CHECK(!BH_ARDF_Key(KEY_PTT) && !BH_ARDF_Key(KEY_3));
    for (unsigned i = 0; i < 5; ++i)
        CHECK(BH_ARDF_Key(KEY_4));
    CHECK(bhArdfConfig.fox_count == 5 && !bhArdfSynced);
    BH_ARDF_Draw();
    CHECK(strstr(last_line, "N5 60s S1 K7") != NULL);
    BH_ARDF_Key(KEY_6);
    CHECK(bhArdfSelected == 2);
    tick = 100;
    BH_ARDF_Key(KEY_7);
    CHECK(bhArdfSynced && bhArdfView.fox == 2 && !bhArdfError);
    attStep = 3;
    BH_ARDF_Key(KEY_8);
    CHECK(bhArdfStats[1].observations == 1 && bhArdfStats[1].gain == 3);
    CHECK(bhArdfStats[1].first_ms == 1000 && bhArdfStats[1].last_ms == 1000);
    tick += 25;
    BH_ARDF_Key(KEY_8);
    CHECK(bhArdfStats[1].observations == 2 && bhArdfStats[1].last_ms == 1250);
    BH_ARDF_StatsRequest(request, 4, reply);
    CHECK(reply[0] == 1 && reply[1] == 0 && reply[2] == 3 && reply[3] == 5);
    CHECK(reply[4] == 0x12 && reply[5] == 0x34 && reply[6] == 0 && reply[7] == 0);
    CHECK(reply[32] == 2 && reply[34] == 3 && reply[35] == 1);
    attStep = 1;
    BH_ARDF_Key(KEY_9);
    CHECK(attStep == 3 && gain_writes == 1 && rebases == 1 && delays == FOXHUNT_ATT_SETTLE_MS);
    BH_ARDF_Key(KEY_9);
    CHECK(gain_writes == 1);
    tick += 5475;
    BH_ARDF_Update();
    CHECK(bhArdfView.fox == 2 && bhArdfView.remaining_ms == 5000 && bhArdfView.end_notice);
    BH_ARDF_Draw();
    CHECK(strcmp(last_line, "F2/5 5s !") == 0);
    tick += 500;
    BH_ARDF_Update();
    CHECK(bhArdfView.fox == 3);
    BH_ARDF_Key(KEY_9);
    CHECK(gain_writes == 1);
    BH_ARDF_Key(KEY_5);
    CHECK(bhArdfConfig.duration_ms == 75000 && !bhArdfSynced);
    for (unsigned i = 0; i < 4; ++i) BH_ARDF_Key(KEY_5);
    CHECK(bhArdfConfig.duration_ms == 15000);
    for (unsigned i = 0; i < 5; ++i) BH_ARDF_Key(KEY_4);
    CHECK(bhArdfConfig.fox_count == 10);
    for (unsigned i = 0; i < 9; ++i) BH_ARDF_Key(KEY_6);
    CHECK(bhArdfSelected == 10);
    BH_ARDF_Draw();
    CHECK(strlen(last_line) <= 18);
    BH_ARDF_Key(KEY_7);
    CHECK(bhArdfView.fox == 10);
    bhArdf.initialized = false;
    BH_ARDF_Update();
    BH_ARDF_Draw();
    CHECK(bhArdfError && strcmp(last_line, "ARDF ERROR") == 0);
    BH_ARDF_Key(KEY_4);
    CHECK(!bhArdfError && bhArdfConfig.fox_count == 0 && !bhArdfSynced);
    BH_ARDF_Start();
    CHECK(bhArdfConfig.fox_count == 0 && !bhArdfSynced);
    CHECK(bhArdfStats[1].observations == 0);
    BH_ARDF_Key(KEY_4);
    BH_ARDF_Key(KEY_7);
    bhArdfStats[0].observations = UINT16_MAX;
    BH_ARDF_Key(KEY_8);
    CHECK(bhArdfStatsSaturated && bhArdfStats[0].observations == UINT16_MAX);
    BH_ARDF_StatsRequest(request, 4, reply);
    CHECK(reply[2] == 11 && reply[20] == 255 && reply[21] == 255);
    const uint32_t session = bhArdfSession;
    for (unsigned length = 0; length < 256; ++length) {
        if (length == 4) continue;
        BH_ARDF_StatsRequest(request, (uint16_t)length, reply);
        CHECK(reply[1] == 2 && session == bhArdfSession && bhArdfStats[0].observations == UINT16_MAX);
    }
    request[0] = 2;
    BH_ARDF_StatsRequest(request, 4, reply);
    CHECK(reply[1] == 2);
    request[0] = 1; request[1] = 1;
    BH_ARDF_StatsRequest(request, 4, reply);
    CHECK(reply[1] == 2);
    request[1] = 0;
    BH_ARDF_StatsRequest(NULL, 4, reply);
    CHECK(reply[1] == 2);
    tick += 100;
    BH_ARDF_Stop();
    const uint32_t elapsed = bhArdfSessionElapsed;
    tick += 1000;
    BH_ARDF_StatsRequest(request, 4, reply);
    CHECK(reply[1] == 0 && reply[2] == 10 && bhArdfSessionElapsed == elapsed);
    tick = UINT32_MAX / 10U - 20U;
    BH_ARDF_Start();
    BH_ARDF_Key(KEY_4);
    BH_ARDF_Key(KEY_7);
    tick += 100;
    BH_ARDF_Key(KEY_8);
    CHECK(bhArdfStats[0].first_ms == 1000);
    BH_ARDF_Stop();
    tick = 0;
    BH_ARDF_Start();
    BH_ARDF_Key(KEY_4);
    BH_ARDF_Key(KEY_4);
    BH_ARDF_Key(KEY_7);
    attStep = 2;
    tick = 6000;
    BH_ARDF_Key(KEY_8);
    CHECK(bhArdfView.fox == 2 && bhArdfStats[0].observations == 0);
    CHECK(bhArdfStats[1].observations == 1 && bhArdfStats[1].first_ms == 60000);
    tick += 5;
    BH_ARDF_Key(KEY_8);
    CHECK(bhArdfStats[1].observations == 2 && bhArdfStats[1].last_ms == 60050);
    BH_ARDF_Key(KEY_7);
    CHECK(bhArdfView.fox == 1 && bhArdfStats[1].observations == 2);
    attStep = FOXHUNT_ATT_COUNT;
    BH_ARDF_Key(KEY_8);
    CHECK(bhArdfError && bhArdfStats[0].observations == 0);
    BH_ARDF_Key(KEY_5);
    CHECK(!bhArdfError && bhArdfStats[1].observations == 0 && !bhArdfStatsSaturated);
    bhArdfSession = UINT32_MAX;
    BH_ARDF_Start();
    CHECK(bhArdfSession == 1);
    BH_ARDF_Stop();
    puts("ARDF adapter checks passed with mocked radio calls (not hardware validation)");
    return EXIT_SUCCESS;
}
