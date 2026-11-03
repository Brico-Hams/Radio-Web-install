/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "bricohams/doppler.h"
#include "bricohams/cat_rx.h"
#include "bricohams/cat_tx.h"
#include "bricohams/passes.h"
#include "scheduler.h"

static uint32_t bhSatDownlink;
static uint32_t bhSatUplink;
static int32_t bhSatRate;
static bh_doppler_frequencies bhSatFrequencies;
static bool bhSatError;
static bool bhSatCatTimeout;
static bool bhSatPassView;
static uint8_t bhSatPassFirst;
static uint8_t bhSatPassUpcoming;

static void BH_SAT_Draw(void);

static bool bhCatOutside; /* Modal CAT TX started from the main screen instead of SAT RX. */
static bool bhCatWasMain = true; /* Cleared while SAT RX runs, so the first main-screen tick rebases. */

/* Hardware-only retune: never touches the VFO structures, channels, EEPROM or flash. */
static void BH_CAT_Retune(uint32_t frequency)
{
    BK4819_SetFrequency(frequency);
    BK4819_PickRXFilterPathBasedOnFrequency(frequency);
    const uint16_t receive = BK4819_ReadRegister(BK4819_REG_30);
    BK4819_WriteRegister(BK4819_REG_30, 0);
    BK4819_WriteRegister(BK4819_REG_30, receive);
}

static void BH_SAT_Tune(uint32_t frequency)
{
    BH_CAT_Retune(frequency);
    SYSTEM_DelayMs(20);
    FOXHUNT_RebaseMeasurements();
}

static void BH_SAT_Apply(void)
{
    bh_doppler_frequencies calculated;
    bhSatError = bh_doppler_calculate(bhSatDownlink, bhSatUplink, bhSatRate, &calculated) != BH_DOPPLER_OK;
    if (bhSatError)
        return;
    bhSatFrequencies = calculated;
    BH_SAT_Tune(calculated.receive_10hz);
    bh_cat_local(&bh_cat_receiver, calculated.receive_10hz);
}

static void BH_SAT_Start(void)
{
    bh_cat_stop(&bh_cat_receiver);
    bhCatWasMain = false;
    bh_cat_tx_arm(&bh_cat_transmitter, false);
    bhSatCatTimeout = false;
    bhSatPassView = false;
    bhSatDownlink = gRxVfo->pRX->Frequency;
    bhSatUplink = gRxVfo->pTX->Frequency;
    bhSatRate = 0;
    memset(&bhSatFrequencies, 0, sizeof(bhSatFrequencies));
    BH_SAT_Apply();
    bh_cat_remote_init();
    /* "CAT remoto" already consented: no need to find the SAT RX screen and press 8. */
    if (bh_cat_remote_enabled && !bhSatError && bh_cat_frequency_valid(bhSatDownlink))
        bh_cat_start(&bh_cat_receiver, bhSatDownlink);
}

/* Modal CAT PTT: the hunt loop's RX metering and Geiger blips must not run while keyed. */
static void BH_CAT_DrawIndicator(const char *text)
{
    GUI_DisplaySmallestInverse(text, 2, 0, true, true, (uint8_t)(2 + strlen(text) * 4));
}

static void BH_SAT_Transmit(void)
{
    const VfoState_t state = FOXHUNT_TxState();
    bh_cat_tx_keyed(&bh_cat_transmitter, (uint8_t)state, SCHEDULER_GetTick10ms() * 10U);
    if (state != VFO_STATE_NORMAL)
        return;
    AUDIO_AudioPathOff();
    gCurrentVfo = gTxVfo;
    BK4819_DisableDTMF(); /* Same TX audio filtering as FUNCTION_Transmit. */
    RADIO_SetTxParameters();
    BK4819_ToggleGpioOut(BK4819_GPIO5_PIN1_RED, true);
    BK4819_ExitTxMute(); /* Mic input, fed by the host's audio cable, goes on air. */
    if (bhCatOutside)
        BH_CAT_DrawIndicator("CAT TX");
    else
        BH_SAT_Draw();
    FOXHUNT_BlitScreen();
    KEY_Code_t held = KEYBOARD_GetKey();
    while (bh_cat_tx_poll(&bh_cat_transmitter, SCHEDULER_GetTick10ms() * 10U) == BH_CAT_TX_NONE) {
#if defined(ENABLE_UART) || defined(ENABLE_USB)
        UART_ServiceCommands();
#endif
        const KEY_Code_t key = KEYBOARD_GetKey();
        if (key != KEY_INVALID && key != held)
            bh_cat_tx_abort(&bh_cat_transmitter, SCHEDULER_GetTick10ms() * 10U); /* Any key aborts and disarms. */
        held = key;
        SYSTEM_DelayMs(10);
        BACKLIGHT_Update();
    }
    BK4819_EnterTxMute();
    BK4819_ToggleGpioOut(BK4819_GPIO1_PIN29_PA_ENABLE, false);
    BK4819_ToggleGpioOut(BK4819_GPIO5_PIN1_RED, false);
    RADIO_SetupRegisters(true);
    bh_cat_tx_unkeyed(&bh_cat_transmitter);
    kbd.current = KEYBOARD_GetKey(); /* The abort key is not a new hunt key press. */
    if (bhCatOutside) {
        if (bh_cat_receiver.active && bh_cat_receiver.remote)
            BH_CAT_Retune(bh_cat_receiver.applied);
    } else if (!bhSatError) {
        BH_SAT_Tune(bhSatFrequencies.receive_10hz);
    }
}

static void BH_SAT_Update(void)
{
    if (foxLocked && bh_cat_transmitter.armed)
        bh_cat_tx_arm(&bh_cat_transmitter, false);
    if (bh_cat_tx_poll(&bh_cat_transmitter, SCHEDULER_GetTick10ms() * 10U) == BH_CAT_TX_KEY)
        BH_SAT_Transmit();
    if (foxLocked && bh_cat_receiver.active) {
        bh_cat_stop(&bh_cat_receiver);
        bhSatRate = 0;
        bhSatCatTimeout = false;
        BH_SAT_Apply();
        return;
    }
    if (bh_cat_expire(&bh_cat_receiver, SCHEDULER_GetTick10ms() * 10U))
        bhSatCatTimeout = true;
    if (!bh_cat_receiver.active || !bh_cat_receiver.pending)
        return;
    bhSatFrequencies.receive_10hz = bh_cat_receiver.target;
    bhSatRate = 0;
    bhSatError = false;
    BH_SAT_Tune(bh_cat_receiver.target);
    bh_cat_applied(&bh_cat_receiver);
    if (bh_cat_receiver.remote)
        bhSatCatTimeout = false;
}

static void BH_SAT_Stop(void)
{
    bh_cat_stop(&bh_cat_receiver);
    bh_cat_tx_arm(&bh_cat_transmitter, false);
}

/* CAT outside SAT RX (normal VFO screen, digital modes). Called every 10 ms from APP_TimeSlice10ms,
 * i.e. in main-loop context: it only retunes BK4819 registers and never blocks. Returns true when the
 * "CAT" indicator needs the screen to be redrawn. */
bool BH_CAT_Service(bool mainScreen, bool localTx);
bool BH_CAT_Service(bool mainScreen, bool localTx)
{
    static KEY_Code_t held = KEY_INVALID;
    static uint32_t lastCheck;
    static uint32_t lastDraw;
    static bool shown;
    const uint32_t now = SCHEDULER_GetTick10ms() * 10U;
    uint32_t tune = 0;
    bh_cat_remote_init();
    if (!bh_cat_remote_enabled) {
        if (bh_cat_global_tick(&bh_cat_receiver, false, false, false, 0, now, &tune))
            BH_CAT_Retune(tune);
        if (bh_cat_transmitter.requested && !bh_cat_transmitter.keyed)
            bh_cat_transmitter.requested = false;
        const bool redraw = shown;
        shown = false;
        return redraw;
    }
    const KEY_Code_t key = KEYBOARD_GetKey();
    const bool keyEdge = key != KEY_INVALID && key != held;
    held = key;
    if (keyEdge)
        bh_cat_tx_user_key(&bh_cat_transmitter, now);
    /* The user's own PTT or leaving the main screen also ends remote control. */
    const bool cancel = keyEdge || localTx || !mainScreen;
    /* The main VFO the user operates; gRxVfo can point at the other VFO (dual watch) or a SAT value. */
    const uint32_t vfo = gTxVfo->pRX->Frequency;
    if (mainScreen && !bhCatWasMain)
        bh_cat_rebase(&bh_cat_receiver, vfo); /* Back from SAT RX: nominal is the VFO, not the downlink. */
    bhCatWasMain = mainScreen;
    const bool retune = bh_cat_global_tick(&bh_cat_receiver, true, cancel, mainScreen && !localTx, vfo, now, &tune);
    if (retune && !localTx) {
        if (!bh_cat_receiver.remote) {
            /* Release/expiry/key: put exactly the saved VFO frequency back (RAM only) and redo RX setup. */
            gTxVfo->pRX->Frequency = tune;
            RADIO_SetupRegisters(true);
        }
        BH_CAT_Retune(tune);
    }
    /* Upstream RX/TX setup may retune behind our back: re-assert the remote frequency. */
    if (bh_cat_receiver.active && bh_cat_receiver.remote && !bh_cat_receiver.pending &&
        mainScreen && !localTx && (uint32_t)(now - lastCheck) >= 100U) {
        lastCheck = now;
        const uint32_t current = BK4819_ReadRegister(BK4819_REG_38) |
            ((uint32_t)BK4819_ReadRegister(BK4819_REG_39) << 16);
        if (current != bh_cat_receiver.applied)
            BH_CAT_Retune(bh_cat_receiver.applied);
    }
    if (mainScreen && !localTx && bh_cat_tx_poll(&bh_cat_transmitter, now) == BH_CAT_TX_KEY) {
        bhCatOutside = true;
        BH_SAT_Transmit();
        bhCatOutside = false;
        held = KEYBOARD_GetKey();
        return true;
    }
    const bool visible = mainScreen && !localTx;
    if (visible != shown || (visible && (uint32_t)(now - lastDraw) >= 500U)) {
        shown = visible;
        lastDraw = now;
        if (visible) {
            BH_CAT_DrawIndicator("CAT");
            FOXHUNT_BlitScreen();
            return false;
        }
        return true;
    }
    return false;
}

static bool BH_SAT_Key(KEY_Code_t key)
{
    if (key == KEY_0) {
        bhSatPassView = !bhSatPassView;
        bhSatPassFirst = 0;
        return true;
    }
    if (bhSatPassView) {
        if (key == KEY_UP && bhSatPassFirst > 0)
            bhSatPassFirst--;
        else if (key == KEY_DOWN && bhSatPassFirst + 1U < bhSatPassUpcoming)
            bhSatPassFirst++;
        /* The list hides the SAT status, so no hidden arming or retuning from here. */
        return key != KEY_EXIT;
    }
    if (key == KEY_9) {
        /* Local confirmation: only the keypad arms CAT PTT, never the host. */
        bh_cat_tx_arm(&bh_cat_transmitter, !bh_cat_transmitter.armed && !bhSatError);
        return true;
    }
    if (key == KEY_8 && gWasFKeyPressed) {
        /* F+8 toggles the persistent "CAT remoto" consent (RX and TX outside SAT RX). */
        const bool enable = !bh_cat_remote_enabled;
        if (!bh_cat_remote_set(enable))
            bh_cat_remote_enabled = false; /* Not verified in flash: stay off. */
        bhSatCatTimeout = false;
        if (bh_cat_remote_enabled) {
            if (!bh_cat_receiver.active && !bhSatError && bh_cat_frequency_valid(bhSatDownlink))
                bh_cat_start(&bh_cat_receiver, bhSatDownlink);
        } else {
            bh_cat_stop(&bh_cat_receiver);
            bh_cat_tx_arm(&bh_cat_transmitter, false);
            bhSatRate = 0;
            BH_SAT_Apply();
        }
        return true;
    }
    if (key == KEY_8) {
        if (bh_cat_receiver.active) {
            bh_cat_stop(&bh_cat_receiver);
            bhSatRate = 0;
            BH_SAT_Apply();
        } else if (bh_cat_frequency_valid(bhSatDownlink)) {
            /* RX-only CAT does not need a valid uplink: an invalid TX VFO must not silently block arming. */
            bhSatRate = 0;
            BH_SAT_Apply();
            if (!bh_cat_start(&bh_cat_receiver, bhSatDownlink))
                bhSatError = true;
        }
        bhSatCatTimeout = false;
        return true;
    }
    if (key != KEY_4 && key != KEY_5 && key != KEY_6)
        return false;
    bh_cat_stop(&bh_cat_receiver);
    bhSatCatTimeout = false;
    if (key == KEY_4 && bhSatRate > -12000000)
        bhSatRate -= 500000;
    else if (key == KEY_6 && bhSatRate < 12000000)
        bhSatRate += 500000;
    else if (key == KEY_5)
        bhSatRate = 0;
    BH_SAT_Apply();
    return true;
}

/* Passes stored by the host (0x7B30), timed by the clock the host last set. */
static void BH_SAT_DrawPasses(void)
{
    char line[24];
    char when[12];
    uint8_t day, hour, minute;
    bh_pass pass;
    for (unsigned row = 0; row < 7; ++row)
        memset(gFrameBuffer[row], 0, sizeof(gFrameBuffer[row]));
    const uint32_t now = bh_pass_clock(SCHEDULER_GetTick10ms() * 10U);
    const uint8_t count = bh_pass_count();
    if (now == 0) {
        strcpy(line, "PASSES NO TIME");
    } else {
        bh_pass_civil(now, &day, &hour, &minute);
        sprintf(line, "PASSES %02u:%02uZ", (unsigned)hour, (unsigned)minute);
    }
    UI_PrintStringSmallNormal(line, 0, 127, 0);
    uint8_t shown = 0;
    bhSatPassUpcoming = 0;
    for (uint8_t i = 0; i < count; ++i) {
        if (!bh_pass_read(i, &pass) || (now != 0 && pass.aos + pass.los_offset <= now))
            continue;
        if (bhSatPassUpcoming++ < bhSatPassFirst || shown >= 3)
            continue;
        if (now == 0)
            when[0] = '\0';
        else if (pass.aos <= now)
            strcpy(when, "NOW");
        else if (pass.aos - now < 86400U)
            /* The modulo bounds let -Wformat-overflow prove the result fits. */
            sprintf(when, "+%02uh%02um", (unsigned)((pass.aos - now) / 3600U % 24U),
                (unsigned)((pass.aos - now) / 60U % 60U));
        else
            sprintf(when, "+%ud%02uh", (unsigned)((uint32_t)(pass.aos - now) / 86400U),
                (unsigned)((pass.aos - now) / 3600U % 24U));
        const uint8_t row = (uint8_t)(1U + shown * 2U);
        sprintf(line, "%-8s %s", pass.name, when);
        UI_PrintStringSmallNormal(line, 0, 0, row);
        bh_pass_civil(pass.aos, &day, &hour, &minute);
        sprintf(line, "%02u %02u:%02u E%02u A%03u", (unsigned)day, (unsigned)hour,
            (unsigned)minute, (unsigned)pass.max_elevation, (unsigned)pass.aos_azimuth);
        UI_PrintStringSmallNormal(line, 0, 0, (uint8_t)(row + 1U));
        shown++;
    }
    if (shown == 0)
        UI_PrintStringSmallNormal(count ? "NO UPCOMING PASS" : "NO PASSES LOADED", 0, 127, 3);
}

static void BH_SAT_Draw(void)
{
    char line[24];
    if (bhSatPassView && !bh_cat_transmitter.keyed) {
        BH_SAT_DrawPasses();
        return;
    }
    memset(gFrameBuffer[2], 0, sizeof(gFrameBuffer[2]));
    memset(gFrameBuffer[6], 0, sizeof(gFrameBuffer[6]));
    if (bhSatError) {
        UI_PrintStringSmallNormal("SAT INVALID VFO", 0, 127, 2);
        UI_PrintStringSmallNormal("136-174/400-470", 0, 127, 6);
        return;
    }
    if (bh_cat_transmitter.keyed) {
        UI_PrintStringSmallNormal("CAT TX ON AIR", 0, 127, 2);
        sprintf(line, "TX %lu.%05lu", (unsigned long)(gTxVfo->pTX->Frequency / 100000),
            (unsigned long)(gTxVfo->pTX->Frequency % 100000));
        UI_PrintStringSmallNormal(line, 0, 127, 6);
        return;
    }
    if (bh_cat_transmitter.limit)
        strcpy(line, "CAT TX LIMIT");
    else if (bh_cat_transmitter.denied_state != 0)
        strcpy(line, "CAT TX DENIED");
    else if (bh_cat_transmitter.armed)
        strcpy(line, "CAT TX ARMED");
    else if (bh_cat_receiver.remote)
        strcpy(line, "SAT CAT RX");
    else if (bhSatCatTimeout)
        strcpy(line, "CAT TIMEOUT");
    else if (bh_cat_receiver.active)
        strcpy(line, "CAT READY RX");
    else
        sprintf(line, "SAT RX V%+ldm/s", (long)(bhSatRate / 1000));
    UI_PrintStringSmallNormal(line, 0, 127, 2);
    sprintf(line, "%lu.%05lu MHz", (unsigned long)(bhSatFrequencies.receive_10hz / 100000),
        (unsigned long)(bhSatFrequencies.receive_10hz % 100000));
    UI_PrintStringSmallNormal(line, 0, 127, 6);
}
