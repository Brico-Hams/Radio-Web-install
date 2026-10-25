/* SPDX-License-Identifier: GPL-3.0-or-later */
#include "cat_rx.h"
#include <string.h>

bh_cat_rx bh_cat_receiver;

static uint32_t read32(const uint8_t *bytes)
{
    return (uint32_t)bytes[0] | ((uint32_t)bytes[1] << 8) |
        ((uint32_t)bytes[2] << 16) | ((uint32_t)bytes[3] << 24);
}

static void write32(uint8_t *bytes, uint32_t value)
{
    for (unsigned i = 0; i < 4; ++i)
        bytes[i] = (uint8_t)(value >> (i * 8U));
}

bool bh_cat_frequency_valid(uint32_t frequency)
{
    return (frequency >= 13600000U && frequency <= 17400000U) ||
        (frequency >= 40000000U && frequency <= 47000000U);
}

bool bh_cat_start(bh_cat_rx *state, uint32_t nominal)
{
    memset(state, 0, sizeof(*state));
    if (!bh_cat_frequency_valid(nominal))
        return false;
    state->nominal = nominal;
    state->target = nominal;
    state->applied = nominal;
    state->active = true;
    return true;
}

void bh_cat_stop(bh_cat_rx *state)
{
    memset(state, 0, sizeof(*state));
}

void bh_cat_local(bh_cat_rx *state, uint32_t applied)
{
    if (!state->active)
        return;
    state->remote = false;
    state->pending = false;
    state->target = applied;
    state->applied = applied;
}

bool bh_cat_expire(bh_cat_rx *state, uint32_t now)
{
    if (!state->active || !state->remote ||
        (uint32_t)(now - state->last_command) < BH_CAT_TIMEOUT_MS)
        return false;
    state->remote = false;
    state->target = state->nominal;
    state->pending = true;
    return true;
}

void bh_cat_applied(bh_cat_rx *state)
{
    state->applied = state->target;
    state->pending = false;
}

void bh_cat_request(bh_cat_rx *state, const uint8_t *request, uint16_t length,
    uint32_t now, uint8_t reply[BH_CAT_REPLY_SIZE])
{
    memset(reply, 0, BH_CAT_REPLY_SIZE);
    reply[0] = 1;
    uint8_t status = 0;
    if (length != BH_CAT_REQUEST_SIZE || request == NULL) {
        status = 2;
    } else {
        reply[2] = request[2];
        reply[3] = request[3];
        const uint32_t frequency = read32(&request[4]);
        if (request[0] != 1) status = 3;
        else if (request[1] > 2) status = 4;
        else if ((request[1] == 0 || request[1] == 2) && frequency != 0) status = 2;
        else if (request[1] == 1 && !bh_cat_frequency_valid(frequency)) status = 6;
        else if (request[1] != 0 && !state->active) status = 5;
        else if (request[1] != 0) {
            state->remote = request[1] == 1;
            state->last_command = now;
            state->target = state->remote ? frequency : state->nominal;
            state->pending = true;
            status = 1; /* Queued, not yet applied by the RX loop. */
        }
    }
    reply[1] = status;
    write32(&reply[4], 7U); /* RX set, query, stop/lease; no TX or EEPROM. */
    write32(&reply[8], state->applied);
    write32(&reply[12], (state->active ? 1U : 0U) |
        (state->remote ? 2U : 0U) | (state->pending ? 4U : 0U));
}
