/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "bricohams/doppler.h"
#include "bricohams/cat_rx.h"
#include "bricohams/cat_tx.h"
#include "scheduler.h"

static uint32_t bhSatDownlink;
static uint32_t bhSatUplink;
static int32_t bhSatRate;
static bh_doppler_frequencies bhSatFrequencies;
static bool bhSatError;
static bool bhSatCatTimeout;

static void BH_SAT_Draw(void);

static void BH_SAT_Tune(uint32_t frequency)
{
    BK4819_SetFrequency(frequency);
    BK4819_PickRXFilterPathBasedOnFrequency(frequency);
    const uint16_t receive = BK4819_ReadRegister(BK4819_REG_30);
    BK4819_WriteRegister(BK4819_REG_30, 0);
    BK4819_WriteRegister(BK4819_REG_30, receive);
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
    bh_cat_tx_arm(&bh_cat_transmitter, false);
    bhSatCatTimeout = false;
    bhSatDownlink = gRxVfo->pRX->Frequency;
    bhSatUplink = gRxVfo->pTX->Frequency;
    bhSatRate = 0;
    memset(&bhSatFrequencies, 0, sizeof(bhSatFrequencies));
    BH_SAT_Apply();
}

/* Modal CAT PTT: the hunt loop's RX metering and Geiger blips must not run while keyed. */
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
    BH_SAT_Draw();
    FOXHUNT_BlitScreen();
    KEY_Code_t held = KEYBOARD_GetKey();
    while (bh_cat_tx_poll(&bh_cat_transmitter, SCHEDULER_GetTick10ms() * 10U) == BH_CAT_TX_NONE) {
#if defined(ENABLE_UART) || defined(ENABLE_USB)
        UART_ServiceCommands();
#endif
        const KEY_Code_t key = KEYBOARD_GetKey();
        if (key != KEY_INVALID && key != held)
            bh_cat_tx_arm(&bh_cat_transmitter, false); /* Any key on the radio aborts and disarms. */
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
    if (!bhSatError)
        BH_SAT_Tune(bhSatFrequencies.receive_10hz);
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

static bool BH_SAT_Key(KEY_Code_t key)
{
    if (key == KEY_9) {
        /* Local confirmation: only the keypad arms CAT PTT, never the host. */
        bh_cat_tx_arm(&bh_cat_transmitter, !bh_cat_transmitter.armed && !bhSatError);
        return true;
    }
    if (key == KEY_8) {
        if (bh_cat_receiver.active) {
            bh_cat_stop(&bh_cat_receiver);
            bhSatRate = 0;
            BH_SAT_Apply();
        } else if (!bhSatError) {
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

static void BH_SAT_Draw(void)
{
    char line[24];
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
