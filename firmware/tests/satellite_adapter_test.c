#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef enum { KEY_INVALID, KEY_3, KEY_4, KEY_5, KEY_6, KEY_7, KEY_8, KEY_PTT, KEY_9 } KEY_Code_t;
typedef struct { uint32_t Frequency; } frequency_t;
typedef struct { frequency_t *pRX; frequency_t *pTX; } vfo_t;
static frequency_t rx = {43500000}, tx = {14500000};
static vfo_t vfo = {&rx, &tx};
static vfo_t *gRxVfo = &vfo;
static uint8_t gFrameBuffer[7][128];
static uint32_t tuned_frequency;
static uint32_t filter_frequency;
static unsigned tunes;
static unsigned writes;
static unsigned rebases;
static unsigned delays;
static uint32_t tick;
static bool foxLocked;
uint32_t SCHEDULER_GetTick10ms(void) { return tick; }
static char line2[32], line6[32];
#define BK4819_REG_30 0x30
static void BK4819_SetFrequency(uint32_t f) { tuned_frequency = f; tunes++; }
static void BK4819_PickRXFilterPathBasedOnFrequency(uint32_t f) { filter_frequency = f; }
static uint16_t BK4819_ReadRegister(uint8_t reg) { (void)reg; return 0x1234; }
static void BK4819_WriteRegister(uint8_t reg, uint16_t value) { (void)reg; (void)value; writes++; }
static void SYSTEM_DelayMs(unsigned delay) { delays += delay; }
static void FOXHUNT_RebaseMeasurements(void) { rebases++; }
static void UI_PrintStringSmallNormal(const char *text, unsigned left, unsigned right, unsigned line)
{
    (void)left; (void)right;
    snprintf(line == 2 ? line2 : line6, 32, "%s", text);
}
#include "bricohams/cat_tx.h"
#define ENABLE_UART
typedef enum { VFO_STATE_NORMAL = 0, VFO_STATE_BUSY, VFO_STATE_BAT_LOW, VFO_STATE_TX_DISABLE } VfoState_t;
#define BK4819_GPIO1_PIN29_PA_ENABLE 29U
#define BK4819_GPIO5_PIN1_RED 1U
static vfo_t *gTxVfo = &vfo;
static vfo_t *gCurrentVfo;
static VfoState_t tx_state;
static KEY_Code_t pressed;
static struct { KEY_Code_t current; } kbd;
static bool red_led;
static unsigned dtmf_off, keyups, mutes, unmutes, pa_off, restores, services, press_after;
static bool on_air;
static uint32_t renew_until;
static char tx_line2[32], tx_line6[32];
static VfoState_t FOXHUNT_TxState(void) { return tx_state; }
static void AUDIO_AudioPathOff(void) {}
static void RADIO_SetTxParameters(void) { keyups++; on_air = true; }
static void BK4819_ExitTxMute(void) { unmutes++; }
static void BK4819_EnterTxMute(void) { mutes++; }
static void BK4819_DisableDTMF(void) { dtmf_off++; }
static void BK4819_ToggleGpioOut(unsigned pin, bool on)
{
    if (pin == 29U && !on) { pa_off++; on_air = false; }
    if (pin == 1U) red_led = on;
}
static void RADIO_SetupRegisters(bool full) { (void)full; restores++; }
static KEY_Code_t KEYBOARD_GetKey(void) { return pressed; }
static void BACKLIGHT_Update(void) {}
static bool tx_led;
static void FOXHUNT_BlitScreen(void) { strcpy(tx_line2, line2); strcpy(tx_line6, line6); tx_led = red_led; }
/* Scripted host for the modal TX loop: each service is one 10 ms pass; renew the lease until renew_until. */
static void UART_ServiceCommands(void)
{
    static const uint8_t renew[BH_CAT_TX_REQUEST_SIZE] = {1, 1, 0, 0, 0, 0, 0, 0};
    uint8_t reply[BH_CAT_TX_REPLY_SIZE];
    services++;
    tick++;
    if (tick * 10U < renew_until)
        bh_cat_tx_request(&bh_cat_transmitter, renew, sizeof(renew), tick * 10U, reply);
    if (press_after != 0 && services == press_after)
        pressed = KEY_3;
}
#include "bricohams/satellite_foxhunt.inc"

#define CHECK(expression) do { if (!(expression)) { \
    fprintf(stderr, "FAIL line %d: %s\n", __LINE__, #expression); return EXIT_FAILURE; \
} } while (0)

int main(void)
{
    BH_SAT_Start();
    CHECK(!bhSatError && bhSatRate == 0 && tuned_frequency == 43500000);
    CHECK(filter_frequency == tuned_frequency && writes == 2 && rebases == 1 && delays == 20);
    CHECK(rx.Frequency == 43500000 && tx.Frequency == 14500000);
    CHECK(!BH_SAT_Key(KEY_PTT) && !BH_SAT_Key(KEY_3) && !BH_SAT_Key(KEY_7));
    CHECK(BH_SAT_Key(KEY_6) && bhSatRate == 500000 && tuned_frequency < rx.Frequency);
    BH_SAT_Draw();
    CHECK(strcmp(line2, "SAT RX V+500m/s") == 0 && strstr(line6, "434.") == line6);
    BH_SAT_Key(KEY_5);
    CHECK(tuned_frequency == rx.Frequency);
    CHECK(BH_SAT_Key(KEY_4) && bhSatRate == -500000 && tuned_frequency > rx.Frequency);
    for (unsigned i = 0; i < 100; ++i) BH_SAT_Key(KEY_4);
    CHECK(bhSatRate == -12000000 && !bhSatError);
    for (unsigned i = 0; i < 100; ++i) BH_SAT_Key(KEY_6);
    CHECK(bhSatRate == 12000000 && !bhSatError);
    BH_SAT_Key(KEY_5);
    CHECK(bhSatRate == 0 && tuned_frequency == 43500000);
    const unsigned previous_tunes = tunes;
    rx.Frequency = 11800000;
    BH_SAT_Start();
    CHECK(bhSatError && tunes == previous_tunes);
    BH_SAT_Draw();
    CHECK(strcmp(line2, "SAT INVALID VFO") == 0);
    rx.Frequency = 13600000;
    BH_SAT_Start();
    CHECK(!bhSatError);
    const unsigned boundary_tunes = tunes;
    BH_SAT_Key(KEY_6);
    CHECK(bhSatError && tunes == boundary_tunes);
    BH_SAT_Key(KEY_5);
    CHECK(!bhSatError && tuned_frequency == 13600000);
    CHECK(tx.Frequency == 14500000);
    rx.Frequency = 43500000;
    BH_SAT_Start();
    CHECK(!bh_cat_receiver.active);
    CHECK(BH_SAT_Key(KEY_8) && bh_cat_receiver.active);
    BH_SAT_Draw();
    CHECK(strcmp(line2, "CAT READY RX") == 0);
    uint8_t request[BH_CAT_REQUEST_SIZE] = {1, 1, 0x12, 0x34, 0, 0, 0, 0};
    uint8_t reply[BH_CAT_REPLY_SIZE];
    const uint32_t remote = 14580000;
    for (unsigned i = 0; i < 4; ++i) request[4 + i] = (uint8_t)(remote >> (8U * i));
    const unsigned before_remote = tunes;
    bh_cat_request(&bh_cat_receiver, request, sizeof(request), 0, reply);
    CHECK(reply[1] == 1 && tunes == before_remote && bh_cat_receiver.pending);
    BH_SAT_Update();
    CHECK(tuned_frequency == remote && filter_frequency == remote);
    CHECK(bh_cat_receiver.applied == remote && !bh_cat_receiver.pending);
    CHECK(rx.Frequency == 43500000 && tx.Frequency == 14500000);
    BH_SAT_Draw();
    CHECK(strcmp(line2, "SAT CAT RX") == 0 && strcmp(line6, "145.80000 MHz") == 0);
    tick = 299; BH_SAT_Update();
    CHECK(tuned_frequency == remote && tunes == before_remote + 1);
    tick = 300; BH_SAT_Update();
    CHECK(tuned_frequency == rx.Frequency && !bh_cat_receiver.remote);
    BH_SAT_Draw();
    CHECK(strcmp(line2, "CAT TIMEOUT") == 0);
    bh_cat_request(&bh_cat_receiver, request, sizeof(request), 3000, reply);
    BH_SAT_Update();
    CHECK(tuned_frequency == remote && !bhSatCatTimeout);
    BH_SAT_Key(KEY_6);
    CHECK(!bh_cat_receiver.active && !bh_cat_receiver.remote && !bh_cat_receiver.pending && bhSatRate == 500000);
    const uint32_t local = tuned_frequency;
    tick = 1000; BH_SAT_Update();
    CHECK(tuned_frequency == local);
    BH_SAT_Key(KEY_8);
    CHECK(bh_cat_receiver.active && tuned_frequency == rx.Frequency);
    bh_cat_request(&bh_cat_receiver, request, sizeof(request), 10000, reply);
    BH_SAT_Stop();
    const unsigned stopped_tunes = tunes;
    BH_SAT_Update();
    CHECK(!bh_cat_receiver.active && tunes == stopped_tunes);
    bh_cat_request(&bh_cat_receiver, request, sizeof(request), 10001, reply);
    CHECK(reply[1] == 5 && tunes == stopped_tunes);
    BH_SAT_Start();
    CHECK(!bh_cat_receiver.active && !bh_cat_receiver.remote && tuned_frequency == 43500000);
    CHECK(!BH_SAT_Key(KEY_PTT) && tunes == stopped_tunes + 1);
    BH_SAT_Key(KEY_8);
    bh_cat_request(&bh_cat_receiver, request, sizeof(request), 10000, reply);
    BH_SAT_Update();
    CHECK(tuned_frequency == remote);
    BH_SAT_Key(KEY_8);
    CHECK(!bh_cat_receiver.active && tuned_frequency == 43500000);
    BH_SAT_Key(KEY_8);
    bh_cat_request(&bh_cat_receiver, request, sizeof(request), 10000, reply);
    foxLocked = true;
    const unsigned locked_tunes = tunes;
    BH_SAT_Update();
    CHECK(!bh_cat_receiver.active && tunes == locked_tunes + 1 && tuned_frequency == 43500000);
    bh_cat_request(&bh_cat_receiver, request, sizeof(request), 10001, reply);
    CHECK(reply[1] == 5);
    foxLocked = false;

    /* CAT PTT: armed only on the keypad, held by a lease, gated by the radio's TX checks. */
    BH_SAT_Start();
    uint8_t ptt[BH_CAT_TX_REQUEST_SIZE] = {1, 1, 0, 0, 0, 0, 0, 0};
    uint8_t ptt_reply[BH_CAT_TX_REPLY_SIZE];
    tick = 20000;
    bh_cat_tx_request(&bh_cat_transmitter, ptt, sizeof(ptt), tick * 10U, ptt_reply);
    BH_SAT_Update();
    CHECK(ptt_reply[1] == BH_CAT_TX_NOT_ARMED && keyups == 0);
    CHECK(BH_SAT_Key(KEY_9) && bh_cat_transmitter.armed);
    BH_SAT_Draw();
    CHECK(strcmp(line2, "CAT TX ARMED") == 0);
    renew_until = (tick + 300U) * 10U;
    bh_cat_tx_request(&bh_cat_transmitter, ptt, sizeof(ptt), tick * 10U, ptt_reply);
    CHECK(ptt_reply[1] == BH_CAT_TX_QUEUED && keyups == 0);
    const unsigned before_tx = tunes;
    BH_SAT_Update();
    CHECK(keyups == 1 && unmutes == 1 && mutes == 1 && pa_off == 1 && restores == 1 && !on_air);
    CHECK(gCurrentVfo == gTxVfo && dtmf_off == 1 && tx_led && !red_led);
    CHECK(strcmp(tx_line2, "CAT TX ON AIR") == 0 && strcmp(tx_line6, "TX 145.00000") == 0);
    /* Lease: last renewal at 2.99 s, PTT dropped 1.5 s later. */
    CHECK(tick == 20000U + 449U);
    CHECK(!bh_cat_transmitter.keyed && bh_cat_transmitter.armed);
    CHECK(tunes == before_tx + 1 && tuned_frequency == 43500000);

    /* Any key on the radio aborts and disarms; the key is not replayed to the hunt. */
    services = 0; press_after = 50; renew_until = UINT32_MAX;
    bh_cat_tx_request(&bh_cat_transmitter, ptt, sizeof(ptt), tick * 10U, ptt_reply);
    BH_SAT_Update();
    CHECK(keyups == 2 && pa_off == 2 && !on_air && services == 50);
    CHECK(!bh_cat_transmitter.armed && kbd.current == KEY_3);
    pressed = KEY_INVALID; press_after = 0; renew_until = 0;

    /* TX lock / band / battery refusal stays until re-armed on the radio. */
    BH_SAT_Key(KEY_9);
    tx_state = VFO_STATE_TX_DISABLE;
    bh_cat_tx_request(&bh_cat_transmitter, ptt, sizeof(ptt), tick * 10U, ptt_reply);
    BH_SAT_Update();
    CHECK(keyups == 2 && bh_cat_transmitter.denied_state == VFO_STATE_TX_DISABLE);
    BH_SAT_Draw();
    CHECK(strcmp(line2, "CAT TX DENIED") == 0);
    bh_cat_tx_request(&bh_cat_transmitter, ptt, sizeof(ptt), tick * 10U, ptt_reply);
    CHECK(ptt_reply[1] == BH_CAT_TX_DENIED);
    tx_state = VFO_STATE_NORMAL;
    BH_SAT_Key(KEY_9);
    CHECK(!bh_cat_transmitter.armed);
    BH_SAT_Key(KEY_9);
    CHECK(bh_cat_transmitter.armed && bh_cat_transmitter.denied_state == 0);

    /* Time cap: a host that never stops renewing is cut at 120 s and disarmed. */
    renew_until = UINT32_MAX;
    const uint32_t cap_start = tick;
    bh_cat_tx_request(&bh_cat_transmitter, ptt, sizeof(ptt), tick * 10U, ptt_reply);
    BH_SAT_Update();
    CHECK(keyups == 3 && !on_air && bh_cat_transmitter.limit && !bh_cat_transmitter.armed);
    CHECK((tick - cap_start) * 10U == BH_CAT_TX_MAX_MS);
    BH_SAT_Draw();
    CHECK(strcmp(line2, "CAT TX LIMIT") == 0);
    renew_until = 0;

    /* Keypad lock and leaving the screen both disarm. */
    BH_SAT_Key(KEY_9);
    foxLocked = true;
    BH_SAT_Update();
    CHECK(!bh_cat_transmitter.armed);
    foxLocked = false;
    BH_SAT_Key(KEY_9);
    BH_SAT_Stop();
    CHECK(!bh_cat_transmitter.armed && keyups == 3);
    puts("Satellite adapter checks passed with mocked RF calls; no hardware validation");
    return EXIT_SUCCESS;
}
