#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef enum { KEY_INVALID, KEY_3, KEY_4, KEY_5, KEY_6, KEY_7, KEY_8, KEY_PTT, KEY_9,
    KEY_0, KEY_UP, KEY_DOWN, KEY_EXIT } KEY_Code_t;
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
static char line2[32], line6[32], rows[7][32];
#define BK4819_REG_30 0x30
static void BK4819_SetFrequency(uint32_t f) { tuned_frequency = f; tunes++; }
static void BK4819_PickRXFilterPathBasedOnFrequency(uint32_t f) { filter_frequency = f; }
static uint16_t BK4819_ReadRegister(uint8_t reg)
{
    /* REG_38/39 hold the tuned frequency (10 Hz units), as the real BK4819 does. */
    if (reg == 0x38) return (uint16_t)(tuned_frequency & 0xFFFFU);
    if (reg == 0x39) return (uint16_t)(tuned_frequency >> 16);
    return 0x1234;
}
#define BK4819_REG_38 0x38
#define BK4819_REG_39 0x39
static bool gWasFKeyPressed;
static char indicator[16], blit_indicator[16];
static void GUI_DisplaySmallestInverse(const char *text, unsigned x, unsigned y, bool a, bool b)
{
    (void)x; (void)y; (void)a; (void)b;
    snprintf(indicator, sizeof(indicator), "%s", text);
}
static void BK4819_WriteRegister(uint8_t reg, uint16_t value) { (void)reg; (void)value; writes++; }
static void SYSTEM_DelayMs(unsigned delay) { delays += delay; }
static void FOXHUNT_RebaseMeasurements(void) { rebases++; }
static void UI_PrintStringSmallNormal(const char *text, unsigned left, unsigned right, unsigned line)
{
    (void)left; (void)right;
    snprintf(rows[line], 32, "%s", text);
    if (line == 2 || line == 6)
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
static void FOXHUNT_BlitScreen(void) { strcpy(tx_line2, line2); strcpy(tx_line6, line6); tx_led = red_led; strcpy(blit_indicator, indicator); }
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
extern uint8_t bh_test_flash[0x10000];
extern unsigned bh_test_flash_writes;
extern unsigned bh_test_flash_erases;

/* Host side of CAT RX: op 1 tunes (frequency in 10 Hz), op 2 stops. */
static void cat_lease(uint8_t op, uint32_t frequency, uint32_t at_tick, uint8_t reply[BH_CAT_REPLY_SIZE])
{
    uint8_t request[BH_CAT_REQUEST_SIZE] = {1, op, 0, 0, 0, 0, 0, 0};
    for (unsigned i = 0; i < 4; ++i) request[4 + i] = (uint8_t)(frequency >> (8U * i));
    bh_cat_request(&bh_cat_receiver, request, sizeof(request), at_tick * 10U, reply);
}
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

    /* "CAT remoto" via F+8 in SAT RX: persists, auto-arms RX, and F+8 again disarms RX and TX. */
    memset(bh_test_flash, 0xff, sizeof(bh_test_flash));
    bh_cat_remote_enabled = false;
    BH_SAT_Start();
    CHECK(!bh_cat_receiver.active);
    gWasFKeyPressed = true;
    CHECK(BH_SAT_Key(KEY_8) && bh_cat_remote_enabled && bh_cat_receiver.active && !bh_cat_receiver.remote);
    CHECK(bh_test_flash[0xF008] == 0xCA && bh_test_flash[0xF009] == 1);
    CHECK(BH_SAT_Key(KEY_8) && !bh_cat_remote_enabled && !bh_cat_receiver.active && bh_test_flash[0xF009] == 0);
    gWasFKeyPressed = false;
    bh_cat_remote_set(true);
    BH_SAT_Start(); /* Already consented: SAT RX arms itself, no key 8 needed. */
    CHECK(bh_cat_receiver.active && !bh_cat_receiver.remote);
    BH_SAT_Stop();

    /* CAT outside SAT RX (normal VFO screen / digital modes). */
    const unsigned erases_before = bh_test_flash_erases, writes_before = bh_test_flash_writes;
    memset(&bh_cat_receiver, 0, sizeof(bh_cat_receiver));
    bh_cat_tx_arm(&bh_cat_transmitter, false);
    pressed = KEY_INVALID;
    tick = 40000;
    CHECK(!BH_CAT_Service(true, false));
    CHECK(bh_cat_receiver.active && !bh_cat_receiver.remote && bh_cat_receiver.nominal == rx.Frequency);
    CHECK(strcmp(blit_indicator, "CAT") == 0);
    cat_lease(1, remote, tick, reply);
    CHECK(reply[1] == 1 && reply[4] == 15 && (reply[12] & 8));
    CHECK(!BH_CAT_Service(true, false) && tuned_frequency == remote && bh_cat_receiver.applied == remote);
    CHECK(rx.Frequency == 43500000 && tx.Frequency == 14500000);
    /* Upstream RX/TX setup retunes behind our back: the remote frequency is re-asserted. */
    tuned_frequency = rx.Frequency;
    tick += 10;
    BH_CAT_Service(true, false);
    CHECK(tuned_frequency == remote);
    /* Same-frequency renewal: no retune. */
    const unsigned renew_tunes = tunes;
    cat_lease(1, remote, tick, reply);
    BH_CAT_Service(true, false);
    CHECK(tunes == renew_tunes && bh_cat_receiver.remote);
    /* Lease expiry restores the user's VFO frequency. */
    tick += 299;
    BH_CAT_Service(true, false);
    CHECK(tuned_frequency == remote);
    tick += 1;
    BH_CAT_Service(true, false);
    CHECK(tuned_frequency == rx.Frequency && !bh_cat_receiver.remote && rx.Frequency == 43500000);
    /* Op 2 restores. */
    cat_lease(1, remote, tick, reply);
    BH_CAT_Service(true, false);
    CHECK(tuned_frequency == remote);
    cat_lease(2, 0, tick, reply);
    BH_CAT_Service(true, false);
    CHECK(tuned_frequency == rx.Frequency && !bh_cat_receiver.remote);
    /* A key press cancels remote control and blocks the host for the hold-off. */
    cat_lease(1, remote, tick, reply);
    BH_CAT_Service(true, false);
    CHECK(tuned_frequency == remote);
    pressed = KEY_3; tick++;
    BH_CAT_Service(true, false);
    CHECK(tuned_frequency == rx.Frequency && !bh_cat_receiver.active);
    pressed = KEY_INVALID; tick++;
    BH_CAT_Service(true, false);
    cat_lease(1, remote, tick, reply);
    CHECK(reply[1] == 5 && (reply[12] & 16));
    tick += 498;
    BH_CAT_Service(true, false);
    CHECK(!bh_cat_receiver.active);
    tick += 1;
    BH_CAT_Service(true, false);
    CHECK(bh_cat_receiver.active);
    /* The user's own PTT cancels without touching the radio's TX frequency. */
    cat_lease(1, remote, tick, reply);
    BH_CAT_Service(true, false);
    CHECK(tuned_frequency == remote);
    const unsigned ptt_tunes = tunes;
    BH_CAT_Service(true, true);
    CHECK(!bh_cat_receiver.remote && tunes == ptt_tunes);
    tick += 500;
    BH_CAT_Service(true, false);
    /* Leaving the main screen cancels as well. */
    cat_lease(1, remote, tick, reply);
    BH_CAT_Service(true, false);
    BH_CAT_Service(false, false);
    CHECK(tuned_frequency == rx.Frequency && !bh_cat_receiver.active);
    tick += 500;
    BH_CAT_Service(true, false);

    /* CAT TX outside SAT RX: no key request, no TX; with a lease and the flag, one slot. */
    const unsigned tx_before = keyups;
    tick = 50000;
    BH_CAT_Service(true, false);
    CHECK(keyups == tx_before);
    bh_cat_tx_request(&bh_cat_transmitter, ptt, sizeof(ptt), tick * 10U, ptt_reply);
    CHECK(ptt_reply[1] == BH_CAT_TX_QUEUED);
    BH_CAT_Service(true, true); /* The user's own PTT in progress: the host does not key. */
    CHECK(keyups == tx_before);
    renew_until = (tick + 100U) * 10U;
    BH_CAT_Service(true, false);
    CHECK(keyups == tx_before + 1 && !on_air && !bh_cat_transmitter.keyed && !bhCatOutside);
    CHECK(strcmp(blit_indicator, "CAT TX") == 0);
    /* A key on the radio aborts CAT TX and refuses the host for the hold-off. */
    services = 0; press_after = 20; renew_until = UINT32_MAX;
    bh_cat_tx_request(&bh_cat_transmitter, ptt, sizeof(ptt), tick * 10U, ptt_reply);
    BH_CAT_Service(true, false);
    CHECK(keyups == tx_before + 2 && !on_air && services == 20 && bh_cat_transmitter.holdoff);
    pressed = KEY_INVALID; press_after = 0; renew_until = 0;
    bh_cat_tx_request(&bh_cat_transmitter, ptt, sizeof(ptt), tick * 10U, ptt_reply);
    CHECK(ptt_reply[1] == BH_CAT_TX_NOT_ARMED);
    /* Switching "CAT remoto" off refuses TX and restores RX. */
    bh_cat_tx_arm(&bh_cat_transmitter, false);
    bh_cat_remote_enabled = false;
    bh_cat_tx_request(&bh_cat_transmitter, ptt, sizeof(ptt), tick * 10U, ptt_reply);
    CHECK(ptt_reply[1] == BH_CAT_TX_NOT_ARMED);
    BH_CAT_Service(true, false);
    CHECK(keyups == tx_before + 2 && !bh_cat_receiver.active && strcmp(blit_indicator, "CAT TX") == 0);
    /* Neither remote tuning nor TX ever erased or wrote flash. */
    CHECK(bh_test_flash_erases == erases_before && bh_test_flash_writes == writes_before);
    bh_cat_remote_enabled = false;

    /* Pass list: KEY_0 toggles it, arrows scroll, SAT controls are swallowed. */
    memset(bh_test_flash, 0xff, sizeof(bh_test_flash));
    uint8_t frame[BH_PASS_REQUEST_HEADER + 3 * BH_PASS_ENTRY_BYTES] = {1, BH_PASS_OP_WRITE};
    uint8_t pass_reply[BH_PASS_REPLY_MAX];
    const char *names[] = {"OLD", "AO-91", "ISS"};
    const uint32_t aos[] = {1761955200U - 3600U, 1761955200U + 5400U, 1761955200U + 2U * 86400U};
    frame[11] = 3;
    for (unsigned i = 0; i < 3; ++i) {
        uint8_t *e = &frame[BH_PASS_REQUEST_HEADER + i * BH_PASS_ENTRY_BYTES];
        e[0] = (uint8_t)(i + 1);
        memcpy(&e[4], names[i], strlen(names[i]));
        for (unsigned b = 0; b < 4; ++b) e[12 + b] = (uint8_t)(aos[i] >> (b * 8U));
        e[18] = 0x58; e[19] = 0x02; /* LOS at +600 s */
        e[20] = 72;
        e[22] = 0x5f; e[23] = 0x01; /* AOS azimuth 351 */
    }
    CHECK(BH_PASS_Request(frame, sizeof(frame), true, 0, pass_reply) && pass_reply[1] == BH_PASS_STATUS_OK);
    memset(frame, 0, BH_PASS_REQUEST_HEADER);
    frame[0] = 1; frame[1] = BH_PASS_OP_COMMIT; frame[11] = 3;
    for (unsigned b = 0; b < 4; ++b) frame[6 + b] = (uint8_t)(1761955200U >> (b * 8U));
    tick = 0;
    CHECK(BH_PASS_Request(frame, BH_PASS_REQUEST_HEADER, true, 0, pass_reply) && pass_reply[3] == 3);
    BH_SAT_Start();
    CHECK(BH_SAT_Key(KEY_0) && bhSatPassView);
    BH_SAT_Draw();
    CHECK(strcmp(rows[0], "PASSES 00:00Z") == 0);
    CHECK(strcmp(rows[1], "AO-91    +01h30m") == 0 && strcmp(rows[2], "01 01:30 E72 A351") == 0);
    CHECK(strcmp(rows[3], "ISS      +2d00h") == 0 && strcmp(rows[4], "03 00:00 E72 A351") == 0);
    CHECK(bhSatPassUpcoming == 2);
    CHECK(BH_SAT_Key(KEY_9) && !bh_cat_transmitter.armed);
    CHECK(BH_SAT_Key(KEY_DOWN) && bhSatPassFirst == 1);
    CHECK(BH_SAT_Key(KEY_DOWN) && bhSatPassFirst == 1);
    BH_SAT_Draw();
    CHECK(strcmp(rows[1], "ISS      +2d00h") == 0);
    CHECK(BH_SAT_Key(KEY_UP) && bhSatPassFirst == 0 && !BH_SAT_Key(KEY_EXIT));
    tick = 6000; /* 60 s later */
    BH_SAT_Draw();
    CHECK(strcmp(rows[0], "PASSES 00:01Z") == 0 && strcmp(rows[1], "AO-91    +01h29m") == 0);
    CHECK(BH_SAT_Key(KEY_0) && !bhSatPassView);
    BH_SAT_Draw();
    CHECK(strncmp(line2, "SAT RX", 6) == 0);
    puts("Satellite adapter checks passed with mocked RF calls; no hardware validation");
    return EXIT_SUCCESS;
}
