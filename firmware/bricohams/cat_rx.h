/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef BRICOHAMS_CAT_RX_H
#define BRICOHAMS_CAT_RX_H
#include <stdbool.h>
#include <stdint.h>

#define BH_CAT_REQUEST_SIZE 8U
#define BH_CAT_REPLY_SIZE 16U
#define BH_CAT_TIMEOUT_MS 3000U
#define BH_CAT_HOLDOFF_MS 5000U /* After a key cancels remote control, the host must not retake it at once. */

/* Reply word 4 (capabilities): bits 0..2 are the v1 operations, bit 3 says CAT also works outside SAT RX. */
#define BH_CAT_CAPS_V1 7U
#define BH_CAT_CAP_ANY_SCREEN 8U
/* Reply word 12 (flags): bits 0..2 active/remote/pending, then the "CAT remoto" consent and the key hold-off. */
#define BH_CAT_FLAG_ENABLED 8U
#define BH_CAT_FLAG_HOLDOFF 16U

/* "CAT remoto" consent lives in the reserved bytes 8..31 of the pass sector (BH_PASS_FLASH_ADDR + 8):
 * 0xCA, flag, ~flag, 0. Erased or corrupt flash always reads as OFF. */
#define BH_CAT_CONFIG_ADDR 0x00F008U
#define BH_CAT_CONFIG_BYTES 4U

typedef struct {
    uint32_t nominal;
    uint32_t target;
    uint32_t applied;
    uint32_t last_command;
    uint32_t holdoff_at;
    bool active;
    bool remote;
    bool pending;
    bool holdoff;
} bh_cat_rx;

extern bh_cat_rx bh_cat_receiver;
extern bool bh_cat_remote_enabled;

bool bh_cat_frequency_valid(uint32_t frequency);
bool bh_cat_start(bh_cat_rx *state, uint32_t nominal);
void bh_cat_stop(bh_cat_rx *state);
/* The nominal becomes the real VFO frequency (e.g. after leaving SAT RX, so the SAT downlink never
 * leaks into the VFO). An idle receiver also reports it as applied; a remote lease is left running. */
void bh_cat_rebase(bh_cat_rx *state, uint32_t vfo);
void bh_cat_local(bh_cat_rx *state, uint32_t applied);
bool bh_cat_expire(bh_cat_rx *state, uint32_t now);
void bh_cat_applied(bh_cat_rx *state);
void bh_cat_request(bh_cat_rx *state, const uint8_t *request, uint16_t length,
    uint32_t now, uint8_t reply[BH_CAT_REPLY_SIZE]);

/* "CAT remoto" consent. init loads it once from flash; set updates RAM and persists the flag only
 * (never a frequency); store writes the flag without touching RAM (used after the pass sector is erased). */
void bh_cat_remote_init(void);
bool bh_cat_remote_set(bool enabled);
void bh_cat_remote_store(bool enabled);

/* A user key cancels remote control: the caller must retune to *tune (the user's nominal frequency). */
bool bh_cat_user_cancel(bh_cat_rx *state, uint32_t now, uint32_t *tune);

/* Arming outside SAT RX, called every 10 ms from the main loop. While nothing is remote the nominal
 * frequency follows the user's VFO; leases are applied/expired here and the return value says that the
 * receiver must be retuned to *tune. cancel (key or left main screen) ends remote control and starts a
 * hold-off; idle_ok is false when CAT must not arm or follow the VFO (not on the main screen). */
bool bh_cat_global_tick(bh_cat_rx *state, bool enabled, bool cancel, bool idle_ok,
    uint32_t vfo, uint32_t now, uint32_t *tune);
#endif
