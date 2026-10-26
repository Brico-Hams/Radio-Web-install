/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "cat_tx.h"
#include <string.h>

bh_cat_tx bh_cat_transmitter;

static void write32(uint8_t *bytes, uint32_t value)
{
    for (unsigned i = 0; i < 4; ++i)
        bytes[i] = (uint8_t)(value >> (i * 8U));
}

void bh_cat_tx_arm(bh_cat_tx *state, bool armed)
{
    /* Arming or disarming never leaves a key request behind; the adapter unkeys on the next poll. */
    state->armed = armed;
    state->requested = false;
    state->limit = false;
    state->denied_state = 0;
}

void bh_cat_tx_request(bh_cat_tx *state, const uint8_t *request, uint16_t length,
    uint32_t now, uint8_t reply[BH_CAT_TX_REPLY_SIZE])
{
    memset(reply, 0, BH_CAT_TX_REPLY_SIZE);
    reply[0] = 1;
    uint8_t status = BH_CAT_TX_OK;
    if (length != BH_CAT_TX_REQUEST_SIZE || request == NULL) {
        status = BH_CAT_TX_BAD_LENGTH;
    } else {
        reply[2] = request[2];
        reply[3] = request[3];
        const bool reserved = request[4] | request[5] | request[6] | request[7];
        if (request[0] != 1) status = BH_CAT_TX_BAD_VERSION;
        else if (request[1] > 2) status = BH_CAT_TX_BAD_OPERATION;
        else if (reserved) status = BH_CAT_TX_BAD_LENGTH;
        else if (request[1] == 2) {
            /* Unkey is always accepted, armed or not. */
            state->requested = false;
            status = state->keyed ? BH_CAT_TX_QUEUED : BH_CAT_TX_OK;
        } else if (request[1] == 1) {
            if (!state->armed) status = state->limit ? BH_CAT_TX_LIMIT : BH_CAT_TX_NOT_ARMED;
            else if (state->denied_state != 0) status = BH_CAT_TX_DENIED;
            else {
                state->requested = true;
                state->last_renew = now;
                status = state->keyed ? BH_CAT_TX_OK : BH_CAT_TX_QUEUED;
            }
        } else if (state->denied_state != 0) {
            status = BH_CAT_TX_DENIED;
        }
    }
    reply[1] = status;
    write32(&reply[4], 8U); /* PTT with lease only: no frequency, power or EEPROM changes. */
    write32(&reply[8], (state->armed ? 1U : 0U) | (state->keyed ? 2U : 0U) |
        (state->requested && !state->keyed ? 4U : 0U) | (state->limit ? 8U : 0U) |
        ((uint32_t)state->denied_state << 8));
    write32(&reply[12], state->keyed ? now - state->keyed_at : 0U);
}

int bh_cat_tx_poll(bh_cat_tx *state, uint32_t now)
{
    if (state->keyed) {
        if ((uint32_t)(now - state->keyed_at) >= BH_CAT_TX_MAX_MS) {
            state->armed = false;
            state->requested = false;
            state->limit = true;
            return BH_CAT_TX_UNKEY;
        }
        if (!state->armed || !state->requested ||
            (uint32_t)(now - state->last_renew) >= BH_CAT_TX_LEASE_MS) {
            state->requested = false;
            return BH_CAT_TX_UNKEY;
        }
        return BH_CAT_TX_NONE;
    }
    if (state->requested && (uint32_t)(now - state->last_renew) >= BH_CAT_TX_LEASE_MS)
        state->requested = false;
    return state->armed && state->requested && state->denied_state == 0 ? BH_CAT_TX_KEY : BH_CAT_TX_NONE;
}

void bh_cat_tx_keyed(bh_cat_tx *state, uint8_t denied_state, uint32_t now)
{
    if (denied_state != 0) {
        /* Refused by the radio's own TX gates: stays refused until re-armed on the radio. */
        state->denied_state = denied_state;
        state->requested = false;
        return;
    }
    state->keyed = true;
    state->keyed_at = now;
}

void bh_cat_tx_unkeyed(bh_cat_tx *state)
{
    state->keyed = false;
}
