/* SPDX-License-Identifier: GPL-3.0-or-later */
#ifndef BRICOHAMS_CAT_TX_H
#define BRICOHAMS_CAT_TX_H
#include <stdbool.h>
#include <stdint.h>

/* Bricohams CAT TX v1 (0x7B02 -> 0x7B03): remote PTT for an audio source on the mic input (SSTV). */
#define BH_CAT_TX_REQUEST_SIZE 8U
#define BH_CAT_TX_REPLY_SIZE 16U
#define BH_CAT_TX_LEASE_MS 1500U   /* PTT drops when the host stops renewing. */
#define BH_CAT_TX_MAX_MS 120000U   /* Hard cap per transmission; the radio disarms after it. */

enum {
    BH_CAT_TX_OK = 0,
    BH_CAT_TX_QUEUED = 1,
    BH_CAT_TX_BAD_LENGTH = 2,
    BH_CAT_TX_BAD_VERSION = 3,
    BH_CAT_TX_BAD_OPERATION = 4,
    BH_CAT_TX_NOT_ARMED = 5,
    BH_CAT_TX_DENIED = 7,
    BH_CAT_TX_LIMIT = 8
};

enum { BH_CAT_TX_NONE, BH_CAT_TX_KEY, BH_CAT_TX_UNKEY };

typedef struct {
    uint32_t keyed_at;
    uint32_t last_renew;
    uint8_t denied_state;  /* VfoState_t of the last refused key-up, 0 if none. */
    bool armed;            /* Set only by a key on the radio. */
    bool requested;
    bool keyed;
    bool limit;
} bh_cat_tx;

extern bh_cat_tx bh_cat_transmitter;

void bh_cat_tx_arm(bh_cat_tx *state, bool armed);
void bh_cat_tx_request(bh_cat_tx *state, const uint8_t *request, uint16_t length,
    uint32_t now, uint8_t reply[BH_CAT_TX_REPLY_SIZE]);
int bh_cat_tx_poll(bh_cat_tx *state, uint32_t now);
void bh_cat_tx_keyed(bh_cat_tx *state, uint8_t denied_state, uint32_t now);
void bh_cat_tx_unkeyed(bh_cat_tx *state);
#endif
